import { addBillingPeriod } from "@/lib/billing/periods"
import { toCsv } from "@/lib/reports/csv"
import { parseDateInput } from "../domain/date-input.ts"
import { getMemberDuplicateReasons } from "./duplicate-detection.ts"
import type {
  BillingInterval,
  MemberStatus,
  PlanTier,
} from "@/lib/domain/types"

export const memberImportFields = [
  "fullName",
  "firstName",
  "lastName",
  "email",
  "phone",
  "status",
  "joinDate",
  "plan",
  "billingInterval",
  "nextBillingDate",
  "notes",
  "lastAttendedDate",
] as const

export type MemberImportField = (typeof memberImportFields)[number]

export type MemberImportMapping = Partial<Record<MemberImportField, string>>

export type MemberImportMappedRow = {
  rowNumber: number
  values: Partial<Record<MemberImportField, string>>
}

export type MemberImportExistingMember = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  status: MemberStatus
}

export type MemberImportValidatedRow = {
  rowNumber: number
  values: Partial<Record<MemberImportField, string>>
  normalized: {
    firstName: string
    lastName: string
    email?: string
    phone?: string
    status: MemberStatus
    joinDate: string
    notes?: string
    lastAttendedDate?: string
    planTierId?: string
    planName?: string
    billingInterval?: BillingInterval
    nextBillingDate?: string
    membershipPriceAmount?: number
  }
  errors: string[]
  warnings: string[]
  duplicateMatches: Array<{
    id: string
    firstName: string
    lastName: string
    email?: string
    phone?: string
    status: MemberStatus
    reasons: ReturnType<typeof getMemberDuplicateReasons>
  }>
  defaultAction: "import" | "skip"
}

export const memberImportFieldLabels: Record<MemberImportField, string> = {
  fullName: "Full name",
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  phone: "Phone",
  status: "Status",
  joinDate: "Join date",
  plan: "Plan",
  billingInterval: "Billing interval",
  nextBillingDate: "Next billing date",
  notes: "Notes",
  lastAttendedDate: "Last attended date",
}

const headerAliases: Record<MemberImportField, string[]> = {
  fullName: ["name", "full name", "member name"],
  firstName: ["first name", "firstname", "given name"],
  lastName: ["last name", "lastname", "surname", "family name"],
  email: ["email", "email address", "e-mail"],
  phone: ["phone", "phone number", "mobile", "mobile number", "contact"],
  status: ["status", "member status"],
  joinDate: ["join date", "joined", "joined at", "start date", "member since"],
  plan: ["plan", "plan name", "membership plan", "tier"],
  billingInterval: ["billing", "billing interval", "interval", "frequency"],
  nextBillingDate: [
    "next billing",
    "next billing date",
    "next payment date",
    "renewal",
    "renewal date",
  ],
  notes: ["notes", "note", "comments", "comment"],
  lastAttendedDate: [
    "last attended",
    "last attended date",
    "last visit",
    "last attendance",
  ],
}

export function detectMemberImportMapping(headers: string[]) {
  const normalizedHeaders = headers.map((header) => ({
    header,
    normalized: normalizeHeader(header),
  }))
  const usedHeaders = new Set<string>()
  const mapping: MemberImportMapping = {}

  for (const field of memberImportFields) {
    const aliases = headerAliases[field].map(normalizeHeader)
    const match = normalizedHeaders.find(
      (candidate) =>
        !usedHeaders.has(candidate.header) &&
        aliases.includes(candidate.normalized)
    )

    if (match) {
      mapping[field] = match.header
      usedHeaders.add(match.header)
    }
  }

  return mapping
}

export function mapCsvObjectsToMemberImportRows(
  rows: Record<string, unknown>[],
  mapping: MemberImportMapping
): MemberImportMappedRow[] {
  return rows.map((row, index) => {
    const values: Partial<Record<MemberImportField, string>> = {}

    for (const field of memberImportFields) {
      const header = mapping[field]

      if (!header) {
        continue
      }

      const value = row[header]

      if (value !== null && value !== undefined) {
        values[field] = String(value)
      }
    }

    return {
      rowNumber: index + 2,
      values,
    }
  })
}

export function validateMemberImportRows({
  rows,
  planTiers,
  existingMembers,
  defaultJoinDate,
}: {
  rows: MemberImportMappedRow[]
  planTiers: PlanTier[]
  existingMembers: MemberImportExistingMember[]
  defaultJoinDate: string
}): MemberImportValidatedRow[] {
  const activePlanByNormalizedName = new Map(
    planTiers
      .filter((planTier) => planTier.isActive)
      .map((planTier) => [normalizeImportPlanName(planTier.name), planTier])
  )

  return rows.map((row) =>
    validateMemberImportRow({
      row,
      activePlanByNormalizedName,
      existingMembers,
      defaultJoinDate,
    })
  )
}

export function buildFailedMemberImportCsv(
  rows: Array<MemberImportValidatedRow & { finalAction?: "failed" | "skipped" }>
) {
  const headers = [
    "row_number",
    "error_reasons",
    ...memberImportFields.map((field) => fieldToCsvHeader(field)),
  ]
  const csvRows = rows.map((row) => [
    row.rowNumber,
    [...row.errors, ...row.warnings].join("; "),
    ...memberImportFields.map((field) => row.values[field] ?? ""),
  ])

  return toCsv(headers, csvRows)
}

function validateMemberImportRow({
  row,
  activePlanByNormalizedName,
  existingMembers,
  defaultJoinDate,
}: {
  row: MemberImportMappedRow
  activePlanByNormalizedName: Map<string, PlanTier>
  existingMembers: MemberImportExistingMember[]
  defaultJoinDate: string
}): MemberImportValidatedRow {
  const errors: string[] = []
  const warnings: string[] = []
  const firstAndLast = getImportedName(row.values)
  const joinDate = parseImportDate(row.values.joinDate) ?? defaultJoinDate
  const parsedJoinDate = parseDateInput(joinDate)
  const status = parseImportStatus(row.values.status)
  const email = clean(row.values.email)
  const phone = clean(row.values.phone)
  const notes = clean(row.values.notes)
  const lastAttendedDate = parseOptionalDate(
    row.values.lastAttendedDate,
    "Last attended date",
    errors
  )
  const billingInterval = parseImportBillingInterval(row.values.billingInterval)
  const nextBillingDate = parseOptionalDate(
    row.values.nextBillingDate,
    "Next billing date",
    errors
  )
  const planName = clean(row.values.plan)
  const planTier = planName
    ? activePlanByNormalizedName.get(normalizeImportPlanName(planName))
    : undefined

  if (!firstAndLast) {
    errors.push("Enter a full name or first and last name.")
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Enter a valid email address.")
  }

  if (email && email.length > 255) {
    errors.push("Email must be 255 characters or fewer.")
  }

  if (phone && phone.length > 50) {
    errors.push("Phone must be 50 characters or fewer.")
  }

  if (!status) {
    errors.push("Status must be active, inactive, or suspended.")
  }

  if (!parsedJoinDate) {
    errors.push("Join date must be a valid date.")
  }

  if (notes && notes.length > 1000) {
    errors.push("Notes must be 1000 characters or fewer.")
  }

  if (planName && !planTier) {
    warnings.push(
      `Plan "${planName}" does not match an active plan; member will import without a membership.`
    )
  }

  if (planTier && !billingInterval) {
    warnings.push(
      "Billing interval is missing or invalid; member will import without a membership."
    )
  }

  if (!planTier && billingInterval) {
    warnings.push(
      "Billing interval is mapped but no active plan is selected; member will import without a membership."
    )
  }

  const duplicateMatches = firstAndLast
    ? existingMembers
        .map((member) => {
          const reasons = getMemberDuplicateReasons(
            {
              firstName: firstAndLast.firstName,
              lastName: firstAndLast.lastName,
              email,
              phone,
            },
            member
          )

          if (reasons.length === 0) {
            return null
          }

          return {
            id: member.id,
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email ?? undefined,
            phone: member.phone ?? undefined,
            status: member.status,
            reasons,
          }
        })
        .filter((match): match is NonNullable<typeof match> => match !== null)
    : []

  const normalized = {
    firstName: firstAndLast?.firstName ?? "",
    lastName: firstAndLast?.lastName ?? "",
    email,
    phone,
    status: status ?? "ACTIVE",
    joinDate,
    notes,
    lastAttendedDate,
    planTierId: planTier && billingInterval ? planTier.id : undefined,
    planName: planTier && billingInterval ? planTier.name : undefined,
    billingInterval: planTier && billingInterval ? billingInterval : undefined,
    nextBillingDate:
      planTier && billingInterval
        ? (nextBillingDate ??
          addBillingPeriod(
            parsedJoinDate ?? new Date(joinDate),
            billingInterval
          )
            .toISOString()
            .slice(0, 10))
        : undefined,
    membershipPriceAmount:
      planTier && billingInterval
        ? billingInterval === "ANNUAL"
          ? planTier.annualPriceAmount
          : planTier.monthlyPriceAmount
        : undefined,
  }

  return {
    rowNumber: row.rowNumber,
    values: row.values,
    normalized,
    errors,
    warnings,
    duplicateMatches,
    defaultAction:
      errors.length === 0 && duplicateMatches.length === 0 ? "import" : "skip",
  }
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ")
}

function normalizeImportPlanName(value: string) {
  return value.trim().toLowerCase()
}

function clean(value: string | null | undefined) {
  const trimmed = value?.trim()

  return trimmed ? trimmed : undefined
}

function getImportedName(values: Partial<Record<MemberImportField, string>>) {
  const firstName = clean(values.firstName)
  const lastName = clean(values.lastName)

  if (firstName && lastName) {
    return { firstName, lastName }
  }

  const fullName = clean(values.fullName)

  if (!fullName) {
    return null
  }

  const parts = fullName.split(/\s+/).filter(Boolean)

  if (parts.length < 2) {
    return null
  }

  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  }
}

function parseImportStatus(
  value: string | null | undefined
): MemberStatus | null {
  const normalized = clean(value)
    ?.toUpperCase()
    .replace(/[\s-]+/g, "_")

  if (!normalized) {
    return "ACTIVE" satisfies MemberStatus
  }

  return ["ACTIVE", "INACTIVE", "SUSPENDED"].includes(normalized)
    ? (normalized as MemberStatus)
    : null
}

function parseImportBillingInterval(
  value: string | null | undefined
): BillingInterval | undefined {
  const normalized = clean(value)?.toUpperCase()

  if (!normalized) {
    return undefined
  }

  if (["MONTHLY", "MONTH", "M"].includes(normalized)) {
    return "MONTHLY" satisfies BillingInterval
  }

  if (["ANNUAL", "ANNUALLY", "YEARLY", "YEAR", "Y"].includes(normalized)) {
    return "ANNUAL" satisfies BillingInterval
  }

  return undefined
}

function parseOptionalDate(
  value: string | null | undefined,
  label: string,
  errors: string[]
) {
  const cleaned = clean(value)

  if (!cleaned) {
    return undefined
  }

  const parsed = parseImportDate(cleaned)

  if (!parsed) {
    errors.push(`${label} must be a valid date.`)
  }

  return parsed ?? undefined
}

function parseImportDate(value: string | null | undefined) {
  const cleaned = clean(value)

  if (!cleaned) {
    return null
  }

  if (parseDateInput(cleaned)) {
    return cleaned
  }

  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(cleaned)

  if (slashMatch) {
    const month = Number(slashMatch[1])
    const day = Number(slashMatch[2])
    const year = Number(slashMatch[3])
    const candidate = [
      String(year).padStart(4, "0"),
      String(month).padStart(2, "0"),
      String(day).padStart(2, "0"),
    ].join("-")

    return parseDateInput(candidate) ? candidate : null
  }

  const parsed = new Date(cleaned)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString().slice(0, 10)
}

function fieldToCsvHeader(field: MemberImportField) {
  return field.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)
}
