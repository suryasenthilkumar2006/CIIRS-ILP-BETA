import React from "react";
import Link from "next/link";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Contract from "@/models/Contract";
import "@/models/WasteListing";
import "@/models/User";
import ContractTimeline from "@/components/contracts/ContractTimeline";
import {
  FileText,
  Building2,
  Factory,
  Scale,
  MapPin,
  Calendar,
  Sparkles,
  Leaf,
  ArrowLeft,
  AlertCircle,
  Clock,
  ShieldCheck,
  Award,
  Layers,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface ContractPageProps {
  params: {
    id: string;
  };
}

export const dynamic = "force-dynamic";

/**
 * Server component that fetches and displays the details, parties,
 * listing summary, and lifecycle timeline for a specific contract.
 */
export default async function ContractDetailPage({ params }: ContractPageProps) {
  const { id } = params;

  // Validate ObjectId format
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return <ContractNotFoundState id={id} message="Invalid contract ID format provided." />;
  }

  let contractDoc: any = null;

  try {
    await connectDB();

    contractDoc = await Contract.findById(id)
      .populate("listingId")
      .populate("supplierId", "name organizationName organizationType email phone address location greenCreditBalance")
      .populate("startupId", "name organizationName organizationType email phone address location greenCreditBalance")
      .lean();
  } catch (err: any) {
    console.error("Failed to load contract:", err);
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-12 text-zinc-100 flex items-center justify-center">
        <Card className="max-w-md w-full border-red-500/30 bg-red-500/10 text-red-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-5 w-5" />
              Database Connection Error
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Unable to retrieve contract records from the database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-300">{err?.message || "An unexpected error occurred."}</p>
            <Button asChild variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-200">
              <Link href="/contracts">← Return to Contracts</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Handle Contract Not Found
  if (!contractDoc) {
    return <ContractNotFoundState id={id} message="No contract found matching this reference ID." />;
  }

  // Safely serialize for Client Component hydration
  const contract = JSON.parse(JSON.stringify(contractDoc));
  const listing = contract.listingId || {};
  const supplier = contract.supplierId || {};
  const startup = contract.startupId || {};
  const aiGrading = listing.aiGrading || {};

  const gradeColor =
    aiGrading.grade === "A"
      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
      : aiGrading.grade === "B"
      ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
      : aiGrading.grade === "C"
      ? "bg-red-500/20 text-red-400 border-red-500/40"
      : "bg-zinc-800 text-zinc-400 border-zinc-700";

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 sm:px-6 lg:px-8 text-zinc-100">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Navigation Breadcrumb & Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Link href="/contracts" className="hover:text-zinc-200 transition-colors flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" />
                Contracts
              </Link>
              <ChevronRight className="h-3 w-3 text-zinc-600" />
              <span className="text-zinc-300 font-mono">#{contract._id?.slice(-6) || "ID"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>Contract Details</span>
              <span className="text-sm font-normal font-mono text-zinc-500">
                ({contract._id})
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              Initiated on {contract.createdAt ? new Date(contract.createdAt).toLocaleDateString("en-US", { dateStyle: "long" }) : "N/A"}
            </p>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex flex-wrap items-center gap-3">
            {contract.greenCreditsAwarded !== undefined && contract.greenCreditsAwarded > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400">
                <Leaf className="h-4 w-4" />
                <span>+{contract.greenCreditsAwarded} Green Credits</span>
              </div>
            )}

            {contract.co2SavedKg !== undefined && contract.co2SavedKg > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-400">
                <TrendingUp className="h-4 w-4" />
                <span>{contract.co2SavedKg} kg CO₂ Saved</span>
              </div>
            )}
          </div>
        </div>

        {/* 1. Interactive 6-Stage Timeline Component */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold uppercase tracking-wider text-zinc-400">
              Contract Lifecycle & Stage Progress
            </h2>
          </div>
          <ContractTimeline contract={contract} />
        </section>

        {/* 2. Main Content Grid: Waste Listing Summary & Participating Parties */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left 2 Cols: Waste Listing Summary */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-zinc-800 bg-zinc-950/80 text-zinc-100 shadow-lg">
              <CardHeader className="border-b border-zinc-800/80 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-white">Waste Material Summary</CardTitle>
                      <CardDescription className="text-xs text-zinc-400">
                        Specification of the batch under transaction
                      </CardDescription>
                    </div>
                  </div>

                  {/* AI Grade Badge */}
                  {aiGrading.grade && (
                    <div className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold border ${gradeColor}`}>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Grade {aiGrading.grade} Quality</span>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-6 space-y-6">
                {/* Waste Attributes Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/60 p-3">
                    <span className="block text-xs font-medium text-zinc-400">Waste Category</span>
                    <span className="mt-1 block text-base font-bold text-zinc-100">
                      {listing.wasteType || "Not specified"}
                    </span>
                    {listing.subType && (
                      <span className="text-xs text-zinc-500">{listing.subType}</span>
                    )}
                  </div>

                  <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/60 p-3">
                    <span className="block text-xs font-medium text-zinc-400">Quantity</span>
                    <span className="mt-1 block text-base font-bold text-zinc-100">
                      {listing.quantityKg !== undefined ? `${listing.quantityKg} ${listing.unit || "kg"}` : "N/A"}
                    </span>
                    <span className="text-xs text-zinc-500">Gross batch mass</span>
                  </div>

                  <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/60 p-3">
                    <span className="block text-xs font-medium text-zinc-400">Contamination</span>
                    <span className="mt-1 block text-base font-bold capitalize text-zinc-100">
                      {aiGrading.contaminationLevel || "Low / None"}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {aiGrading.confidence ? `${Math.round(aiGrading.confidence * 100)}% confidence` : "Inspected"}
                    </span>
                  </div>
                </div>

                {/* Photo Previews if available */}
                {listing.photoUrls && listing.photoUrls.length > 0 && (
                  <div>
                    <span className="block text-xs font-medium text-zinc-400 mb-2">
                      Batch Inspection Photos ({listing.photoUrls.length})
                    </span>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {listing.photoUrls.map((url: string, index: number) => (
                        <div
                          key={index}
                          className="h-24 w-32 flex-shrink-0 rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden"
                        >
                          <img
                            src={url}
                            alt={`Waste batch ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Logistics & Location Details */}
                <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    <MapPin className="h-4 w-4 text-zinc-400" />
                    <span>Origin / Generator Location</span>
                  </div>
                  <p className="text-sm text-zinc-200">
                    {listing.location?.address ||
                      (listing.location?.coordinates
                        ? `Coordinates: [${listing.location.coordinates[0]}, ${listing.location.coordinates[1]}]`
                        : "Location specified in contract documents")}
                  </p>
                  {listing.availableFrom && (
                    <p className="text-xs text-zinc-400 flex items-center gap-1.5 pt-1">
                      <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                      <span>Available From: {new Date(listing.availableFrom).toLocaleDateString()}</span>
                      {listing.isRecurring && (
                        <span className="text-blue-400 ml-2 font-medium">
                          • Recurring Supply ({listing.recurrencePattern || "Periodic"})
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Audit Trail Timeline Log */}
            {contract.timeline && contract.timeline.length > 0 && (
              <Card className="border-zinc-800 bg-zinc-950/80 text-zinc-100 shadow-lg">
                <CardHeader className="border-b border-zinc-800/80 pb-3">
                  <CardTitle className="text-base text-zinc-200 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-zinc-400" />
                    <span>Verified Audit Trail & Activity Log</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {contract.timeline.map((event: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between border-b border-zinc-850 pb-3 last:border-0 last:pb-0"
                      >
                        <div className="space-y-0.5">
                          <span className="text-sm font-semibold text-zinc-200">{event.stage}</span>
                          {event.note && <p className="text-xs text-zinc-400">{event.note}</p>}
                        </div>
                        <span className="text-xs text-zinc-500 font-mono">
                          {event.timestamp
                            ? new Date(event.timestamp).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Col: Parties Involved (Supplier & Startup) */}
          <div className="space-y-6">
            {/* Supplier Profile Card */}
            <Card className="border-zinc-800 bg-zinc-950/80 text-zinc-100 shadow-lg">
              <CardHeader className="border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Factory className="h-4 w-4 text-emerald-400" />
                  <CardTitle className="text-base text-zinc-100">Waste Generator / Supplier</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-sm">
                <div>
                  <span className="text-xs text-zinc-400 block">Organization</span>
                  <span className="font-semibold text-zinc-100 text-base">
                    {supplier.organizationName || supplier.name || "Registered Supplier"}
                  </span>
                  {supplier.organizationType && (
                    <span className="inline-block mt-1 text-xs rounded bg-zinc-850 px-2 py-0.5 text-zinc-300 capitalize border border-zinc-700">
                      {supplier.organizationType}
                    </span>
                  )}
                </div>

                <div className="space-y-1 pt-2 border-t border-zinc-850 text-xs text-zinc-400">
                  {supplier.name && supplier.name !== supplier.organizationName && (
                    <p><strong className="text-zinc-300">Contact:</strong> {supplier.name}</p>
                  )}
                  {supplier.email && (
                    <p><strong className="text-zinc-300">Email:</strong> {supplier.email}</p>
                  )}
                  {supplier.phone && (
                    <p><strong className="text-zinc-300">Phone:</strong> {supplier.phone}</p>
                  )}
                  {supplier.address && (
                    <p><strong className="text-zinc-300">Address:</strong> {supplier.address}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Startup Profile Card */}
            <Card className="border-zinc-800 bg-zinc-950/80 text-zinc-100 shadow-lg">
              <CardHeader className="border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-400" />
                  <CardTitle className="text-base text-zinc-100">Valorization Startup / Buyer</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-sm">
                <div>
                  <span className="text-xs text-zinc-400 block">Startup Entity</span>
                  <span className="font-semibold text-zinc-100 text-base">
                    {startup.organizationName || startup.name || "Registered Startup"}
                  </span>
                  {startup.organizationType && (
                    <span className="inline-block mt-1 text-xs rounded bg-blue-500/10 px-2 py-0.5 text-blue-300 capitalize border border-blue-500/30">
                      {startup.organizationType}
                    </span>
                  )}
                </div>

                <div className="space-y-1 pt-2 border-t border-zinc-850 text-xs text-zinc-400">
                  {startup.name && startup.name !== startup.organizationName && (
                    <p><strong className="text-zinc-300">Representative:</strong> {startup.name}</p>
                  )}
                  {startup.email && (
                    <p><strong className="text-zinc-300">Email:</strong> {startup.email}</p>
                  )}
                  {startup.phone && (
                    <p><strong className="text-zinc-300">Phone:</strong> {startup.phone}</p>
                  )}
                  {startup.address && (
                    <p><strong className="text-zinc-300">Facility Address:</strong> {startup.address}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Security & Verification Card */}
            <Card className="border-zinc-800/80 bg-zinc-900/30 text-zinc-100">
              <CardContent className="p-4 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-400 space-y-1">
                  <p className="font-semibold text-zinc-200">Cryptographically Verified Custody</p>
                  <p>
                    All lifecycle transitions and OTP confirmations are recorded permanently on the CIIRS ledger.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * Rendered when a contract ID is invalid or cannot be located in the database.
 */
function ContractNotFoundState({ id, message }: { id?: string; message: string }) {
  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-16 text-zinc-100 flex items-center justify-center">
      <Card className="max-w-md w-full border-zinc-800 bg-zinc-900/80 text-zinc-100 shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400">
            <FileText className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl text-white">Contract Not Found</CardTitle>
          <CardDescription className="text-zinc-400">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          {id && (
            <div className="rounded-md bg-zinc-950 border border-zinc-800 p-2.5 font-mono text-xs text-zinc-400 break-all">
              Reference ID: {id}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
              <Link href="/contracts">View All Contracts</Link>
            </Button>
            <Button asChild variant="outline" className="border-zinc-700 bg-zinc-850 text-zinc-300 hover:bg-zinc-800">
              <Link href="/">Return to Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
