import React from "react";
import Link from "next/link";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import WasteListing from "@/models/WasteListing";
import User from "@/models/User";
import "@/models/Contract";
import {
  Layers,
  Sparkles,
  MapPin,
  Calendar,
  ArrowLeft,
  Building2,
  Factory,
  ShieldCheck,
  PlusCircle,
  TrendingUp,
  Handshake,
  CheckCircle2,
} from "lucide-react";
import InitiateContractButton from "@/components/contracts/InitiateContractButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export interface ListingDetailPageProps {
  params: {
    id: string;
  };
}

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { id } = params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <main className="flex-1 px-4 py-16 text-zinc-100 flex items-center justify-center">
          <Card className="max-w-md w-full border-zinc-800 bg-zinc-900/80 text-zinc-100">
            <CardHeader className="text-center">
              <CardTitle className="text-red-400">Invalid Listing ID</CardTitle>
              <CardDescription className="text-zinc-400">
                The requested listing identifier is not valid.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild variant="outline" className="border-zinc-700 bg-zinc-800 text-zinc-200">
                <Link href="/listings">← Back to Listings</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  await connectDB();
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  const isStartup = user?.role === "startup";
  const isSupplier = user?.role === "supplier" || (!isStartup && !!user);

  const listingDoc = await WasteListing.findById(id)
    .populate("supplierId", "name organizationName organizationType email phone address location")
    .lean();

  if (!listingDoc) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <main className="flex-1 px-4 py-16 text-zinc-100 flex items-center justify-center">
          <Card className="max-w-md w-full border-zinc-800 bg-zinc-900/80 text-zinc-100">
            <CardHeader className="text-center">
              <CardTitle className="text-zinc-200">Listing Not Found</CardTitle>
              <CardDescription className="text-zinc-400">
                This waste batch has been removed, completed, or does not exist.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild variant="outline" className="border-zinc-700 bg-zinc-800 text-zinc-200">
                <Link href="/listings">← Back to Listings</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const listing = JSON.parse(JSON.stringify(listingDoc));
  const supplier = listing.supplierId || {};
  const aiGrade = listing.aiGrading || {};

  const grade = aiGrade.grade || "B";
  const gradeColor =
    grade === "A"
      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      : grade === "B"
      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
      : "bg-red-500/20 text-red-400 border-red-500/30";

  // Fetch candidate valorization startups
  const candidateStartups = await User.find({ role: "startup" })
    .select("name organizationName organizationType address phone email")
    .limit(3)
    .lean();

  const startups = JSON.parse(JSON.stringify(candidateStartups));

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
                        Startup Batch Inspection Desk
                      </span>
                      <p className="text-[11px] text-zinc-400">
                        Review AI grading, contamination level, and request a circular procurement contract.
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
                        Supplier Material Specification
                      </span>
                      <p className="text-[11px] text-zinc-400">
                        Batch inspection score and buyer matching candidates.
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
              <Link href="/listings" className="hover:text-zinc-200 transition-colors flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" />
                Listings
              </Link>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-300 font-mono">#{listing._id.slice(-6)}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>{listing.wasteType} Batch</span>
              <span className={`rounded-md px-2.5 py-0.5 text-xs font-bold border ${gradeColor}`}>
                Grade {grade} Quality
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              Published on {listing.createdAt ? new Date(listing.createdAt).toLocaleDateString("en-US", { dateStyle: "long" }) : "N/A"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-200">
              <Link href="/listings">← Browse All</Link>
            </Button>
            <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
              <Link href="/listings/new">List Another Batch</Link>
            </Button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main Details (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Specification Card */}
            <Card className="border-zinc-800 bg-zinc-950/80 text-zinc-100 shadow-xl">
              <CardHeader className="border-b border-zinc-800/80 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-white">Batch Specifications</CardTitle>
                      <CardDescription className="text-xs text-zinc-400">
                        Material details, volume, and inspection breakdown
                      </CardDescription>
                    </div>
                  </div>

                  <span className="rounded bg-zinc-900 px-2.5 py-1 text-xs font-semibold uppercase text-zinc-300 border border-zinc-800">
                    Status: {listing.status || "listed"}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="pt-6 space-y-6">
                {/* Metric tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                    <span className="block text-xs text-zinc-400">Gross Quantity</span>
                    <span className="text-lg font-bold text-emerald-400 mt-0.5 block">
                      {listing.quantityKg} {listing.unit || "kg"}
                    </span>
                    <span className="text-[11px] text-zinc-500">Available volume</span>
                  </div>

                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                    <span className="block text-xs text-zinc-400">Sub-Category</span>
                    <span className="text-sm font-semibold text-zinc-200 mt-1 block truncate">
                      {listing.subType || "General"}
                    </span>
                    <span className="text-[11px] text-zinc-500">Specific material</span>
                  </div>

                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                    <span className="block text-xs text-zinc-400">Contamination</span>
                    <span className="text-sm font-semibold capitalize text-zinc-200 mt-1 block">
                      {aiGrade.contaminationLevel || "None / Low"}
                    </span>
                    <span className="text-[11px] text-zinc-500">AI inspected</span>
                  </div>
                </div>

                {/* AI Grading Summary Box */}
                {aiGrade.notes && (
                  <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400">
                      <Sparkles className="h-4 w-4" />
                      <span>Gemini Vision AI Quality Assessment</span>
                    </div>
                    <p className="text-xs text-blue-200/90 leading-relaxed">
                      {aiGrade.notes}
                    </p>
                  </div>
                )}

                {/* Photo Previews */}
                {listing.photoUrls && listing.photoUrls.length > 0 && (
                  <div className="space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Inspection Photos ({listing.photoUrls.length})
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {listing.photoUrls.map((url: string, index: number) => (
                        <div
                          key={index}
                          className="h-36 rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden"
                        >
                          <img
                            src={url}
                            alt={`Batch photo ${index + 1}`}
                            className="h-full w-full object-cover hover:scale-105 transition-transform"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location & Availability */}
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 space-y-2 text-xs text-zinc-300">
                  <div className="flex items-center gap-2 font-semibold text-zinc-200">
                    <MapPin className="h-4 w-4 text-zinc-400" />
                    <span>Pickup Location:</span>
                    <span className="font-normal text-zinc-400">
                      {listing.location?.address ||
                        (listing.location?.coordinates
                          ? `[${listing.location.coordinates[0]}, ${listing.location.coordinates[1]}]`
                          : "Coordinate data registered")}
                    </span>
                  </div>
                  {listing.availableFrom && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-zinc-400" />
                      <span>Available From:</span>
                      <span className="font-normal text-zinc-400">
                        {new Date(listing.availableFrom).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Matched Startups Recommendation Section */}
            <Card className="border-zinc-800 bg-zinc-950/80 text-zinc-100 shadow-xl">
              <CardHeader className="border-b border-zinc-800/80 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Handshake className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-white">Matched Valorization Startups</CardTitle>
                      <CardDescription className="text-xs text-zinc-400">
                        Potential recycling partners compatible with this waste stream
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6 space-y-4">
                {startups.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-4 text-center">
                    No startup candidates currently available.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {startups.map((st: any) => (
                      <div
                        key={st._id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-blue-400" />
                            <span className="font-semibold text-zinc-100 text-sm">
                              {st.organizationName || st.name}
                            </span>
                            {st.organizationType && (
                              <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-300 capitalize border border-blue-500/20">
                                {st.organizationType}
                              </span>
                            )}
                          </div>
                          {st.address && (
                            <p className="text-xs text-zinc-400 flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-zinc-500" />
                              {st.address}
                            </p>
                          )}
                        </div>

                        <InitiateContractButton
                          listingId={listing._id}
                          supplierId={supplier._id || listing.supplierId?._id || listing.supplierId}
                          startupId={st._id}
                          startupName={st.organizationName || st.name}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Col: Generator Information & Security */}
          <div className="space-y-6">
            <Card className="border-zinc-800 bg-zinc-950/80 text-zinc-100 shadow-xl">
              <CardHeader className="border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Factory className="h-4 w-4 text-emerald-400" />
                  <CardTitle className="text-base text-zinc-100">Waste Generator</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs text-zinc-400">
                <div>
                  <span className="block text-zinc-500 text-[11px]">Organization</span>
                  <span className="text-sm font-semibold text-zinc-200 block">
                    {supplier.organizationName || supplier.name || "Registered Generator"}
                  </span>
                  {supplier.organizationType && (
                    <span className="inline-block mt-1 rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300 capitalize border border-zinc-700">
                      {supplier.organizationType}
                    </span>
                  )}
                </div>

                {supplier.address && (
                  <div className="pt-2 border-t border-zinc-850">
                    <span className="block text-zinc-500 text-[11px]">Facility Location</span>
                    <span className="text-zinc-300">{supplier.address}</span>
                  </div>
                )}

                {supplier.email && (
                  <div className="pt-2 border-t border-zinc-850">
                    <span className="block text-zinc-500 text-[11px]">Contact Channel</span>
                    <span className="text-zinc-300">{supplier.email}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-zinc-800/80 bg-zinc-900/30 text-zinc-100">
              <CardContent className="p-4 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-400 space-y-1">
                  <p className="font-semibold text-zinc-200">Verified Marketplace Guarantee</p>
                  <p>
                    Every batch undergoes automated Gemini Vision quality classification and OTP-verified physical handoff.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
    </div>
  );
}
