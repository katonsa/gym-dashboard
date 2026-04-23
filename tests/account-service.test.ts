import { expect, test, vi } from "vitest"

import {
  changeEmailForUser,
  changePasswordForUser,
} from "../lib/auth/account-service.ts"
import { Prisma } from "../lib/generated/prisma/client.ts"

const requestHeaders = new Headers({
  cookie: "better-auth.session_token=current-session",
})
const currentSessionToken = "current-session"

test("rejects same-email changes after normalization", async () => {
  const verifyPassword = vi.fn()
  const client = {
    user: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  }

  await expect(
    changeEmailForUser({
      client,
      userId: "user-1",
      currentEmail: "Owner@Example.test",
      currentSessionToken,
      newEmail: "owner@example.test",
      currentPassword: "owner-password-123",
      requestHeaders,
      verifyPassword,
    })
  ).resolves.toStrictEqual({ status: "same-email" })

  expect(verifyPassword).not.toHaveBeenCalled()
  expect(client.user.findFirst).not.toHaveBeenCalled()
  expect(client.$transaction).not.toHaveBeenCalled()
})

test("rejects duplicate email addresses before update", async () => {
  const verifyPassword = vi.fn().mockResolvedValue({ status: true })
  const client = {
    user: {
      findFirst: vi.fn().mockResolvedValue({ id: "user-2" }),
    },
    $transaction: vi.fn(),
  }

  await expect(
    changeEmailForUser({
      client,
      userId: "user-1",
      currentEmail: "owner@example.test",
      currentSessionToken,
      newEmail: "new@example.test",
      currentPassword: "owner-password-123",
      requestHeaders,
      verifyPassword,
    })
  ).resolves.toStrictEqual({ status: "duplicate-email" })

  expect(client.user.findFirst).toHaveBeenCalledWith({
    where: {
      id: { not: "user-1" },
      email: {
        equals: "new@example.test",
        mode: "insensitive",
      },
    },
    select: { id: true },
  })
  expect(client.$transaction).not.toHaveBeenCalled()
})

test("rejects invalid current passwords for email changes", async () => {
  const verifyPassword = vi.fn().mockRejectedValue({
    body: { code: "INVALID_PASSWORD" },
  })
  const client = {
    user: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  }

  await expect(
    changeEmailForUser({
      client,
      userId: "user-1",
      currentEmail: "owner@example.test",
      currentSessionToken,
      newEmail: "new@example.test",
      currentPassword: "wrong-password",
      requestHeaders,
      verifyPassword,
    })
  ).resolves.toStrictEqual({ status: "invalid-password" })

  expect(client.user.findFirst).not.toHaveBeenCalled()
  expect(client.$transaction).not.toHaveBeenCalled()
})

test("maps unique constraint races to duplicate-email results", async () => {
  const verifyPassword = vi.fn().mockResolvedValue({ status: true })
  const tx = {
    user: {
      update: vi.fn().mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("duplicate", {
          code: "P2002",
          clientVersion: "test",
          meta: {
            target: ["email"],
          },
        })
      ),
    },
    session: {
      deleteMany: vi.fn(),
    },
  }
  const client = {
    user: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    $transaction: vi.fn(async (handler) => handler(tx)),
  }

  await expect(
    changeEmailForUser({
      client,
      userId: "user-1",
      currentEmail: "owner@example.test",
      currentSessionToken,
      newEmail: "new@example.test",
      currentPassword: "owner-password-123",
      requestHeaders,
      verifyPassword,
    })
  ).resolves.toStrictEqual({ status: "duplicate-email" })

  expect(tx.session.deleteMany).not.toHaveBeenCalled()
})

test("updates email and revokes other sessions in one transaction", async () => {
  const verifyPassword = vi.fn().mockResolvedValue({ status: true })
  const tx = {
    user: {
      update: vi.fn().mockResolvedValue({ id: "user-1" }),
    },
    session: {
      deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
    },
  }
  const client = {
    user: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    $transaction: vi.fn(async (handler) => handler(tx)),
  }

  await expect(
    changeEmailForUser({
      client,
      userId: "user-1",
      currentEmail: "owner@example.test",
      currentSessionToken,
      newEmail: "new@example.test",
      currentPassword: "owner-password-123",
      requestHeaders,
      verifyPassword,
    })
  ).resolves.toStrictEqual({ status: "updated" })

  expect(client.$transaction).toHaveBeenCalledTimes(1)
  expect(tx.user.update).toHaveBeenCalledWith({
    where: { id: "user-1" },
    data: { email: "new@example.test" },
    select: { id: true },
  })
  expect(tx.session.deleteMany).toHaveBeenCalledWith({
    where: {
      userId: "user-1",
      token: { not: currentSessionToken },
      expiresAt: { gt: expect.any(Date) },
    },
  })
})

test("changes passwords with other-session revocation enabled", async () => {
  const changePassword = vi.fn().mockResolvedValue({})

  await expect(
    changePasswordForUser({
      currentPassword: "owner-password-123",
      newPassword: "new-owner-password-123",
      requestHeaders,
      changePassword,
    })
  ).resolves.toStrictEqual({ status: "updated" })

  expect(changePassword).toHaveBeenCalledWith({
    body: {
      currentPassword: "owner-password-123",
      newPassword: "new-owner-password-123",
      revokeOtherSessions: true,
    },
    headers: requestHeaders,
  })
})

test("maps invalid current passwords during password changes", async () => {
  const changePassword = vi.fn().mockRejectedValue({
    body: { code: "INVALID_PASSWORD" },
  })

  await expect(
    changePasswordForUser({
      currentPassword: "wrong-password",
      newPassword: "new-owner-password-123",
      requestHeaders,
      changePassword,
    })
  ).resolves.toStrictEqual({ status: "invalid-password" })
})
