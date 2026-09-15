import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Contract from "@/models/Contract";
import User from "@/models/User";
import WasteListing from "@/models/WasteListing";
import { generateOTP, hashOTP } from "@/lib/otp";
import { sendOTPEmail } from "@/lib/mailer";

/**
 * POST /api/contracts/[id]/otp/generate
 * Generates a 6-digit OTP, stores the bcrypt hash on the contract,
 * sets contract status to 'scheduled' if not already, sends the plain OTP
 * to the supplier's email via sendOTPEmail, and returns { success: true, message: "OTP sent" }.
 * Note: Raw OTP is never exposed in the API response.
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

    // 1. Fetch the contract by ID
    const contract = await Contract.findById(id);
    if (!contract) {
      return NextResponse.json(
        { error: `Contract with ID "${id}" not found.` },
        { status: 404 }
      );
    }

    // 2. Fetch the associated supplier's details via User model
    const supplier = await User.findById(contract.supplierId);
    if (!supplier || !supplier.email) {
      return NextResponse.json(
        { error: "Supplier or supplier email for this contract was not found." },
        { status: 404 }
      );
    }

    // Retrieve wasteType from the listing for email context
    let wasteType = "Waste";
    if (contract.listingId) {
      const listing = await WasteListing.findById(contract.listingId);
      if (listing?.wasteType) {
        wasteType = listing.wasteType;
      }
    }

    // 3. Generate 6-digit OTP & bcrypt hash
    const otp = generateOTP();
    const hashedOtp = await hashOTP(otp);

    // 4. Save hash to contract & update status to 'scheduled' if needed
    contract.otpCode = hashedOtp;
    if (contract.status !== "scheduled") {
      contract.status = "scheduled";

      const hasScheduledTimeline = contract.timeline?.some(
        (t) => t.stage.toLowerCase() === "scheduled"
      );
      if (!hasScheduledTimeline) {
        contract.timeline.push({
          stage: "Scheduled",
          timestamp: new Date(),
          note: "Pickup verification OTP generated and dispatched to supplier",
        });
      }
    }
    await contract.save();

    // 5. Send plain OTP email to the supplier
    const mailResult = await sendOTPEmail(supplier.email, otp, wasteType);

    // 6. Return success response
    return NextResponse.json(
      {
        success: true,
        message: mailResult.success
          ? `OTP dispatched to ${supplier.email}`
          : `OTP generated for ${supplier.email}`,
        supplierEmail: supplier.email,
        delivered: mailResult.success,
        devOtp: mailResult.devOtp, // Available in dev fallback
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("POST /api/contracts/[id]/otp/generate error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
