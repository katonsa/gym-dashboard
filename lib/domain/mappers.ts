import type { AttendanceRecordModel } from "@/lib/generated/prisma/models/AttendanceRecord"
import type { DropInVisitModel } from "@/lib/generated/prisma/models/DropInVisit"
import type { GymModel } from "@/lib/generated/prisma/models/Gym"
import type { MemberModel } from "@/lib/generated/prisma/models/Member"
import type { MembershipModel } from "@/lib/generated/prisma/models/Membership"
import type { MembershipPaymentModel } from "@/lib/generated/prisma/models/MembershipPayment"
import type { PlanTierModel } from "@/lib/generated/prisma/models/PlanTier"
import type {
  AttendanceRecord,
  DropInVisit,
  GymProfile,
  Member,
  Membership,
  MembershipPayment,
  PlanTier,
} from "@/lib/domain/types"

type GymProfileRow = Pick<
  GymModel,
  "id" | "name" | "timezone" | "currencyCode" | "defaultDropInFeeAmount"
>

type PlanTierRow = Pick<
  PlanTierModel,
  | "id"
  | "gymId"
  | "name"
  | "description"
  | "monthlyPriceAmount"
  | "annualPriceAmount"
  | "isActive"
  | "sortOrder"
>

type MemberRow = Pick<
  MemberModel,
  | "id"
  | "gymId"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "status"
  | "joinDate"
  | "lastAttendedAt"
  | "notes"
>

type MembershipRow = Pick<
  MembershipModel,
  | "id"
  | "memberId"
  | "planTierId"
  | "billingInterval"
  | "status"
  | "priceAmount"
  | "startedAt"
  | "currentPeriodEndsAt"
  | "nextBillingDate"
  | "canceledAt"
>

type MembershipPaymentRow = Pick<
  MembershipPaymentModel,
  | "id"
  | "gymId"
  | "memberId"
  | "membershipId"
  | "amount"
  | "status"
  | "dueAt"
  | "paidAt"
  | "notes"
>

type AttendanceRecordRow = Pick<
  AttendanceRecordModel,
  "id" | "gymId" | "memberId" | "attendedAt" | "source" | "notes"
>

type DropInVisitRow = Pick<
  DropInVisitModel,
  | "id"
  | "gymId"
  | "visitorName"
  | "visitorContact"
  | "visitCount"
  | "amount"
  | "visitedAt"
  | "notes"
>

export function mapGymProfile(gym: GymProfileRow): GymProfile {
  return {
    id: gym.id,
    name: gym.name,
    timezone: gym.timezone,
    currencyCode: gym.currencyCode,
    defaultDropInFeeAmount: gym.defaultDropInFeeAmount,
  }
}

export function mapPlanTier(planTier: PlanTierRow): PlanTier {
  return {
    id: planTier.id,
    gymId: planTier.gymId,
    name: planTier.name,
    description: optionalString(planTier.description),
    monthlyPriceAmount: planTier.monthlyPriceAmount,
    annualPriceAmount: planTier.annualPriceAmount,
    isActive: planTier.isActive,
    sortOrder: planTier.sortOrder,
  }
}

export function mapMember(member: MemberRow): Member {
  return {
    id: member.id,
    gymId: member.gymId,
    firstName: member.firstName,
    lastName: member.lastName,
    email: optionalString(member.email),
    phone: optionalString(member.phone),
    status: member.status,
    joinDate: toDateString(member.joinDate),
    lastAttendedAt: optionalDateString(member.lastAttendedAt),
    notes: optionalString(member.notes),
  }
}

export function mapMembership(membership: MembershipRow): Membership {
  return {
    id: membership.id,
    memberId: membership.memberId,
    planTierId: membership.planTierId,
    billingInterval: membership.billingInterval,
    status: membership.status,
    priceAmount: membership.priceAmount,
    startedAt: toDateString(membership.startedAt),
    currentPeriodEndsAt: toDateString(membership.currentPeriodEndsAt),
    nextBillingDate: toDateString(membership.nextBillingDate),
    canceledAt: optionalDateString(membership.canceledAt),
  }
}

export function mapMembershipPayment(
  payment: MembershipPaymentRow
): MembershipPayment {
  return {
    id: payment.id,
    gymId: payment.gymId,
    memberId: payment.memberId,
    membershipId: payment.membershipId,
    amount: payment.amount,
    status: payment.status,
    dueAt: toDateString(payment.dueAt),
    paidAt: optionalDateString(payment.paidAt),
    notes: optionalString(payment.notes),
  }
}

export function mapAttendanceRecord(
  attendanceRecord: AttendanceRecordRow
): AttendanceRecord {
  return {
    id: attendanceRecord.id,
    gymId: attendanceRecord.gymId,
    memberId: attendanceRecord.memberId,
    attendedAt: toDateString(attendanceRecord.attendedAt),
    source: attendanceRecord.source,
    notes: optionalString(attendanceRecord.notes),
  }
}

export function mapDropInVisit(dropInVisit: DropInVisitRow): DropInVisit {
  return {
    id: dropInVisit.id,
    gymId: dropInVisit.gymId,
    visitorName: optionalString(dropInVisit.visitorName),
    visitorContact: optionalString(dropInVisit.visitorContact),
    visitCount: dropInVisit.visitCount,
    amount: dropInVisit.amount,
    visitedAt: toDateString(dropInVisit.visitedAt),
    notes: optionalString(dropInVisit.notes),
  }
}

function toDateString(value: Date) {
  return value.toISOString()
}

function optionalDateString(value: Date | null) {
  return value ? toDateString(value) : undefined
}

function optionalString(value: string | null) {
  return value ?? undefined
}
