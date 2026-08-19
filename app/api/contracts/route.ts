import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Contract from "@/models/Contract";
import WasteListing from "@/models/WasteListing";
import "@/models/User"; // Ensure User model is registered for populate queries

/**
 * POST /api/contracts
 * Creates a new contract for a waste listing in 'requested' status,
 * initializes the stage timeline with 'Listed' and 'Requested' entries,
 * and transitions the associated WasteListing's status to 'requested'.
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const { listingId, supplierId, startupId } = body;

    // Validate required fields
    if (!listingId || !supplierId || !startupId) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: listingId, supplierId, and startupId are all required.",
        },
        { status: 400 }
      );
    }

    // Fetch the related waste listing
    const listing = await WasteListing.findById(listingId);
    if (!listing) {
      return NextResponse.json(
        { error: `Waste listing with ID "${listingId}" not found.` },
        { status: 404 }
      );
    }

    // Initialize timeline with 'Listed' (from listing creation) and 'Requested' (current timestamp)
    const timeline = [
      {
        stage: "Listed",
        timestamp: listing.createdAt || new Date(),
        note: "Waste listing published on CIIRS marketplace",
      },
      {
        stage: "Requested",
        timestamp: new Date(),
        note: "Contract request initiated between startup and supplier",
      },
    ];

    // Create the contract in 'requested' status
    const contract = await Contract.create({
      listingId,
      supplierId,
      startupId,
      status: "requested",
      timeline,
    });

    // Update the associated waste listing status to 'requested'
    listing.status = "requested";
    await listing.save();

    return NextResponse.json(contract, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/contracts error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contracts
 * Fetches contracts filtered by supplierId or startupId (or listingId/status),
 * sorted by createdAt descending, and populated with basic listing details.
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get("supplierId");
    const startupId = searchParams.get("startupId");
    const listingId = searchParams.get("listingId");
    const status = searchParams.get("status");

    const filter: Record<string, any> = {};

    if (supplierId) {
      filter.supplierId = supplierId;
    }
    if (startupId) {
      filter.startupId = startupId;
    }
    if (listingId) {
      filter.listingId = listingId;
    }
    if (status) {
      filter.status = status;
    }

    const contracts = await Contract.find(filter)
      .sort({ createdAt: -1 })
      .populate("listingId", "wasteType subType quantityKg unit priceEstimate status photoUrls location")
      .populate("supplierId", "name organizationName organizationType email phone address")
      .populate("startupId", "name organizationName organizationType email phone address");

    return NextResponse.json(contracts, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/contracts error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
