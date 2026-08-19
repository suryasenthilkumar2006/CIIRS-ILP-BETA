import React from "react";
import ListingForm from "@/components/listings/ListingForm";

export const metadata = {
  title: "List Your Waste | CIIRS Marketplace",
  description:
    "Create a new waste batch listing with automated AI quality grading and match with verified recovery startups.",
};

export default function NewListingPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-12 text-zinc-100">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          List Your Waste
        </h1>
        <p className="mt-2 text-base text-zinc-400 sm:text-lg">
          Upload details and photographs of your recyclable or industrial waste batch to receive instant AI quality grading and connect with verified buyers.
        </p>
      </div>

      <div className="mt-8">
        <ListingForm />
      </div>
    </main>
  );
}
