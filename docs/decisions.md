# Decisions

## 2026-10-19: Stack
TypeScript full-stack: Next.js (App Router), PostgreSQL (Neon), Drizzle ORM,
Auth.js, Tailwind + shadcn/ui, Vitest + Playwright, Vercel.
Reason: one language end to end, cheap hosting, matches what international
clients expect. Spring Boot kept as a secondary skill, not used here.

## 2026-10-19: Stock is a ledger
Stock level is the sum of `stock_movements`, not a stored number.
Reason: full audit trail and no drift between stored and real stock.

## Environment
Project lives at D:\dev\opsboard (outside OneDrive on purpose).