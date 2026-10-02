# Servio

> One QR. Your entire restaurant connected.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%7C%20Auth%20%7C%20Storage-3ECF8E?logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com)

Servio is a QR-first restaurant operating system: digital menu, ordering, live
kitchen display, staff notifications, and analytics in a single SaaS. Full
product spec: [`docs/PRD.md`](docs/PRD.md).

## Features

- 📱 **QR-first digital menu** — no app install, scan and order
- 🧑‍🍳 **Live kitchen display** — pending → accepted → preparing → ready
- 🔔 **Waiter call & bill requests** from the table, in real time-ish
- 🧾 **Cashier flow** — bill creation and Mobile Money payment recording
- 🎨 **Templates & branding** — 11 menu templates, brand colour, custom fonts
- 👥 **Role-based staff access** — waiter / kitchen / cashier PIN login
- 🏷️ **Offers & promo codes** — percentage or flat discounts, redeemed at checkout
- 🎁 **14-day free trial** with Business-level features for every new restaurant
- 🛡️ **Multi-tenant by design** — Postgres Row Level Security isolates every restaurant's data
- 📊 **Owner dashboard** — orders, tables, menu, staff, analytics, QR codes
- 🛠️ **Platform admin** — manage restaurants, users, subscriptions, payments

## Table of contents

- [Stack](#stack)
- [Getting started](#getting-started)
- [Database](#database)
- [Testing](#testing)
- [How auth works](#how-auth-works)
- [Route map](#route-map)
- [What's implemented vs. what's next](#whats-implemented-vs-whats-next)
- [Deployment notes](#deployment-notes)
- [Security notes](#security-notes)

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui ·
Supabase (Postgres, Auth, Realtime, Storage) · Vercel

Next.js 16 renames `middleware.ts` to `proxy.ts` — see `src/proxy.ts`.

## Getting started

```bash
bun install
cp .env.example .env.local   # fill in Supabase project credentials
bun run dev
```

### Database

Migrations live in `supabase/migrations/` and are plain SQL (no CLI lock-in),
applied in filename order:

| Migration | What it does |
| --- | --- |
| `20260814000001_extensions_and_enums` | Extensions and enum types |
| `20260814000002_core_schema` | Every table (restaurants, branches, menu, orders, staff, subscriptions, …) |
| `20260814000003_rls_policies` | Row Level Security: restaurant-level isolation |
| `20260814000004_seed_reference_data` | Subscription plans and menu templates |
| `20260814000005_coupon_usage_function` | Coupon counter (superseded, dropped in `20261002000001`) |
| `20260815000001_storage_buckets` | Image buckets + storage RLS (per-restaurant folders) |
| `20260815000002_upi_payment` | Deprecated, kept for history |
| `20261001000000_mobile_money_payment` | Mobile Money payment method |
| `20261001000001_waiter_request_lifecycle` | Waiter request claim/transfer; one active session per table |
| `20261001000002`…`000005` | Security hardening: RLS helpers moved to a private schema, RPC privileges closed |
| `20261001000006_data_consistency` | Cross-tenant foreign keys and money invariants |
| `20261001000007_fix_data_consistency` | Allows a new session per table after payment; `ON DELETE SET NULL (column)` |
| `20261002000001_transactional_orders` | `place_order` and `mark_bill_paid`, each a single transaction |
| `20261002000002_staff_login_throttle` | Staff PIN sign-in throttling |
| `20261002000003_onboarding_trial` | Atomic `create_restaurant`, automatic 14-day trial, XAF plan prices |
| `20261002000004_french_display_names` | French template names and default branch name |

Apply them with the Supabase CLI (`supabase db push`) or by running each file
against your project's Postgres connection in order.

#### Verifying migrations and regenerating types

`src/lib/supabase/database.types.ts` is generated from the migrations, not
from a live project. After changing a migration, point `DATABASE_URL` at a
throwaway Postgres ≥ 15 server and run:

```bash
export DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres
bun run db:verify   # fresh DB, applies every migration, runs supabase/tests/*.test.sql
bun run db:types    # regenerates database.types.ts from that DB
```

`supabase/tests/00_platform_stubs.sql` provides the minimal `auth`/`storage`
objects, API roles and default privileges a real Supabase project already
has — never run it against a real project.

Required env vars (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from your
  Supabase project's API settings.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, used wherever no Supabase Auth
  session exists (guests, PIN-authenticated staff) and for platform-admin
  listing; never exposed to the browser. See [Security notes](#security-notes).
- `STAFF_SESSION_SECRET` — random secret signing staff PIN-login cookies
  (`openssl rand -base64 32`).
- `NEXT_PUBLIC_SITE_URL` — used to build QR code target URLs.

## Testing

```bash
bun run lint
bun run typecheck   # next typegen + tsc
bun run test        # unit tests (bun test)
bun run db:verify   # migrations + SQL tests, needs DATABASE_URL (see above)
```

The SQL tests in `supabase/tests/*.test.sql` cover the database functions
end to end: order pricing and coupons, payment, PIN throttling, onboarding
and the trial, plus tenant-consistency constraints. They run inside a
rolled-back transaction, several of them as the `authenticated` role so RLS
applies. CI (`.github/workflows/ci.yml`) runs all of the above on every pull
request, and fails if `database.types.ts` is stale.

## How auth works

Two separate authentication paths, matching the PRD:

- **Owners/managers** sign in with Supabase Auth (email/password). Every
  dashboard query runs through the user's own Supabase session, and RLS scopes
  rows to the restaurant(s) they belong to.
- **Restaurant staff** (waiter/kitchen/cashier) sign in with a role + 4-digit
  PIN at `/staff` — not a Supabase Auth session. The PIN is verified
  server-side against `staff.pin_hash` (scrypt); attempts are throttled
  (5 failures per device per 15 min, 20 per role per hour). A signed HttpOnly
  cookie (`STAFF_SESSION_SECRET`) carries the session for one 12-hour shift,
  with the expiry inside the signed payload. On every request the staff row
  is re-read, so deactivating someone (dashboard → Staff) or changing their
  role signs them out at once. Staff pages and actions then use the
  service-role client (bypassing RLS by design) — see
  `src/lib/staff-session.ts` and `src/app/actions/staff-ops.ts`.
- **Customers** never authenticate. The QR menu pages
  (`/menu/[restaurant]/[branch]/[table]`) read public menu data through
  anon-role RLS policies; placing an order, requesting the waiter or leaving
  feedback goes through a server action using the service-role client
  (`src/app/actions/orders.ts`, `waiter-requests.ts`, `feedback.ts`), since
  anon has no write access to those tables by design.
- **New owners** create their restaurant at `/onboarding` through the
  `create_restaurant` database function, which runs as the signed-in user
  (RLS applies) and creates the restaurant, owner membership and first branch
  in one transaction; a trigger starts the 14-day trial.

## Route map

```
/                                          marketing home
/login, /signup, /onboarding               owner auth + restaurant creation

/dashboard                                 owner/manager (Supabase Auth)
/dashboard/orders
/dashboard/tables
/dashboard/menu
/dashboard/offers
/dashboard/branding                        template, brand colour, font
/dashboard/staff
/dashboard/analytics
/dashboard/qr
/dashboard/settings

/staff                                     role + PIN sign-in
/staff/kitchen                             kitchen display (accept/preparing/ready)
/staff/waiter                              open waiter requests
/staff/cashier                             open bills

/admin                                     platform admin (Supabase Auth + platform_admins)
/admin/restaurants
/admin/users
/admin/subscriptions
/admin/payments
/admin/templates

/menu/[restaurant]/[branch]                general branch menu (entrance QR)
/menu/[restaurant]/[branch]/[table]         table-scoped menu (table QR)
/menu/[restaurant]/[branch]/order/[orderId] live order tracking (PRD §34)
```

## What's implemented vs. what's next

Covers PRD **Phase 1 (Foundation)** in full, plus working slices of Phases
2–4: real auth, restaurant/branch/table/menu/staff CRUD, QR code generation,
image uploads, menu templates and branding, the full customer ordering loop
(cart → coupon → order → live tracking), waiter-call requests, a functional
kitchen/waiter/cashier flow (including bill creation when a customer requests
the check), and near-real-time updates throughout.

**Customer ordering loop** (`src/lib/cart-types.ts`,
`src/components/menu/cart-provider.tsx`, `src/app/actions/orders.ts`): the
cart is client-side (localStorage, scoped per restaurant+branch+table) purely
for UX. `placeOrder` hands the cart's IDs to the `place_order` database
function (`supabase/migrations/..._transactional_orders.sql`), which prices
every line, validates and counts the coupon, and writes the order in a single
transaction — so a tampered client request can't change what the restaurant
gets paid, and a failure leaves nothing half-written. Placing an order
creates or reuses the table's active `table_sessions` row, sets the table to
`order_pending`, and redirects to a live tracking page. Payment goes through
`mark_bill_paid` the same way (one payment per bill, even on a double click).

**Images** (`src/lib/compress-image.ts`, `src/components/ui/image-upload.tsx`):
menu photos and restaurant logo/cover upload to Supabase Storage. Images are
downscaled to 900px and re-encoded to WebP **in the browser before upload** —
a 4 MB phone photo lands at ~150 KB, which keeps a full menu inside Supabase's
1 GB free tier and keeps served bytes small. They're served straight from
Storage rather than through `next/image`, since they're already sized and
optimising them again would burn Vercel transformation quota for no gain.
Storage RLS keys off the first path segment (`<restaurant_id>/…`), so one
restaurant cannot overwrite another's images — verified against a real
Postgres instance, including malformed paths.

**Templates & branding** (`src/lib/templates.ts`, `/dashboard/branding`): 11
seeded templates (3 free, 8 premium) change only presentation — layout,
typography, image shape — never menu data, per PRD §32. The owner's brand
colour is applied by overriding the `--brand` CSS custom property for the menu
subtree, so existing `bg-brand`/`text-brand` utilities follow automatically.
Premium templates are gated, in the form and in the server action: locked on
Starter or once the trial has ended, open during the trial (PRD §48 gives
trials Business-level features).

**Offers & promo codes** (`/dashboard/offers`): an offer is a percentage or
flat XAF discount, with optional minimum order, cap and date range. Guests
redeem it with a promo code created under the offer (optionally limited in
uses); `place_order` checks dates, limits and minimums and counts the use in
the same transaction as the order. Offer types without pricing rules yet
(BOGO, combo, happy hour) cannot be created, and their codes are refused at
checkout rather than silently giving no discount.

**Subscription & trial** (`src/lib/subscription.ts`): every restaurant
starts on a 14-day Business trial; the dashboard shows the days left. When it
ends, Business features (premium templates) are locked. Billing itself is not
automated yet: a platform admin moves a restaurant to a paid plan. Plan
prices follow the PRD §47 XAF hypothesis (5,000 / 10,000 / 20,000 XAF).

**Order lifecycle** is closed end to end: kitchen drives pending → accepted →
preparing → ready, the waiter's "Ready to serve" queue takes ready → served,
and the cashier recording payment completes every open order on the table
session and frees the table. Each transition writes to `order_status_history`.

**Payment** (Congo-first): cash, Mobile Money and card, with manual confirmation in the current release. Automated Mobile Money collection is intentionally provider-agnostic and can be added when a supported local provider/aggregator is connected.

**Near-real-time, not websocket Realtime**: customers and PIN-authenticated
staff never hold a Supabase Auth session, so a browser-side Supabase Realtime
subscription would connect as `anon` — which correctly *can't* read
orders/waiter_requests/bills under RLS (member-only policies). Rather than
weaken that boundary, the kitchen/waiter/cashier pages, the order tracking
page, and the owner dashboard poll via `router.refresh()` on a short interval
(`src/components/auto-refresh.tsx`). The owner dashboard *does* have a real
Supabase Auth session, so upgrading it to genuine `postgres_changes` Realtime
is a natural, low-risk follow-up; doing the same for staff/customers would
first need a real auth/token mechanism for them.

Deliberately not built yet (see PRD §53–56 for the phased roadmap):

- True websocket Realtime (see above — currently short-interval polling)
- Push notifications / sound alerts
- Self-serve billing: choosing and paying for a plan after the trial (an
  admin changes the subscription for now)
- Offer rules beyond percentage/flat: BOGO, combos, happy hours, weekday or
  time-of-day windows, item/category restrictions (columns exist, unused)
- Deleting menu items, and deleting a restaurant that already has orders
  (order lines keep a restricting reference to the menu item)
- Online payment gateway (automated Mobile Money collection is not yet connected; there's no
  automatic reconciliation — the cashier confirms receipt manually)
- local invoicing, printer integration
- Inventory, loyalty, CRM, WhatsApp — explicitly out of MVP scope per PRD §54

## Deployment notes

- **QR codes embed `NEXT_PUBLIC_SITE_URL`.** Menu, prices, offers and template
  can all change freely without reprinting — the QR only carries a URL — but
  changing the *domain* invalidates every printed code. Settle the final
  domain before printing table stickers. (A `qr_codes` table with a
  `target_url` column is already in the schema if an indirection layer is
  wanted later.)
- **Vercel's Hobby plan is non-commercial only** per their ToS; a revenue-
  generating deployment needs Pro or self-hosting.
- **Supabase free projects pause after ~7 days of inactivity** — fine for a
  live restaurant, worth knowing during intermittent testing.

## Security notes

- RLS is the real access-control boundary (PRD §51: "Restaurant A must never
  access Restaurant B's data") — verified against a real Postgres instance
  during development, including the owner-bootstrap edge case (a brand-new
  owner has no `restaurant_members` row yet when they create their first
  restaurant) and the negative case (a stranger cannot self-assign ownership
  of someone else's restaurant).
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and is only ever used server-side,
  where no Supabase Auth session exists to check against RLS: guest actions
  (ordering, waiter requests, feedback, order tracking, opening a table
  session), staff PIN sign-in and the staff pages/actions (after the session
  checks above), and platform-admin user listing. Every such path scopes its
  queries to the restaurant/branch explicitly.
- The money-moving functions (`place_order`, `mark_bill_paid`) and the PIN
  throttle are executable by the service role only; `create_restaurant` by
  signed-in users only. The SQL tests assert these grants.
