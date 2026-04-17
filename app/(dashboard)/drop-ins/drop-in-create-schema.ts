import * as z from "zod"

export type CreateDropInActionResult = {
  success: boolean
  error?: string
}

const MAX_DROP_IN_AMOUNT = 10_000_000
const MAX_VISIT_COUNT = 100

const optionalTextSchema = z.string().trim().optional()

const optionalAmountSchema = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || /^\d+$/.test(value), {
    message: "Enter a whole-number amount.",
  })
  .refine((value) => !value || Number(value) <= MAX_DROP_IN_AMOUNT, {
    message: "Enter an amount from 0 to 10,000,000.",
  })

const optionalVisitCountSchema = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || /^\d+$/.test(value), {
    message: "Enter a whole-number visit count.",
  })
  .refine(
    (value) =>
      !value || (Number(value) >= 1 && Number(value) <= MAX_VISIT_COUNT),
    {
      message: "Enter 1 to 100 visits.",
    }
  )

export const createDropInSchema = z.object({
  visitorName: optionalTextSchema,
  visitorContact: optionalTextSchema,
  amount: optionalAmountSchema,
  visitCount: optionalVisitCountSchema,
  notes: optionalTextSchema,
})

export type CreateDropInValues = z.infer<typeof createDropInSchema>

export function normalizeCreateDropInValues(values: CreateDropInValues) {
  return {
    visitorName: optionalText(values.visitorName),
    visitorContact: optionalText(values.visitorContact),
    amount: optionalAmount(values.amount),
    visitCount: optionalVisitCount(values.visitCount),
    notes: optionalText(values.notes),
  }
}

function optionalText(value: string | undefined) {
  const trimmed = value?.trim()

  return trimmed || undefined
}

function optionalAmount(value: string | undefined) {
  const trimmed = value?.trim()

  if (!trimmed) {
    return undefined
  }

  return Number(trimmed)
}

function optionalVisitCount(value: string | undefined) {
  const trimmed = value?.trim()

  if (!trimmed) {
    return 1
  }

  return Number(trimmed)
}
