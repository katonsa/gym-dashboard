import * as z from "zod"

import { parseDateInput } from "./member-create-schema.ts"

export type LogCheckInActionResult = {
  success: boolean
  error?: string
}

export const logCheckInSchema = z.object({
  memberId: z.string().trim().min(1, "Choose a member."),
  attendedAt: z
    .string()
    .trim()
    .min(1, "Choose a check-in date.")
    .refine((value) => parseDateInput(value) !== null, {
      message: "Choose a valid check-in date.",
    })
    .refine((value) => !isFutureDateInput(value), {
      message: "Check-in date cannot be in the future.",
    }),
  notes: z
    .string()
    .trim()
    .max(500, "Notes must be 500 characters or fewer.")
    .optional()
    .transform((value) => value || undefined),
})

export type LogCheckInValues = z.input<typeof logCheckInSchema>

function isFutureDateInput(value: string) {
  const selectedDate = parseDateInput(value)

  if (!selectedDate) {
    return false
  }

  const today = parseDateInput(formatDateInput(new Date()))

  return today ? selectedDate.getTime() > today.getTime() : false
}

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}
