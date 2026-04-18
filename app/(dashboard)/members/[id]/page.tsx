import Link from "next/link"
import type * as React from "react"

import { Button } from "@/components/ui/button"
import {
  getExpiringMemberships,
  getOverduePayments,
  type AttendanceRecord,
  type AttendanceSource,
  type BillingInterval,
  type Member,
  type MemberStatus,
  type MembershipPayment,
  type MembershipStatus,
  type PaymentStatus,
} from "@/lib/dashboard"
import {
  loadMemberDetailData,
  type MemberDetailMembership,
} from "@/lib/dashboard/loaders"
import { cn } from "@/lib/utils"
import { MemberPlanChangeForm } from "../member-plan-change-form"
import { MemberStatusAction } from "../member-status-action"

type MemberDetailPageProps = {
  params: Promise<{
    id: string
  }>
}

type BillingRisk = "clear" | "expiring" | "overdue"

const statusClasses: Record<MemberStatus, string> = {
  ACTIVE: "border-status/45 bg-status/12 text-status",
  INACTIVE: "border-chart-3/45 bg-chart-3/12 text-chart-3",
  SUSPENDED: "border-alert/45 bg-alert/12 text-alert",
}

const riskClasses: Record<BillingRisk, string> = {
  clear: "border-border bg-muted text-muted-foreground",
  expiring: "border-chart-3/45 bg-chart-3/12 text-chart-3",
  overdue: "border-alert/45 bg-alert/12 text-alert",
}

const membershipClasses: Record<MembershipStatus, string> = {
  ACTIVE: "border-status/45 bg-status/12 text-status",
  CANCELED: "border-muted-foreground/35 bg-muted text-muted-foreground",
  EXPIRED: "border-muted-foreground/35 bg-muted text-muted-foreground",
  PAST_DUE: "border-alert/45 bg-alert/12 text-alert",
}

const paymentClasses: Record<PaymentStatus, string> = {
  OVERDUE: "border-alert/45 bg-alert/12 text-alert",
  PAID: "border-status/45 bg-status/12 text-status",
  PENDING: "border-chart-3/45 bg-chart-3/12 text-chart-3",
  VOID: "border-muted-foreground/35 bg-muted text-muted-foreground",
}

export default async function MemberDetailPage({
  params,
}: MemberDetailPageProps) {
  const { id } = await params
  const data = await loadMemberDetailData(id)

  if (!data) {
    return (
      <div className="grid gap-4">
        <Button asChild variant="outline" size="lg" className="min-h-11 w-fit">
          <Link href="/members">Back to members</Link>
        </Button>
        <section className="rounded-lg border border-border bg-card p-5 text-card-foreground">
          <h1 className="text-xl font-semibold tracking-normal">
            Member not found
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This member does not exist or belongs to a different gym.
          </p>
        </section>
      </div>
    )
  }

  const { gym, member, planTiers, memberships, payments, attendance } = data
  const memberName = formatMemberName(member)
  const currentMembership = memberships.find(
    (membership) => membership.status === "ACTIVE"
  )
  const billingRisk = getBillingRisk(memberships, payments)

  return (
    <div className="grid gap-5 lg:gap-6">
      <div>
        <Button asChild variant="outline" size="lg" className="min-h-11">
          <Link href="/members">Back to members</Link>
        </Button>
      </div>

      <header className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary uppercase">
            Member profile
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-balance sm:text-3xl">
            {memberName}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <StatusBadge status={member.status} />
          <RiskBadge risk={billingRisk} />
          <MemberStatusAction
            memberId={member.id}
            memberName={memberName}
            status={member.status}
          />
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
        <InfoCard title="Contact">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailField label="Email" value={member.email ?? "Not provided"} />
            <DetailField label="Phone" value={member.phone ?? "Not provided"} />
            <DetailField
              label="Join date"
              value={formatDate(member.joinDate, gym.timezone)}
            />
            <DetailField
              label="Last attended"
              value={
                member.lastAttendedAt
                  ? formatDate(member.lastAttendedAt, gym.timezone)
                  : "No attendance recorded"
              }
            />
          </div>
          <div className="mt-4">
            <DetailField label="Notes" value={member.notes ?? "No notes"} />
          </div>
        </InfoCard>

        <InfoCard title="Current membership">
          {currentMembership ? (
            <CurrentMembershipSummary
              currencyCode={gym.currencyCode}
              membership={currentMembership}
              timeZone={gym.timezone}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No active membership
            </p>
          )}
        </InfoCard>
      </section>

      <MemberPlanChangeForm
        memberId={member.id}
        planTiers={planTiers}
        currentPlan={
          currentMembership
            ? {
                planName: currentMembership.planTier.name,
                billingInterval: currentMembership.billingInterval,
                priceAmount: currentMembership.priceAmount,
              }
            : null
        }
        currencyCode={gym.currencyCode}
        initialEffectiveDate={formatDateInput(new Date(), gym.timezone)}
      />

      <section className="grid gap-4 xl:grid-cols-2">
        <InfoCard title="Membership history">
          {memberships.length > 0 ? (
            <div className="grid gap-3">
              {memberships.map((membership) => (
                <MembershipHistoryItem
                  key={membership.id}
                  currencyCode={gym.currencyCode}
                  membership={membership}
                  timeZone={gym.timezone}
                />
              ))}
            </div>
          ) : (
            <EmptyText>No memberships on record.</EmptyText>
          )}
        </InfoCard>

        <InfoCard title="Payment history">
          {payments.length > 0 ? (
            <div className="grid gap-3">
              {payments.map((payment) => (
                <PaymentHistoryItem
                  key={payment.id}
                  currencyCode={gym.currencyCode}
                  payment={payment}
                  timeZone={gym.timezone}
                />
              ))}
            </div>
          ) : (
            <EmptyText>No payment records.</EmptyText>
          )}
        </InfoCard>
      </section>

      <InfoCard
        title={`Attendance log (${attendance.length})`}
        detail="Showing the 20 most recent entries."
      >
        {attendance.length > 0 ? (
          <div className="grid gap-2">
            {attendance.slice(0, 20).map((record) => (
              <AttendanceLogItem
                key={record.id}
                record={record}
                timeZone={gym.timezone}
              />
            ))}
          </div>
        ) : (
          <EmptyText>No attendance recorded.</EmptyText>
        )}
      </InfoCard>
    </div>
  )
}

function CurrentMembershipSummary({
  currencyCode,
  membership,
  timeZone,
}: {
  currencyCode: string
  membership: MemberDetailMembership
  timeZone: string
}) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-lg font-semibold">{membership.planTier.name}</p>
        <MembershipBadge status={membership.status} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <DetailField
          label="Interval"
          value={formatBillingInterval(membership.billingInterval)}
        />
        <DetailField
          label="Price"
          value={formatCurrency(membership.priceAmount, currencyCode)}
        />
        <DetailField
          label="Period ends"
          value={formatDate(membership.currentPeriodEndsAt, timeZone)}
        />
        <DetailField
          label="Next billing"
          value={formatDate(membership.nextBillingDate, timeZone)}
        />
      </div>
    </div>
  )
}

function MembershipHistoryItem({
  currencyCode,
  membership,
  timeZone,
}: {
  currencyCode: string
  membership: MemberDetailMembership
  timeZone: string
}) {
  return (
    <article className="rounded-lg border border-border bg-background p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium">{membership.planTier.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatBillingInterval(membership.billingInterval)} |{" "}
            {formatCurrency(membership.priceAmount, currencyCode)}
          </p>
        </div>
        <MembershipBadge status={membership.status} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {formatDate(membership.startedAt, timeZone)} to{" "}
        {formatDate(membership.currentPeriodEndsAt, timeZone)}
      </p>
    </article>
  )
}

function PaymentHistoryItem({
  currencyCode,
  payment,
  timeZone,
}: {
  currencyCode: string
  payment: MembershipPayment
  timeZone: string
}) {
  return (
    <article className="rounded-lg border border-border bg-background p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium">
            {formatCurrency(payment.amount, currencyCode)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Due {formatDate(payment.dueAt, timeZone)}
          </p>
        </div>
        <PaymentBadge status={payment.status} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Paid{" "}
        {payment.paidAt ? formatDate(payment.paidAt, timeZone) : "not recorded"}
      </p>
    </article>
  )
}

function AttendanceLogItem({
  record,
  timeZone,
}: {
  record: AttendanceRecord
  timeZone: string
}) {
  return (
    <article className="flex min-h-11 flex-col justify-center rounded-lg border border-border bg-background px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium">
        {formatDate(record.attendedAt, timeZone)}
      </p>
      <p className="text-xs text-muted-foreground">
        {formatAttendanceSource(record.source)}
      </p>
    </article>
  )
}

function InfoCard({
  title,
  detail,
  children,
}: {
  title: string
  detail?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 text-card-foreground sm:p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {detail ? (
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium break-words">{value}</p>
    </div>
  )
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}

function StatusBadge({ status }: { status: MemberStatus }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-lg border px-2 py-1 text-[0.7rem] font-medium uppercase",
        statusClasses[status]
      )}
    >
      {titleCase(status)}
    </span>
  )
}

function RiskBadge({ risk }: { risk: BillingRisk }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-lg border px-2 py-1 text-[0.7rem] font-medium uppercase",
        riskClasses[risk]
      )}
    >
      {risk === "clear" ? "No risk" : titleCase(risk)}
    </span>
  )
}

function MembershipBadge({ status }: { status: MembershipStatus }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-lg border px-2 py-1 text-[0.7rem] font-medium uppercase",
        membershipClasses[status]
      )}
    >
      {titleCase(status.replace("_", " "))}
    </span>
  )
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-lg border px-2 py-1 text-[0.7rem] font-medium uppercase",
        paymentClasses[status]
      )}
    >
      {titleCase(status)}
    </span>
  )
}

function getBillingRisk(
  memberships: MemberDetailMembership[],
  payments: MembershipPayment[]
): BillingRisk {
  if (getOverduePayments(payments).length > 0) {
    return "overdue"
  }

  if (getExpiringMemberships(memberships).length > 0) {
    return "expiring"
  }

  return "clear"
}

function formatMemberName(member: Pick<Member, "firstName" | "lastName">) {
  return `${member.firstName} ${member.lastName}`
}

function formatDate(date: string, timeZone: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone,
    year: "numeric",
  }).format(new Date(date))
}

function formatDateInput(date: Date, timeZone: string) {
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

function formatCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en", {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount)
}

function formatBillingInterval(interval: BillingInterval) {
  return titleCase(interval)
}

function formatAttendanceSource(source: AttendanceSource) {
  return titleCase(source.replace("_", " "))
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
