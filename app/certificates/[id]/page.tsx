import React from "react";
import Link from "next/link";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import ImpactCertificate from "@/models/ImpactCertificate";
import "@/models/Contract";
import "@/models/WasteListing";
import "@/models/User";
import {
  Leaf,
  ShieldCheck,
  CheckCircle2,
  Share2,
  Copy,
  ArrowLeft,
  Sparkles,
  Building2,
  FileCheck2,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface CertificatePageProps {
  params: {
    id: string;
  };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: CertificatePageProps) {
  return {
    title: `Impact Certificate ${params.id} | CIIRS`,
    description: `Official Verified Environmental Impact Certificate #${params.id} issued by CIIRS for circular waste diversion and CO₂ mitigation.`,
  };
}

/**
 * Public Server Component displaying a verified Environmental Impact Certificate.
 * No authentication required — designed for public verification and WhatsApp/social sharing.
 */
export default async function ImpactCertificatePage({ params }: CertificatePageProps) {
  const { id } = params;

  if (!id) {
    return <CertificateNotFoundState id={id} />;
  }

  let certificateDoc: any = null;

  try {
    await connectDB();

    // Look up by certificateNumber (e.g. CIIRS-2026-ABCDE) or by ObjectId
    certificateDoc = await ImpactCertificate.findOne({ certificateNumber: id })
      .populate("userId", "name organizationName organizationType email address")
      .populate({
        path: "contractId",
        populate: [
          { path: "startupId", select: "name organizationName organizationType" },
          { path: "listingId", select: "wasteType subType location" },
        ],
      })
      .lean();

    if (!certificateDoc && mongoose.Types.ObjectId.isValid(id)) {
      certificateDoc = await ImpactCertificate.findOne({
        $or: [
          { _id: new mongoose.Types.ObjectId(id) },
          { contractId: new mongoose.Types.ObjectId(id) },
        ],
      })
        .populate("userId", "name organizationName organizationType email address")
        .populate({
          path: "contractId",
          populate: [
            { path: "startupId", select: "name organizationName organizationType" },
            { path: "listingId", select: "wasteType subType location" },
          ],
        })
        .lean();
    }
  } catch (err) {
    console.error("Failed to query ImpactCertificate:", err);
  }

  if (!certificateDoc) {
    return <CertificateNotFoundState id={id} />;
  }

  const certificate = JSON.parse(JSON.stringify(certificateDoc));
  const user = certificate.userId || {};
  const contract = certificate.contractId || {};
  const startup = contract.startupId || {};
  const listing = contract.listingId || {};

  const recipientName =
    user.organizationName || user.name || "Authorized Circular Partner";
  const recipientType = user.organizationType
    ? `${user.organizationType.toUpperCase()}`
    : "WASTE GENERATOR";
  const partnerName =
    startup.organizationName || startup.name || "Circular Valorization Startup";

  const formattedDate = certificate.issuedAt
    ? new Date(certificate.issuedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  const shareText = `Check out this Verified Impact Certificate #${certificate.certificateNumber} on CIIRS! Diverted ${certificate.wasteKg} kg of ${certificate.wasteType} and mitigated ${certificate.co2SavedKg} kg CO₂ emissions.`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `${shareText} View certificate: https://ciirs.app/certificates/${certificate.certificateNumber}`
  )}`;

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 sm:py-12 text-zinc-100 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none -z-0" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none -z-0" />

      <div className="w-full max-w-4xl space-y-6 relative z-10">
        {/* Top Navigation & Share Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to CIIRS Marketplace</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* WhatsApp Direct Share Button */}
            <Button
              asChild
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-md shadow-emerald-900/30 gap-1.5"
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <Share2 className="h-3.5 w-3.5" />
                <span>Share on WhatsApp</span>
              </a>
            </Button>

            {/* Copy Link Button with client-side event listener */}
            <Button
              id="copy-cert-btn"
              type="button"
              variant="outline"
              size="sm"
              className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium text-xs gap-1.5 cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5 text-zinc-400" />
              <span id="copy-btn-text">Copy Link</span>
            </Button>

            {/* Print / Save PDF Button */}
            <Button
              id="print-cert-btn"
              type="button"
              variant="outline"
              size="sm"
              className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium text-xs gap-1.5 hidden sm:inline-flex cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-zinc-400" />
              <span>Print</span>
            </Button>
          </div>
        </div>

        {/* The Impact Certificate Card */}
        <div className="relative rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-b from-zinc-900/95 via-zinc-950/95 to-zinc-900/95 p-6 sm:p-10 text-zinc-100 shadow-2xl shadow-emerald-950/20 backdrop-blur-xl">
          {/* Ornamental Certificate Corner Accents */}
          <div className="absolute top-3 left-3 h-6 w-6 border-t-2 border-l-2 border-emerald-400/60 rounded-tl-sm" />
          <div className="absolute top-3 right-3 h-6 w-6 border-t-2 border-r-2 border-emerald-400/60 rounded-tr-sm" />
          <div className="absolute bottom-3 left-3 h-6 w-6 border-b-2 border-l-2 border-emerald-400/60 rounded-bl-sm" />
          <div className="absolute bottom-3 right-3 h-6 w-6 border-b-2 border-r-2 border-emerald-400/60 rounded-br-sm" />

          {/* Certificate Inner Content */}
          <div className="space-y-8 text-center">
            {/* Header / Brand */}
            <div className="space-y-2">
              {/* Verified on CIIRS Badge */}
              <div className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-400 shadow-sm">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Verified on CIIRS</span>
              </div>

              <div className="pt-2 flex items-center justify-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-inner">
                  <Leaf className="h-6 w-6" />
                </div>
                <span className="text-xl sm:text-2xl font-black tracking-tight text-white font-mono">
                  CIIRS
                </span>
              </div>
              <p className="text-[11px] uppercase tracking-widest text-zinc-400 font-semibold">
                Circular Industrial & Institutional Resource Recovery System
              </p>

              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white pt-2">
                Impact Certificate
              </h1>

              <div className="inline-block rounded-md bg-zinc-950/80 border border-zinc-800 px-3 py-1 font-mono text-xs text-zinc-400">
                Certificate No:{" "}
                <span className="text-emerald-400 font-bold">
                  #{certificate.certificateNumber}
                </span>
              </div>
            </div>

            {/* Recipient Declaration */}
            <div className="max-w-xl mx-auto space-y-1.5 border-y border-zinc-800/80 py-4">
              <p className="text-xs uppercase tracking-wider text-zinc-400">
                This certifies that
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 flex items-center justify-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-400 inline" />
                <span>{recipientName}</span>
              </h2>
              <p className="text-xs text-zinc-400">
                Classification:{" "}
                <span className="text-zinc-300 font-medium">
                  {recipientType}
                </span>{" "}
                • Partnered with{" "}
                <span className="text-blue-400 font-medium">{partnerName}</span>
              </p>
              <p className="text-xs text-zinc-300 pt-1 leading-relaxed">
                has successfully diverted recyclable waste from landfills through the CIIRS verified custody and valorization framework.
              </p>
            </div>

            {/* Hero Metric: CO2 Saved */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 sm:p-8 max-w-lg mx-auto shadow-inner">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
                <Sparkles className="h-4 w-4" />
                <span>CO₂ Emissions Mitigated</span>
              </div>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white drop-shadow-sm">
                  {certificate.co2SavedKg}
                </span>
                <span className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono">
                  kg CO₂
                </span>
              </div>
              <p className="mt-2 text-xs text-emerald-300/80">
                Direct greenhouse gas diversion calculated from verified material reclamation
              </p>
            </div>

            {/* Supporting Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4 space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 block">
                  Waste Diverted
                </span>
                <span className="text-lg sm:text-xl font-bold text-zinc-100 font-mono block">
                  {certificate.wasteKg} kg
                </span>
                <span className="text-[11px] text-zinc-400">
                  Gross diverted mass
                </span>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4 space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 block">
                  Waste Type
                </span>
                <span className="text-lg sm:text-xl font-bold text-zinc-100 capitalize block truncate" title={certificate.wasteType}>
                  {certificate.wasteType}
                </span>
                <span className="text-[11px] text-zinc-400">
                  {listing.subType || "Valorized batch"}
                </span>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4 space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 block">
                  Issue Date
                </span>
                <span className="text-sm sm:text-base font-bold text-zinc-100 block">
                  {formattedDate}
                </span>
                <span className="text-[11px] text-zinc-400">
                  Verified timestamp
                </span>
              </div>
            </div>

            {/* Official Seal & Verification Footer */}
            <div className="pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
              <div className="flex items-center gap-2.5 text-left">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-semibold text-zinc-200 block">
                    Verified on CIIRS Platform
                  </span>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    OTP Custody Handover Authenticated
                  </span>
                </div>
              </div>

              <div className="text-right font-mono text-[11px] text-zinc-500">
                <span>Ref: #{certificate._id}</span>
                <span className="block text-[10px] text-zinc-600">
                  CIIRS Circular Trust Protocol
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Client-side script for copy & print interactivity */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('click', function(e) {
              var copyBtn = e.target && e.target.closest ? e.target.closest('#copy-cert-btn') : null;
              if (copyBtn) {
                if (navigator.clipboard && window.location) {
                  navigator.clipboard.writeText(window.location.href).then(function() {
                    var btnText = document.getElementById('copy-btn-text');
                    if (btnText) {
                      btnText.innerText = 'Copied!';
                      setTimeout(function() { btnText.innerText = 'Copy Link'; }, 2500);
                    }
                  }).catch(function() {
                    prompt('Copy Certificate Link:', window.location.href);
                  });
                } else {
                  prompt('Copy Certificate Link:', window.location.href);
                }
              }

              var printBtn = e.target && e.target.closest ? e.target.closest('#print-cert-btn') : null;
              if (printBtn) {
                window.print();
              }
            });
          `,
        }}
      />
    </main>
  );
}

/**
 * Not-Found State for invalid or non-existent certificate numbers
 */
function CertificateNotFoundState({ id }: { id?: string }) {
  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-16 text-zinc-100 flex items-center justify-center">
      <Card className="max-w-md w-full border-zinc-800 bg-zinc-900/90 text-zinc-100 shadow-2xl">
        <CardContent className="pt-6 space-y-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400">
            <FileCheck2 className="h-6 w-6" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-white">Certificate Not Found</h1>
            <p className="text-xs text-zinc-400">
              No verified Environmental Impact Certificate exists with reference identifier:
            </p>
            {id && (
              <div className="mt-2 inline-block rounded bg-zinc-950 border border-zinc-800 px-3 py-1 font-mono text-xs text-emerald-400 break-all">
                {id}
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
            <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs">
              <Link href="/">Explore CIIRS Marketplace</Link>
            </Button>
            <Button asChild variant="outline" className="border-zinc-700 bg-zinc-850 text-zinc-300 text-xs">
              <Link href="/contracts">View Transactions</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
