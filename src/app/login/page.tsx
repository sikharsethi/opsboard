import { Suspense } from "react";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

async function LoginError({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  if (!error) return null;
  return <p className="text-sm text-red-600">Invalid email or password.</p>;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/dashboard",
      });
    } catch (e) {
      if (e instanceof AuthError) redirect("/login?error=1");
      throw e; // lets the success redirect through
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <form action={login} className="w-full max-w-sm space-y-4 rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Sign in to OpsBoard</h1>
        <Suspense>
          <LoginError searchParams={searchParams} />
        </Suspense>
        <input name="email" type="email" placeholder="Email" required
          className="w-full rounded-md border px-3 py-2" />
        <input name="password" type="password" placeholder="Password" required
          className="w-full rounded-md border px-3 py-2" />
        <button type="submit"
          className="w-full rounded-md bg-black px-3 py-2 text-white hover:bg-zinc-800">
          Sign in
        </button>
      </form>
    </main>
  );
}