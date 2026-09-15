import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import ImpactCertificate from "@/models/ImpactCertificate";
import Contract from "@/models/Contract";
import WasteListing from "@/models/WasteListing";
import "@/models/User";

/**
 * GET /api/certificates/[contractId]
 * Fetches an existing ImpactCertificate for the given contractId, or creates a new
 * one using details from the completed Contract and its WasteListing.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { contractId: string } }
) {
  try {
    await connectDB();

    const { contractId } = params;

    if (!contractId || !mongoose.Types.ObjectId.isValid(contractId)) {
      return NextResponse.json(
        { error: "A valid contractId parameter is required." },
        { status: 400 }
      );
    }

    // 1. Check if an ImpactCertificate already exists for this contractId
    const existingCertificate = await ImpactCertificate.findOne({
      contractId: new mongoose.Types.ObjectId(contractId),
    })
      .populate("userId", "name organizationName organizationType email")
      .populate("contractId");

    if (existingCertificate) {
      return NextResponse.json(existingCertificate, { status: 200 });
    }

    // 2. Fetch the target Contract
    const contract = await Contract.findById(contractId);
    if (!contract) {
      return NextResponse.json(
        { error: `Contract with ID "${contractId}" not found.` },
        { status: 404 }
      );
    }

    // 3. Return 404 if the contract is not completed
    if (contract.status !== "completed") {
      return NextResponse.json(
        {
          error: `Contract with ID "${contractId}" is not completed (current status: "${contract.status}").`,
        },
        { status: 404 }
      );
    }

    // 4. Fetch associated WasteListing to extract waste quantity and type
    const listing = await WasteListing.findById(contract.listingId);
    const wasteKg = listing?.quantityKg ?? 0;
    const wasteType = listing?.wasteType ?? "Recyclable Waste";
    const co2SavedKg = contract.co2SavedKg ?? (wasteKg > 0 ? Math.round(wasteKg * 2.5 * 100) / 100 : 0);
    const userId = contract.supplierId;

    // 5. Generate certificate number using the model's static method
    let certificateNumber = ImpactCertificate.generateCertificateNumber();
    let collisionCheck = await ImpactCertificate.findOne({ certificateNumber });
    while (collisionCheck) {
      certificateNumber = ImpactCertificate.generateCertificateNumber();
      collisionCheck = await ImpactCertificate.findOne({ certificateNumber });
    }

    const shareUrl = `/certificates/${certificateNumber}`;

    // 6. Create and save the new ImpactCertificate
    const newCertificate = await ImpactCertificate.create({
      contractId: contract._id,
      userId,
      certificateNumber,
      co2SavedKg,
      wasteKg,
      wasteType,
      issuedAt: new Date(),
      shareUrl,
    });

    return NextResponse.json(newCertificate, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/certificates/[contractId] error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
