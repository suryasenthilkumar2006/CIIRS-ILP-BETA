import React from "react";
import Link from "next/link";
import { ArrowLeft, Factory } from "lucide-react";
import ListingForm from "@/components/listings/ListingForm";

export const metadata = {
  title: "List Your Waste | CIIRS Marketplace",
  description:
    "Create a new waste batch listing with automated AI quality grading and match with verified recovery startups.",
};

export default function NewListingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Persona Header Tag */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <Link
              href="/listings"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Listings</span>
            </Link>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 text-xs font-semibold text-emerald-400">
              <Factory className="h-3.5 w-3.5" />
              <span>Supplier Listing Portal</span>
            </span>
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              List Your Waste Batch
            </h1>
            <p className="mt-2 text-sm text-zinc-400 sm:text-base max-w-2xl mx-auto">
              Upload details and photographs of your recyclable or industrial waste batch to receive instant AI quality grading and connect with verified buyers.
            </p>
          </div>

          <div className="mt-8">
            <ListingForm />
          </div>
        </div>
      </main>
    </div>
  );
}

