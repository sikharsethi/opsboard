"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type DailySales = { date: string; revenue: number; units: number };
export type TopProduct = { name: string; units: number };

const salesConfig = {
  revenue: { label: "Revenue ($)", color: "#2563eb" },
} satisfies ChartConfig;

const topConfig = {
  units: { label: "Units sold", color: "#0f766e" },
} satisfies ChartConfig;

function fmtDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function SalesChart({ data }: { data: DailySales[] }) {
  return (
    <ChartContainer config={salesConfig} className="h-[280px] w-full">
      <AreaChart data={data} margin={{ left: 4, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={fmtDate}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={(v: number) => `$${v}`}
        />
        <ChartTooltip
          content={<ChartTooltipContent labelFormatter={(v) => fmtDate(String(v))} />}
        />
        <Area
          dataKey="revenue"
          type="monotone"
          stroke="var(--color-revenue)"
          fill="var(--color-revenue)"
          fillOpacity={0.15}
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function TopProductsChart({ data }: { data: TopProduct[] }) {
  return (
    <ChartContainer config={topConfig} className="h-[280px] w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16 }}>
        <CartesianGrid horizontal={false} />
        <YAxis
          dataKey="name"
          type="category"
          tickLine={false}
          axisLine={false}
          width={150}
          tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)}
        />
        <XAxis type="number" hide />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="units" fill="var(--color-units)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}