import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Contract from "@/models/Contract";
import "@/models/WasteListing";
import "@/models/User";
import {
  FileText,
  Handshake,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Layers,
  Leaf,
  Building2,
  Factory,
  Filter,
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
  title: "Contracts & Transactions | CIIRS",
  description: "Manage circular waste contracts, pickup schedules, custody verification, and Green Credit awards.",
};

export default async function ContractsOverviewPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  await connectDB();

  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  const isStartup = user?.role === "startup";
  const isSupplier = user?.role === "supplier" || (!isStartup && !!user);
  const userId = user?.id;

  const filter: Record<string, any> = {};

  // If user is logged in, show contracts relevant to them (or all if admin)
  if (userId && (session?.user as any)?.role !== "admin") {
    filter.$or = [{ supplierId: userId }, { startupId: userId }];
  }

  if (searchParams?.status && searchParams.status !== "all") {
    filter.status = searchParams.status;
  }

  const rawContracts = await Contract.find(filter)
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("listingId", "wasteType subType quantityKg unit priceEstimate photoUrls location")
    .populate("supplierId", "name organizationName organizationType email phone")
    .populate("startupId", "name organizationName organizationType email phone")
    .lean();

  const contracts = JSON.parse(JSON.stringify(rawContracts));

  // Compute metrics
  const activeCount = contracts.filter(
    (c: any) => c.status !== "completed" && c.status !== "cancelled"
  ).length;
  const scheduledCount = contracts.filter(
    (c: any) => c.status === "scheduled"
  ).length;
  const completedCount = contracts.filter(
    (c: any) => c.status === "completed" || c.status === "otp_verified"
  ).length;
  const totalCredits = contracts.reduce(
    (sum: number, c: any) => sum + (c.greenCreditsAwarded || 0),
    0
  );

  const statuses = [
    { key: "all", label: "All Contracts" },
    { key: "requested", label: "Requested" },
    { key: "confirmed", label: "Confirmed" },
    { key: "scheduled", label: "Scheduled (OTP Ready)" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Role Mode Banner */}
          {session && (
            <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                {isStartup ? (
                  <>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                        Startup Contracts Ledger
                      </span>
                      <p className="text-[11px] text-zinc-400">
                        Inbound feedstock transactions, scheduling, and verified OTP collection.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Factory className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                        Supplier Custody &amp; OTP Ledger
                      </span>
                      <p className="text-[11px] text-zinc-400">
                        Outbound waste handoffs, OTP generation, and Green Credit verification.
                      </p>
                    </div>
                  </>
                )}
              </div>
              <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[10px] font-mono font-medium text-zinc-300">
                {isStartup ? "STARTUP MODE" : "SUPPLIER MODE"}
              </span>
            </div>
          )}

          {/* Navigation & Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Link href="/dashboard" className="hover:text-zinc-200 transition-colors">
                Dashboard
              </Link>
              <span className="text-zinc-600">/</span>
              <span className="text-blue-400 font-medium">Contracts Ledger</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>Custody &amp; Valorization Contracts</span>
              <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400 border border-blue-500/20">
                {contracts.length} Total
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              Track multi-stage handoffs, schedule pickups, verify OTP codes, and claim Green Credits
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800">
              <Link href="/listings">Browse Listings</Link>
            </Button>
            <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-900/30">
              <Link href="/listings/new">List New Waste</Link>
            </Button>
          </div>
        </div>

        {/* Metric KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-zinc-800 bg-zinc-950/80 text-zinc-100 shadow-lg p-4 space-y-1">
            <span className="text-xs text-zinc-400 flex items-center gap-1.5">
              <Handshake className="h-3.5 w-3.5 text-blue-400" />
              Active Contracts
            </span>
            <span className="text-2xl font-bold text-white block">{activeCount}</span>
            <span className="text-[11px] text-zinc-500">In negotiation or transit</span>
          </Card>

          <Card className="border-zinc-800 bg-zinc-950/80 text-zinc-100 shadow-lg p-4 space-y-1">
            <span className="text-xs text-zinc-400 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-amber-400" />
              Scheduled Pickups
            </span>
            <span className="text-2xl font-bold text-amber-400 block">{scheduledCount}</span>
            <span className="text-[11px] text-zinc-500">Ready for OTP verification</span>
          </Card>

          <Card className="border-zinc-800 bg-zinc-950/80 text-zinc-100 shadow-lg p-4 space-y-1">
            <span className="text-xs text-zinc-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              Completed Diverted
            </span>
            <span className="text-2xl font-bold text-emerald-400 block">{completedCount}</span>
            <span className="text-[11px] text-zinc-500">Valorization confirmed</span>
          </Card>

          <Card className="border-zinc-800 bg-zinc-950/80 text-zinc-100 shadow-lg p-4 space-y-1">
            <span className="text-xs text-zinc-400 flex items-center gap-1.5">
              <Leaf className="h-3.5 w-3.5 text-emerald-400" />
              Credits Awarded
            </span>
            <span className="text-2xl font-bold text-emerald-400 block">+{totalCredits.toLocaleString()}</span>
            <span className="text-[11px] text-zinc-500">Green Credits ledger</span>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <Filter className="h-4 w-4 text-zinc-400 shrink-0 mr-1" />
          {statuses.map((st) => {
            const isSelected =
              (!searchParams?.status && st.key === "all") ||
              searchParams?.status === st.key;
            return (
              <Link
                key={st.key}
                href={st.key === "all" ? "/contracts" : `/contracts?status=${st.key}`}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shrink-0 ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                {st.label}
              </Link>
            );
          })}
        </div>

        {/* Contracts List */}
        {contracts.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-12 text-center space-y-3">
            <FileText className="mx-auto h-12 w-12 text-zinc-600" />
            <h3 className="text-base font-semibold text-zinc-300">No contracts found</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              You do not have any contracts matching this criteria yet. Browse active waste listings or create a batch to initiate contracts.
            </p>
            <Button asChild className="bg-blue-600 text-white hover:bg-blue-700" size="sm">
              <Link href="/listings">Explore Active Listings</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {contracts.map((item: any) => {
              const listing = item.listingId || {};
              const supplier = item.supplierId || {};
              const startup = item.startupId || {};

              const isCompleted = item.status === "completed" || item.status === "otp_verified";
              const isScheduled = item.status === "scheduled";
              const isCancelled = item.status === "cancelled";

              const statusColor = isCompleted
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                : isScheduled
                ? "bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse"
                : isCancelled
                ? "bg-red-500/20 text-red-400 border-red-500/30"
                : "bg-blue-500/20 text-blue-400 border-blue-500/30";

              return (
                <Card
                  key={item._id}
                  className="border-zinc-800 bg-zinc-950/80 text-zinc-100 shadow-lg hover:border-zinc-700 transition-colors"
                >
                  <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    {/* Left: Material & Contract Identifiers */}
                    <div className="space-y-2 max-w-md">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs text-zinc-500">
                          #{item._id.slice(-6)}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider border ${statusColor}`}
                        >
                          {item.status?.replace(/_/g, " ") || "In Progress"}
                        </span>
                        {isScheduled && (
                          <span className="text-xs text-amber-400 font-medium flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            OTP Verification Ready
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <span>{listing.wasteType || "Waste Batch"}</span>
                        {listing.subType && (
                          <span className="text-xs font-normal text-zinc-400">
                            ({listing.subType})
                          </span>
                        )}
                        <span className="text-sm font-semibold text-emerald-400 ml-auto md:ml-2">
                          {listing.quantityKg} {listing.unit || "kg"}
                        </span>
                      </h3>

                      {/* Parties involved */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <Factory className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-zinc-300 font-medium">
                            {supplier.organizationName || supplier.name || "Supplier"}
                          </span>
                        </div>
                        <span className="text-zinc-600">→</span>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-blue-400" />
                          <span className="text-zinc-300 font-medium">
                            {startup.organizationName || startup.name || "Startup Buyer"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Timeline summary / Milestones */}
                    <div className="text-xs text-zinc-400 space-y-1 min-w-[180px]">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Initiated:</span>
                        <span>
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>
                      {item.greenCreditsAwarded > 0 && (
                        <div className="flex items-center justify-between text-emerald-400 font-medium">
                          <span>Credits Earned:</span>
                          <span>+{item.greenCreditsAwarded} GC</span>
                        </div>
                      )}
                      {item.co2SavedKg > 0 && (
                        <div className="flex items-center justify-between text-blue-400 font-medium">
                          <span>CO₂ Diverted:</span>
                          <span>{item.co2SavedKg} kg</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Action Button */}
                    <div className="shrink-0 flex items-center">
                      <Button
                        asChild
                        className={
                          isScheduled
                            ? "bg-amber-600 text-white hover:bg-amber-700 shadow-md shadow-amber-900/30 font-semibold text-xs sm:text-sm"
                            : "bg-blue-600 text-white hover:bg-blue-700 font-semibold text-xs sm:text-sm"
                        }
                        size="sm"
                      >
                        <Link
                          href={`/contracts/${item._id}`}
                          className="flex items-center gap-2"
                        >
                          <span>
                            {isScheduled
                              ? "Verify OTP & Complete →"
                              : "View Lifecycle Tracker →"}
                          </span>
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
    </div>
  );
}
