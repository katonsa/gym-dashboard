import * as z from "zod"

import {
  MAX_DROP_IN_AMOUNT,
  wholeNumberString,
  supportedCurrencies,
  supportedTimezones,
} from "@/lib/dashboard/schemas/gym-settings-schema"

export const setupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(100, "Name must be 100 characters or fewer."),
  email: z
    .string()
    .trim()
    .min(1, "Enter your email.")
    .email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be 128 characters or fewer."),
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

export type SetupValues = z.input<typeof setupSchema>
