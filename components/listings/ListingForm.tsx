"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import PhotoUploader from "./PhotoUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sparkles, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";

interface AIGradingResult {
  grade: string;
  contaminationLevel: string;
  confidence: number;
  lowConfidence?: boolean;
  notes?: string;
  rawResponse?: string;
}

interface ListingFormData {
  wasteType: string;
  subType: string;
  quantityKg: number | "";
  unit: string;
  longitude: number | "";
  latitude: number | "";
  address: string;
  availableFrom: string;
  isRecurring: boolean;
  recurrencePattern: string;
  photoUrls: string[];
}

export default function ListingForm() {
  const router = useRouter();
  const { data: session } = useSession();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [formData, setFormData] = useState<ListingFormData>({
    wasteType: "Plastic",
    subType: "",
    quantityKg: "",
    unit: "kg",
    longitude: 80.2707,
    latitude: 13.0827,
    address: "",
    availableFrom: new Date().toISOString().split("T")[0],
    isRecurring: false,
    recurrencePattern: "",
    photoUrls: [],
  });

  // Created Listing State & AI Analysis State
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);
  const [isCreatingListing, setIsCreatingListing] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiGrading, setAiGrading] = useState<AIGradingResult | null>(null);
  const [error, setError] = useState<string>("");
  const [isSubmittingFinal, setIsSubmittingFinal] = useState<boolean>(false);

  // Field change handler
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (name === "quantityKg" || name === "longitude" || name === "latitude") {
      setFormData((prev) => ({
        ...prev,
        [name]: value === "" ? "" : parseFloat(value),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    setError("");
    if (!formData.wasteType.trim()) {
      setError("Please select a waste type.");
      return false;
    }
    if (formData.quantityKg === "" || formData.quantityKg <= 0) {
      setError("Please enter a valid quantity in kg.");
      return false;
    }
    if (!formData.unit.trim()) {
      setError("Please enter or select a unit.");
      return false;
    }
    if (formData.longitude === "" || formData.latitude === "") {
      setError("Please provide valid location coordinates.");
      return false;
    }
    if (!formData.availableFrom) {
      setError("Please select the date from which waste is available.");
      return false;
    }
    return true;
  };

  const handleStep1Next = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  // Helper to create or sync listing document on server
  const ensureListingCreated = async (photos: string[]): Promise<string> => {
    if (createdListingId) return createdListingId;

    setIsCreatingListing(true);
    // Get user ID from session or fallback demo ID if testing
    const supplierId =
      (session?.user as any)?.id || "660000000000000000000001";

    const payload = {
      supplierId,
      wasteType: formData.wasteType,
      subType: formData.subType || undefined,
      quantityKg: Number(formData.quantityKg),
      unit: formData.unit,
      photoUrls: photos,
      location: {
        type: "Point",
        coordinates: [Number(formData.longitude), Number(formData.latitude)],
      },
      availableFrom: formData.availableFrom,
      isRecurring: formData.isRecurring,
      recurrencePattern: formData.isRecurring ? formData.recurrencePattern : undefined,
    };

    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsCreatingListing(false);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to create listing (HTTP ${res.status})`);
    }

    const listing = await res.json();
    setCreatedListingId(listing._id);
    return listing._id;
  };

  // Triggered when PhotoUploader completes an upload
  const handlePhotoUploadComplete = async (url: string) => {
    setError("");
    const updatedPhotos = [...formData.photoUrls, url];
    setFormData((prev) => ({ ...prev, photoUrls: updatedPhotos }));

    try {
      // Create listing if not created yet
      const listingId = await ensureListingCreated(updatedPhotos);

      // Run AI Grading via POST /api/listings/[id]/analyze
      setIsAnalyzing(true);
      const analyzeRes = await fetch(`/api/listings/${listingId}/analyze`, {
        method: "POST",
      });

      setIsAnalyzing(false);

      if (!analyzeRes.ok) {
        const errData = await analyzeRes.json().catch(() => ({}));
        throw new Error(errData.error || "AI grading request failed.");
      }

      const updatedListing = await analyzeRes.json();
      if (updatedListing.aiGrading) {
        let lowConf = false;
        if (updatedListing.aiGrading.rawResponse) {
          try {
            const rawParsed = JSON.parse(updatedListing.aiGrading.rawResponse);
            lowConf = Boolean(rawParsed.lowConfidence || rawParsed.confidence < 0.5);
          } catch {
            lowConf = (updatedListing.aiGrading.confidence || 1) < 0.5;
          }
        } else {
          lowConf = (updatedListing.aiGrading.confidence || 1) < 0.5;
        }

        setAiGrading({
          grade: updatedListing.aiGrading.grade || "B",
          contaminationLevel: updatedListing.aiGrading.contaminationLevel || "low",
          confidence: updatedListing.aiGrading.confidence ?? 0.8,
          lowConfidence: lowConf,
          notes: updatedListing.aiGrading.notes,
          rawResponse: updatedListing.aiGrading.rawResponse,
        });
      }
    } catch (err: any) {
      setIsCreatingListing(false);
      setIsAnalyzing(false);
      setError(err.message || "Failed to process photo upload and AI grading.");
    }
  };

  // Final submit in Step 3
  const handleFinalConfirm = async () => {
    setIsSubmittingFinal(true);
    setError("");

    try {
      let listingId = createdListingId;
      if (!listingId) {
        listingId = await ensureListingCreated(formData.photoUrls);
      }
      if (listingId) {
        router.push(`/listings/${listingId}`);
      } else {
        router.push("/listings");
      }
    } catch (err: any) {
      setError(err.message || "Failed to finalize listing.");
      setIsSubmittingFinal(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Step Indicator Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: "Waste Details" },
            { num: 2, label: "Photo & AI Grade" },
            { num: 3, label: "Review & Confirm" },
          ].map((s) => (
            <div key={s.num} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    step === s.num
                      ? "bg-blue-600 text-white ring-4 ring-blue-600/20"
                      : step > s.num
                      ? "bg-emerald-600 text-white"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                  }`}
                >
                  {step > s.num ? "✓" : s.num}
                </div>
                <span
                  className={`text-xs font-medium ${
                    step === s.num ? "text-blue-400" : "text-zinc-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {s.num < 3 && (
                <div
                  className={`mx-2 h-0.5 flex-1 transition-colors ${
                    step > s.num ? "bg-emerald-600" : "bg-zinc-800"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Form Card */}
      <Card className="border-zinc-800 bg-zinc-950/80 text-zinc-100 shadow-xl backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-xl text-zinc-100">
            {step === 1 && "Step 1: Specify Waste Details"}
            {step === 2 && "Step 2: Upload Photo & Run AI Inspection"}
            {step === 3 && "Step 3: Review & Finalize Listing"}
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {step === 1 &&
              "Provide accurate information regarding the material type, quantity, and location."}
            {step === 2 &&
              "Upload clear photographs of your waste batch to generate automated quality grading."}
            {step === 3 &&
              "Verify all listing data and AI inspection grades before publishing."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-500/15 border border-red-500/30 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* STEP 1 — Waste Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-300">
                    Waste Category *
                  </label>
                  <select
                    name="wasteType"
                    value={formData.wasteType}
                    onChange={handleChange}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Plastic">Plastic</option>
                    <option value="Organic">Organic / Food Waste</option>
                    <option value="E-waste">E-Waste / Electronics</option>
                    <option value="Paper">Paper & Cardboard</option>
                    <option value="Metal">Scrap Metal</option>
                    <option value="Textile">Textiles & Fabric</option>
                    <option value="Glass">Glass</option>
                    <option value="Hazardous">Industrial / Chemical</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-300">
                    Sub-Type / Specification
                  </label>
                  <Input
                    name="subType"
                    placeholder="e.g. PET Bottles, Shredded Paper"
                    value={formData.subType}
                    onChange={handleChange}
                    className="border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-300">
                    Quantity *
                  </label>
                  <Input
                    type="number"
                    name="quantityKg"
                    placeholder="e.g. 250"
                    value={formData.quantityKg}
                    onChange={handleChange}
                    min="0"
                    step="any"
                    className="border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-300">
                    Unit *
                  </label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="kg">kg (Kilograms)</option>
                    <option value="tonnes">tonnes (Metric Tons)</option>
                    <option value="bags">bags</option>
                    <option value="units">units / pieces</option>
                  </select>
                </div>
              </div>

              {/* Location Coordinates */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-300">
                  Location Coordinates (Longitude & Latitude) *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="number"
                    name="longitude"
                    placeholder="Longitude (e.g. 80.2707)"
                    value={formData.longitude}
                    onChange={handleChange}
                    step="any"
                    className="border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600"
                  />
                  <Input
                    type="number"
                    name="latitude"
                    placeholder="Latitude (e.g. 13.0827)"
                    value={formData.latitude}
                    onChange={handleChange}
                    step="any"
                    className="border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-300">
                    Available From Date *
                  </label>
                  <Input
                    type="date"
                    name="availableFrom"
                    value={formData.availableFrom}
                    onChange={handleChange}
                    className="border-zinc-800 bg-zinc-900 text-zinc-100"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-zinc-300">
                    <input
                      type="checkbox"
                      name="isRecurring"
                      checked={formData.isRecurring}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-blue-500"
                    />
                    Is Recurring Waste Supply?
                  </label>
                </div>
              </div>

              {formData.isRecurring && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-300">
                    Recurrence Frequency / Pattern
                  </label>
                  <Input
                    name="recurrencePattern"
                    placeholder="e.g. Weekly every Monday, Monthly 1st"
                    value={formData.recurrencePattern}
                    onChange={handleChange}
                    className="border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600"
                  />
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button
                  type="button"
                  onClick={handleStep1Next}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  Next: Photo Upload →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2 — Photo Upload & Editable AI Grading Suggestion */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Upload Batch Photo
                </label>
                <PhotoUploader onUploadComplete={handlePhotoUploadComplete} />
              </div>

              {/* Status Indicator & Loading State */}
              {isAnalyzing && (
                <div className="flex items-center gap-3 rounded-lg border border-blue-500/40 bg-blue-500/15 p-4 text-blue-300 animate-pulse">
                  <div className="h-5 w-5 flex-shrink-0 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-blue-200">
                      Analyzing your photo...
                    </p>
                    <p className="text-xs text-blue-400/80">
                      Gemini Vision AI is inspecting material purity, contamination levels, and assigning quality grades.
                    </p>
                  </div>
                </div>
              )}

              {isCreatingListing && !isAnalyzing && (
                <div className="flex items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-blue-400">
                  <div className="h-5 w-5 flex-shrink-0 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                  <div className="text-sm font-medium">
                    Creating listing document...
                  </div>
                </div>
              )}

              {/* AI Grading Results (Editable suggestion: AI suggests, human confirms) */}
              {aiGrading && !isAnalyzing && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                        Quality Inspection
                      </span>
                      <span className="text-[11px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">
                        AI suggested — you can adjust
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span>
                        AI Confidence:{" "}
                        <strong className="text-zinc-200">
                          {Math.round(aiGrading.confidence * 100)}%
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Low Confidence Warning Notice */}
                  {aiGrading.lowConfidence && (
                    <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-200">
                          Please double-check this photo&apos;s grading
                        </p>
                        <p className="text-amber-300/80 text-[11px] mt-0.5">
                          Low AI confidence ({Math.round(aiGrading.confidence * 100)}%). Review the assigned grade and contamination below to ensure accurate matching.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Editable Grade and Contamination Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    {/* Quality Grade Select */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-zinc-300">
                        Assigned Quality Grade *
                      </label>
                      <select
                        value={aiGrading.grade}
                        onChange={(e) =>
                          setAiGrading((prev) =>
                            prev ? { ...prev, grade: e.target.value } : null
                          )
                        }
                        className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 font-semibold focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="A">Grade A (Clean, Uniform, Minimal Foreign Matter)</option>
                        <option value="B">Grade B (Usable with Minor / Mixed Contamination)</option>
                        <option value="C">Grade C (Degraded / Significant Contamination)</option>
                      </select>
                      <p className="text-[10px] text-zinc-500">
                        Grade A yields higher Green Credits and premium valorization.
                      </p>
                    </div>

                    {/* Contamination Level Select */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-zinc-300">
                        Contamination Level *
                      </label>
                      <select
                        value={aiGrading.contaminationLevel}
                        onChange={(e) =>
                          setAiGrading((prev) =>
                            prev
                              ? { ...prev, contaminationLevel: e.target.value }
                              : null
                          )
                        }
                        className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 font-semibold capitalize focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="none">None (0% Foreign Materials)</option>
                        <option value="low">Low (&lt;5% Non-target)</option>
                        <option value="medium">Medium (5-20% Mixed Items)</option>
                        <option value="high">High (&gt;20% Foreign Items)</option>
                      </select>
                      <p className="text-[10px] text-zinc-500">
                        Adjust if the photo shows lighting glare or partial occlusion.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={isAnalyzing || isCreatingListing}
                  className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                >
                  ← Back
                </Button>

                <Button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={
                    formData.photoUrls.length === 0 ||
                    isAnalyzing ||
                    isCreatingListing
                  }
                  className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Analyzing Photo...
                    </span>
                  ) : (
                    "Next: Review & Confirm →"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3 — Review & Confirm */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-sm">
                <div className="flex justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Waste Type</span>
                  <span className="font-medium text-zinc-100">
                    {formData.wasteType}{" "}
                    {formData.subType ? `(${formData.subType})` : ""}
                  </span>
                </div>

                <div className="flex justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Quantity</span>
                  <span className="font-medium text-zinc-100">
                    {formData.quantityKg} {formData.unit}
                  </span>
                </div>

                <div className="flex justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Location Coordinates</span>
                  <span className="font-medium text-zinc-100">
                    [{formData.longitude}, {formData.latitude}]
                  </span>
                </div>

                <div className="flex justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Available From</span>
                  <span className="font-medium text-zinc-100">
                    {formData.availableFrom}
                  </span>
                </div>

                <div className="flex justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Recurrence</span>
                  <span className="font-medium text-zinc-100">
                    {formData.isRecurring
                      ? `Yes (${formData.recurrencePattern || "Regular"})`
                      : "One-time batch"}
                  </span>
                </div>

                {/* Uploaded Photos Count */}
                <div className="flex justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Uploaded Photos</span>
                  <span className="font-medium text-zinc-100">
                    {formData.photoUrls.length} file(s) uploaded
                  </span>
                </div>

                {/* Confirmed Quality Grade summary */}
                {aiGrading && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="block text-xs text-zinc-400">
                        Confirmed Quality Grade
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {aiGrading.lowConfidence
                          ? "(Manually Adjusted / Verified)"
                          : "(AI Inspected & Confirmed)"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-bold ${
                          aiGrading.grade === "A"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                            : aiGrading.grade === "B"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                            : "bg-red-500/20 text-red-400 border border-red-500/40"
                        }`}
                      >
                        Grade {aiGrading.grade}
                      </span>
                      <span className="text-xs text-zinc-400 capitalize">
                        ({aiGrading.contaminationLevel} contamination,{" "}
                        {Math.round(aiGrading.confidence * 100)}% confidence)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                >
                  ← Back
                </Button>

                <Button
                  type="button"
                  onClick={handleFinalConfirm}
                  disabled={isSubmittingFinal}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSubmittingFinal
                    ? "Finalizing..."
                    : "Confirm & Publish Listing"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
