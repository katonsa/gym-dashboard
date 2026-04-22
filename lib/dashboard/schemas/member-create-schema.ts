import * as z from "zod"

import type { MemberDuplicateMatch } from "../member-duplicate-detection.ts"
import { parseDateInput } from "../formatters.ts"

export type CreateMemberActionResult =
  | {
      success: true
    }
  | {
      success: false
      error: string
    }
  | {
      success: false
      duplicateMatches: MemberDuplicateMatch[]
    }

export const memberStatusSchema = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"])
export const billingIntervalSchema = z.enum(["MONTHLY", "ANNUAL"])

export const createMemberSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, "Enter a first name.")
      .max(100, "First name must be 100 characters or fewer."),
    lastName: z
      .string()
      .trim()
      .min(1, "Enter a last name.")
      .max(100, "Last name must be 100 characters or fewer."),
    email: z
      .string()
      .trim()
      .max(255, "Email must be 255 characters or fewer.")
      .optional()
      .transform((value) => value || undefined)
      .pipe(z.string().email("Enter a valid email address.").optional()),
    phone: z
      .string()
      .trim()
      .max(50, "Phone must be 50 characters or fewer.")
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
      .max(1000, "Notes must be 1000 characters or fewer.")
      .optional()
      .transform((value) => value || undefined),
    confirmDuplicate: z.boolean().optional(),
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
