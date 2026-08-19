"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Clock,
  ArrowRight,
  FileText,
  Handshake,
  ShieldCheck,
  Calendar,
  Lock,
  Award,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ITimelineEvent {
  stage: string;
  timestamp: string | Date;
  note?: string;
}

export interface ContractData {
  _id?: string;
  id?: string;
  status:
    | "listed"
    | "matched"
    | "requested"
    | "confirmed"
    | "scheduled"
    | "otp_verified"
    | "completed"
    | "cancelled"
    | string;
  timeline?: ITimelineEvent[];
  scheduledPickupAt?: string | Date;
  otpCode?: string;
  otpVerifiedAt?: string | Date;
  greenCreditsAwarded?: number;
  co2SavedKg?: number;
  [key: string]: any;
}

export interface ContractTimelineProps {
  contract: ContractData;
  onAdvance?: (nextStage: string) => void | Promise<void>;
  isLoading?: boolean;
  className?: string;
}

interface StageDefinition {
  key: string;
  label: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STAGES: StageDefinition[] = [
  {
    key: "listed",
    label: "Listed",
    shortDesc: "Listing published on CIIRS",
    icon: FileText,
  },
  {
    key: "requested",
    label: "Requested",
    shortDesc: "Contract requested by startup",
    icon: Handshake,
  },
  {
    key: "confirmed",
    label: "Confirmed",
    shortDesc: "Terms mutually accepted",
    icon: ShieldCheck,
  },
  {
    key: "scheduled",
    label: "Scheduled",
    shortDesc: "Pickup date & window fixed",
    icon: Calendar,
  },
  {
    key: "otp_verified",
    label: "OTP Verified",
    shortDesc: "On-site custody handover",
    icon: Lock,
  },
  {
    key: "completed",
    label: "Completed",
    shortDesc: "Recycled & credits issued",
    icon: Award,
  },
];

const NEXT_STAGE_MAP: Record<string, { key: string; label: string }> = {
  listed: { key: "requested", label: "Requested" },
  matched: { key: "requested", label: "Requested" },
  requested: { key: "confirmed", label: "Confirmed" },
  confirmed: { key: "scheduled", label: "Scheduled" },
  scheduled: { key: "otp_verified", label: "OTP Verified" },
  otp_verified: { key: "completed", label: "Completed" },
};

function normalizeStageString(stageStr?: string): string {
  if (!stageStr) return "";
  return stageStr.toLowerCase().replace(/[\s_-]+/g, "_");
}

function getStageIndex(statusOrStage?: string): number {
  if (!statusOrStage) return 0;
  const norm = normalizeStageString(statusOrStage);
  switch (norm) {
    case "listed":
    case "matched":
      return 0;
    case "requested":
      return 1;
    case "confirmed":
      return 2;
    case "scheduled":
      return 3;
    case "otp_verified":
    case "otpverified":
    case "otp":
      return 4;
    case "completed":
      return 5;
    default:
      return 0;
  }
}

function formatTimestamp(timestamp?: string | Date): string {
  if (!timestamp) return "";
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function findTimelineEvent(
  timeline: ITimelineEvent[] | undefined,
  stageKey: string,
  stageLabel: string
): ITimelineEvent | undefined {
  if (!timeline || !Array.isArray(timeline)) return undefined;

  const targetNorm = normalizeStageString(stageKey);
  const targetLabelNorm = normalizeStageString(stageLabel);

  return timeline.find((event) => {
    const eventNorm = normalizeStageString(event.stage);
    return eventNorm === targetNorm || eventNorm === targetLabelNorm;
  });
}

export default function ContractTimeline({
  contract,
  onAdvance,
  isLoading = false,
  className = "",
}: ContractTimelineProps) {
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);

  const currentStatusNorm = normalizeStageString(contract.status);
  const isCancelled = currentStatusNorm === "cancelled";
  const isCompleted = currentStatusNorm === "completed";
  const currentIndex = isCancelled ? -1 : getStageIndex(contract.status);

  const nextStageInfo = !isCancelled && !isCompleted ? NEXT_STAGE_MAP[currentStatusNorm] : null;

  const handleAdvanceClick = async () => {
    if (!onAdvance || !nextStageInfo || isLoading || isAdvancing) return;

    try {
      setIsAdvancing(true);
      await onAdvance(nextStageInfo.key);
    } finally {
      setIsAdvancing(false);
    }
  };

  return (
    <Card className={`border-zinc-800 bg-zinc-950/90 text-zinc-100 shadow-xl backdrop-blur-sm ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800/80 pb-4">
        <div>
          <CardTitle className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <span>Contract Lifecycle Tracker</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                isCompleted
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : isCancelled
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
              }`}
            >
              {contract.status?.replace(/_/g, " ") || "In Progress"}
            </span>
          </CardTitle>
          <p className="mt-1 text-xs text-zinc-400">
            6-stage custody and valorization workflow verification
          </p>
        </div>

        {/* Advance Action Button */}
        {onAdvance && nextStageInfo && (
          <Button
            onClick={handleAdvanceClick}
            disabled={isLoading || isAdvancing}
            className="bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all font-medium text-xs sm:text-sm"
            size="sm"
          >
            {isLoading || isAdvancing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Advancing...
              </>
            ) : (
              <>
                <span>Advance to {nextStageInfo.label}</span>
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </>
            )}
          </Button>
        )}
      </CardHeader>

      <CardContent className="pt-6">
        {/* DESKTOP VIEW: Horizontal 6-Step Tracker (md & above) */}
        <div className="hidden md:block">
          <div className="relative flex items-start justify-between">
            {/* Background connecting line bar */}
            <div className="absolute left-8 right-8 top-5 -z-0 h-0.5 bg-zinc-800" />

            {/* Active progress fill line */}
            <div
              className="absolute left-8 top-5 -z-0 h-0.5 bg-gradient-to-r from-emerald-500 via-blue-500 to-blue-600 transition-all duration-500"
              style={{
                width: isCancelled
                  ? "0%"
                  : isCompleted
                  ? "calc(100% - 4rem)"
                  : `calc(${(currentIndex / (STAGES.length - 1)) * 100}% - 4rem)`,
              }}
            />

            {STAGES.map((stage, idx) => {
              const timelineEntry = findTimelineEvent(contract.timeline, stage.key, stage.label);
              const isPast = !isCancelled && (idx < currentIndex || (isCompleted && idx <= currentIndex));
              const isCurrent = !isCancelled && idx === currentIndex && !isCompleted;
              const isFuture = isCancelled || (!isPast && !isCurrent);

              const formattedTime = timelineEntry ? formatTimestamp(timelineEntry.timestamp) : "";
              const Icon = stage.icon;

              return (
                <div
                  key={stage.key}
                  className="relative z-10 flex flex-1 flex-col items-center px-1 text-center"
                >
                  {/* Step Node Circle */}
                  <div className="relative mb-3 flex items-center justify-center">
                    {/* Subtle Framer Motion Pulse for Current Active Step */}
                    {isCurrent && (
                      <motion.div
                        className="absolute -inset-2 rounded-full bg-blue-500/25"
                        animate={{
                          scale: [1, 1.25, 1],
                          opacity: [0.7, 0.2, 0.7],
                        }}
                        transition={{
                          duration: 2.2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    )}

                    <div
                      className={`relative flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                        isPast
                          ? "bg-emerald-600 text-white ring-4 ring-emerald-600/20 shadow-lg shadow-emerald-900/30"
                          : isCurrent
                          ? "bg-blue-600 text-white ring-4 ring-blue-500/30 shadow-lg shadow-blue-900/40"
                          : "border border-zinc-700 bg-zinc-900 text-zinc-500"
                      }`}
                    >
                      {isPast ? (
                        <Check className="h-5 w-5 stroke-[2.5]" />
                      ) : isCurrent ? (
                        <Icon className="h-4 w-4" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>
                  </div>

                  {/* Stage Label */}
                  <div className="flex flex-col items-center">
                    <span
                      className={`text-xs font-semibold transition-colors ${
                        isPast
                          ? "text-zinc-200"
                          : isCurrent
                          ? "text-blue-400 font-bold"
                          : "text-zinc-500"
                      }`}
                    >
                      {stage.label}
                    </span>

                    {/* Timestamp or Status Badge */}
                    {isPast && formattedTime && (
                      <span className="mt-1 flex items-center gap-1 text-[11px] text-zinc-400 font-normal">
                        <Clock className="h-3 w-3 text-zinc-500 inline" />
                        {formattedTime}
                      </span>
                    )}

                    {isCurrent && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-300 border border-blue-500/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                        In Progress
                      </span>
                    )}

                    {isFuture && (
                      <span className="mt-1 text-[11px] text-zinc-600">Pending</span>
                    )}

                    {/* Note if available */}
                    {timelineEntry?.note && (
                      <p className="mt-1 max-w-[120px] text-[10px] text-zinc-400 line-clamp-2" title={timelineEntry.note}>
                        {timelineEntry.note}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* MOBILE VIEW: Vertical Timeline (< md) */}
        <div className="block md:hidden space-y-4">
          <div className="relative pl-6 space-y-6">
            {/* Vertical spine line */}
            <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-zinc-800" />

            {STAGES.map((stage, idx) => {
              const timelineEntry = findTimelineEvent(contract.timeline, stage.key, stage.label);
              const isPast = !isCancelled && (idx < currentIndex || (isCompleted && idx <= currentIndex));
              const isCurrent = !isCancelled && idx === currentIndex && !isCompleted;
              const isFuture = isCancelled || (!isPast && !isCurrent);

              const formattedTime = timelineEntry ? formatTimestamp(timelineEntry.timestamp) : "";
              const Icon = stage.icon;

              return (
                <div key={stage.key} className="relative flex items-start gap-4">
                  {/* Step Icon Node */}
                  <div className="relative -ml-[25px] flex-shrink-0">
                    {isCurrent && (
                      <motion.div
                        className="absolute -inset-1.5 rounded-full bg-blue-500/30"
                        animate={{
                          scale: [1, 1.3, 1],
                          opacity: [0.7, 0.2, 0.7],
                        }}
                        transition={{
                          duration: 2.2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    )}

                    <div
                      className={`relative flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                        isPast
                          ? "bg-emerald-600 text-white"
                          : isCurrent
                          ? "bg-blue-600 text-white ring-2 ring-blue-500/40"
                          : "border border-zinc-700 bg-zinc-900 text-zinc-500"
                      }`}
                    >
                      {isPast ? (
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      ) : isCurrent ? (
                        <Icon className="h-3 w-3" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-semibold ${
                          isPast
                            ? "text-zinc-200"
                            : isCurrent
                            ? "text-blue-400 font-bold"
                            : "text-zinc-500"
                        }`}
                      >
                        {stage.label}
                      </span>

                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-300 border border-blue-500/30">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                          Active
                        </span>
                      )}

                      {isPast && formattedTime && (
                        <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-zinc-500" />
                          {formattedTime}
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-zinc-400">
                      {timelineEntry?.note || stage.shortDesc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
