"use server"

import { headers } from "next/headers"

import { revalidateAccountSettingsPaths } from "@/lib/application/revalidation"
import { auth } from "@/lib/auth"
import { requireDashboardSession } from "@/lib/auth/server"
import {
  changeEmailForUser,
  changePasswordForUser,
} from "@/lib/auth/account-service"
import {
  changeEmailSchema,
  changePasswordSchema,
  type AccountSettingsActionResult,
  type ChangeEmailValues,
  type ChangePasswordValues,
} from "@/lib/auth/schemas/account-settings-schema"
import { db } from "@/lib/db"

export async function changeEmail(
  values: ChangeEmailValues
): Promise<AccountSettingsActionResult> {
  const session = await requireDashboardSession("/account")
  const parsed = changeEmailSchema.safeParse(values)

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ??
        "Check the email details and try again.",
    }
  }

  try {
    const result = await changeEmailForUser({
      client: db,
      userId: session.user.id,
      currentEmail: session.user.email,
      currentSessionToken: session.session.token,
      newEmail: parsed.data.newEmail,
      currentPassword: parsed.data.currentPassword,
      requestHeaders: await headers(),
      verifyPassword: auth.api.verifyPassword,
    })

    if (result.status === "same-email") {
      return {
        success: false,
        error: "Enter a different email address.",
      }
    }

    if (result.status === "duplicate-email") {
      return {
        success: false,
        error: "That email is already in use.",
      }
    }

    if (result.status === "invalid-password") {
      return {
        success: false,
        error: "Enter your current password correctly and try again.",
      }
    }

    revalidateAccountSettingsPaths()

    return { success: true }
  } catch {
    return {
      success: false,
      error: "The email could not be changed. Try again.",
    }
  }
}

export async function changePassword(
  values: ChangePasswordValues
): Promise<AccountSettingsActionResult> {
  await requireDashboardSession("/account")
  const parsed = changePasswordSchema.safeParse(values)

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ??
        "Check the password details and try again.",
    }
  }

  try {
    const result = await changePasswordForUser({
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
      requestHeaders: await headers(),
      changePassword: auth.api.changePassword,
    })

    if (result.status === "invalid-password") {
      return {
        success: false,
        error: "Enter your current password correctly and try again.",
      }
    }

    revalidateAccountSettingsPaths()

    return { success: true }
  } catch {
    return {
      success: false,
      error: "The password could not be changed. Try again.",
    }
  }
}
