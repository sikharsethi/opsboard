import bcrypt from "bcryptjs";
import { db } from "../src/db";
import { users } from "../src/db/schema";

// Demo password for local/demo data only. Real clients get their own.
const DEMO_PASSWORD = "demo1234";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await db
    .insert(users)
    .values([
      { email: "admin@opsboard.dev", name: "Demo Admin", role: "admin", passwordHash },
      { email: "staff@opsboard.dev", name: "Demo Staff", role: "staff", passwordHash },
      { email: "viewer@opsboard.dev", name: "Demo Viewer", role: "viewer", passwordHash },
    ])
    .onConflictDoNothing();
  console.log("Seeded demo users");
  process.exit(0);
}

main();