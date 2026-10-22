import { Suspense } from "react";
import { connection } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { products, stockMovements } from "@/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

async function ProductsTable() {
  await connection();
  await requireRole("admin", "staff", "viewer");

  const rows = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      priceCents: products.priceCents,
      reorderLevel: products.reorderLevel,
      stock: sql<number>`coalesce(sum(${stockMovements.quantity}), 0)`.mapWith(
        Number
      ),
    })
    .from(products)
    .leftJoin(stockMovements, eq(stockMovements.productId, products.id))
    .groupBy(products.id)
    .orderBy(products.name);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>SKU</TableHead>
          <TableHead>Name</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">In stock</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={5}
              className="text-center text-muted-foreground"
            >
              No products yet.
            </TableCell>
          </TableRow>
        )}
        {rows.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="font-mono text-xs">{p.sku}</TableCell>
            <TableCell>{p.name}</TableCell>
            <TableCell className="text-right">
              ${(p.priceCents / 100).toFixed(2)}
            </TableCell>
            <TableCell className="text-right">{p.stock}</TableCell>
            <TableCell>
              {p.stock <= p.reorderLevel ? (
                <Badge variant="destructive">Low stock</Badge>
              ) : (
                <Badge variant="secondary">OK</Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function ProductsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Products</h1>
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">Loading...</p>}
      >
        <ProductsTable />
      </Suspense>
    </div>
  );
}