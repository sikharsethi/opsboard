import { Suspense } from "react";
import { connection } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { products, stockMovements } from "@/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SalesChart, TopProductsChart, type DailySales } from "./charts";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

async function DashboardContent() {
  await connection();
  await requireRole("admin", "staff", "viewer");

  const salesLast30 = and(
    eq(stockMovements.reason, "sale"),
    sql`${stockMovements.createdAt} >= now() - interval '30 days'`
  );
  const dayExpr = sql<string>`to_char(${stockMovements.createdAt}, 'YYYY-MM-DD')`;

  const [stockRows, daily, top] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        priceCents: products.priceCents,
        reorderLevel: products.reorderLevel,
        stock: sql<number>`coalesce(sum(${stockMovements.quantity}), 0)`.mapWith(Number),
      })
      .from(products)
      .leftJoin(stockMovements, eq(stockMovements.productId, products.id))
      .groupBy(products.id),
    db
      .select({
        day: dayExpr,
        units: sql<number>`sum(-${stockMovements.quantity})`.mapWith(Number),
        revenueCents: sql<number>`sum(-${stockMovements.quantity} * ${products.priceCents})`.mapWith(Number),
      })
      .from(stockMovements)
      .innerJoin(products, eq(products.id, stockMovements.productId))
      .where(salesLast30)
      .groupBy(dayExpr),
    db
      .select({
        name: products.name,
        units: sql<number>`sum(-${stockMovements.quantity})`.mapWith(Number),
      })
      .from(stockMovements)
      .innerJoin(products, eq(products.id, stockMovements.productId))
      .where(salesLast30)
      .groupBy(products.id, products.name)
      .orderBy(desc(sql`sum(-${stockMovements.quantity})`))
      .limit(5),
  ]);

  // Fill days with no sales so the chart has a continuous 30-day axis
  const byDay = new Map(daily.map((d) => [d.day, d]));
  const series: DailySales[] = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(Date.now() - (29 - i) * 86_400_000).toISOString().slice(0, 10);
    const row = byDay.get(date);
    return {
      date,
      revenue: row ? Math.round(row.revenueCents) / 100 : 0,
      units: row ? row.units : 0,
    };
  });

  const totalUnits = stockRows.reduce((s, p) => s + p.stock, 0);
  const stockValueCents = stockRows.reduce((s, p) => s + p.stock * p.priceCents, 0);
  const lowStock = stockRows
    .filter((p) => p.stock <= p.reorderLevel)
    .sort((a, b) => a.stock - a.reorderLevel - (b.stock - b.reorderLevel));
  const revenue30 = series.reduce((s, d) => s + d.revenue, 0);
  const units30 = series.reduce((s, d) => s + d.units, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi label="Products" value={String(stockRows.length)} />
        <Kpi label="Units in stock" value={totalUnits.toLocaleString("en-US")} />
        <Kpi label="Stock value" value={money.format(stockValueCents / 100)} />
        <Kpi label="Low-stock products" value={String(lowStock.length)} />
        <Kpi label="Revenue, last 30 days" value={money.format(revenue30)} />
        <Kpi label="Units sold, last 30 days" value={units30.toLocaleString("en-US")} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Revenue, last 30 days</CardTitle>
            <CardDescription>Sales recorded in the stock ledger, at current prices.</CardDescription>
          </CardHeader>
          <CardContent>
            <SalesChart data={series} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top products</CardTitle>
            <CardDescription>Units sold in the last 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            {top.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales yet.</p>
            ) : (
              <TopProductsChart data={top} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Needs restocking</CardTitle>
          <CardDescription>Products at or below their reorder level.</CardDescription>
        </CardHeader>
        <CardContent>
          {lowStock.length === 0 ? (
            <p className="text-sm text-muted-foreground">Everything is above its reorder level.</p>
          ) : (
            <ul className="divide-y">
              {lowStock.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {p.name} <span className="font-mono text-xs text-muted-foreground">{p.sku}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {p.stock} left (reorder at {p.reorderLevel})
                    </span>
                    <Badge variant="destructive">Low stock</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading...</p>}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}