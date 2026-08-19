import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import WasteListing from "@/models/WasteListing";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const {
      supplierId,
      wasteType,
      quantityKg,
      unit,
      location,
      availableFrom,
    } = body;

    // Validate required fields
    if (!supplierId) {
      return NextResponse.json(
        { error: "supplierId is required." },
        { status: 400 }
      );
    }
    if (!wasteType) {
      return NextResponse.json(
        { error: "wasteType is required." },
        { status: 400 }
      );
    }
    if (quantityKg === undefined || quantityKg === null) {
      return NextResponse.json(
        { error: "quantityKg is required." },
        { status: 400 }
      );
    }
    if (!unit) {
      return NextResponse.json(
        { error: "unit is required." },
        { status: 400 }
      );
    }
    if (
      !location ||
      !location.coordinates ||
      !Array.isArray(location.coordinates) ||
      location.coordinates.length !== 2
    ) {
      return NextResponse.json(
        {
          error:
            "location is required and must include coordinates as [longitude, latitude].",
        },
        { status: 400 }
      );
    }
    if (!availableFrom) {
      return NextResponse.json(
        { error: "availableFrom is required." },
        { status: 400 }
      );
    }

    const listing = await WasteListing.create({
      supplierId,
      wasteType,
      subType: body.subType || undefined,
      quantityKg,
      unit,
      photoUrls: body.photoUrls || [],
      status: "listed",
      location: {
        type: "Point",
        coordinates: location.coordinates,
      },
      availableFrom: new Date(availableFrom),
      isRecurring: body.isRecurring ?? false,
      recurrencePattern: body.recurrencePattern || undefined,
    });

    return NextResponse.json(listing, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/listings error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const wasteType = searchParams.get("wasteType");
    const status = searchParams.get("status");
    const supplierId = searchParams.get("supplierId");

    const filter: Record<string, string> = {};

    if (wasteType) {
      filter.wasteType = wasteType;
    }
    if (status) {
      filter.status = status;
    }
    if (supplierId) {
      filter.supplierId = supplierId;
    }

    const listings = await WasteListing.find(filter).sort({ createdAt: -1 });

    return NextResponse.json(listings);
  } catch (error: any) {
    console.error("GET /api/listings error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
