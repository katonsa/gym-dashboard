import * as z from "zod"

export type PlanTierActionResult = {
  success: boolean
  error?: string
}

const MAX_PLAN_AMOUNT = 10_000_000
const MAX_SORT_ORDER = 10_000

const wholeNumberString = (fieldName: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter a ${fieldName}.`)
    .regex(/^\d+$/, "Enter a whole-number amount.")
    .refine((value) => Number(value) <= MAX_PLAN_AMOUNT, {
      message: "Enter an amount from 0 to 10,000,000.",
    })

const sortOrderString = z
  .string()
  .trim()
  .min(1, "Enter a sort order.")
  .regex(/^\d+$/, "Enter a whole-number sort order.")
  .refine((value) => Number(value) <= MAX_SORT_ORDER, {
    message: "Enter a sort order from 0 to 10,000.",
  })

const planTierFields = {
  name: z
    .string()
    .trim()
    .min(1, "Enter a plan name.")
    .max(80, "Plan name must be 80 characters or fewer."),
  description: z
    .string()
    .trim()
    .max(240, "Description must be 240 characters or fewer.")
    .optional()
    .transform((value) => value || undefined),
  monthlyPriceAmount: wholeNumberString("monthly price"),
  annualPriceAmount: wholeNumberString("annual price"),
  sortOrder: sortOrderString,
  isActive: z.boolean(),
}

export const createPlanTierSchema = z.object(planTierFields)

export const updatePlanTierSchema = z.object({
  planTierId: z.string().trim().min(1, "Choose a plan."),
  ...planTierFields,
})

export const deactivatePlanTierSchema = z.object({
  planTierId: z.string().trim().min(1, "Choose a plan."),
})

export type CreatePlanTierValues = z.input<typeof createPlanTierSchema>
export type UpdatePlanTierValues = z.input<typeof updatePlanTierSchema>
export type DeactivatePlanTierValues = z.input<typeof deactivatePlanTierSchema>

export function normalizePlanTierValues(
  values: z.output<typeof createPlanTierSchema>
) {
  return {
    name: values.name,
    description: values.description ?? null,
    monthlyPriceAmount: Number(values.monthlyPriceAmount),
    annualPriceAmount: Number(values.annualPriceAmount),
    sortOrder: Number(values.sortOrder),
    isActive: values.isActive,
  }
}
