import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Contract from "@/models/Contract";
import User from "@/models/User";
import WasteListing from "@/models/WasteListing";
import { generateOTP, hashOTP } from "@/lib/otp";
import { sendOTPEmail } from "@/lib/mailer";

/**
 * GET /api/contracts/[id]
 * Fetches a single contract by its ID, populated with listing, supplier, and startup details.
 */
export async function GET(
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

    const contract = await Contract.findById(id)
      .populate("listingId")
      .populate("supplierId", "name organizationName organizationType email phone address location greenCreditBalance")
      .populate("startupId", "name organizationName organizationType email phone address location greenCreditBalance");

    if (!contract) {
      return NextResponse.json(
        { error: `Contract with ID "${id}" not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json(contract, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/contracts/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/contracts/[id]
 * Handles contract state transitions:
 *  1. action: 'confirm'
 *     - Only the supplier (contract.supplierId) can confirm.
 *     - Current status must be 'requested'.
 *     - Sets status to 'confirmed' and pushes a 'Confirmed' entry to timeline.
 *  2. action: 'schedule'
 *     - Either party (supplier or startup) can schedule once scheduledPickupAt is provided.
 *     - Current status must be 'confirmed'.
 *     - Requires scheduledPickupAt in request body.
 *     - Sets scheduledPickupAt, updates status to 'scheduled', and pushes a 'Scheduled' entry to timeline.
 */
export async function PATCH(
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
    const { action, userId, scheduledPickupAt } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Missing required field: action ('confirm' | 'schedule') is required." },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: userId is required." },
        { status: 403 }
      );
    }

    // Fetch the target contract
    const contract = await Contract.findById(id);
    if (!contract) {
      return NextResponse.json(
        { error: `Contract with ID "${id}" not found.` },
        { status: 404 }
      );
    }

    const supplierIdStr = contract.supplierId?._id
      ? contract.supplierId._id.toString()
      : contract.supplierId?.toString();
    const startupIdStr = contract.startupId?._id
      ? contract.startupId._id.toString()
      : contract.startupId?.toString();
    const currentUserIdStr = String(userId);

    // Initialize timeline array if missing
    if (!contract.timeline) {
      contract.timeline = [];
    }

    if (action === "confirm") {
      // Verify authorization: Only the supplier can confirm
      if (currentUserIdStr !== supplierIdStr) {
        return NextResponse.json(
          { error: "Unauthorized: Only the supplier can confirm this contract." },
          { status: 403 }
        );
      }

      // Verify current status is 'requested'
      if (contract.status !== "requested") {
        return NextResponse.json(
          {
            error: `Invalid transition: Contract status must be "requested" to confirm, but current status is "${contract.status}".`,
          },
          { status: 400 }
        );
      }

      // Transition to 'confirmed'
      contract.status = "confirmed";
      contract.timeline.push({
        stage: "Confirmed",
        timestamp: new Date(),
        note: "Contract confirmed and accepted by supplier",
      });

      await contract.save();
      return NextResponse.json(contract, { status: 200 });
    }

    if (action === "schedule") {
      // Verify authorization: Either party (supplier or startup) can schedule
      if (currentUserIdStr !== supplierIdStr && currentUserIdStr !== startupIdStr) {
        return NextResponse.json(
          {
            error: "Unauthorized: Only the supplier or startup involved in this contract can schedule pickup.",
          },
          { status: 403 }
        );
      }

      // Verify current status is 'confirmed'
      if (contract.status !== "confirmed") {
        return NextResponse.json(
          {
            error: `Invalid transition: Contract status must be "confirmed" to schedule, but current status is "${contract.status}".`,
          },
          { status: 400 }
        );
      }

      // Validate scheduledPickupAt
      if (!scheduledPickupAt) {
        return NextResponse.json(
          {
            error: "Missing required field: scheduledPickupAt is required to schedule pickup.",
          },
          { status: 400 }
        );
      }

      const pickupDate = new Date(scheduledPickupAt);
      if (isNaN(pickupDate.getTime())) {
        return NextResponse.json(
          {
            error: "Invalid date format for scheduledPickupAt.",
          },
          { status: 400 }
        );
      }

      // Generate OTP and bcrypt hash for custody verification
      const otp = generateOTP();
      const hashedOtp = await hashOTP(otp);

      // Transition to 'scheduled'
      contract.scheduledPickupAt = pickupDate;
      contract.status = "scheduled";
      contract.otpCode = hashedOtp;
      contract.timeline.push({
        stage: "Scheduled",
        timestamp: new Date(),
        note: `Pickup scheduled for ${pickupDate.toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        })}. Verification OTP generated and sent to supplier.`,
      });

      await contract.save();

      // Dispatch OTP email to the supplier asynchronously
      try {
        const supplier = await User.findById(contract.supplierId);
        if (supplier?.email) {
          let wasteType = "Waste";
          if (contract.listingId) {
            const listing = await WasteListing.findById(contract.listingId);
            if (listing?.wasteType) wasteType = listing.wasteType;
          }
          await sendOTPEmail(supplier.email, otp, wasteType);
        }
      } catch (mailErr) {
        console.error("Failed to send OTP email during scheduling:", mailErr);
      }

      return NextResponse.json(contract, { status: 200 });
    }

    // Invalid action
    return NextResponse.json(
      {
        error: `Invalid action "${action}". Allowed actions are "confirm" and "schedule".`,
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("PATCH /api/contracts/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
