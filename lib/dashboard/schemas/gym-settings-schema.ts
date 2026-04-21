import * as z from "zod"

import {
  gymCurrencyValues,
  gymTimezoneValues,
} from "../gym-settings-options.ts"

export type UpdateGymSettingsActionResult = {
  success: boolean
  error?: string
}

const MAX_DROP_IN_AMOUNT = 10_000_000
const supportedTimezones: ReadonlySet<string> = new Set(gymTimezoneValues)
const supportedCurrencies: ReadonlySet<string> = new Set(gymCurrencyValues)

const wholeNumberString = z
  .string()
  .trim()
  .min(1, "Enter a default drop-in fee.")
  .regex(/^\d+$/, "Enter a whole-number amount.")
  .refine((value) => Number(value) <= MAX_DROP_IN_AMOUNT, {
    message: "Enter an amount from 0 to 10,000,000.",
  })

export const updateGymSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a gym name.")
    .max(100, "Gym name must be 100 characters or fewer."),
  timezone: z
    .string()
    .trim()
    .refine(
      (value) => supportedTimezones.has(value),
      "Choose a supported timezone."
    ),
  currencyCode: z
    .string()
    .trim()
    .toUpperCase()
    .refine(
      (value) => supportedCurrencies.has(value),
      "Choose a supported currency."
    ),
  defaultDropInFeeAmount: wholeNumberString,
})

export type UpdateGymSettingsValues = z.input<
  typeof updateGymSettingsSchema
>

export function normalizeGymSettingsValues(
  values: z.output<typeof updateGymSettingsSchema>
) {
  return {
    name: values.name,
    timezone: values.timezone,
    currencyCode: values.currencyCode,
    defaultDropInFeeAmount: Number(values.defaultDropInFeeAmount),
  }
}
