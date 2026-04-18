import * as z from "zod"

import { parseDateInput } from "./member-create-schema.ts"

export type ChangePlanActionResult = {
  success: boolean
  error?: string
}

export const changePlanSchema = z.object({
  memberId: z.string().trim().min(1, "Choose a member."),
  planTierId: z.string().trim().min(1, "Choose a plan."),
  billingInterval: z.enum(["MONTHLY", "ANNUAL"], {
    message: "Choose a billing interval.",
  }),
  effectiveDate: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || todayDateInput())
    .refine((value) => parseDateInput(value) !== null, {
      message: "Choose a valid effective date.",
    }),
})

export type ChangeMemberPlanValues = z.input<typeof changePlanSchema>

function todayDateInput() {
  return new Date().toISOString().slice(0, 10)
}
