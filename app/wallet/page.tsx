import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import GreenCredit from "@/models/GreenCredit";
import WalletChart, { ChartDataPoint } from "@/components/wallet/WalletChart";
import {
  Coins,
  Leaf,
  TrendingUp,
  ArrowUpRight,
  History,
  ShieldCheck,
  Award,
  Calendar,
  ArrowLeft,
  Layers,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Green Credits Wallet | CIIRS",
  description:
    "Track your verified circular economy Green Credits, transaction ledger, and ecological impact.",
};

export default async function WalletPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  await connectDB();
  const userId = (session.user as any).id;

  // 1. Fetch current User greenCreditBalance
  const user = await User.findById(userId).lean();
  const balance = user?.greenCreditBalance ?? 0;

  // 2. Fetch GreenCredit transaction history sorted descending
  const rawCredits = await GreenCredit.find({ userId })
    .sort({ createdAt: -1 })
    .lean();

  const creditTransactions = JSON.parse(JSON.stringify(rawCredits));

  // 3. Prepare chronological data series for Recharts line/area chart
  const chartData: ChartDataPoint[] = creditTransactions
    .slice()
    .reverse()
    .map((item: any) => ({
      date: item.createdAt
        ? new Date(item.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "N/A",
      balance: item.balanceAfter ?? 0,
      amount: item.amount ?? 0,
      reason: item.reason || "Credit issuance",
    }));

  const totalEarned = creditTransactions.reduce(
    (acc: number, curr: any) => (curr.amount > 0 ? acc + curr.amount : acc),
    0
  );

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 sm:px-6 lg:px-8 text-zinc-100">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Link
                href="/dashboard"
                className="hover:text-zinc-200 transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Dashboard
              </Link>
              <span className="text-zinc-600">/</span>
              <span className="text-emerald-400 font-medium">Eco Wallet</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>Green Credits Wallet</span>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                Verified Ledger
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              Cryptographically verified environmental credits awarded for circular waste diversion
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="outline"
              className="border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            >
              <Link href="/contracts">View Contracts</Link>
            </Button>
            <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-900/30">
              <Link href="/listings/new">List New Waste</Link>
            </Button>
          </div>
        </div>

        {/* Hero KPI Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {/* Main Balance Card */}
          <Card className="sm:col-span-2 relative overflow-hidden border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-900/90 to-emerald-950/40 text-zinc-100 shadow-xl">
            <div className="absolute right-0 top-0 -mt-6 -mr-6 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-emerald-400" />
                  Available Green Credits
                </span>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-300 border border-emerald-500/30">
                  1 GC = 0.2 kg Waste
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
                  {balance.toLocaleString()}
                </span>
                <span className="text-lg font-medium text-emerald-400">Credits</span>
              </div>
              <p className="text-xs text-zinc-400 max-w-lg leading-relaxed">
                Awarded upon successful physical pickup verification. Can be redeemed for ESG compliance reporting, marketplace fee discounts, and verified carbon offset tokens.
              </p>
            </CardContent>
          </Card>

          {/* Quick Metrics Card */}
          <Card className="border-zinc-800 bg-zinc-950/80 text-zinc-100 shadow-xl flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <Leaf className="h-4 w-4 text-emerald-400" />
                Lifetime Impact Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                <span className="text-xs text-zinc-400">Lifetime Earned</span>
                <span className="font-semibold text-emerald-400">
                  +{totalEarned.toLocaleString()} GC
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                <span className="text-xs text-zinc-400">Estimated CO₂ Saved</span>
                <span className="font-semibold text-blue-400">
                  {(totalEarned * 0.5).toFixed(1)} kg CO₂
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Verified Pickups</span>
                <span className="font-semibold text-zinc-200">
                  {creditTransactions.length} events
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Balance Over Time Chart Section */}
        <Card className="border-zinc-800 bg-zinc-950/80 text-zinc-100 shadow-xl">
          <CardHeader className="border-b border-zinc-800/80 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg text-white">Credit Balance History</CardTitle>
                  <CardDescription className="text-xs text-zinc-400">
                    Cumulative balance trajectory over time
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <WalletChart data={chartData} />
          </CardContent>
        </Card>

        {/* Transaction History Ledger */}
        <Card className="border-zinc-800 bg-zinc-950/80 text-zinc-100 shadow-xl">
          <CardHeader className="border-b border-zinc-800/80 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg text-white">Transaction Ledger</CardTitle>
                  <CardDescription className="text-xs text-zinc-400">
                    Comprehensive audit trail of all credit events
                  </CardDescription>
                </div>
              </div>
              <span className="text-xs text-zinc-500">
                {creditTransactions.length} Record{creditTransactions.length === 1 ? "" : "s"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {creditTransactions.length === 0 ? (
              <div className="py-12 text-center text-sm text-zinc-500">
                No credit transactions recorded yet. Complete waste pickups to earn your first Green Credits!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-zinc-800 bg-zinc-900/40 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    <tr>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Description / Reason</th>
                      <th className="px-6 py-3">Contract Ref</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                      <th className="px-6 py-3 text-right">Balance After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {creditTransactions.map((tx: any, idx: number) => {
                      const isPositive = (tx.amount ?? 0) >= 0;
                      return (
                        <tr
                          key={tx._id || idx}
                          className="hover:bg-zinc-900/40 transition-colors"
                        >
                          <td className="whitespace-nowrap px-6 py-4 text-xs font-medium text-zinc-300">
                            {tx.createdAt
                              ? new Date(tx.createdAt).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "N/A"}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-medium text-zinc-200 block">
                              {tx.reason || "Waste pickup verified"}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-zinc-400">
                            {tx.contractId ? (
                              <Link
                                href={`/contracts/${tx.contractId}`}
                                className="hover:text-blue-400 transition-colors underline decoration-zinc-700 underline-offset-2"
                              >
                                #{String(tx.contractId).slice(-6)}
                              </Link>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
                                isPositive
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-red-500/10 text-red-400 border border-red-500/20"
                              }`}
                            >
                              {isPositive ? `+${tx.amount}` : tx.amount} GC
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right font-semibold text-zinc-200">
                            {tx.balanceAfter !== undefined
                              ? `${Number(tx.balanceAfter).toLocaleString()} GC`
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
