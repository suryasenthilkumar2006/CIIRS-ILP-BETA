"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Mail,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  UserCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface SupplierOtpCardProps {
  contractId: string;
  supplierEmail?: string;
  scheduledPickupAt?: string | Date;
  startupName?: string;
}

export default function SupplierOtpCard({
  contractId,
  supplierEmail,
  scheduledPickupAt,
  startupName,
}: SupplierOtpCardProps) {
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const formattedDate = scheduledPickupAt
    ? new Date(scheduledPickupAt).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Pending Confirmation";

  const handleResend = async () => {
    setIsResending(true);
    setResendStatus(null);
    try {
      const res = await fetch(`/api/contracts/${contractId}/otp/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResendStatus(`Fresh OTP successfully dispatched to ${data.email || supplierEmail}!`);
        if (data.devOtp) {
          setDevOtp(data.devOtp);
        }
      } else {
        setResendStatus("Failed to dispatch code. Please try again.");
      }
    } catch {
      setResendStatus("Network error while requesting code dispatch.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className="border-emerald-500/30 bg-emerald-950/20 shadow-xl overflow-hidden">
      <CardHeader className="border-b border-emerald-500/20 bg-emerald-500/5 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <span>Supplier Custody Release Code</span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-300 border border-emerald-500/30">
                  Active Pickup Window
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-emerald-200/70">
                Provide this OTP code to the collector upon physical handover
              </CardDescription>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            size="sm"
            variant="outline"
            className="border-emerald-500/30 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 hover:text-white text-xs shrink-0 self-start sm:self-auto"
          >
            {isResending ? (
              <span className="flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Dispatching...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Resend Code to Email
              </span>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-4">
        {/* Scheduled Info Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
            <Clock className="h-4 w-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-zinc-500 block text-[11px]">Scheduled Pickup Time:</span>
              <span className="font-semibold text-zinc-200">{formattedDate}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
            <UserCheck className="h-4 w-4 text-blue-400 shrink-0" />
            <div>
              <span className="text-zinc-500 block text-[11px]">Assigned Collector / Startup:</span>
              <span className="font-semibold text-zinc-200">{startupName || "Authorized Circular Startup"}</span>
            </div>
          </div>
        </div>

        {/* Dispatch Status */}
        {resendStatus && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{resendStatus}</span>
          </div>
        )}

        {/* Development Helper if Active */}
        {devOtp && (
          <div className="flex items-center justify-between rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <span>Dev Testing Verification Code:</span>
            </div>
            <span className="font-mono font-bold text-sm tracking-widest bg-zinc-900 px-2 py-0.5 rounded border border-amber-500/30 text-amber-400">
              {devOtp}
            </span>
          </div>
        )}

        {/* Step-by-Step Supplier Instructions */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/90 p-4 space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            Custody Handover Protocol
          </h4>
          <ol className="space-y-1.5 text-xs text-zinc-300 list-decimal list-inside leading-relaxed">
            <li>
              Check your inbox at <span className="font-mono text-emerald-300">{supplierEmail || "your registered email"}</span> for the 6-digit OTP.
            </li>
            <li>
              Verify that the collection vehicle and driver credentials match <span className="font-semibold text-white">{startupName || "the assigned startup"}</span>.
            </li>
            <li>
              Once the material batch is weighed and loaded, <span className="font-bold text-emerald-300">verbally share your 6-digit OTP code</span> with the driver.
            </li>
            <li>
              As soon as the driver enters the code into their mobile verification terminal, your <span className="font-semibold text-emerald-400">Green Credits</span> will be credited immediately to your wallet.
            </li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
