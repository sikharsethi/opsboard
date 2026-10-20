import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="font-semibold">OpsBoard</span>
        <div className="flex items-center gap-4 text-sm">
          <span>{session.user.name} ({session.user.role})</span>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button className="underline">Sign out</button>
          </form>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}