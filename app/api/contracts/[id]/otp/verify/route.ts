import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Contract from "@/models/Contract";
import GreenCredit from "@/models/GreenCredit";
import User from "@/models/User";
import WasteListing from "@/models/WasteListing";
import { verifyOTP } from "@/lib/otp";

/**
 * POST /api/contracts/[id]/otp/verify
 * Verifies the 6-digit OTP code against the contract's stored bcrypt hash.
 * On success:
 *  1. Sets contract.otpVerifiedAt to now, pushes 'OTP Verified' & 'Completed' to timeline, sets status to 'completed'.
 *  2. Calculates greenCreditsAwarded (5 credits/kg) and co2SavedKg (2.5 kg CO2/kg waste).
 *  3. Creates a GreenCredit ledger entry for the supplier with reason 'Waste pickup verified'.
 *  4. Increments the supplier User's greenCreditBalance.
 *  5. Saves all documents and returns the updated contract.
 * On mismatch:
 *  Returns 400 with { success: false, message: 'Invalid OTP' }.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: "Contract ID parameter is required." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { otp } = body;

    if (!otp || typeof otp !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid OTP" },
        { status: 400 }
      );
    }

    // 1. Fetch the target contract
    const contract = await Contract.findById(id);
    if (!contract) {
      return NextResponse.json(
        { error: `Contract with ID "${id}" not found.` },
        { status: 404 }
      );
    }

    if (!contract.otpCode) {
      return NextResponse.json(
        { success: false, message: "Invalid OTP" },
        { status: 400 }
      );
    }

    // 2. Verify submitted OTP against stored bcrypt hash
    const isOtpValid = await verifyOTP(otp.trim(), contract.otpCode);
    if (!isOtpValid) {
      return NextResponse.json(
        { success: false, message: "Invalid OTP" },
        { status: 400 }
      );
    }

    // 3. Multi-document update execution inside try/catch
    try {
      const now = new Date();

      // Step 1: Update Contract verification and lifecycle status
      contract.otpVerifiedAt = now;
      contract.status = "completed";

      // Append OTP Verified and Completed milestone events to timeline
      const hasOtpVerifiedTimeline = contract.timeline?.some(
        (t) => t.stage.toLowerCase() === "otp verified" || t.stage.toLowerCase() === "otp_verified"
      );
      if (!hasOtpVerifiedTimeline) {
        contract.timeline.push({
          stage: "OTP Verified",
          timestamp: now,
          note: "On-site custody handover verified via secure OTP",
        });
      }

      const hasCompletedTimeline = contract.timeline?.some(
        (t) => t.stage.toLowerCase() === "completed"
      );
      if (!hasCompletedTimeline) {
        contract.timeline.push({
          stage: "Completed",
          timestamp: now,
          note: "Waste diversion completed, Green Credits and CO₂ savings awarded",
        });
      }

      // Step 2: Fetch WasteListing to calculate credits and CO2 savings
      const listing = await WasteListing.findById(contract.listingId);
      const quantityKg = Number(listing?.quantityKg) || 0;

      // Green Credits awarded at 5 credits per kg diverted
      const greenCreditsAwarded = Math.max(0, Math.round(quantityKg * 5));

      // Estimated CO2 savings: 2.5 kg CO2 per kg diverted (placeholder factor, adjustable per material LCA)
      const co2SavedKg = Math.max(0, Math.round(quantityKg * 2.5 * 100) / 100);

      contract.greenCreditsAwarded = greenCreditsAwarded;
      contract.co2SavedKg = co2SavedKg;

      // Step 3 & 4: Fetch supplier User, increment balance, and create GreenCredit document
      const supplier = await User.findById(contract.supplierId);
      if (supplier) {
        const previousBalance = supplier.greenCreditBalance || 0;
        const balanceAfter = previousBalance + greenCreditsAwarded;

        supplier.greenCreditBalance = balanceAfter;
        await supplier.save();

        await GreenCredit.create({
          userId: supplier._id,
          contractId: contract._id,
          amount: greenCreditsAwarded,
          reason: "Waste pickup verified",
          balanceAfter,
        });
      }

      // Update associated waste listing status to 'completed'
      if (listing) {
        listing.status = "completed";
        await listing.save();
      }

      // Step 5: Save contract and return updated document
      await contract.save();

      return NextResponse.json(contract, { status: 200 });
    } catch (updateError: any) {
      console.error("Multi-document update failed during OTP verification:", updateError);
      return NextResponse.json(
        {
          error: `Failed to complete verification and award credits: ${updateError.message || "Database update failed"}`,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("POST /api/contracts/[id]/otp/verify error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
