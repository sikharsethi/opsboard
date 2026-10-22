import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { signOutAction } from "./actions-auth";

async function UserMenu() {
  await connection();
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex items-center gap-4 text-sm">
      <span>
        {session.user.name} ({session.user.role})
      </span>
      <form action={signOutAction}>
        <button className="underline">Sign out</button>
      </form>
    </div>
  );
}

async function AuthGate({ children }: { children: React.ReactNode }) {
  await connection();
  const session = await auth();
  if (!session) redirect("/login");
  return <>{children}</>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <nav className="flex items-center gap-6">
          <span className="font-semibold">OpsBoard</span>
          <Link href="/dashboard" className="text-sm hover:underline">
            Dashboard
          </Link>
          <Link href="/dashboard/products" className="text-sm hover:underline">
            Products
          </Link>
        </nav>
        <Suspense
          fallback={<span className="text-sm text-muted-foreground">...</span>}
        >
          <UserMenu />
        </Suspense>
      </header>
      <main className="p-6">
        <Suspense
          fallback={<p className="text-sm text-muted-foreground">Loading...</p>}
        >
          <AuthGate>{children}</AuthGate>
        </Suspense>
      </main>
    </div>
  );
}