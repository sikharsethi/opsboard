import { redirect } from "next/navigation";
import { auth } from "@/auth";

type Role = "admin" | "staff" | "viewer";

export async function requireRole(...allowed: Role[]) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!allowed.includes(session.user.role)) {
    throw new Error("Forbidden");
  }
  return session.user;
}