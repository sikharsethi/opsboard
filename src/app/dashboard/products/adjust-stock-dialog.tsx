"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { adjustStock } from "./actions";

export function AdjustStockDialog({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("purchase");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Users type a normal number. Sales remove stock, purchases and returns add it,
    // and "adjustment" uses the sign exactly as typed.
    const typed = Number(formData.get("quantity"));
    const signed =
      reason === "sale"
        ? -Math.abs(typed)
        : reason === "adjustment"
        ? typed
        : Math.abs(typed);
    formData.set("quantity", String(signed));
    formData.set("productId", productId);
    formData.set("reason", reason);

    setError(null);
    startTransition(async () => {
      const result = await adjustStock(formData);
      if (result.ok) {
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Adjust stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>{productName}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
          >
            <option value="purchase">Purchase (adds stock)</option>
            <option value="sale">Sale (removes stock)</option>
            <option value="return">Customer return (adds stock)</option>
            <option value="adjustment">Adjustment (use + or -)</option>
          </select>
          <Input
            name="quantity"
            type="number"
            step="1"
            placeholder={
              reason === "adjustment" ? "e.g. -5 or 10" : "Quantity (e.g. 10)"
            }
            required
          />
          <Input name="note" placeholder="Note (optional)" maxLength={500} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Saving..." : "Save movement"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}