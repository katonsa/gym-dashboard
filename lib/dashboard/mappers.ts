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
} from "@/lib/dashboard/types"

export function mapGymProfile(gym: GymModel): GymProfile {
  return {
    id: gym.id,
    name: gym.name,
    timezone: gym.timezone,
    currencyCode: gym.currencyCode,
    defaultDropInFeeAmount: gym.defaultDropInFeeAmount,
  }
}

export function mapPlanTier(planTier: PlanTierModel): PlanTier {
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

export function mapMember(member: MemberModel): Member {
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

export function mapMembership(membership: MembershipModel): Membership {
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
  payment: MembershipPaymentModel
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
  attendanceRecord: AttendanceRecordModel
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

export function mapDropInVisit(dropInVisit: DropInVisitModel): DropInVisit {
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
