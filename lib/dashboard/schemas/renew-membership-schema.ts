import * as z from "zod"

import { parseDateInput } from "../formatters.ts"

export type RenewMembershipActionResult = {
  success: boolean
  error?: string
}

export const renewMembershipSchema = z.object({
  membershipId: z.string().trim().min(1, "Choose a membership."),
  expectedStatus: z.enum(["ACTIVE", "EXPIRED"], {
    message: "Refresh this membership and try again.",
  }),
  expectedCurrentPeriodEndsAt: z
    .string()
    .trim()
    .min(1, "Refresh this membership and try again.")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "Refresh this membership and try again.",
    }),
  submissionId: z
    .string()
    .trim()
    .min(1, "Refresh this membership and try again.")
    .refine(
      (value) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          value
        ),
      { message: "Refresh this membership and try again." }
    ),
  renewalDate: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => value === undefined || parseDateInput(value) !== null, {
      message: "Choose a valid renewal date.",
    }),
})

export type RenewMembershipValues = z.input<typeof renewMembershipSchema>
