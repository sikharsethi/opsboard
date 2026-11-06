# OpsBoard

Inventory and operations dashboard that replaces the spreadsheet: upload a CSV, track stock through an audit-friendly ledger, and see what needs restocking.

**Live demo:** https://opsboard-ten.vercel.app/login (use the one-click demo buttons on the login page)

![Dashboard](docs/screenshots/dashboard.png)

## What it does

- **Role-based access** (admin, staff, viewer) enforced on the server, not just hidden in the UI
- **Products and live stock levels**, with low-stock alerts against a per-product reorder level
- **Stock ledger**: every change (purchase, sale, return, adjustment, import) is a row with who, when and why. Current stock is the sum of the ledger, so there is a full audit trail and no drifting counters
- **CSV import** with row-by-row validation: bad rows are reported by row number, good rows still import, and re-importing updates existing SKUs instead of duplicating them
- **Dashboard**: KPI cards, 30-day revenue trend, top products, and a restock list

| Products and stock | CSV import |
|---|---|
| ![Products](docs/screenshots/products.png) | ![Import](docs/screenshots/import.png) |

## Roles

| Role | View | Add products / adjust stock | Import CSV |
|---|---|---|---|
| Admin | yes | yes | yes |
| Staff | yes | yes | yes |
| Viewer | yes | no | no |

Every server action calls `requireRole()` first, so a viewer cannot change data even by calling an action directly.

## Tech stack

- **Next.js 16** (App Router, Server Actions, Cache Components) and **TypeScript**
- **PostgreSQL** on Neon, **Drizzle ORM** with versioned SQL migrations
- **Auth.js** (credentials, JWT sessions), bcrypt password hashing
- **Tailwind CSS**, **shadcn/ui** (Radix), **Recharts**
- **Zod** for input validation, **Papa Parse** for CSV

## Engineering decisions

- **Stock is a ledger, not a number.** `stock_movements` is append-only; stock is `SUM(quantity)`. Corrections are new rows, never edits.
- **Server-side stock rules.** Signs (sales remove stock, purchases add it) and the "never below zero" check run on the server inside a transaction with a row lock, so two simultaneous sales cannot oversell the last unit.
- **Money as integer cents.** No floating-point rounding bugs. Order items will store the price at time of sale so later price changes do not rewrite history.
- **Authorization at the data boundary.** The layout redirects unauthenticated users, and every page and action also checks the session and role itself.
- **Migrations live in the repo** (`drizzle/`), so the database is reproducible on any Postgres host.

## Getting started

Requirements: Node 20+ and a PostgreSQL database (a free Neon project works).

```bash
git clone https://github.com/sikharsethi/opsboard.git
cd opsboard
npm install
cp .env.example .env.local   # then fill in the values
npm run db:migrate           # create the tables
npm run db:seed              # demo users
npm run db:seed:products     # demo products and 30 days of sales
npm run dev
```

Open http://localhost:3000. Demo accounts after seeding (local use only):
`admin@opsboard.dev`, `staff@opsboard.dev`, `viewer@opsboard.dev`, all with password `demo1234`.

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Session signing secret (`npx auth secret`) |
| `DEMO_MODE` | `true` shows the one-click demo login. Leave unset in real client deployments |

### Scripts

`db:generate`, `db:migrate`, `db:studio`, `db:seed`, `db:seed:products`, `db:reset:products` (demo data only, never run on real data)

## How I would adapt this to your business

The core (roles, ledger, import, dashboard) is reusable. Typical client changes:

- Your own fields: batch numbers, expiry dates, warehouses, units of measure
- Import matched to your existing spreadsheet columns
- Orders, suppliers and purchase orders
- Integrations: accounting, e-commerce, email or Slack alerts for low stock
- AI features, for example asking questions about stock in plain English

## Roadmap

- Orders and customers, with stock deducted through the ledger
- Product editing, search, filters and pagination
- CSV export
- Automated tests (Vitest, Playwright) and CI
- Error tracking

## Author

Sikhar Sethi, full-stack developer. Available for freelance projects: [sikharsethi5@gmail.com] | https://github.com/sikharsethi