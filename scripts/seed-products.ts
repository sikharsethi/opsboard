import { db } from "../src/db";
import { products, stockMovements, users } from "../src/db/schema";
import { eq } from "drizzle-orm";

const items = [
  ["WID-001", "Steel Widget (small)", 450, 20],
  ["WID-002", "Steel Widget (large)", 780, 15],
  ["BLT-010", "Hex Bolt M8 (box of 100)", 1250, 10],
  ["BLT-011", "Hex Bolt M10 (box of 100)", 1690, 10],
  ["NUT-020", "Lock Nut M8 (box of 100)", 990, 10],
  ["GSK-030", "Rubber Gasket 50mm", 320, 30],
  ["GSK-031", "Rubber Gasket 80mm", 410, 30],
  ["PIP-040", "PVC Pipe 1m", 860, 25],
  ["PIP-041", "PVC Pipe 2m", 1480, 15],
  ["TPE-050", "Industrial Tape Roll", 540, 40],
  ["GLV-060", "Work Gloves (pair)", 690, 50],
  ["HLM-070", "Safety Helmet", 1890, 12],
  ["LBL-080", "Shipping Labels (500)", 1150, 8],
  ["BOX-090", "Carton Box 30x30", 210, 100],
  ["BOX-091", "Carton Box 50x40", 340, 80],
] as const;

async function main() {
  const [admin] = await db.select().from(users).where(eq(users.email, "admin@opsboard.dev"));
  if (!admin) throw new Error("Run npm run db:seed first (users are missing).");

  for (const [sku, name, priceCents, reorderLevel] of items) {
    const [product] = await db
      .insert(products)
      .values({ sku, name, priceCents, reorderLevel })
      .onConflictDoNothing()
      .returning();
    if (!product) continue; // already seeded

    // Opening stock, then a couple of movements so the history looks real
    const opening = reorderLevel * 3 + Math.floor(Math.random() * 40);
    const sold = Math.floor(opening * (0.2 + Math.random() * 0.7)); // max 90% of opening, never negative
    await db.insert(stockMovements).values([
      { productId: product.id, quantity: opening, reason: "purchase", note: "Opening stock", userId: admin.id },
      { productId: product.id, quantity: -sold, reason: "sale", note: "Recent sales", userId: admin.id },
    ]);
  }
  console.log("Seeded products and stock");
  process.exit(0);
}

main();