import { Prisma } from "@/lib/generated/prisma/client"

type VerifyPassword = (args: {
  body: {
    password: string
  }
  headers: Headers
}) => Promise<{ status: boolean }>

type ChangePassword = (args: {
  body: {
    currentPassword: string
    newPassword: string
    revokeOtherSessions: boolean
  }
  headers: Headers
}) => Promise<unknown>

type AccountWriteClient = {
  user: {
    update(args: {
      where: { id: string }
      data: { email: string }
      select: { id: true }
    }): Promise<{ id: string }>
  }
  session: {
    deleteMany(args: {
      where: {
        userId: string
        token: { not: string }
        expiresAt: { gt: Date }
      }
    }): Promise<{ count: number }>
  }
}

type AccountClient = {
  user: {
    findFirst(args: {
      where: {
        id: { not: string }
        email: {
          equals: string
          mode: "insensitive"
        }
      }
      select: { id: true }
    }): Promise<{ id: string } | null>
  }
  $transaction<T>(handler: (tx: AccountWriteClient) => Promise<T>): Promise<T>
}

export type ChangeEmailResult =
  | { status: "updated" }
  | { status: "duplicate-email" }
  | { status: "same-email" }
  | { status: "invalid-password" }

export type ChangePasswordResult =
  | { status: "updated" }
  | { status: "invalid-password" }

export async function changeEmailForUser({
  client,
  userId,
  currentEmail,
  currentSessionToken,
  newEmail,
  currentPassword,
  requestHeaders,
  verifyPassword,
}: {
  client: AccountClient
  userId: string
  currentEmail: string
  currentSessionToken: string
  newEmail: string
  currentPassword: string
  requestHeaders: Headers
  verifyPassword: VerifyPassword
}): Promise<ChangeEmailResult> {
  if (normalizeAccountEmail(currentEmail) === newEmail) {
    return { status: "same-email" }
  }

  const passwordVerified = await verifyCurrentPassword({
    currentPassword,
    requestHeaders,
    verifyPassword,
  })

  if (!passwordVerified) {
    return { status: "invalid-password" }
  }

  const duplicate = await client.user.findFirst({
    where: {
      id: { not: userId },
      email: {
        equals: newEmail,
        mode: "insensitive",
      },
    },
    select: { id: true },
  })

  if (duplicate) {
    return { status: "duplicate-email" }
  }

  try {
    await client.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { email: newEmail },
        select: { id: true },
      })

      await tx.session.deleteMany({
        where: {
          userId,
          token: { not: currentSessionToken },
          expiresAt: { gt: new Date() },
        },
      })
    })
  } catch (error) {
    if (isUserEmailUniqueError(error)) {
      return { status: "duplicate-email" }
    }

    throw error
  }

  return { status: "updated" }
}

export async function changePasswordForUser({
  currentPassword,
  newPassword,
  requestHeaders,
  changePassword,
}: {
  currentPassword: string
  newPassword: string
  requestHeaders: Headers
  changePassword: ChangePassword
}): Promise<ChangePasswordResult> {
  try {
    await changePassword({
      body: {
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      },
      headers: requestHeaders,
    })
  } catch (error) {
    if (isInvalidPasswordError(error)) {
      return { status: "invalid-password" }
    }

    throw error
  }

  return { status: "updated" }
}

export function normalizeAccountEmail(email: string) {
  return email.trim().toLowerCase()
}

async function verifyCurrentPassword({
  currentPassword,
  requestHeaders,
  verifyPassword,
}: {
  currentPassword: string
  requestHeaders: Headers
  verifyPassword: VerifyPassword
}) {
  try {
    const result = await verifyPassword({
      body: {
        password: currentPassword,
      },
      headers: requestHeaders,
    })

    return result.status
  } catch (error) {
    if (isInvalidPasswordError(error)) {
      return false
    }

    throw error
  }
}

function isInvalidPasswordError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "body" in error &&
    typeof error.body === "object" &&
    error.body !== null &&
    "code" in error.body &&
    error.body.code === "INVALID_PASSWORD"
  )
}

function isUserEmailUniqueError(error: unknown) {
  const target =
    error instanceof Prisma.PrismaClientKnownRequestError
      ? error.meta?.target
      : null

  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    ((Array.isArray(target) && target.includes("email")) ||
      target === "User_email_key")
  )
}
