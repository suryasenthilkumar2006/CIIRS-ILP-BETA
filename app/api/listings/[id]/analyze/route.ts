import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import WasteListing from "@/models/WasteListing";
import { analyzeWastePhoto } from "@/lib/ai/gemini";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const { id } = params;

    const listing = await WasteListing.findById(id);

    if (!listing) {
      return NextResponse.json(
        { error: `Listing with id "${id}" not found.` },
        { status: 404 }
      );
    }

    if (!listing.photoUrls || listing.photoUrls.length === 0) {
      return NextResponse.json(
        { error: "Listing has no photos to analyze." },
        { status: 400 }
      );
    }

    let analysisResult;
    try {
      analysisResult = await analyzeWastePhoto(
        listing.photoUrls[0],
        listing.wasteType
      );
    } catch (aiError: any) {
      console.error("Gemini analysis failed:", aiError);
      return NextResponse.json(
        {
          error: `AI analysis failed: ${aiError.message || "Unknown Gemini error"}`,
        },
        { status: 500 }
      );
    }

    listing.aiGrading = {
      grade: analysisResult.grade,
      contaminationLevel: analysisResult.contaminationLevel,
      confidence: analysisResult.confidence,
      rawResponse: JSON.stringify(analysisResult),
    };

    await listing.save();

    return NextResponse.json(listing);
  } catch (error: any) {
    console.error("POST /api/listings/[id]/analyze error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
