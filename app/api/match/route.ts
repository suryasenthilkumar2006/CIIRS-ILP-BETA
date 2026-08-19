import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import WasteListing from "@/models/WasteListing";
import User, { IUser } from "@/models/User";
import { matchListingToStartups, CandidateStartupInput, StartupMatch } from "@/lib/ai/claude";

export interface PopulatedStartupMatch extends StartupMatch {
  name: string;
  organizationName: string;
  organizationType?: string;
  address?: string;
  location?: {
    type: "Point";
    coordinates: [number, number];
  };
  email?: string;
  phone?: string;
  startup?: Partial<IUser>;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const { listingId } = body;

    if (!listingId) {
      return NextResponse.json(
        { error: "listingId is required in the request body." },
        { status: 400 }
      );
    }

    // 1. Fetch the waste listing
    const listing = await WasteListing.findById(listingId);
    if (!listing) {
      return NextResponse.json(
        { error: `Waste listing with ID "${listingId}" was not found.` },
        { status: 404 }
      );
    }

    // 2. Query all candidate startups
    // Fetch users with the 'startup' role to supply candidate data to Claude
    const candidateUsers = await User.find({ role: "startup" })
      .select("-passwordHash")
      .lean();

    if (!candidateUsers || candidateUsers.length === 0) {
      // If no startups are registered yet, update status or return empty matches
      listing.status = "matched";
      await listing.save();

      return NextResponse.json({
        success: true,
        listingId: listing._id,
        status: listing.status,
        matches: [],
        message: "No registered startup candidates found in the system.",
      });
    }

    // 3. Format candidates for the Claude matching engine
    const candidateStartups: CandidateStartupInput[] = candidateUsers.map(
      (user) => ({
        startupId: user._id.toString(),
        id: user._id.toString(),
        name: user.name,
        organizationName: user.organizationName,
        organizationType: user.organizationType,
        address: user.address,
        location: user.location,
      })
    );

    // 4. Invoke Claude AI matching engine
    let matchingResult;
    try {
      matchingResult = await matchListingToStartups(
        {
          id: listing._id.toString(),
          wasteType: listing.wasteType,
          subType: listing.subType,
          quantityKg: listing.quantityKg,
          unit: listing.unit,
          aiGrading: listing.aiGrading
            ? {
                grade: listing.aiGrading.grade,
                contaminationLevel: listing.aiGrading.contaminationLevel,
                confidence: listing.aiGrading.confidence,
                rawResponse: listing.aiGrading.rawResponse,
              }
            : undefined,
          location: listing.location,
          priceEstimate: listing.priceEstimate,
          isRecurring: listing.isRecurring,
          recurrencePattern: listing.recurrencePattern,
          availableFrom: listing.availableFrom,
        },
        candidateStartups
      );
    } catch (aiError: any) {
      console.error("Claude matching engine error in POST /api/match:", aiError);
      return NextResponse.json(
        {
          error: `Claude startup matching failed: ${
            aiError.message || "Unknown error occurred while contacting AI matching service."
          }`,
        },
        { status: 500 }
      );
    }

    // 5. Update listing status to 'matched'
    listing.status = "matched";
    await listing.save();

    // 6. Map candidate details onto the ranked matches
    const startupMap = new Map<string, any>(
      candidateUsers.map((u) => [u._id.toString(), u])
    );

    const populatedMatches: PopulatedStartupMatch[] = matchingResult.matches.map(
      (match) => {
        const startupUser = startupMap.get(match.startupId);
        return {
          startupId: match.startupId,
          score: match.score,
          reasoning: match.reasoning,
          name: startupUser?.name || "Unknown Candidate",
          organizationName: startupUser?.organizationName || "Unknown Startup",
          organizationType: startupUser?.organizationType,
          address: startupUser?.address,
          location: startupUser?.location,
          email: startupUser?.email,
          phone: startupUser?.phone,
          startup: startupUser
            ? {
                _id: startupUser._id,
                name: startupUser.name,
                organizationName: startupUser.organizationName,
                organizationType: startupUser.organizationType,
                address: startupUser.address,
                location: startupUser.location,
                email: startupUser.email,
                phone: startupUser.phone,
                greenCreditBalance: startupUser.greenCreditBalance,
              }
            : undefined,
        };
      }
    );

    return NextResponse.json({
      success: true,
      listingId: listing._id,
      status: listing.status,
      matches: populatedMatches,
    });
  } catch (error: any) {
    console.error("POST /api/match internal server error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
