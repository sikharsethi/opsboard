"use server";

import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { importJobs, products, stockMovements } from "@/db/schema";
import { requireRole } from "@/lib/auth-guard";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_ROWS = 5000;

export type RowError = { row: number; message: string };
export type ImportResult =
  | { ok: true; total: number; imported: number; errors: RowError[] }
  | { ok: false; error: string };

const textSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(64),
  name: z.string().trim().min(1, "Name is required").max(200),
});

export async function importProducts(formData: FormData): Promise<ImportResult> {
  const user = await requireRole("admin", "staff");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose a CSV file." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File is too large (max 2 MB)." };
  }

  const parsedCsv = Papa.parse<Record<string, string>>(await file.text(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const headers = parsedCsv.meta.fields ?? [];
  const missing = ["sku", "name", "price"].filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return { ok: false, error: `Missing required column(s): ${missing.join(", ")}.` };
  }
  if (parsedCsv.data.length === 0) return { ok: false, error: "The file has no data rows." };
  if (parsedCsv.data.length > MAX_ROWS) {
    return { ok: false, error: `Too many rows (max ${MAX_ROWS}).` };
  }

  const errors: RowError[] = [];
  const seen = new Set<string>();
  const valid: {
    sku: string;
    name: string;
    priceCents: number;
    reorderLevel: number;
    quantity: number;
  }[] = [];

  parsedCsv.data.forEach((raw, i) => {
    const row = i + 2; // row 1 is the header
    const text = textSchema.safeParse(raw);
    if (!text.success) {
      errors.push({ row, message: text.error.issues[0].message });
      return;
    }
    const { sku, name } = text.data;

    const price = (raw.price ?? "").trim();
    if (!/^\d+(\.\d{1,2})?$/.test(price)) {
      errors.push({ row, message: "Price must be a number like 12.50." });
      return;
    }
    const reorder = (raw.reorder_level ?? "").trim() || "0";
    if (!/^\d+$/.test(reorder)) {
      errors.push({ row, message: "Reorder level must be a whole number." });
      return;
    }
    const qty = (raw.quantity ?? "").trim() || "0";
    if (!/^\d+$/.test(qty)) {
      errors.push({ row, message: "Quantity must be a whole number (0 or more)." });
      return;
    }
    if (seen.has(sku.toLowerCase())) {
      errors.push({ row, message: `Duplicate SKU "${sku}" in this file.` });
      return;
    }
    seen.add(sku.toLowerCase());

    valid.push({
      sku,
      name,
      priceCents: Math.round(Number(price) * 100),
      reorderLevel: Number(reorder),
      quantity: Number(qty),
    });
  });

  await db.transaction(async (tx) => {
    for (let i = 0; i < valid.length; i += 500) {
      const chunk = valid.slice(i, i + 500);

      // Insert new products, update existing ones (matched by SKU)
      const saved = await tx
        .insert(products)
        .values(
          chunk.map((r) => ({
            sku: r.sku,
            name: r.name,
            priceCents: r.priceCents,
            reorderLevel: r.reorderLevel,
          }))
        )
        .onConflictDoUpdate({
          target: products.sku,
          set: {
            name: sql`excluded.name`,
            priceCents: sql`excluded.price_cents`,
            reorderLevel: sql`excluded.reorder_level`,
          },
        })
        .returning({ id: products.id, sku: products.sku });

      const idBySku = new Map(saved.map((p) => [p.sku, p.id]));
      const movements = chunk
        .filter((r) => r.quantity > 0)
        .map((r) => ({
          productId: idBySku.get(r.sku)!,
          quantity: r.quantity,
          reason: "import" as const,
          note: `CSV import: ${file.name}`,
          userId: user.id,
        }));
      if (movements.length > 0) await tx.insert(stockMovements).values(movements);
    }

    await tx.insert(importJobs).values({
      userId: user.id,
      filename: file.name,
      status: "completed",
      totalRows: parsedCsv.data.length,
      importedRows: valid.length,
      rowErrors: errors,
    });
  });

  revalidatePath("/dashboard/products");
  return { ok: true, total: parsedCsv.data.length, imported: valid.length, errors };
}