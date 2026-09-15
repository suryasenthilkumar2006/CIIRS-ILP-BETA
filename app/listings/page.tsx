import React from "react";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import WasteListing from "@/models/WasteListing";
import "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import WasteMap from "@/components/map/WasteMap";
import {
  Layers,
  PlusCircle,
  Sparkles,
  MapPin,
  Calendar,
  ArrowRight,
  Filter,
  Package,
  Factory,
  Building2,
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
  title: "Waste Marketplace Listings | CIIRS",
  description:
    "Browse verified circular economy waste listings, material grades, and valorization opportunities.",
};

export default async function ListingsBrowsePage({
  searchParams,
}: {
  searchParams?: { wasteType?: string; status?: string };
}) {
  await connectDB();
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  const isStartup = user?.role === "startup";
  const isSupplier = user?.role === "supplier" || (!isStartup && !!user);

  const filter: Record<string, any> = {};
  if (searchParams?.wasteType && searchParams.wasteType !== "all") {
    filter.wasteType = new RegExp(`^${searchParams.wasteType}$`, "i");
  }
  if (searchParams?.status && searchParams.status !== "all") {
    filter.status = searchParams.status;
  }

  const rawListings = await WasteListing.find(filter)
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("supplierId", "name organizationName organizationType email phone")
    .lean();

  const listings = JSON.parse(JSON.stringify(rawListings));

  const categories = [
    "all",
    "Plastic",
    "Organic",
    "E-waste",
    "Paper",
    "Metal",
    "Textile",
    "Glass",
    "Hazardous",
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
                        Startup Sourcing Portal
                      </span>
                      <p className="text-[11px] text-zinc-400">
                        Procure raw recyclable batches from verified institutional generators.
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
                        Supplier Material Stream
                      </span>
                      <p className="text-[11px] text-zinc-400">
                        Live listings feed &amp; real-time buyer demand tracking.
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
          {/* Header Banner */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Link href="/dashboard" className="hover:text-zinc-200 transition-colors">
                  Dashboard
                </Link>
              <span className="text-zinc-600">/</span>
              <span className="text-emerald-400 font-medium">Marketplace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>Waste Material Listings</span>
              <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400 border border-blue-500/20">
                {listings.length} Active Batches
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              Direct B2B supply pipeline from verified waste generators to recycling &amp; valorization startups
            </p>
          </div>

          <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-900/30">
            <Link href="/listings/new" className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              <span>Create New Listing</span>
            </Link>
          </Button>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <Filter className="h-4 w-4 text-zinc-400 shrink-0 mr-1" />
          {categories.map((cat) => {
            const isSelected =
              (!searchParams?.wasteType && cat === "all") ||
              searchParams?.wasteType?.toLowerCase() === cat.toLowerCase();
            return (
              <Link
                key={cat}
                href={cat === "all" ? "/listings" : `/listings?wasteType=${cat}`}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors shrink-0 ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                {cat === "all" ? "All Categories" : cat}
              </Link>
            );
          })}
        </div>

        {/* Listings Grid */}
        {listings.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
            <h3 className="text-base font-semibold text-zinc-300">No waste listings found</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              There are currently no listings matching this filter. Be the first generator to publish a batch!
            </p>
            <Button asChild className="mt-4 bg-blue-600 text-white hover:bg-blue-700" size="sm">
              <Link href="/listings/new">Publish First Listing</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((item: any) => {
              const aiGrade = item.aiGrading || {};
              const grade = aiGrade.grade || "B";
              const gradeColor =
                grade === "A"
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : grade === "B"
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  : "bg-red-500/20 text-red-400 border-red-500/30";

              const photoUrl =
                item.photoUrls && item.photoUrls.length > 0
                  ? item.photoUrls[0]
                  : null;

              return (
                <Card
                  key={item._id}
                  className="group flex flex-col overflow-hidden border-zinc-800 bg-zinc-950/80 text-zinc-100 shadow-md hover:border-zinc-700 transition-all"
                >
                  {/* Photo Preview / Banner */}
                  <div className="relative h-44 w-full bg-zinc-900 overflow-hidden border-b border-zinc-800/80">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={item.wasteType}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-600">
                        <Layers className="h-10 w-10 stroke-1" />
                      </div>
                    )}

                    {/* Grade Badge */}
                    <div className="absolute top-3 right-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold border backdrop-blur-md shadow-md ${gradeColor}`}
                      >
                        <Sparkles className="h-3 w-3" />
                        Grade {grade}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="absolute bottom-3 left-3">
                      <span className="rounded bg-zinc-950/80 px-2 py-0.5 text-[10px] font-semibold text-zinc-300 border border-zinc-800 uppercase tracking-wider">
                        {item.status || "listed"}
                      </span>
                    </div>
                  </div>

                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base font-bold text-white">
                          {item.wasteType}
                        </CardTitle>
                        {item.subType && (
                          <CardDescription className="text-xs text-zinc-400">
                            {item.subType}
                          </CardDescription>
                        )}
                      </div>
                      <span className="text-sm font-extrabold text-emerald-400">
                        {item.quantityKg} {item.unit || "kg"}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-3 text-xs text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">
                        {item.location?.address ||
                          (item.location?.coordinates
                            ? `Coords: [${item.location.coordinates[0]}, ${item.location.coordinates[1]}]`
                            : "Origin specified")}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                      <span>
                        Available:{" "}
                        {item.availableFrom
                          ? new Date(item.availableFrom).toLocaleDateString()
                          : "Immediate"}
                      </span>
                    </div>

                    {item.supplierId?.organizationName && (
                      <div className="pt-2 border-t border-zinc-850 flex items-center justify-between text-[11px]">
                        <span className="text-zinc-500">Generator:</span>
                        <span className="font-medium text-zinc-300 truncate max-w-[150px]">
                          {item.supplierId.organizationName}
                        </span>
                      </div>
                    )}
                  </CardContent>

                  <div className="p-4 pt-0">
                    <Button
                      asChild
                      variant="outline"
                      className="w-full border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors"
                      size="sm"
                    >
                      <Link
                        href={`/listings/${item._id}`}
                        className="flex items-center justify-center gap-1.5"
                      >
                        <span>View Details &amp; Matches</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Live Spatial Resource Map */}
        <section className="space-y-4 pt-6 border-t border-zinc-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-400" />
                  Live Marketplace Spatial Ledger Map
                </h2>
              </div>
              <p className="text-xs text-zinc-400">
                Interactive geographic distribution of available waste batches and collection nodes across India.
              </p>
            </div>
          </div>

          <WasteMap listings={listings} height="480px" />
        </section>
      </div>
    </main>
    </div>
  );
}
