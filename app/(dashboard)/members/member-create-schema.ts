import * as z from "zod"

export type CreateMemberActionResult = {
  success: boolean
  error?: string
}

export const memberStatusSchema = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"])
export const billingIntervalSchema = z.enum(["MONTHLY", "ANNUAL"])

export const createMemberSchema = z
  .object({
    firstName: z.string().trim().min(1, "Enter a first name."),
    lastName: z.string().trim().min(1, "Enter a last name."),
    email: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || undefined)
      .pipe(z.string().email("Enter a valid email address.").optional()),
    phone: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || undefined),
    status: memberStatusSchema,
    joinDate: z
      .string()
      .trim()
      .min(1, "Choose a join date.")
      .refine((value) => parseDateInput(value) !== null, {
        message: "Choose a valid join date.",
      }),
    planTierId: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || undefined),
    billingInterval: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || undefined),
    notes: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || undefined),
  })
  .superRefine((value, context) => {
    if (
      value.planTierId &&
      !billingIntervalSchema.safeParse(value.billingInterval).success
    ) {
      context.addIssue({
        code: "custom",
        path: ["billingInterval"],
        message: "Choose a billing interval for the selected plan.",
      })
    }
  })

export type CreateMemberValues = z.input<typeof createMemberSchema>

export function parseDateInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, monthIndex, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date
}
