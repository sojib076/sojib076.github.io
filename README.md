# Shibu Store — local grocery pre-order & delivery

A mobile-first grocery pre-order and delivery platform for one neighbourhood
shop in Bangladesh, built so nearby customers can browse, build a basket, and
get it delivered or collect it from the counter.

It is deliberately **not** a general e-commerce template. Everything is shaped
around one real workflow:

> customer opens the site → finds products → adds groceries → meets the minimum
> order → picks delivery or pickup → sees the delivery fee → places the order →
> the shop receives it → packs it → the customer gets it.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, Server Actions) |
| Language | TypeScript |
| UI | MUI v6 (Material UI) with a custom grocery-shop theme |
| Database | MongoDB (official `mongodb` driver — no ORM) |
| Auth | Phone + one-time code for customers, email + password for staff; JWT in an httpOnly cookie |
| Images | Local disk by default, or any S3-compatible bucket |
| Messaging | Pluggable provider (console → SMS/WhatsApp gateway) |

## Getting started

```bash
npm install
cp .env.example .env      # then fill in MONGODB_URI and AUTH_SECRET
npm run db:seed           # creates the store, 15 categories, ~87 products
npm run dev               # http://localhost:3000
```

`AUTH_SECRET` must be at least 32 characters:

```bash
openssl rand -base64 32
```

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` before seeding to get an owner
account; sign in at `/admin`.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | TypeScript, no emit |
| `npm run db:seed` | Seed/refresh the catalogue (safe to re-run) |
| `npm run db:indexes` | Apply all MongoDB indexes |
| `npm run check:pricing` | Runs the pricing-rule checks (minimum order, zone fees, free-delivery threshold, discounts) |
| `npx tsx scripts/generate-icons.ts` | Redraws the PWA icons from the brand colours |

## First things to do after seeding

The shop's phone and WhatsApp number (`01781736024`) are seeded. The
**address and map link are deliberately left empty** — publishing a guessed
location for a real shop is worse than publishing nothing, and the same details
feed the local-business structured data. Fill them in at
**Admin → Settings → Store details**.

The admin dashboard opens with a **setup checklist** that flags anything still
missing — no delivery areas, no products, no order alerts, no SMS gateway — so
the owner finds out from the dashboard rather than from a lost order.

Seeded prices are realistic starting points, not quotes. Correct them in
**Admin → Products**; inline price editing and an in-stock toggle are on the
list itself.

## How it is put together

### Money

Every amount is an integer number of **poisha** (1 BDT = 100 poisha), never a
float. Percentage discounts and split delivery fees would otherwise drift, and
a grocery bill that is one poisha off is a bill the owner stops trusting.
Display goes through `formatBDT`, which uses South Asian digit grouping —
one lakh taka reads `৳1,00,000`, not `৳100,000`.

### Nothing commercial is hardcoded

Minimum order, delivery fee, free-delivery threshold, per-area charges and
overrides, delivery slots, opening hours, preparation time, pickup
availability, product prices and stock all live in the database and are edited
from the admin dashboard. `src/lib/pricing.ts` is the single source of truth
for what an order costs; it is pure and synchronous, so `npm run check:pricing`
exercises it directly.

Fee precedence, most specific first:

1. free-delivery threshold (per-area override, else store-wide)
2. a matching subtotal band on the area
3. the area's flat fee
4. the store's default fee

### The cart is server-owned

Carts live in MongoDB keyed by an httpOnly cookie. The browser may send product
ids and quantities — never prices. That also means a cart survives switching
from mobile data to wifi and carries over when the shopper signs in.

Delivery fees are shown from the first cart screen, never revealed at the last
step, and a cart under the minimum says exactly how much more is needed
("Add ৳60 more to place your order").

### Document model

Data is modelled for a document database rather than transliterated from SQL:

- embedded where it is only read with its parent — a product's photos, stock
  and price; an order's lines, status history and payment; a store's settings
  and opening hours;
- separate collections where it is queried on its own — products, orders,
  customers, categories, delivery areas.

The practical win: **an order, including all its lines, is one document**, so
placing an order is a single atomic insert. No multi-document transaction is
needed, which means the app is just as correct against a standalone `mongod` on
a cheap VPS as against an Atlas replica set. Bookkeeping that follows (stock,
purchase counts, emptying the cart) is ordered so that a failure can never lose
the order itself.

Order numbers (`SS-260815-004`) come from an atomic `$inc` on a per-day
counter, so two customers checking out in the same second cannot collide.

Indexes are declared in `src/lib/db/indexes.ts` and applied automatically on
first use, or explicitly with `npm run db:indexes`.

### Built for one shop, ready for many

Every tenant-owned document carries `storeId`, and slugs are unique *per
store*. `getStore()` is the only place that answers "which store is this
request for?" — today it returns the single seeded store; later it can read a
subdomain or a `/[storeSlug]` route segment without touching anything
downstream. `Store`, `User`, `Customer`, `Product`, `Category`, `Inventory`,
`Cart`, `Order`, `OrderItem`, `Address`, `DeliveryZone`, `DeliveryFee`,
`DeliverySlot`, `Payment`, `Coupon`, `Review` and `Notification` all exist
already, including the ones the MVP does not surface yet.

### Repeat ordering

Order history, favourites, "you buy these often" (from the shopper's own order
history) and one-tap **Order again**. Reordering never lies: unavailable items
are reported by name instead of silently dropped, and price changes since the
original order are surfaced.

### WhatsApp is a real ordering channel

The shop already runs on WhatsApp (`01781736024`), so the site treats it as a
way to order rather than a support afterthought:

- a floating WhatsApp button on every storefront page, lifted above the mobile
  bottom navigation;
- **"Send this order on WhatsApp"** in the cart, which pre-fills the entire
  basket, per-line prices, delivery area, fee and total as a message — so a
  customer who would rather confirm by chat still reaches the shop with an
  exact, priced order instead of a vague voice call;
- click-to-chat and call buttons on the order page and throughout the admin.

None of this needs an API account, which means the shop can take orders from
day one, before any paid gateway exists.

### Notifications

`src/lib/notifications` writes every message to a collection first, then hands
it to the active provider, so a gateway outage leaves a visible FAILED record
instead of silence. New orders are announced to the shop on WhatsApp by
default. With no gateway configured, messages (including sign-in codes) are
logged to the server console — the entire flow works locally with no paid
account.

### Installs to the home screen

A manifest and generated icons make the shop installable, so a weekly customer
reopens it with one tap. The icons are drawn in code
(`scripts/generate-icons.ts`) from the brand colours rather than committed as
opaque binaries, so changing the logo is a reviewable diff.

### Fails gracefully

Skeleton loading screens instead of a blank white page on a slow connection, a
plain-language error screen that keeps the cart and offers the shop's phone
number, and a 404 that offers search and categories rather than a dead end.

### SEO

Per-page metadata and canonicals, `GroceryStore` + `Product` + `BreadcrumbList`
JSON-LD, a database-driven sitemap and robots rules that keep `/cart`,
`/checkout`, `/orders`, `/account` and `/admin` out of the index. Structured
data only ever contains what the owner actually entered — there are no invented
reviews, ratings or business details anywhere in this repository.

### Built for slow connections

MUI imports are tree-shaken, images are AVIF/WebP with long cache lifetimes,
category tiles use emoji instead of downloaded icons, product photos fall back
to a named tile rather than a broken image, and inputs are 16px so iOS does not
zoom the checkout form.

## Deployment

This app needs a **Node.js host** — it uses Server Actions, server-rendered
pages and a live database.

> **Note about this repository:** `sojib076.github.io` is a GitHub Pages repo,
> and GitHub Pages only serves static files. It cannot run this application.
> Deploy to Vercel, Render, Railway, Fly.io or any VPS, and point the domain
> (the `CNAME` file currently holds `toliapp.me`) at that host instead.

Deployment checklist:

1. Provision MongoDB (Atlas free tier is enough to start) and set `MONGODB_URI`.
2. Set `AUTH_SECRET` and `NEXT_PUBLIC_SITE_URL`.
3. Run `npm run db:seed` once against the production database.
4. Configure object storage (`S3_*`) if product photos should not live on the
   app server's disk.
5. Add an SMS/WhatsApp gateway (`SMS_GATEWAY_*`) when you want real messages.

## Not built yet (on purpose)

The architecture leaves room for these, but the MVP does not include them:
multi-store marketplace, rider app and delivery network, recommendations
("frequently bought together"), subscriptions and recurring baskets, business
/bulk accounts, and online payment. Payment is modelled end-to-end
(`payment.provider` / `payment.reference`) so a gateway can be added without a
schema change — today the options are cash on delivery and pay at store.
