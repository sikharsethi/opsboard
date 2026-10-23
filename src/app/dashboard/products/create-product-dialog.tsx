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
import { createProduct } from "./actions";

export function CreateProductDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await createProduct(formData);
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
        <Button>Add product</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add product</DialogTitle>
          <DialogDescription>
            New products start with 0 stock. Add stock afterwards.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <Input name="sku" placeholder="SKU (e.g. WID-001)" required />
          <Input name="name" placeholder="Product name" required />
          <Input
            name="price"
            type="number"
            step="0.01"
            min="0"
            placeholder="Price (e.g. 12.50)"
            required
          />
          <Input
            name="reorderLevel"
            type="number"
            min="0"
            step="1"
            defaultValue={0}
            placeholder="Reorder level"
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Saving..." : "Save product"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}