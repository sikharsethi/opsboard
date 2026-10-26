"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { importProducts, type ImportResult } from "./actions";

export function ImportForm() {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setResult(null);
    startTransition(async () => {
      setResult(await importProducts(formData));
    });
  }

  return (
    <div className="max-w-xl space-y-4">
      <form onSubmit={onSubmit} className="space-y-3">
        <Input name="file" type="file" accept=".csv,text/csv" required />
        <Button type="submit" disabled={pending}>
          {pending ? "Importing..." : "Import CSV"}
        </Button>
      </form>

      {result && !result.ok && <p className="text-sm text-red-600">{result.error}</p>}

      {result && result.ok && (
        <div className="space-y-2 rounded-md border p-4 text-sm">
          <p className="font-medium">
            Imported {result.imported} of {result.total} rows.
          </p>
          {result.errors.length > 0 && (
            <>
              <p className="text-red-600">{result.errors.length} row(s) skipped:</p>
              <ul className="max-h-48 list-disc space-y-1 overflow-auto pl-5">
                {result.errors.map((e) => (
                  <li key={e.row}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}