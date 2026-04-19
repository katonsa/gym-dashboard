import * as z from "zod"

export type VoidPaymentActionResult = {
  success: boolean
  error?: string
}

export const voidPaymentSchema = z.object({
  paymentId: z.string().trim().min(1, "Choose a payment."),
  reason: z
    .string()
    .trim()
    .max(500, "Reason must be 500 characters or fewer.")
    .optional(),
})

export type VoidPaymentValues = z.input<typeof voidPaymentSchema>
