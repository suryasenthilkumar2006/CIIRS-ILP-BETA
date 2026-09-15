import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Review from "@/models/Review";
import Contract from "@/models/Contract";
import "@/models/User"; // Ensure User model is registered for populate queries

/**
 * POST /api/reviews
 * Creates a new Review for a contract.
 * Verifies that the contract is 'completed' and no review already exists for it.
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const { contractId, reviewerId, revieweeId, rating, comment } = body;

    // 1. Validate required fields
    if (!contractId || !reviewerId || !revieweeId || rating === undefined || !comment) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: contractId, reviewerId, revieweeId, rating, and comment are all required.",
        },
        { status: 400 }
      );
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return NextResponse.json(
        { error: "Rating must be a numeric value between 1 and 5." },
        { status: 400 }
      );
    }

    // 2. Verify the contract exists and is in 'completed' status
    const contract = await Contract.findById(contractId);
    if (!contract) {
      return NextResponse.json(
        { error: `Contract with ID "${contractId}" not found.` },
        { status: 404 }
      );
    }

    if (contract.status !== "completed") {
      return NextResponse.json(
        {
          error: `Reviews can only be submitted for completed contracts. Current contract status is "${contract.status}".`,
        },
        { status: 400 }
      );
    }

    // 3. Verify no review already exists for this contract
    const existingReview = await Review.findOne({ contractId });
    if (existingReview) {
      return NextResponse.json(
        { error: "A review has already been submitted for this contract." },
        { status: 400 }
      );
    }

    // 4. Persist the review
    const review = await Review.create({
      contractId,
      reviewerId,
      revieweeId,
      rating: numRating,
      comment: String(comment).trim(),
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/reviews error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reviews?revieweeId=...
 * Returns all reviews for a specific reviewee along with the computed count and average rating.
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const revieweeId = searchParams.get("revieweeId");

    if (!revieweeId || typeof revieweeId !== "string" || revieweeId.trim().length === 0) {
      return NextResponse.json(
        { error: "revieweeId query parameter is required." },
        { status: 400 }
      );
    }

    const reviews = await Review.find({ revieweeId: revieweeId.trim() })
      .sort({ createdAt: -1 })
      .populate("reviewerId", "name organizationName organizationType")
      .populate("contractId", "status createdAt")
      .lean();

    const count = reviews.length;
    const totalRatingSum = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    const averageRating =
      count > 0 ? Math.round((totalRatingSum / count) * 10) / 10 : 0;

    return NextResponse.json(
      {
        reviews,
        count,
        averageRating,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("GET /api/reviews error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
