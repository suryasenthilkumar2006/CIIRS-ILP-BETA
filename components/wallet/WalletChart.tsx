"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export interface ChartDataPoint {
  date: string;
  balance: number;
  amount: number;
  reason: string;
}

interface WalletChartProps {
  data: ChartDataPoint[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/95 p-3 shadow-xl backdrop-blur-md text-xs">
        <p className="font-semibold text-zinc-200">{label}</p>
        <div className="mt-1 space-y-1">
          <p className="text-emerald-400 font-bold">
            Balance: {data.balance.toLocaleString()} Credits
          </p>
          {data.amount !== 0 && (
            <p className="text-zinc-400">
              Change:{" "}
              <span className={data.amount > 0 ? "text-emerald-400 font-medium" : "text-red-400 font-medium"}>
                {data.amount > 0 ? `+${data.amount}` : data.amount}
              </span>
            </p>
          )}
          {data.reason && (
            <p className="text-zinc-500 max-w-[200px] truncate">{data.reason}</p>
          )}
        </div>
      </div>
    );
  }
  return null;
}

export default function WalletChart({ data }: WalletChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 text-sm text-zinc-500">
        No credit history available to chart yet
      </div>
    );
  }

  // Ensure there are at least two points for a clean visual area curve
  const chartPoints =
    data.length === 1
      ? [{ date: "Start", balance: 0, amount: 0, reason: "Initial balance" }, ...data]
      : data;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartPoints}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#71717a"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#71717a"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `${val}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="#10b981"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#emeraldGradient)"
            activeDot={{ r: 5, fill: "#10b981", stroke: "#047857", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
