"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Lock,
  KeyRound,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface OtpInputProps {
  contractId: string;
  onVerified?: (contract?: any) => void | Promise<void>;
  className?: string;
  supplierEmail?: string;
}

/**
 * Client component providing a 6-digit OTP verification interface.
 * Features:
 * - 6 individual auto-advancing input boxes with backspace & paste support
 * - "Resend code" action calling /api/contracts/[id]/otp/generate with cooldown
 * - Verify action calling /api/contracts/[id]/otp/verify
 * - Loading states, error alerts, and onVerified callback execution
 */
export default function OtpInput({
  contractId,
  onVerified,
  className = "",
  supplierEmail,
}: OtpInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState<number>(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 30-second cooldown timer for resending OTP
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Handle single character change or multi-character paste
  const handleChange = (index: number, value: string) => {
    setErrorMessage("");
    setSuccessMessage("");

    const cleaned = value.replace(/\D/g, "");

    // Multi-digit paste handling
    if (cleaned.length > 1) {
      const nextOtp = [...otp];
      const pastedDigits = cleaned.slice(0, 6).split("");

      for (let i = 0; i < 6; i++) {
        nextOtp[i] = pastedDigits[i] || "";
      }
      setOtp(nextOtp);

      const nextFocusIndex = Math.min(pastedDigits.length, 5);
      inputRefs.current[nextFocusIndex]?.focus();
      return;
    }

    const nextOtp = [...otp];
    nextOtp[index] = cleaned;
    setOtp(nextOtp);

    // Auto-advance focus to the next input box
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace, arrow navigation, and enter keys
  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        const nextOtp = [...otp];
        nextOtp[index - 1] = "";
        setOtp(nextOtp);
        inputRefs.current[index - 1]?.focus();
      } else {
        const nextOtp = [...otp];
        nextOtp[index] = "";
        setOtp(nextOtp);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === "Enter" && otp.every((d) => d !== "")) {
      e.preventDefault();
      handleVerify();
    }
  };

  // Handle clipboard paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasteData) return;

    const nextOtp = Array(6).fill("");
    pasteData.split("").forEach((char, idx) => {
      if (idx < 6) nextOtp[idx] = char;
    });

    setOtp(nextOtp);
    setErrorMessage("");

    const targetFocus = Math.min(pasteData.length, 5);
    inputRefs.current[targetFocus]?.focus();
  };

  // Call POST /api/contracts/[id]/otp/verify
  const handleVerify = async () => {
    const fullOtp = otp.join("").trim();
    if (fullOtp.length !== 6) {
      setErrorMessage("Please enter all 6 digits of the OTP code.");
      return;
    }

    setIsVerifying(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch(`/api/contracts/${contractId}/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: fullOtp }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || data.error || "Invalid OTP code. Please try again.");
      }

      setIsVerified(true);
      setSuccessMessage("Custody handover verified successfully! Contract completed.");

      if (onVerified) {
        await onVerified(data);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to verify OTP.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Call POST /api/contracts/[id]/otp/generate to resend
  const handleResend = async () => {
    if (cooldown > 0 || isResending || isVerified) return;

    setIsResending(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch(`/api/contracts/${contractId}/otp/generate`, {
        method: "POST",
      });

      const data = await res.json().catch(() => ({}));

      const emailTarget = data.supplierEmail || supplierEmail;
      if (data.devOtp) {
        setSuccessMessage(
          `OTP generated for ${emailTarget || "supplier email"}. (Dev Mode: Test Code is ${data.devOtp})`
        );
      } else {
        setSuccessMessage(
          emailTarget
            ? `A fresh 6-digit code was sent to ${emailTarget}.`
            : "A fresh 6-digit code was dispatched to the supplier's email."
        );
      }
      setCooldown(30);
      setOtp(Array(6).fill(""));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setErrorMessage(err.message || "Could not resend OTP. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  const isComplete = otp.every((d) => d !== "");

  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-950/90 p-5 text-zinc-100 shadow-xl backdrop-blur-md space-y-5 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Pickup Custody Verification
            </h3>
            <p className="text-xs text-zinc-400">
              Enter the 6-digit OTP code provided by the waste supplier
            </p>
          </div>
        </div>

        {isVerified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Verified
          </span>
        )}
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 6 Individual Digit Input Boxes */}
      <div className="space-y-3">
        <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              disabled={isVerifying || isVerified}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className={`h-12 w-10 sm:h-14 sm:w-12 text-center font-mono text-xl sm:text-2xl font-bold rounded-lg border transition-all outline-none disabled:opacity-50 ${
                digit
                  ? "border-blue-500/80 bg-zinc-900 text-white shadow-md shadow-blue-500/10"
                  : "border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:border-zinc-500"
              } focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30`}
            />
          ))}
        </div>

        <p className="text-center text-[11px] text-zinc-500">
          Code is valid for 15 minutes from generation.
        </p>
      </div>

      {/* Actions: Resend Code & Submit Verification */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        {/* Resend Link */}
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || isResending || isVerifying || isVerified}
          className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCw className={`h-3.5 w-3.5 ${isResending ? "animate-spin" : ""}`} />
          <span>
            {isResending
              ? "Dispatching code..."
              : cooldown > 0
              ? `Resend code in ${cooldown}s`
              : "Resend verification code"}
          </span>
        </button>

        {/* Submit Button */}
        <Button
          type="button"
          onClick={handleVerify}
          disabled={!isComplete || isVerifying || isVerified}
          className="w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20 font-semibold text-xs sm:text-sm px-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying Code...
            </span>
          ) : isVerified ? (
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              Verified
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5" />
              Verify & Complete Pickup
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
