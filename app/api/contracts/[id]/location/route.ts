import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Contract from "@/models/Contract";

/**
 * GET /api/contracts/[id]/location
 * Returns the contract's current liveLocation (or null if not set).
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

    const contract = await Contract.findById(id).select("liveLocation status");

    if (!contract) {
      return NextResponse.json(
        { error: `Contract with ID "${id}" not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        liveLocation: contract.liveLocation || null,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("GET /api/contracts/[id]/location error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contracts/[id]/location
 * Accepts { lat, lng }, verifies contract status is 'scheduled',
 * updates contract.liveLocation with the coordinates and current timestamp,
 * returns 200 with success. Returns 400 if status isn't 'scheduled' or invalid payload.
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
    const { lat, lng } = body;

    if (
      lat === undefined ||
      lng === undefined ||
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      isNaN(lat) ||
      isNaN(lng)
    ) {
      return NextResponse.json(
        { error: "Valid numeric 'lat' and 'lng' coordinates are required." },
        { status: 400 }
      );
    }

    const contract = await Contract.findById(id);

    if (!contract) {
      return NextResponse.json(
        { error: `Contract with ID "${id}" not found.` },
        { status: 404 }
      );
    }

    if (contract.status !== "scheduled") {
      return NextResponse.json(
        {
          error: `Live location updates are only permitted when contract status is 'scheduled'. Current status is '${contract.status}'.`,
        },
        { status: 400 }
      );
    }

    const liveLocation = {
      lat,
      lng,
      updatedAt: new Date(),
    };

    contract.liveLocation = liveLocation;
    await contract.save();

    return NextResponse.json(
      {
        success: true,
        message: "Live location updated successfully.",
        liveLocation: contract.liveLocation,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("POST /api/contracts/[id]/location error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
