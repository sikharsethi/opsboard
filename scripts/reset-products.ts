import { db } from "../src/db";
import { products, stockMovements } from "../src/db/schema";

async function main() {
  await db.delete(stockMovements); // ledger first, because it references products
  await db.delete(products);
  console.log("Cleared products and stock movements");
  process.exit(0);
}

main();