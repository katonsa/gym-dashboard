import * as z from "zod"

export type MarkPaidActionResult = {
  success: boolean
  error?: string
}

export const markPaidSchema = z.object({
  paymentId: z.string().trim().min(1, "Choose a payment."),
})

export type MarkPaidValues = z.input<typeof markPaidSchema>
