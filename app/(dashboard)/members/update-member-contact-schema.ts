import * as z from "zod"

export type UpdateMemberContactActionResult = {
  success: boolean
  error?: string
}

const optionalNullableText = (maxLength: number, message: string) =>
  z
    .string()
    .trim()
    .max(maxLength, message)
    .optional()
    .transform((value) => value || null)

export const updateMemberContactSchema = z.object({
  memberId: z.string().trim().min(1, "Choose a member."),
  firstName: z
    .string()
    .trim()
    .min(1, "Enter a first name.")
    .max(100, "First name must be 100 characters or fewer."),
  lastName: z
    .string()
    .trim()
    .min(1, "Enter a last name.")
    .max(100, "Last name must be 100 characters or fewer."),
  email: z
    .string()
    .trim()
    .max(255, "Email must be 255 characters or fewer.")
    .optional()
    .transform((value) => value || null)
    .pipe(z.string().email("Enter a valid email address.").nullable()),
  phone: optionalNullableText(50, "Phone must be 50 characters or fewer."),
  notes: optionalNullableText(1000, "Notes must be 1000 characters or fewer."),
})

export type UpdateMemberContactValues = z.input<
  typeof updateMemberContactSchema
>
