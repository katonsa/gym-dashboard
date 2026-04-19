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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Prisma client (standalone — not the Next.js singleton)
// ---------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error("❌ DATABASE_URL is not set.")
  process.exit(1)
}

const adapter = new PrismaPg({ connectionString })
const db = new PrismaClient({ adapter })

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🌱 Seeding database…\n")

  // ---- Idempotency check --------------------------------------------------
  const existingGym = await db.gym.findFirst()
  if (existingGym) {
    console.log(
      `✅ Database already has a gym ("${existingGym.name}"). Skipping seed.\n` +
        "   To re-seed, run: npx prisma migrate reset"
    )
    return
  }

  // ---- 1. Create demo owner via Better Auth --------------------------------
  console.log("  Creating demo owner account…")

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
    console.log(`  ✓ Owner created: ${DEMO_OWNER_EMAIL}`)
  } catch (error: unknown) {
    // If the user already exists (e.g. from a partial previous seed), look them up.
    const existing = await db.user.findUnique({
      where: { email: DEMO_OWNER_EMAIL },
    })

    if (existing) {
      userId = existing.id
      console.log(`  ✓ Owner already exists: ${DEMO_OWNER_EMAIL}`)
    } else {
      throw error
    }
  }

  // ---- 2. Create gym -------------------------------------------------------
  console.log("  Creating gym…")

  const gym = await db.gym.create({
    data: {
      name: "JKT Strength House",
      timezone: "Asia/Jakarta",
      currencyCode: "IDR",
      defaultDropInFeeAmount: 75_000,
      ownerId: userId,
    },
  })

  console.log(`  ✓ Gym created: ${gym.name}`)

  // ---- 3. Create plan tiers ------------------------------------------------
  console.log("  Creating plan tiers…")

  const [basic, pro, elite] = await Promise.all([
    db.planTier.create({
      data: {
        gymId: gym.id,
        name: "Basic",
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
        description: "Unlimited access with monthly performance review.",
        monthlyPriceAmount: 950_000,
        annualPriceAmount: 9_500_000,
        isActive: true,
        sortOrder: 3,
      },
    }),
  ])

  console.log(`  ✓ Plan tiers: ${basic.name}, ${pro.name}, ${elite.name}`)

  // ---- 4. Create members ---------------------------------------------------
  console.log("  Creating members…")

  // ACTIVE members
  const ari = await db.member.create({
    data: {
      gymId: gym.id,
      firstName: "Ari",
      lastName: "Pratama",
      email: "ari.pratama@example.com",
      phone: "+628111110001",
      status: "ACTIVE",
      joinDate: daysAgo(165),
      lastAttendedAt: hoursAgo(20),
    },
  })

  const sinta = await db.member.create({
    data: {
      gymId: gym.id,
      firstName: "Sinta",
      lastName: "Mahendra",
      email: "sinta.mahendra@example.com",
      phone: "+628111110002",
      status: "ACTIVE",
      joinDate: daysAgo(12), // New sign-up this month
      lastAttendedAt: hoursAgo(44),
      notes: "New sign-up this month.",
    },
  })

  const bayu = await db.member.create({
    data: {
      gymId: gym.id,
      firstName: "Bayu",
      lastName: "Santoso",
      email: "bayu.santoso@example.com",
      phone: "+628111110003",
      status: "ACTIVE",
      joinDate: daysAgo(270),
      lastAttendedAt: daysAgo(21),
    },
  })

  const dewi = await db.member.create({
    data: {
      gymId: gym.id,
      firstName: "Dewi",
      lastName: "Lestari",
      email: "dewi.lestari@example.com",
      phone: "+628111110004",
      status: "ACTIVE",
      joinDate: daysAgo(365),
      lastAttendedAt: daysAgo(6),
    },
  })

  const maya = await db.member.create({
    data: {
      gymId: gym.id,
      firstName: "Maya",
      lastName: "Putri",
      email: "maya.putri@example.com",
      phone: "+628111110006",
      status: "ACTIVE",
      joinDate: daysAgo(125),
      lastAttendedAt: daysAgo(8),
    },
  })

  const lina = await db.member.create({
    data: {
      gymId: gym.id,
      firstName: "Lina",
      lastName: "Kusuma",
      email: "lina.kusuma@example.com",
      phone: "+628111110009",
      status: "ACTIVE",
      joinDate: daysAgo(96),
      lastAttendedAt: hoursAgo(18),
    },
  })

  // SUSPENDED member
  const nadia = await db.member.create({
    data: {
      gymId: gym.id,
      firstName: "Nadia",
      lastName: "Halim",
      email: "nadia.halim@example.com",
      phone: "+628111110007",
      status: "SUSPENDED",
      joinDate: daysAgo(345),
      lastAttendedAt: daysAgo(47),
      notes: "Suspended pending billing review.",
    },
  })

  // INACTIVE members
  const raka = await db.member.create({
    data: {
      gymId: gym.id,
      firstName: "Raka",
      lastName: "Wijaya",
      email: "raka.wijaya@example.com",
      phone: "+628111110005",
      status: "INACTIVE",
      joinDate: daysAgo(260),
      lastAttendedAt: daysAgo(57),
    },
  })

  const edo = await db.member.create({
    data: {
      gymId: gym.id,
      firstName: "Edo",
      lastName: "Saputra",
      email: "edo.saputra@example.com",
      phone: "+628111110008",
      status: "INACTIVE",
      joinDate: daysAgo(555),
      lastAttendedAt: daysAgo(77),
    },
  })

  const members = [ari, sinta, bayu, dewi, maya, lina, nadia, raka, edo]
  console.log(`  ✓ Members: ${members.length}`)

  // ---- 5. Create memberships -----------------------------------------------
  console.log("  Creating memberships…")

  // Ari — Basic, monthly, ACTIVE
  const msAri = await db.membership.create({
    data: {
      memberId: ari.id,
      planTierId: basic.id,
      billingInterval: "MONTHLY",
      status: "ACTIVE",
      priceAmount: 350_000,
      startedAt: ari.joinDate,
      currentPeriodEndsAt: endOfDay(daysFromNow(17)),
      nextBillingDate: startOfDay(daysFromNow(18)),
    },
  })

  // Sinta — Pro, monthly, ACTIVE (new sign-up)
  const msSinta = await db.membership.create({
    data: {
      memberId: sinta.id,
      planTierId: pro.id,
      billingInterval: "MONTHLY",
      status: "ACTIVE",
      priceAmount: 650_000,
      startedAt: sinta.joinDate,
      currentPeriodEndsAt: endOfDay(daysFromNow(18)),
      nextBillingDate: startOfDay(daysFromNow(19)),
    },
  })

  // Bayu — Pro, annual, ACTIVE
  const msBayu = await db.membership.create({
    data: {
      memberId: bayu.id,
      planTierId: pro.id,
      billingInterval: "ANNUAL",
      status: "ACTIVE",
      priceAmount: 6_500_000,
      startedAt: bayu.joinDate,
      currentPeriodEndsAt: endOfDay(daysFromNow(95)),
      nextBillingDate: startOfDay(daysFromNow(96)),
    },
  })

  // Dewi — Elite, annual, ACTIVE (expiring soon — triggers alert)
  const msDewi = await db.membership.create({
    data: {
      memberId: dewi.id,
      planTierId: elite.id,
      billingInterval: "ANNUAL",
      status: "ACTIVE",
      priceAmount: 9_500_000,
      startedAt: dewi.joinDate,
      currentPeriodEndsAt: endOfDay(daysFromNow(2)),
      nextBillingDate: startOfDay(daysFromNow(3)),
    },
  })

  // Maya — Elite, monthly, PAST_DUE (overdue — triggers alert)
  const msMaya = await db.membership.create({
    data: {
      memberId: maya.id,
      planTierId: elite.id,
      billingInterval: "MONTHLY",
      status: "PAST_DUE",
      priceAmount: 950_000,
      startedAt: maya.joinDate,
      currentPeriodEndsAt: endOfDay(daysAgo(4)),
      nextBillingDate: startOfDay(daysAgo(3)),
    },
  })

  // Nadia — Pro, monthly, PAST_DUE (suspended member, overdue)
  const msNadia = await db.membership.create({
    data: {
      memberId: nadia.id,
      planTierId: pro.id,
      billingInterval: "MONTHLY",
      status: "PAST_DUE",
      priceAmount: 650_000,
      startedAt: nadia.joinDate,
      currentPeriodEndsAt: endOfDay(daysAgo(9)),
      nextBillingDate: startOfDay(daysAgo(8)),
    },
  })

  // Raka — Basic, monthly, EXPIRED
  const msRaka = await db.membership.create({
    data: {
      memberId: raka.id,
      planTierId: basic.id,
      billingInterval: "MONTHLY",
      status: "EXPIRED",
      priceAmount: 350_000,
      startedAt: raka.joinDate,
      currentPeriodEndsAt: endOfDay(daysAgo(45)),
      nextBillingDate: startOfDay(daysAgo(44)),
      canceledAt: daysAgo(44),
    },
  })

  // Edo — Basic, monthly, CANCELED
  const msEdo = await db.membership.create({
    data: {
      memberId: edo.id,
      planTierId: basic.id,
      billingInterval: "MONTHLY",
      status: "CANCELED",
      priceAmount: 350_000,
      startedAt: edo.joinDate,
      currentPeriodEndsAt: endOfDay(daysAgo(66)),
      nextBillingDate: startOfDay(daysAgo(65)),
      canceledAt: daysAgo(65),
    },
  })

  // Lina — Basic, monthly, ACTIVE (period ending soon — triggers expiring alert)
  const msLina = await db.membership.create({
    data: {
      memberId: lina.id,
      planTierId: basic.id,
      billingInterval: "MONTHLY",
      status: "ACTIVE",
      priceAmount: 350_000,
      startedAt: lina.joinDate,
      currentPeriodEndsAt: endOfDay(daysFromNow(4)),
      nextBillingDate: startOfDay(daysFromNow(5)),
    },
  })

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
  ]
  console.log(`  ✓ Memberships: ${memberships.length}`)

  // ---- 6. Create payments --------------------------------------------------
  console.log("  Creating payments…")

  await db.membershipPayment.createMany({
    data: [
      // Ari — PAID (current period)
      {
        gymId: gym.id,
        memberId: ari.id,
        membershipId: msAri.id,
        amount: 350_000,
        status: "PAID",
        dueAt: daysAgo(13),
        paidAt: daysAgo(13),
      },
      // Sinta — PAID (first payment)
      {
        gymId: gym.id,
        memberId: sinta.id,
        membershipId: msSinta.id,
        amount: 650_000,
        status: "PAID",
        dueAt: sinta.joinDate,
        paidAt: sinta.joinDate,
      },
      // Dewi — PENDING (annual renewal invoice, due soon)
      {
        gymId: gym.id,
        memberId: dewi.id,
        membershipId: msDewi.id,
        amount: 9_500_000,
        status: "PENDING",
        dueAt: daysFromNow(3),
        notes: "Annual renewal invoice.",
      },
      // Maya — OVERDUE (card failed)
      {
        gymId: gym.id,
        memberId: maya.id,
        membershipId: msMaya.id,
        amount: 950_000,
        status: "OVERDUE",
        dueAt: daysAgo(3),
        notes: "Card failed twice.",
      },
      // Nadia — OVERDUE (suspended)
      {
        gymId: gym.id,
        memberId: nadia.id,
        membershipId: msNadia.id,
        amount: 650_000,
        status: "OVERDUE",
        dueAt: daysAgo(8),
        notes: "Account suspended until settled.",
      },
      // Edo — VOID (canceled membership)
      {
        gymId: gym.id,
        memberId: edo.id,
        membershipId: msEdo.id,
        amount: 350_000,
        status: "VOID",
        dueAt: daysAgo(65),
      },
    ],
  })

  console.log("  ✓ Payments: 6")

  // ---- 7. Create attendance records ----------------------------------------
  console.log("  Creating attendance records…")

  await db.attendanceRecord.createMany({
    data: [
      // Ari — 2 visits
      {
        gymId: gym.id,
        memberId: ari.id,
        attendedAt: daysAgo(3),
        source: "MANUAL",
      },
      {
        gymId: gym.id,
        memberId: ari.id,
        attendedAt: hoursAgo(20),
        source: "MANUAL",
      },
      // Sinta — 2 visits
      {
        gymId: gym.id,
        memberId: sinta.id,
        attendedAt: daysAgo(9),
        source: "MANUAL",
      },
      {
        gymId: gym.id,
        memberId: sinta.id,
        attendedAt: hoursAgo(44),
        source: "MANUAL",
      },
      // Bayu — 1 visit (older, contributes to "inactive-ish" feel)
      {
        gymId: gym.id,
        memberId: bayu.id,
        attendedAt: daysAgo(21),
        source: "MANUAL",
      },
      // Dewi — 1 visit
      {
        gymId: gym.id,
        memberId: dewi.id,
        attendedAt: daysAgo(6),
        source: "MANUAL",
      },
      // Maya — 1 visit
      {
        gymId: gym.id,
        memberId: maya.id,
        attendedAt: daysAgo(8),
        source: "MANUAL",
      },
      // Lina — 1 visit
      {
        gymId: gym.id,
        memberId: lina.id,
        attendedAt: hoursAgo(18),
        source: "MANUAL",
      },
    ],
  })

  console.log("  ✓ Attendance records: 8")

  // ---- 8. Create drop-in visits --------------------------------------------
  console.log("  Creating drop-in visits…")

  await db.dropInVisit.createMany({
    data: [
      // Fajar — identified visitor, 2 visits early in the month
      {
        gymId: gym.id,
        visitorName: "Fajar Nugroho",
        visitorContact: "+628122220001",
        visitCount: 2,
        amount: 150_000,
        visitedAt: daysAgo(14),
      },
      // Fajar — 3 more visits mid-month (total 5 = conversion threshold)
      {
        gymId: gym.id,
        visitorName: "Fajar Nugroho",
        visitorContact: "+628122220001",
        visitCount: 3,
        amount: 225_000,
        visitedAt: daysAgo(4),
        notes: "Asked about Pro plan.",
      },
      // Rita — identified visitor, 5 visits (at conversion threshold)
      {
        gymId: gym.id,
        visitorName: "Rita Amanda",
        visitorContact: "rita.amanda@example.com",
        visitCount: 5,
        amount: 375_000,
        visitedAt: hoursAgo(25),
        notes: "Interested in morning training.",
      },
      // Anonymous walk-ins
      {
        gymId: gym.id,
        visitCount: 4,
        amount: 300_000,
        visitedAt: daysAgo(5),
        notes: "Anonymous walk-ins from local event.",
      },
      // Prior month anonymous — should not count in current month totals
      {
        gymId: gym.id,
        visitCount: 2,
        amount: 150_000,
        visitedAt: daysAgo(35),
      },
    ],
  })

  console.log("  ✓ Drop-in visits: 5")

  // ---- Done ----------------------------------------------------------------
  console.log("\n✅ Seed complete.")
  console.log(`\n   Sign in with:`)
  console.log(`   Email:    ${DEMO_OWNER_EMAIL}`)
  console.log(`   Password: ${DEMO_OWNER_PASSWORD}\n`)
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
