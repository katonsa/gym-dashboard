import type { Metadata } from "next"
import Link from "next/link"

import { RiskBadge, StatusBadge } from "@/components/dashboard/badges"
import { EmptyText, InfoCard } from "@/components/dashboard/info-card"
import { Button } from "@/components/ui/button"
import { PaginationNav } from "@/components/ui/pagination-nav"
import {
  formatDate,
  formatDateInput,
  formatMemberName,
  formatPageRange,
  getCurrentDisplayMembership,
  getMembershipDisplayStatus,
  parsePaginationParams,
} from "@/lib/dashboard"
import { getGymLocalDayBoundary } from "@/lib/dashboard/date-boundaries"
import {
  loadMemberAttendancePage,
  loadMemberDetailData,
  loadMemberPaymentsPage,
  type MemberDetailMembership,
} from "@/lib/dashboard/loaders"
import type { BillingRisk } from "@/lib/dashboard/status-styles"
import { AttendanceLogItem } from "../attendance-log-item"
import { CurrentMembershipSummary } from "../current-membership-summary"
import { MemberCheckInForm } from "../member-checkin-form"
import { MemberContactCard } from "../member-contact-card"
import { MemberPlanChangeForm } from "../member-plan-change-form"
import { MembershipHistoryItem } from "../membership-history-item"
import { PaymentHistoryItem } from "../payment-history-item"
import { MemberStatusAction } from "../member-status-action"

type MemberDetailPageProps = {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    pp?: string | string[]
    ap?: string | string[]
  }>
}

export async function generateMetadata({
  params,
}: Pick<MemberDetailPageProps, "params">): Promise<Metadata> {
  const { id } = await params
  const data = await loadMemberDetailData(id)

  if (!data) {
    return {
      title: "Member Not Found",
    }
  }

  return {
    title: formatMemberName(data.member),
  }
}

export default async function MemberDetailPage({
  params,
  searchParams,
}: MemberDetailPageProps) {
  const { id } = await params
  const resolvedSearchParams = await searchParams
  const [paymentsPagination, attendancePagination] = await Promise.all([
    parsePaginationParams(resolvedSearchParams, {
      pageParam: "pp",
    }),
    parsePaginationParams(resolvedSearchParams, {
      pageParam: "ap",
      pageSize: 20,
    }),
  ])
  const [data, paymentsPage, attendancePage] = await Promise.all([
    loadMemberDetailData(id),
    loadMemberPaymentsPage(id, paymentsPagination),
    loadMemberAttendancePage(id, attendancePagination),
  ])

  if (!data || !paymentsPage || !attendancePage) {
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

  const { gym, member, planTiers, memberships, hasOverduePayments } = data
  const memberName = formatMemberName(member)
  const membershipAsOf = getGymLocalDayBoundary(new Date(), gym.timezone)
  const currentMembership = getCurrentDisplayMembership(memberships)
  const billingRisk = getBillingRisk(
    currentMembership,
    hasOverduePayments,
    membershipAsOf
  )
  const preservedPaginationParams =
    getPreservedPaginationParams(resolvedSearchParams)

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
        <MemberContactCard
          member={{
            id: member.id,
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
            phone: member.phone,
            notes: member.notes,
          }}
          joinDateLabel={formatDate(member.joinDate, gym.timezone)}
          lastAttendedLabel={
            member.lastAttendedAt
              ? formatDate(member.lastAttendedAt, gym.timezone)
              : "No attendance recorded"
          }
        />

        <InfoCard id="current-membership" title="Current membership">
          {currentMembership ? (
            <CurrentMembershipSummary
              currencyCode={gym.currencyCode}
              membership={currentMembership}
              asOf={membershipAsOf}
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

        <InfoCard
          id="payments"
          title="Payment history"
          detail={formatPageRange(paymentsPage, "payments")}
        >
          {paymentsPage.rows.length > 0 ? (
            <div className="grid gap-3">
              {paymentsPage.rows.map((payment) => (
                <PaymentHistoryItem
                  key={payment.id}
                  currencyCode={gym.currencyCode}
                  payment={payment}
                  timeZone={gym.timezone}
                />
              ))}
              <PaginationNav
                page={paymentsPage.page}
                pageCount={paymentsPage.pageCount}
                basePath={`/members/${member.id}`}
                pageParam="pp"
                preservedSearchParams={preservedPaginationParams}
              />
            </div>
          ) : (
            <EmptyText>No payment records.</EmptyText>
          )}
        </InfoCard>
      </section>

      <InfoCard
        title={`Attendance log (${attendancePage.total})`}
        detail={formatPageRange(attendancePage, "attendance entries")}
        action={
          <MemberCheckInForm
            memberId={member.id}
            initialDate={formatDateInput(new Date(), gym.timezone)}
          />
        }
      >
        {attendancePage.rows.length > 0 ? (
          <div className="grid gap-2">
            {attendancePage.rows.map((record) => (
              <AttendanceLogItem
                key={record.id}
                record={record}
                timeZone={gym.timezone}
              />
            ))}
            <PaginationNav
              page={attendancePage.page}
              pageCount={attendancePage.pageCount}
              basePath={`/members/${member.id}`}
              pageParam="ap"
              preservedSearchParams={preservedPaginationParams}
            />
          </div>
        ) : (
          <EmptyText>No attendance recorded.</EmptyText>
        )}
      </InfoCard>
    </div>
  )
}

function getBillingRisk(
  membership: MemberDetailMembership | undefined,
  hasOverduePayments: boolean,
  asOf: Date
): BillingRisk {
  if (hasOverduePayments) {
    return "overdue"
  }

  if (!membership) {
    return "clear"
  }

  const displayStatus = getMembershipDisplayStatus(membership, asOf)

  if (displayStatus === "expired") {
    return "expired"
  }

  if (displayStatus === "expiring") {
    return "expiring"
  }

  return "clear"
}

function getPreservedPaginationParams(searchParams: {
  pp?: string | string[]
  ap?: string | string[]
}) {
  return {
    ap: searchParams.ap,
    pp: searchParams.pp,
  }
}
