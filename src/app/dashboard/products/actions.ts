"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { products, stockMovements } from "@/db/schema";
import { requireRole } from "@/lib/auth-guard";

const productSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(64),
  name: z.string().trim().min(1, "Name is required").max(200),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  reorderLevel: z.coerce.number().int().min(0),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createProduct(formData: FormData): Promise<ActionResult> {
  await requireRole("admin", "staff");

  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const { sku, name, price, reorderLevel } = parsed.data;

  try {
    await db.insert(products).values({
      sku,
      name,
      priceCents: Math.round(price * 100),
      reorderLevel,
    });
  } catch {
    return { ok: false, error: "A product with this SKU already exists." };
  }

  revalidatePath("/dashboard/products");
  return { ok: true };
}

const adjustSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce
    .number()
    .int()
    .refine((n) => n !== 0, "Quantity cannot be 0"),
  reason: z.enum(["purchase", "sale", "adjustment", "return"]),
  note: z.string().trim().max(500).optional(),
});

export async function adjustStock(formData: FormData): Promise<ActionResult> {
  const user = await requireRole("admin", "staff");

  const parsed = adjustSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const { productId, reason, note } = parsed.data;
  let { quantity } = parsed.data;

  // Enforce the sign rule on the server, never trust the browser
  if (reason === "sale") quantity = -Math.abs(quantity);
  if (reason === "purchase" || reason === "return") quantity = Math.abs(quantity);

  const result = await db.transaction(async (tx) => {
    const [product] = await tx
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId))
      .for("update"); // lock the product row so two requests can't race
    if (!product) return { ok: false as const, error: "Product not found." };

    const [{ current }] = await tx
      .select({
        current: sql<number>`coalesce(sum(${stockMovements.quantity}), 0)`.mapWith(Number),
      })
      .from(stockMovements)
      .where(eq(stockMovements.productId, productId));

    if (current + quantity < 0) {
      return {
        ok: false as const,
        error: `Not enough stock. Current stock is ${current}.`,
      };
    }

    await tx.insert(stockMovements).values({
      productId,
      quantity,
      reason,
      note: note || null,
      userId: user.id,
    });
    return { ok: true as const };
  });

  if (result.ok) revalidatePath("/dashboard/products");
  return result;
}