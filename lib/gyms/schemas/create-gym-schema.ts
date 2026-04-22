import * as z from "zod"

import {
  wholeNumberString,
  supportedCurrencies,
  supportedTimezones,
} from "@/lib/gyms/schemas/settings-schema"

export const createGymSchema = z.object({
  gymName: z
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

export type CreateGymValues = z.input<typeof createGymSchema>
