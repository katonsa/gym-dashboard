# 🏋️ Gym Owner Dashboard — Project Brief

**Project Type:** Web Application  
**Platform:** React (Web)  
**Version:** 1.0  
**Date:** April 2026  

---

## 1. Overview

A focused, single-location gym management dashboard built for gym owners and admins. The system provides a real-time view of membership health, subscription status, and business performance — including both recurring membership revenue and one-time drop-in (day pass) revenue — enabling fast, informed decisions without the complexity of enterprise gym software.

---

## 2. Problem Statement

Small gym owners currently juggle spreadsheets, paper sign-in sheets, and disconnected tools to track their members. This leads to:

- Missed renewals and lapsing members going unnoticed
- No clear view of monthly revenue by plan tier
- Drop-in (day pass) revenue tracked separately from membership, making total revenue hard to see
- Manual effort to identify at-risk or overdue members
- No single source of truth for membership status

---

## 3. Goals

- Give the gym owner a **daily at-a-glance view** of their membership health
- Reduce time spent manually tracking subscriptions
- Surface **actionable alerts** (expiring plans, absent members, overdue payments)
- Provide a **clear revenue snapshot** that combines membership and drop-in income without requiring accounting tools

---

## 4. Target User

| Attribute | Detail |
|-----------|--------|
| **Role** | Gym Owner / Admin |
| **Technical level** | Low to moderate |
| **Usage frequency** | Daily — first thing in the morning |
| **Device** | Mobile browser (primary), Desktop (secondary) |
| **Scale** | 1 location, fewer than 200 members |

---

## 5. Core Features

### 5.1 Overview Stats Panel
- Total members (active / inactive breakdown)
- New sign-ups this month
- Monthly Recurring Revenue (MRR) — from memberships only
- Drop-in Revenue this month — from day pass / walk-in fees
- Total Revenue = MRR + Drop-in Revenue
- Members with expiring subscriptions (next 7 days)

### 5.2 Member Table
- Searchable and filterable list of all members
- Columns: Name, Plan, Status, Join Date, Next Billing Date, Sessions Attended
- Quick actions: View profile, Edit plan, Suspend account

### 5.3 Subscription Breakdown
- Distribution of members across plan tiers (Basic / Pro / Elite)
- Revenue contribution per tier
- Visual plan comparison chart

### 5.4 Alerts Panel
- Members with subscriptions expiring within 7 days
- Members with overdue payments
- Members inactive for 30+ days (churn risk)

### 5.5 Revenue Trend Chart
- Monthly revenue chart (last 6 months)
- Stacked or grouped view: **Membership Revenue** vs **Drop-in Revenue**
- Highlights MoM growth or decline per stream and in total

### 5.6 Drop-in Log
- Record of day pass visits (date, name optional, amount paid)
- Daily and monthly drop-in totals
- Flag frequent identified drop-ins (5+ visits/month) as **membership conversion opportunities**

---

## 6. Out of Scope (v1.0)

The following features are intentionally excluded from the initial version:

- Multi-location management
- Trainer scheduling and payroll
- Equipment tracking and maintenance logs
- Class booking and attendance
- Role-based access control (staff vs owner)
- Native mobile app *(web app is mobile-optimized; native app is v2 consideration)*
- Payment processing / billing integrations
- CSV import from external systems *(v1.5 consideration)*
- Email notifications for expiring subscriptions *(v1.5 consideration)*
- PWA / offline mode *(v1.5 consideration)*

---

## 7. Revenue Model

The dashboard tracks two distinct revenue streams:

| Type | Also Known As | Description | Billing Intervals |
|------|--------------|-------------|-------------------|
| **Membership** | Subscription | Recurring members on a plan tier | **Monthly** or **Annual** |
| **Drop-in** | Day Pass / Walk-in | Non-members paying per visit | One-time, per visit |

### Billing Intervals

| Interval | Cycle | Notes |
|----------|-------|-------|
| **Monthly** | Every 30 days | Default interval; shown as MRR |
| **Annual** | Every 365 days | Usually offered at a discounted rate; normalized to monthly equivalent for MRR display |

**Key rules:**
- Members can be on either a **monthly** or **annual** billing cycle per plan tier
- Annual plans are normalized to a **monthly equivalent** for MRR calculation (annual price ÷ 12)
- Renewal alerts apply to both — monthly members 7 days before renewal, annual members 30 days before
- MRR (Monthly Recurring Revenue) counts **membership only**
- Drop-in revenue is **non-recurring** and tracked separately
- **Total Revenue** = MRR + Drop-in Revenue for the period
- Drop-in fee defaults to a configurable gym-level price, with per-visit override support
- Drop-in visitors may be logged as named visitors or anonymous counts
- Frequent identified drop-ins (5+ visits/month) are flagged as **conversion opportunities**

---

## 8. Technical Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React (Web) |
| **Styling** | Tailwind CSS |
| **Charts** | Recharts |
| **Data** | Mock data (v1); REST API-ready architecture |
| **State** | React useState / useReducer |
| **Responsive** | Mobile-first; responsive breakpoints for tablet and desktop |
| **Import** | Manual entry / mock data in v1; CSV import deferred |
| **Notifications** | In-app alerts in v1; email notifications deferred |

---

## 9. Design Direction

- **Theme:** Dark industrial — built for a busy owner, fast to scan
- **Tone:** Utilitarian, no fluff, high information density
- **Typography:** Bold, condensed display font with a clean body font
- **Accent color:** Electric yellow / lime on deep charcoal
- **Key principle:** Every piece of data shown must be actionable
- **Theme mode:** Dark-first with a persistent light/dark toggle

### Mobile-First Guidelines

The dashboard is designed **mobile-first** for an admin on the gym floor:

| Consideration | Approach |
|--------------|----------|
| **Layout** | Single-column stacked cards on mobile; wider grid on desktop |
| **Touch targets** | Minimum 44×44px for all buttons and interactive elements |
| **Stats panel** | 2×2 card grid — large numbers, scannable at a glance |
| **Member table** | Condensed card list on mobile (not a wide table) |
| **Navigation** | Bottom tab bar on mobile; sidebar on desktop |
| **Alerts** | Pinned at top — always visible without scrolling |
| **Forms & inputs** | Large input fields, native mobile keyboards where appropriate |
| **Charts** | Simplified, touch-friendly with tap-to-reveal data points |

---

## 10. Success Metrics

| Metric | Target |
|--------|--------|
| Time to find a member's status | < 10 seconds |
| Alerts visibility on load | Above the fold |
| Daily active usage | Owner opens dashboard every morning |
| Reduction in missed renewals | 90%+ of expiring plans actioned before lapse |

---

## 11. Milestones

| Phase | Deliverable | Status |
|-------|-------------|--------|
| Phase 1 | Project Brief | ✅ Complete |
| Phase 2 | UI Design & Component Architecture | 🔲 Pending |
| Phase 3 | Core Dashboard — Stats + Member Table | 🔲 Pending |
| Phase 4 | Alerts Panel + Subscription Breakdown | 🔲 Pending |
| Phase 5 | Revenue Trend Chart + Drop-in Log | 🔲 Pending |
| Phase 6 | Polish, QA, and Handoff | 🔲 Pending |

---

## 12. Resolved Questions

- ~~Will member data be imported from an existing system (e.g., CSV export)?~~ ✅ **Not in v1; manual entry / mock data only. CSV import is a v1.5 candidate.**
- ~~Should the dashboard support dark/light mode toggle?~~ ✅ **Yes; dark-first UI with a persistent light/dark toggle.**
- ~~Is email notification for expiring subscriptions in scope for v1?~~ ✅ **No; v1 uses in-app alerts only. Email notifications are a v1.5 candidate.**
- ~~What billing intervals are supported?~~ ✅ **Monthly + Annual**
- ~~What is the standard day pass / drop-in fee?~~ ✅ **Configurable gym-level default, with amount override per visit.**
- ~~Should drop-in visitors be logged by name, or just as anonymous visit counts?~~ ✅ **Both; name/contact is optional, anonymous counts are allowed, and conversion alerts only apply to identified visitors.**

---

*Brief prepared for the Gym Owner Dashboard project. Review and confirm before development begins.*
