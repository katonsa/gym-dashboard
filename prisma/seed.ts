import "dotenv/config"
import { PrismaClient } from "../lib/generated/prisma/client.js"
import { PrismaPg } from "@prisma/adapter-pg"
import { auth } from "../lib/auth/index.js"

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEMO_OWNER_EMAIL = "owner@jkt-strength.local"
const DEMO_OWNER_PASSWORD = "owner-password-123"
const DEMO_OWNER_NAME = "Demo Owner"

const DROP_IN_FEE_AMOUNT = 75_000

function normalizePlanTierName(name: string) {
  return name.trim().toLowerCase()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type BillingInterval = "MONTHLY" | "ANNUAL"
type MemberStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED"
type MembershipStatus = "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED"
type PaymentStatus = "PENDING" | "PAID" | "OVERDUE" | "VOID"

type SeedMemberKey =
  | "ari"
  | "sinta"
  | "bayu"
  | "dewi"
  | "maya"
  | "lina"
  | "nadia"
  | "raka"
  | "edo"
  | "made"
  | "yusuf"
  | "putu"
  | "citra"
  | "bagus"
  | "fitri"
  | "hana"
  | "tono"

type SeedPlan = {
  id: string
  monthlyPriceAmount: number
  annualPriceAmount: number
}

type SeedMember = {
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  status: MemberStatus
  joinDate: Date
  lastAttendedAt?: Date | null
  notes?: string | null
}

function daysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

function daysFromNow(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

function hoursAgo(hours: number): Date {
  const date = new Date()
  date.setHours(date.getHours() - hours)
  return date
}

function monthsAgo(months: number): Date {
  const date = new Date()
  date.setMonth(date.getMonth() - months)
  return date
}

function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 0)
  return d
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(8, 0, 0, 0)
  return d
}

function paymentDate(monthsBack: number): Date {
  const date = monthsAgo(monthsBack)
  date.setDate(5)
  date.setHours(9, 0, 0, 0)
  return date
}

function membershipPrice(plan: SeedPlan, interval: BillingInterval) {
  return interval === "ANNUAL"
    ? plan.annualPriceAmount
    : plan.monthlyPriceAmount
}

// ---------------------------------------------------------------------------
// Prisma client (standalone, not the Next.js singleton)
// ---------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error("DATABASE_URL is not set.")
  process.exit(1)
}

const adapter = new PrismaPg({ connectionString })
const db = new PrismaClient({ adapter })

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding database...\n")

  // ---- Idempotency check --------------------------------------------------
  const existingGym = await db.gym.findFirst()
  if (existingGym) {
    console.log(
      `Database already has a gym ("${existingGym.name}"). Skipping seed.\n` +
        "   To re-seed, run: npx prisma migrate reset"
    )
    return
  }

  // ---- 1. Create demo owner via Better Auth --------------------------------
  console.log("  Creating demo owner account...")

  let userId: string

  try {
    const result = await auth.api.signUpEmail({
      body: {
        email: DEMO_OWNER_EMAIL,
        password: DEMO_OWNER_PASSWORD,
        name: DEMO_OWNER_NAME,
      },
    })

    userId = result.user.id
    console.log(`  - Owner created: ${DEMO_OWNER_EMAIL}`)
  } catch (error: unknown) {
    // If the user already exists from a partial previous seed, look them up.
    const existing = await db.user.findUnique({
      where: { email: DEMO_OWNER_EMAIL },
    })

    if (existing) {
      userId = existing.id
      console.log(`  - Owner already exists: ${DEMO_OWNER_EMAIL}`)
    } else {
      throw error
    }
  }

  // ---- 2. Create gym -------------------------------------------------------
  console.log("  Creating gym...")

  const gym = await db.gym.create({
    data: {
      name: "JKT Strength House",
      timezone: "Asia/Jakarta",
      currencyCode: "IDR",
      defaultDropInFeeAmount: DROP_IN_FEE_AMOUNT,
      ownerId: userId,
    },
  })

  console.log(`  - Gym created: ${gym.name}`)

  // ---- 3. Create plan tiers ------------------------------------------------
  console.log("  Creating plan tiers...")

  const [basic, pro, elite] = await Promise.all([
    db.planTier.create({
      data: {
        gymId: gym.id,
        name: "Basic",
        normalizedName: normalizePlanTierName("Basic"),
        description: "Open gym access for independent training.",
        monthlyPriceAmount: 350_000,
        annualPriceAmount: 3_500_000,
        isActive: true,
        sortOrder: 1,
      },
    }),
    db.planTier.create({
      data: {
        gymId: gym.id,
        name: "Pro",
        normalizedName: normalizePlanTierName("Pro"),
        description: "Open gym plus weekly group programming.",
        monthlyPriceAmount: 650_000,
        annualPriceAmount: 6_500_000,
        isActive: true,
        sortOrder: 2,
      },
    }),
    db.planTier.create({
      data: {
        gymId: gym.id,
        name: "Elite",
        normalizedName: normalizePlanTierName("Elite"),
        description: "Unlimited access with monthly performance review.",
        monthlyPriceAmount: 950_000,
        annualPriceAmount: 9_500_000,
        isActive: true,
        sortOrder: 3,
      },
    }),
  ])
  const plansByName = { Basic: basic, Pro: pro, Elite: elite }

  console.log(`  - Plan tiers: ${basic.name}, ${pro.name}, ${elite.name}`)

  // ---- 4. Create members ---------------------------------------------------
  console.log("  Creating members...")

  const memberScenarios: Record<SeedMemberKey, SeedMember> = {
    ari: {
      firstName: "Ari",
      lastName: "Pratama",
      email: "ari.pratama@example.com",
      phone: "+628111110001",
      status: "ACTIVE",
      joinDate: daysAgo(165),
      lastAttendedAt: hoursAgo(20),
      notes: "Baseline active Basic monthly member.",
    },
    sinta: {
      firstName: "Sinta",
      lastName: "Mahendra",
      email: "sinta.mahendra@example.com",
      phone: "+628111110002",
      status: "ACTIVE",
      joinDate: daysAgo(12),
      lastAttendedAt: hoursAgo(44),
      notes: "New sign-up this month.",
    },
    bayu: {
      firstName: "Bayu",
      lastName: "Santoso",
      email: "bayu.santoso@example.com",
      phone: "+628111110003",
      status: "ACTIVE",
      joinDate: daysAgo(270),
      lastAttendedAt: daysAgo(21),
    },
    dewi: {
      firstName: "Dewi",
      lastName: "Lestari",
      email: "dewi.lestari@example.com",
      phone: "+628111110004",
      status: "ACTIVE",
      joinDate: daysAgo(365),
      lastAttendedAt: daysAgo(6),
      notes: "Annual Elite renewal due soon.",
    },
    maya: {
      firstName: "Maya",
      lastName: "Putri",
      email: "maya.putri@example.com",
      phone: "+628111110006",
      status: "ACTIVE",
      joinDate: daysAgo(125),
      lastAttendedAt: daysAgo(8),
      notes: "Past-due membership with overdue payment.",
    },
    lina: {
      firstName: "Lina",
      lastName: "Kusuma",
      email: "lina.kusuma@example.com",
      phone: "+628111110009",
      status: "ACTIVE",
      joinDate: daysAgo(96),
      lastAttendedAt: hoursAgo(18),
      notes: "Monthly membership expires this week.",
    },
    nadia: {
      firstName: "Nadia",
      lastName: "Halim",
      email: "nadia.halim@example.com",
      phone: "+628111110007",
      status: "SUSPENDED",
      joinDate: daysAgo(345),
      lastAttendedAt: daysAgo(47),
      notes: "Suspended pending billing review.",
    },
    raka: {
      firstName: "Raka",
      lastName: "Wijaya",
      email: "raka.wijaya@example.com",
      phone: "+628111110005",
      status: "INACTIVE",
      joinDate: daysAgo(260),
      lastAttendedAt: daysAgo(57),
      notes: "Inactive member with expired membership.",
    },
    edo: {
      firstName: "Edo",
      lastName: "Saputra",
      email: "edo.saputra@example.com",
      phone: "+628111110008",
      status: "INACTIVE",
      joinDate: daysAgo(555),
      lastAttendedAt: daysAgo(77),
      notes: "Inactive member with canceled history.",
    },
    made: {
      firstName: "Made",
      lastName: "Suryani",
      email: "made.suryani@example.com",
      phone: "+628111110010",
      status: "ACTIVE",
      joinDate: daysAgo(430),
      lastAttendedAt: daysAgo(12),
      notes: "Persisted expired membership for the Renew flow.",
    },
    yusuf: {
      firstName: "Yusuf",
      lastName: "Ramadhan",
      email: "yusuf.ramadhan@example.com",
      phone: "+628111110011",
      status: "ACTIVE",
      joinDate: daysAgo(210),
      lastAttendedAt: daysAgo(11),
      notes: "Active membership whose period already ended.",
    },
    putu: {
      firstName: "Putu",
      lastName: "Aditya",
      email: "putu.aditya@example.com",
      phone: "+628111110012",
      status: "ACTIVE",
      joinDate: daysAgo(3),
      lastAttendedAt: null,
      notes: "No plan yet; use to test plan assignment.",
    },
    citra: {
      firstName: "Citra",
      lastName: "Ningrum",
      email: null,
      phone: null,
      status: "ACTIVE",
      joinDate: daysAgo(44),
      lastAttendedAt: daysAgo(2),
      notes: null,
    },
    bagus: {
      firstName: "Bagus",
      lastName: "Wibowo",
      email: "bagus.wibowo@example.com",
      phone: "+628111110014",
      status: "ACTIVE",
      joinDate: daysAgo(620),
      lastAttendedAt: daysAgo(1),
      notes: "Multiple membership history rows for plan-change review.",
    },
    fitri: {
      firstName: "Fitri",
      lastName: "Handayani",
      email: "fitri.handayani@example.com",
      phone: "+628111110015",
      status: "ACTIVE",
      joinDate: monthsAgo(32),
      lastAttendedAt: daysAgo(4),
      notes: "Long payment history for pagination testing.",
    },
    hana: {
      firstName: "Hana",
      lastName: "Permata",
      email: "hana.permata@example.com",
      phone: "+628111110016",
      status: "ACTIVE",
      joinDate: daysAgo(190),
      lastAttendedAt: hoursAgo(6),
      notes: "Long attendance history for pagination testing.",
    },
    tono: {
      firstName: "Tono",
      lastName: "Irawan",
      email: "tono.irawan@example.com",
      phone: "+628111110017",
      status: "INACTIVE",
      joinDate: daysAgo(85),
      lastAttendedAt: null,
      notes: "Inactive member with no attendance recorded.",
    },
  }

  const membersByKey = {} as Record<
    SeedMemberKey,
    Awaited<ReturnType<typeof db.member.create>>
  >

  for (const [key, member] of Object.entries(memberScenarios) as Array<
    [SeedMemberKey, SeedMember]
  >) {
    membersByKey[key] = await db.member.create({
      data: {
        gymId: gym.id,
        ...member,
      },
    })
  }

  const rosterMembers = await db.member.createMany({
    data: Array.from({ length: 18 }, (_, index) => {
      const number = index + 1
      const isInactive = number % 9 === 0
      const isSuspended = number % 13 === 0

      return {
        gymId: gym.id,
        firstName: [
          "Agus",
          "Bima",
          "Clara",
          "Dimas",
          "Eka",
          "Farah",
          "Gilang",
          "Intan",
          "Joko",
          "Kartika",
          "Leo",
          "Mira",
          "Niko",
          "Oki",
          "Priska",
          "Qori",
          "Rendi",
          "Sarah",
        ][index],
        lastName: `Roster ${String(number).padStart(2, "0")}`,
        email: `roster-${String(number).padStart(2, "0")}@example.com`,
        phone: `+62813333${String(number).padStart(4, "0")}`,
        status: isSuspended
          ? ("SUSPENDED" as const)
          : isInactive
            ? ("INACTIVE" as const)
            : ("ACTIVE" as const),
        joinDate: daysAgo(30 + number * 5),
        lastAttendedAt: isInactive
          ? daysAgo(45 + number)
          : daysAgo(number % 20),
        notes: "Additional roster member for pagination and filtering.",
      }
    }),
  })

  const allMembers = await db.member.findMany({
    where: { gymId: gym.id },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  })

  console.log(`  - Members: ${allMembers.length}`)

  // ---- 5. Create memberships -----------------------------------------------
  console.log("  Creating memberships...")

  async function createMembership({
    memberId,
    plan,
    interval,
    status = "ACTIVE",
    startedAt,
    currentPeriodEndsAt,
    nextBillingDate,
    canceledAt,
  }: {
    memberId: string
    plan: SeedPlan
    interval: BillingInterval
    status?: MembershipStatus
    startedAt: Date
    currentPeriodEndsAt: Date
    nextBillingDate?: Date
    canceledAt?: Date
  }) {
    return db.membership.create({
      data: {
        memberId,
        planTierId: plan.id,
        billingInterval: interval,
        status,
        priceAmount: membershipPrice(plan, interval),
        startedAt,
        currentPeriodEndsAt,
        nextBillingDate: nextBillingDate ?? startOfDay(currentPeriodEndsAt),
        canceledAt,
      },
    })
  }

  const msAri = await createMembership({
    memberId: membersByKey.ari.id,
    plan: basic,
    interval: "MONTHLY",
    startedAt: membersByKey.ari.joinDate,
    currentPeriodEndsAt: endOfDay(daysFromNow(17)),
    nextBillingDate: startOfDay(daysFromNow(18)),
  })
  const msSinta = await createMembership({
    memberId: membersByKey.sinta.id,
    plan: pro,
    interval: "MONTHLY",
    startedAt: membersByKey.sinta.joinDate,
    currentPeriodEndsAt: endOfDay(daysFromNow(18)),
    nextBillingDate: startOfDay(daysFromNow(19)),
  })
  const msBayu = await createMembership({
    memberId: membersByKey.bayu.id,
    plan: pro,
    interval: "ANNUAL",
    startedAt: membersByKey.bayu.joinDate,
    currentPeriodEndsAt: endOfDay(daysFromNow(95)),
    nextBillingDate: startOfDay(daysFromNow(96)),
  })
  const msDewi = await createMembership({
    memberId: membersByKey.dewi.id,
    plan: elite,
    interval: "ANNUAL",
    startedAt: membersByKey.dewi.joinDate,
    currentPeriodEndsAt: endOfDay(daysFromNow(21)),
    nextBillingDate: startOfDay(daysFromNow(22)),
  })
  const msMaya = await createMembership({
    memberId: membersByKey.maya.id,
    plan: elite,
    interval: "MONTHLY",
    status: "PAST_DUE",
    startedAt: membersByKey.maya.joinDate,
    currentPeriodEndsAt: endOfDay(daysAgo(4)),
    nextBillingDate: startOfDay(daysAgo(3)),
  })
  const msNadia = await createMembership({
    memberId: membersByKey.nadia.id,
    plan: pro,
    interval: "MONTHLY",
    status: "PAST_DUE",
    startedAt: membersByKey.nadia.joinDate,
    currentPeriodEndsAt: endOfDay(daysAgo(9)),
    nextBillingDate: startOfDay(daysAgo(8)),
  })
  const msRaka = await createMembership({
    memberId: membersByKey.raka.id,
    plan: basic,
    interval: "MONTHLY",
    status: "EXPIRED",
    startedAt: membersByKey.raka.joinDate,
    currentPeriodEndsAt: endOfDay(daysAgo(45)),
    nextBillingDate: startOfDay(daysAgo(44)),
    canceledAt: daysAgo(44),
  })
  const msEdo = await createMembership({
    memberId: membersByKey.edo.id,
    plan: basic,
    interval: "MONTHLY",
    status: "CANCELED",
    startedAt: membersByKey.edo.joinDate,
    currentPeriodEndsAt: endOfDay(daysAgo(66)),
    nextBillingDate: startOfDay(daysAgo(65)),
    canceledAt: daysAgo(65),
  })
  const msLina = await createMembership({
    memberId: membersByKey.lina.id,
    plan: basic,
    interval: "MONTHLY",
    startedAt: membersByKey.lina.joinDate,
    currentPeriodEndsAt: endOfDay(daysFromNow(4)),
    nextBillingDate: startOfDay(daysFromNow(5)),
  })
  const msMade = await createMembership({
    memberId: membersByKey.made.id,
    plan: pro,
    interval: "MONTHLY",
    status: "EXPIRED",
    startedAt: membersByKey.made.joinDate,
    currentPeriodEndsAt: endOfDay(daysAgo(17)),
    nextBillingDate: startOfDay(daysAgo(16)),
    canceledAt: daysAgo(16),
  })
  const msYusuf = await createMembership({
    memberId: membersByKey.yusuf.id,
    plan: elite,
    interval: "MONTHLY",
    startedAt: membersByKey.yusuf.joinDate,
    currentPeriodEndsAt: endOfDay(daysAgo(5)),
    nextBillingDate: startOfDay(daysAgo(4)),
  })
  const msCitra = await createMembership({
    memberId: membersByKey.citra.id,
    plan: basic,
    interval: "MONTHLY",
    startedAt: membersByKey.citra.joinDate,
    currentPeriodEndsAt: endOfDay(daysFromNow(12)),
    nextBillingDate: startOfDay(daysFromNow(13)),
  })
  const msBagusOld = await createMembership({
    memberId: membersByKey.bagus.id,
    plan: basic,
    interval: "MONTHLY",
    status: "EXPIRED",
    startedAt: daysAgo(620),
    currentPeriodEndsAt: endOfDay(daysAgo(400)),
    nextBillingDate: startOfDay(daysAgo(399)),
    canceledAt: daysAgo(399),
  })
  const msBagusMiddle = await createMembership({
    memberId: membersByKey.bagus.id,
    plan: pro,
    interval: "MONTHLY",
    status: "EXPIRED",
    startedAt: daysAgo(399),
    currentPeriodEndsAt: endOfDay(daysAgo(110)),
    nextBillingDate: startOfDay(daysAgo(109)),
    canceledAt: daysAgo(109),
  })
  const msBagusCurrent = await createMembership({
    memberId: membersByKey.bagus.id,
    plan: elite,
    interval: "ANNUAL",
    startedAt: daysAgo(109),
    currentPeriodEndsAt: endOfDay(daysFromNow(256)),
    nextBillingDate: startOfDay(daysFromNow(257)),
  })
  const msFitri = await createMembership({
    memberId: membersByKey.fitri.id,
    plan: pro,
    interval: "MONTHLY",
    startedAt: membersByKey.fitri.joinDate,
    currentPeriodEndsAt: endOfDay(daysFromNow(24)),
    nextBillingDate: startOfDay(daysFromNow(25)),
  })
  const msHana = await createMembership({
    memberId: membersByKey.hana.id,
    plan: basic,
    interval: "MONTHLY",
    startedAt: membersByKey.hana.joinDate,
    currentPeriodEndsAt: endOfDay(daysFromNow(10)),
    nextBillingDate: startOfDay(daysFromNow(11)),
  })
  const msTono = await createMembership({
    memberId: membersByKey.tono.id,
    plan: basic,
    interval: "MONTHLY",
    status: "CANCELED",
    startedAt: membersByKey.tono.joinDate,
    currentPeriodEndsAt: endOfDay(daysAgo(34)),
    nextBillingDate: startOfDay(daysAgo(33)),
    canceledAt: daysAgo(33),
  })

  const rosterMemberRows = allMembers.filter((member) =>
    member.lastName.startsWith("Roster")
  )
  const rosterMemberships = []

  for (const [index, member] of rosterMemberRows.entries()) {
    const plan =
      index % 3 === 0 ? plansByName.Basic : index % 3 === 1 ? pro : elite
    const interval: BillingInterval = index % 4 === 0 ? "ANNUAL" : "MONTHLY"
    const isSuspended = member.status === "SUSPENDED"
    const isExpired = index % 8 === 0
    const isExpiring = index % 7 === 0

    rosterMemberships.push(
      await createMembership({
        memberId: member.id,
        plan,
        interval,
        status: isSuspended ? "PAST_DUE" : isExpired ? "EXPIRED" : "ACTIVE",
        startedAt: member.joinDate,
        currentPeriodEndsAt: isExpired
          ? endOfDay(daysAgo(10 + index))
          : isExpiring
            ? endOfDay(daysFromNow(interval === "ANNUAL" ? 24 : 5))
            : endOfDay(daysFromNow(35 + index)),
        nextBillingDate: isExpired
          ? startOfDay(daysAgo(9 + index))
          : startOfDay(daysFromNow(36 + index)),
        canceledAt: isExpired ? daysAgo(9 + index) : undefined,
      })
    )
  }

  const memberships = [
    msAri,
    msSinta,
    msBayu,
    msDewi,
    msMaya,
    msNadia,
    msRaka,
    msEdo,
    msLina,
    msMade,
    msYusuf,
    msCitra,
    msBagusOld,
    msBagusMiddle,
    msBagusCurrent,
    msFitri,
    msHana,
    msTono,
    ...rosterMemberships,
  ]

  console.log(`  - Memberships: ${memberships.length}`)

  // ---- 6. Create payments --------------------------------------------------
  console.log("  Creating payments...")

  const fitriPaymentHistory = Array.from({ length: 30 }, (_, index) => {
    const dueAt = paymentDate(29 - index)

    return {
      gymId: gym.id,
      memberId: membersByKey.fitri.id,
      membershipId: msFitri.id,
      amount: pro.monthlyPriceAmount,
      status: "PAID" as PaymentStatus,
      dueAt,
      paidAt: dueAt,
      notes:
        index === 5
          ? "Historical payment row for pagination testing."
          : undefined,
    }
  })

  const paymentRows = [
    {
      gymId: gym.id,
      memberId: membersByKey.ari.id,
      membershipId: msAri.id,
      amount: basic.monthlyPriceAmount,
      status: "PAID" as PaymentStatus,
      dueAt: daysAgo(13),
      paidAt: daysAgo(13),
    },
    {
      gymId: gym.id,
      memberId: membersByKey.sinta.id,
      membershipId: msSinta.id,
      amount: pro.monthlyPriceAmount,
      status: "PAID" as PaymentStatus,
      dueAt: membersByKey.sinta.joinDate,
      paidAt: membersByKey.sinta.joinDate,
    },
    {
      gymId: gym.id,
      memberId: membersByKey.dewi.id,
      membershipId: msDewi.id,
      amount: elite.annualPriceAmount,
      status: "PENDING" as PaymentStatus,
      dueAt: daysFromNow(22),
      notes: "Annual renewal invoice.",
    },
    {
      gymId: gym.id,
      memberId: membersByKey.lina.id,
      membershipId: msLina.id,
      amount: basic.monthlyPriceAmount,
      status: "PENDING" as PaymentStatus,
      dueAt: daysFromNow(5),
      notes: "Monthly renewal invoice.",
    },
    {
      gymId: gym.id,
      memberId: membersByKey.maya.id,
      membershipId: msMaya.id,
      amount: elite.monthlyPriceAmount,
      status: "OVERDUE" as PaymentStatus,
      dueAt: daysAgo(3),
      notes: "Card failed twice.",
    },
    {
      gymId: gym.id,
      memberId: membersByKey.nadia.id,
      membershipId: msNadia.id,
      amount: pro.monthlyPriceAmount,
      status: "OVERDUE" as PaymentStatus,
      dueAt: daysAgo(8),
      notes: "Account suspended until settled.",
    },
    {
      gymId: gym.id,
      memberId: membersByKey.yusuf.id,
      membershipId: msYusuf.id,
      amount: elite.monthlyPriceAmount,
      status: "PENDING" as PaymentStatus,
      dueAt: daysAgo(4),
      notes: "Pending payment past due by date.",
    },
    {
      gymId: gym.id,
      memberId: membersByKey.edo.id,
      membershipId: msEdo.id,
      amount: basic.monthlyPriceAmount,
      status: "VOID" as PaymentStatus,
      dueAt: daysAgo(65),
      notes: "Voided after cancellation correction.",
    },
    {
      gymId: gym.id,
      memberId: membersByKey.made.id,
      membershipId: msMade.id,
      amount: pro.monthlyPriceAmount,
      status: "PAID" as PaymentStatus,
      dueAt: daysAgo(48),
      paidAt: daysAgo(47),
    },
    {
      gymId: gym.id,
      memberId: membersByKey.bagus.id,
      membershipId: msBagusCurrent.id,
      amount: elite.annualPriceAmount,
      status: "PAID" as PaymentStatus,
      dueAt: msBagusCurrent.startedAt,
      paidAt: msBagusCurrent.startedAt,
    },
    {
      gymId: gym.id,
      memberId: membersByKey.hana.id,
      membershipId: msHana.id,
      amount: basic.monthlyPriceAmount,
      status: "PAID" as PaymentStatus,
      dueAt: daysAgo(20),
      paidAt: daysAgo(20),
    },
    {
      gymId: gym.id,
      memberId: membersByKey.tono.id,
      membershipId: msTono.id,
      amount: basic.monthlyPriceAmount,
      status: "VOID" as PaymentStatus,
      dueAt: daysAgo(33),
      notes: "Canceled before collection.",
    },
    ...fitriPaymentHistory,
    ...rosterMemberships.slice(0, 8).map((membership, index) => ({
      gymId: gym.id,
      memberId: membership.memberId,
      membershipId: membership.id,
      amount: membership.priceAmount,
      status:
        index % 5 === 0
          ? ("OVERDUE" as PaymentStatus)
          : ("PAID" as PaymentStatus),
      dueAt: index % 5 === 0 ? daysAgo(2 + index) : daysAgo(12 + index),
      paidAt: index % 5 === 0 ? undefined : daysAgo(11 + index),
      notes:
        index % 5 === 0
          ? "Roster payment creates overdue filter coverage."
          : undefined,
    })),
  ]

  await db.membershipPayment.createMany({
    data: paymentRows,
  })

  console.log(`  - Payments: ${paymentRows.length}`)

  // ---- 7. Create attendance records ----------------------------------------
  console.log("  Creating attendance records...")

  const hanaAttendanceHistory = Array.from({ length: 26 }, (_, index) => ({
    gymId: gym.id,
    memberId: membersByKey.hana.id,
    attendedAt: index === 0 ? hoursAgo(6) : daysAgo(index * 3),
    source: "MANUAL" as const,
    notes: index === 0 ? "Morning strength block." : undefined,
  }))

  const attendanceRows = [
    {
      gymId: gym.id,
      memberId: membersByKey.ari.id,
      attendedAt: daysAgo(3),
      source: "MANUAL" as const,
    },
    {
      gymId: gym.id,
      memberId: membersByKey.ari.id,
      attendedAt: hoursAgo(20),
      source: "MANUAL" as const,
    },
    {
      gymId: gym.id,
      memberId: membersByKey.sinta.id,
      attendedAt: daysAgo(9),
      source: "MANUAL" as const,
    },
    {
      gymId: gym.id,
      memberId: membersByKey.sinta.id,
      attendedAt: hoursAgo(44),
      source: "MANUAL" as const,
    },
    {
      gymId: gym.id,
      memberId: membersByKey.bayu.id,
      attendedAt: daysAgo(21),
      source: "MANUAL" as const,
    },
    {
      gymId: gym.id,
      memberId: membersByKey.dewi.id,
      attendedAt: daysAgo(6),
      source: "MANUAL" as const,
    },
    {
      gymId: gym.id,
      memberId: membersByKey.maya.id,
      attendedAt: daysAgo(8),
      source: "MANUAL" as const,
    },
    {
      gymId: gym.id,
      memberId: membersByKey.lina.id,
      attendedAt: hoursAgo(18),
      source: "MANUAL" as const,
    },
    {
      gymId: gym.id,
      memberId: membersByKey.citra.id,
      attendedAt: daysAgo(2),
      source: "MANUAL" as const,
      notes: "Member has no email or phone on file.",
    },
    ...hanaAttendanceHistory,
    ...rosterMemberRows.slice(0, 14).map((member, index) => ({
      gymId: gym.id,
      memberId: member.id,
      attendedAt: daysAgo(index + 1),
      source: "MANUAL" as const,
    })),
  ]

  await db.attendanceRecord.createMany({
    data: attendanceRows,
  })

  console.log(`  - Attendance records: ${attendanceRows.length}`)

  // ---- 8. Create drop-in visits --------------------------------------------
  console.log("  Creating drop-in visits...")

  const dropInRows = [
    {
      gymId: gym.id,
      visitorName: "Fajar Nugroho",
      visitorContact: "+628122220001",
      visitCount: 2,
      amount: 2 * DROP_IN_FEE_AMOUNT,
      visitedAt: daysAgo(14),
    },
    {
      gymId: gym.id,
      visitorName: "Fajar Nugroho",
      visitorContact: "+628122220001",
      visitCount: 3,
      amount: 3 * DROP_IN_FEE_AMOUNT,
      visitedAt: daysAgo(4),
      notes: "Asked about Pro plan.",
    },
    {
      gymId: gym.id,
      visitorName: "Rita Amanda",
      visitorContact: "rita.amanda@example.com",
      visitCount: 5,
      amount: 5 * DROP_IN_FEE_AMOUNT,
      visitedAt: hoursAgo(25),
      notes: "Interested in morning training.",
    },
    {
      gymId: gym.id,
      visitorName: "Samuel Tan",
      visitorContact: "samuel.tan@example.com",
      visitCount: 4,
      amount: 4 * DROP_IN_FEE_AMOUNT,
      visitedAt: daysAgo(2),
      notes: "Below conversion threshold.",
    },
    {
      gymId: gym.id,
      visitorName: "Nora Wati",
      visitorContact: "+628122220004",
      visitCount: 6,
      amount: 6 * DROP_IN_FEE_AMOUNT,
      visitedAt: hoursAgo(2),
      notes: "Today drop-in and conversion lead.",
    },
    {
      gymId: gym.id,
      visitCount: 4,
      amount: 4 * DROP_IN_FEE_AMOUNT,
      visitedAt: daysAgo(5),
      notes: "Anonymous walk-ins from local event.",
    },
    {
      gymId: gym.id,
      visitCount: 2,
      amount: 2 * DROP_IN_FEE_AMOUNT,
      visitedAt: daysAgo(35),
      notes: "Prior month anonymous visits.",
    },
    ...Array.from({ length: 24 }, (_, index) => ({
      gymId: gym.id,
      visitorName:
        index % 3 === 0
          ? `Trial Visitor ${String(index + 1).padStart(2, "0")}`
          : null,
      visitorContact:
        index % 3 === 0
          ? `trial-${String(index + 1).padStart(2, "0")}@example.com`
          : null,
      visitCount: 1 + (index % 2),
      amount: (1 + (index % 2)) * DROP_IN_FEE_AMOUNT,
      visitedAt: daysAgo((index % 20) + 1),
      notes:
        index % 3 === 0
          ? "Identified visitor below conversion threshold."
          : "Anonymous drop-in group.",
    })),
  ]

  await db.dropInVisit.createMany({
    data: dropInRows,
  })

  console.log(`  - Drop-in visits: ${dropInRows.length}`)
  console.log(`  - Extra roster members inserted: ${rosterMembers.count}`)

  // ---- Done ----------------------------------------------------------------
  console.log("\nSeed complete.")
  console.log(`\n   Sign in with:`)
  console.log(`   Email:    ${DEMO_OWNER_EMAIL}`)
  console.log(`   Password: ${DEMO_OWNER_PASSWORD}\n`)
}

main()
  .catch((error) => {
    console.error("Seed failed:", error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
