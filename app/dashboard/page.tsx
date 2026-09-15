import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import WasteListing from "@/models/WasteListing";
import Contract from "@/models/Contract";
import ReliabilityScore from "@/models/ReliabilityScore";
import {
  Recycle,
  PlusCircle,
  Layers,
  Handshake,
  Coins,
  Building2,
  Factory,
  Sparkles,
  MapPin,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Map,
  Package,
  Activity,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
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
  title: "Dashboard | CIIRS",
  description:
    "Role-aware operations dashboard for waste generators and circular startups.",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  await connectDB();

  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;
  const isStartup = userRole === "startup";

  // 1 & 2. Fetch current User and Reliability Score in parallel
  const [userDoc, reliabilityDoc] = await Promise.all([
    User.findById(userId).lean(),
    ReliabilityScore.findOne({ userId }).lean(),
  ]);

  if (!userDoc) {
    redirect("/login");
  }
  const user = JSON.parse(JSON.stringify(userDoc));
  const reliabilityScore = reliabilityDoc?.score ?? 700;

  // 3. Query role-specific metrics & data
  let activeListingsCount = 0;
  let matchedListingsCount = 0;
  let activeContractsCount = 0;
  let recentContracts: any[] = [];
  let recentListings: any[] = [];

  if (isStartup) {
    // For startups: matched listings available for procurement & active contracts
    [matchedListingsCount, activeContractsCount, recentContracts, recentListings] =
      await Promise.all([
        WasteListing.countDocuments({ status: { $in: ["listed", "matched"] } }),
        Contract.countDocuments({
          startupId: userId,
          status: { $nin: ["completed", "cancelled"] },
        }),
        Contract.find({ startupId: userId })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("listingId", "wasteType subType quantityKg unit priceEstimate")
          .populate("supplierId", "name organizationName email phone")
          .lean(),
        WasteListing.find({ status: { $in: ["listed", "matched"] } })
          .sort({ createdAt: -1 })
          .limit(6)
          .populate("supplierId", "name organizationName organizationType")
          .lean(),
      ]);
  } else {
    // For suppliers: active listings, active contracts, recent batches
    [activeListingsCount, activeContractsCount, recentContracts, recentListings] =
      await Promise.all([
        WasteListing.countDocuments({
          supplierId: userId,
          status: { $in: ["listed", "matched", "requested", "confirmed", "scheduled"] },
        }),
        Contract.countDocuments({
          supplierId: userId,
          status: { $nin: ["completed", "cancelled"] },
        }),
        Contract.find({ supplierId: userId })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("listingId", "wasteType subType quantityKg unit priceEstimate")
          .populate("startupId", "name organizationName email phone")
          .lean(),
        WasteListing.find({ supplierId: userId })
          .sort({ createdAt: -1 })
          .limit(6)
          .lean(),
      ]);
  }

  const contracts = JSON.parse(JSON.stringify(recentContracts));
  const listings = JSON.parse(JSON.stringify(recentListings));
  const greenCreditBalance = user.greenCreditBalance ?? 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Role Mode Banner */}
        <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            {isStartup ? (
              <>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                    Startup Procurement Portal
                  </span>
                  <p className="text-[11px] text-zinc-400">
                    Sourcing raw circular waste supplies, managing custody handoffs, and analyzing trends.
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
                    Supplier &amp; Generator Portal
                  </span>
                  <p className="text-[11px] text-zinc-400">
                    Publishing verified waste inventory, managing pickup contracts, and earning Green Credits.
                  </p>
                </div>
              </>
            )}
          </div>
          <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[10px] font-mono font-medium text-zinc-300">
            {isStartup ? "STARTUP" : "SUPPLIER"}
          </span>
        </div>

        {/* Welcome Header & Primary CTAs */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {isStartup ? "Buyer Workspace" : "Generator Workspace"}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-emerald-400 text-xs font-medium capitalize">
                {user.organizationType || "Organization"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>Welcome back, {user.organizationName || user.name}</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              {isStartup
                ? "Monitor raw material procurement pipelines, track custody handoffs, and forecast circular supply."
                : "Manage your listed waste streams, track verified pickups, and accumulate Green Credits."}
            </p>
          </div>

          {/* Role-Specific Quick Link Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {isStartup ? (
              <>
                <Button
                  asChild
                  variant="outline"
                  className="border-zinc-850 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white text-xs"
                >
                  <Link href="/map" className="flex items-center gap-1.5">
                    <Map className="h-3.5 w-3.5 text-blue-400" />
                    <span>Browse Map</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  className="bg-blue-600 text-white hover:bg-blue-700 text-xs shadow-md shadow-blue-600/20"
                >
                  <Link href="/forecast" className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>Supply Forecast</span>
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button
                  asChild
                  variant="outline"
                  className="border-zinc-850 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white text-xs"
                >
                  <Link href="/contracts" className="flex items-center gap-1.5">
                    <Handshake className="h-3.5 w-3.5 text-emerald-400" />
                    <span>My Contracts</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs shadow-md shadow-emerald-600/20"
                >
                  <Link href="/listings/new" className="flex items-center gap-1.5">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>List Waste</span>
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Metric Cards Grid */}
        {isStartup ? (
          /* STARTUP METRIC CARDS */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Matched / Available Listings */}
            <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400">Matched Supply</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Layers className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white tracking-tight">
                    {matchedListingsCount}
                  </p>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Open recyclable batches ready for procurement
                </p>
              </CardContent>
            </Card>

            {/* Active Contracts */}
            <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400">Active Contracts</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Handshake className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white tracking-tight">
                    {activeContractsCount}
                  </p>
                </div>
                <p className="text-[11px] text-zinc-500">
                  In verification, transit, or processing
                </p>
              </CardContent>
            </Card>

            {/* Quick Link Card: Browse Map */}
            <Card className="border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 transition-colors backdrop-blur-sm group">
              <Link href="/map" className="block p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400">Geospatial Explorer</span>
                  <Map className="h-4 w-4 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div>
                  <p className="text-lg font-bold text-zinc-100 group-hover:text-blue-400 transition-colors">
                    Browse Map →
                  </p>
                </div>
                <p className="text-[11px] text-zinc-500">
                  View regional supply hubs &amp; proximity routes
                </p>
              </Link>
            </Card>

            {/* Quick Link Card: Supply Forecast */}
            <Card className="border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 transition-colors backdrop-blur-sm group">
              <Link href="/forecast" className="block p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400">AI Predictions</span>
                  <TrendingUp className="h-4 w-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div>
                  <p className="text-lg font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                    Supply Forecast →
                  </p>
                </div>
                <p className="text-[11px] text-zinc-500">
                  4-week volume projections via Hugging Face
                </p>
              </Link>
            </Card>
          </div>
        ) : (
          /* SUPPLIER METRIC CARDS */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Active Listings */}
            <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400">Active Listings</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Layers className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white tracking-tight">
                    {activeListingsCount}
                  </p>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Published batches awaiting or matched with startups
                </p>
              </CardContent>
            </Card>

            {/* Active Contracts */}
            <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400">Active Contracts</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Handshake className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white tracking-tight">
                    {activeContractsCount}
                  </p>
                </div>
                <p className="text-[11px] text-zinc-500">
                  In progress, pickup scheduling, or OTP verification
                </p>
              </CardContent>
            </Card>

            {/* Green Credit Balance */}
            <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400">Green Credits</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Coins className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400 tracking-tight">
                    {greenCreditBalance.toLocaleString()}{" "}
                    <span className="text-xs font-normal text-zinc-400">GC</span>
                  </p>
                </div>
                <p className="text-[11px] text-zinc-500">
                  <Link href="/wallet" className="hover:underline text-emerald-400">
                    View wallet ledger →
                  </Link>
                </p>
              </CardContent>
            </Card>

            {/* Reliability Score */}
            <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400">Reliability Score</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white tracking-tight">
                    {reliabilityScore}{" "}
                    <span className="text-xs font-normal text-zinc-400">/ 850</span>
                  </p>
                </div>
                <p className="text-[11px] text-zinc-500">
                  {reliabilityScore >= 750
                    ? "Tier 1 Verified Generator"
                    : reliabilityScore >= 650
                    ? "Reliable Partner"
                    : "Standard Rating"}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Workspace Layout (2 Columns: Material Feed + Contracts Summary) */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left 2 Columns: Supply Feed / Batches */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-md">
              <CardHeader className="border-b border-zinc-800/80 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-white">
                        {isStartup
                          ? "Available Waste Supply Feed"
                          : "Your Waste Inventory Batches"}
                      </CardTitle>
                      <CardDescription className="text-xs text-zinc-400">
                        {isStartup
                          ? "Browse verified waste batches available for startup procurement"
                          : "Recent material batches listed for recycling matchmaking"}
                      </CardDescription>
                    </div>
                  </div>

                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    <Link href={isStartup ? "/listings" : "/listings/new"}>
                      {isStartup ? "View All →" : "+ List Waste"}
                    </Link>
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                {listings.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-500 space-y-3">
                    <p>
                      {isStartup
                        ? "No active marketplace listings at this moment."
                        : "You haven't listed any waste batches yet."}
                    </p>
                    {!isStartup && (
                      <Button asChild size="sm" className="bg-emerald-600 text-white">
                        <Link href="/listings/new">Create Your First Listing</Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {listings.map((item: any) => {
                      const grade = item.aiGrading?.grade || "B";
                      const gradeColor =
                        grade === "A"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : grade === "B"
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          : "bg-red-500/20 text-red-400 border-red-500/30";

                      return (
                        <div
                          key={item._id}
                          className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-3 hover:border-zinc-700 transition-colors flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-sm capitalize">
                                {item.wasteType}
                              </span>
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-bold border ${gradeColor}`}
                              >
                                Grade {grade}
                              </span>
                            </div>

                            {item.subType && (
                              <p className="text-xs text-zinc-400 truncate">
                                {item.subType}
                              </p>
                            )}

                            <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800/80">
                              <span className="text-zinc-500">Quantity:</span>
                              <span className="font-bold text-emerald-400">
                                {item.quantityKg} {item.unit || "kg"}
                              </span>
                            </div>
                          </div>

                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="w-full border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-emerald-600 hover:text-white transition-colors text-xs"
                          >
                            <Link href={`/listings/${item._id}`}>
                              {isStartup ? "Inspect & Request →" : "View Details →"}
                            </Link>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Role Quick Links Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {isStartup ? (
                <>
                  <Link
                    href="/map"
                    className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:bg-zinc-900/80 hover:border-zinc-700 transition-all flex items-center gap-3 group"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Map className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="font-semibold text-sm text-zinc-200 block">
                        Browse Map
                      </span>
                      <span className="text-xs text-zinc-500">Live spatial ledger</span>
                    </div>
                  </Link>

                  <Link
                    href="/forecast"
                    className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:bg-zinc-900/80 hover:border-zinc-700 transition-all flex items-center gap-3 group"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="font-semibold text-sm text-zinc-200 block">
                        Supply Forecast
                      </span>
                      <span className="text-xs text-zinc-500">AI weekly projection</span>
                    </div>
                  </Link>

                  <Link
                    href="/contracts"
                    className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:bg-zinc-900/80 hover:border-zinc-700 transition-all flex items-center gap-3 group"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      <Handshake className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="font-semibold text-sm text-zinc-200 block">
                        My Contracts
                      </span>
                      <span className="text-xs text-zinc-500">Custody tracking</span>
                    </div>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/listings/new"
                    className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:bg-zinc-900/80 hover:border-zinc-700 transition-all flex items-center gap-3 group"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <PlusCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="font-semibold text-sm text-zinc-200 block">
                        List Waste
                      </span>
                      <span className="text-xs text-zinc-500">Publish new batch</span>
                    </div>
                  </Link>

                  <Link
                    href="/contracts"
                    className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:bg-zinc-900/80 hover:border-zinc-700 transition-all flex items-center gap-3 group"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Handshake className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="font-semibold text-sm text-zinc-200 block">
                        My Contracts
                      </span>
                      <span className="text-xs text-zinc-500">Pickup OTPs &amp; handoffs</span>
                    </div>
                  </Link>

                  <Link
                    href="/wallet"
                    className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:bg-zinc-900/80 hover:border-zinc-700 transition-all flex items-center gap-3 group"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                      <Coins className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="font-semibold text-sm text-zinc-200 block">
                        Green Wallet
                      </span>
                      <span className="text-xs text-zinc-500">Impact ledger</span>
                    </div>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Active Contracts & Profile */}
          <div className="space-y-6">
            {/* Active Contracts Tracker */}
            <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-md">
              <CardHeader className="border-b border-zinc-800/80 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Handshake className="h-4 w-4 text-blue-400" />
                    <CardTitle className="text-base text-zinc-100">
                      Recent Contracts
                    </CardTitle>
                  </div>
                  <span className="text-xs text-zinc-500">{contracts.length} active</span>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-3">
                {contracts.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-6 text-center">
                    No active contracts yet. Start by browsing or listing batches.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {contracts.map((c: any) => {
                      const isCompleted = c.status === "completed";
                      const isScheduled = c.status === "scheduled";

                      return (
                        <div
                          key={c._id}
                          className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-xs space-y-2 hover:border-zinc-700 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-zinc-500 text-[11px]">
                              #{c._id.slice(-6)}
                            </span>
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                isCompleted
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : isScheduled
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              }`}
                            >
                              {c.status?.replace(/_/g, " ")}
                            </span>
                          </div>

                          <p className="font-semibold text-zinc-200">
                            {c.listingId?.wasteType || "Waste Batch"} (
                            {c.listingId?.quantityKg || "—"} kg)
                          </p>

                          <Button
                            asChild
                            size="sm"
                            variant="ghost"
                            className="w-full text-xs text-zinc-300 hover:text-white h-7"
                          >
                            <Link href={`/contracts/${c._id}`}>
                              View Timeline &amp; OTP →
                            </Link>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <Button
                  asChild
                  variant="outline"
                  className="w-full text-xs border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                >
                  <Link href="/contracts">View All Contracts →</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Profile & Trust Summary */}
            <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-md">
              <CardHeader className="border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2">
                  {isStartup ? (
                    <Building2 className="h-4 w-4 text-blue-400" />
                  ) : (
                    <Factory className="h-4 w-4 text-emerald-400" />
                  )}
                  <CardTitle className="text-base text-zinc-100">Enterprise Profile</CardTitle>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-3 text-xs text-zinc-400">
                <div>
                  <span className="block text-zinc-500 text-[11px]">Organization Name</span>
                  <span className="font-semibold text-zinc-200 text-sm block">
                    {user.organizationName || user.name}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-800 pt-2">
                  <span className="text-zinc-500">Account Type:</span>
                  <span className="text-zinc-200 capitalize font-medium">
                    {user.role} ({user.organizationType || "General"})
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-800 pt-2">
                  <span className="text-zinc-500">Reliability Score:</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {reliabilityScore} / 850
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-800 pt-2">
                  <span className="text-zinc-500">Email:</span>
                  <span className="text-zinc-300 truncate max-w-[160px]">{user.email}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
