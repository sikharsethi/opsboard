import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { ImportForm } from "./import-form";

async function ImportContent() {
  await connection();
  const session = await auth();
  if (!session) redirect("/login");

  if (session.user.role === "viewer") {
    return (
      <p className="rounded-md border p-4 text-sm">
        You don&apos;t have permission to import products. Ask an admin or
        staff member for access.
      </p>
    );
  }

  return <ImportForm />;
}

export default function ImportPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Import products</h1>
      <p className="text-sm text-muted-foreground">
        Upload a CSV with columns:{" "}
        <code>sku, name, price, reorder_level, quantity</code>. Existing SKUs
        are updated, new ones are created.{" "}
        <a href="/sample-products.csv" download className="underline">
          Download a sample file
        </a>
        .
      </p>
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">Loading...</p>}
      >
        <ImportContent />
      </Suspense>
    </div>
  );
}