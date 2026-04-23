import * as z from "zod"

export type AccountSettingsActionResult = {
  success: boolean
  error?: string
}

const emailField = z
  .string()
  .trim()
  .min(1, "Enter a new email.")
  .email("Enter a valid email address.")
  .transform((value) => value.toLowerCase())

const passwordField = z.string().min(1, "Enter your current password.")

export const accountPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be 128 characters or fewer.")

export const changeEmailSchema = z.object({
  newEmail: emailField,
  currentPassword: passwordField,
})

export const changePasswordSchema = z
  .object({
    currentPassword: passwordField,
    newPassword: accountPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Confirm your new password.",
    path: ["confirmPassword"],
  })

export type ChangeEmailValues = z.input<typeof changeEmailSchema>
export type ChangePasswordValues = z.input<typeof changePasswordSchema>
