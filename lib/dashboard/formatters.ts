import type {
  AttendanceSource,
  BillingInterval,
  MembershipStatus,
} from "@/lib/domain/types"
import { parseDateInput } from "@/lib/domain/date-input"

export function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/[_ ]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function formatDate(date: Date | string, timeZone?: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone,
    year: "numeric",
  }).format(new Date(date))
}

export function formatDashboardDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone,
  }).format(date)
}

export function formatDateInput(date: Date, timeZone?: string) {
  const dateParts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date)
  const partValue = (type: Intl.DateTimeFormatPartTypes) =>
    dateParts.find((part) => part.type === type)?.value ?? ""

  return `${partValue("year")}-${partValue("month")}-${partValue("day")}`
}

export function formatCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en", {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount)
}

export function formatMemberName(member: {
  firstName: string
  lastName: string
}) {
  return `${member.firstName} ${member.lastName}`
}

export function formatBillingInterval(interval: BillingInterval) {
  return titleCase(interval)
}

export function formatAttendanceSource(source: AttendanceSource) {
  return titleCase(source)
}

export function formatMembershipStatus(status: MembershipStatus) {
  return titleCase(status)
}

export function formatDateInputForDisplay(value: string) {
  const parsed = parseDateInput(value)

  if (!parsed) {
    return value || "the selected renewal date"
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(parsed)
}

export function formatPageRange(
  pageData: {
    page: number
    pageSize: number
    total: number
  },
  label: string,
  formatter?: Intl.NumberFormat
) {
  if (pageData.total === 0) {
    return undefined
  }

  const start = (pageData.page - 1) * pageData.pageSize + 1
  const end = Math.min(pageData.total, pageData.page * pageData.pageSize)
  const format = (value: number) =>
    formatter ? formatter.format(value) : `${value}`

  return `Showing ${format(start)}-${format(end)} of ${format(
    pageData.total
  )} ${label}.`
}
