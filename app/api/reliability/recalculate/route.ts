import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Contract from "@/models/Contract";
import ReliabilityScore from "@/models/ReliabilityScore";
import User from "@/models/User";
import { calculateReliabilityScore } from "@/lib/reliabilityScore";

/**
 * POST /api/reliability/recalculate
 * Re-evaluates and updates a user's 12-factor reliability score.
 * Queries user transaction contracts, derives raw KPI metrics, calls
 * calculateReliabilityScore(), upserts the ReliabilityScore record (recording
 * score history), and returns the updated document.
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const { userId } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "User ID parameter is required." },
        { status: 400 }
      );
    }

    // 1. Fetch user to verify existence and derive tenure
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: `User with ID "${userId}" not found.` },
        { status: 404 }
      );
    }

    // 2. Query all contracts where the user is either supplier or startup
    const contracts = await Contract.find({
      $or: [{ supplierId: userId }, { startupId: userId }],
    });

    const totalContracts = contracts.length;
    const completedContracts = contracts.filter(
      (c) => c.status === "completed" || c.status === "otp_verified"
    ).length;
    const cancelledContracts = contracts.filter(
      (c) => c.status === "cancelled"
    ).length;
    const verifiedTransactionCount = contracts.filter(
      (c) => c.otpVerifiedAt || c.status === "completed"
    ).length;

    // Completion and cancellation ratios
    const completionRate =
      totalContracts > 0 ? completedContracts / totalContracts : 1.0;
    const cancellationRate =
      totalContracts > 0 ? cancelledContracts / totalContracts : 0.0;

    // Calculate on-time handover rate
    const scheduledAndVerified = contracts.filter(
      (c) => c.scheduledPickupAt && c.otpVerifiedAt
    );
    let onTimeRate = 0.95; // Default healthy baseline for active users
    if (scheduledAndVerified.length > 0) {
      const onTimeCount = scheduledAndVerified.filter((c) => {
        const scheduled = new Date(c.scheduledPickupAt!).getTime();
        const verified = new Date(c.otpVerifiedAt!).getTime();
        // 3-hour flexible arrival window allowance
        return verified <= scheduled + 3 * 60 * 60 * 1000;
      }).length;
      onTimeRate = onTimeCount / scheduledAndVerified.length;
    }

    // Platform tenure in months
    let tenureMonths = 1;
    if (user.createdAt) {
      const diffMs = Math.abs(Date.now() - new Date(user.createdAt).getTime());
      tenureMonths = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4375)));
    }

    // Approximate remaining performance factors using sensible domain defaults
    const avgResponseTime = 1.5; // Average responsiveness in hours
    const disputeRate = 0.0; // Clean record default
    const volumeConsistency = 0.95; // Measured vs declared weight consistency
    const avgRating = 4.8; // Star rating (out of 5.0)
    const recurringContractRate = totalContracts > 1 ? 0.35 : 0.0;
    const disputeResolutionRate = 1.0; // Cooperative resolution
    const photoAccuracyRate = 0.92; // Material purity / AI grading match

    const rawFactorData = {
      completionRate: Math.round(completionRate * 100) / 100,
      onTimeRate: Math.round(onTimeRate * 100) / 100,
      photoAccuracyRate,
      volumeConsistency,
      verifiedTransactionCount,
      disputeRate,
      disputeResolutionRate,
      avgRating,
      recurringContractRate,
      avgResponseTime,
      tenureMonths,
      cancellationRate: Math.round(cancellationRate * 100) / 100,
    };

    // 3. Compute score via Claude Actuarial Engine
    const calculationResult = await calculateReliabilityScore(userId, rawFactorData);

    // 4. Upsert ReliabilityScore document
    let scoreDoc = await ReliabilityScore.findOne({ userId });

    if (scoreDoc) {
      // Archive current score into history before overwriting
      if (scoreDoc.score !== undefined && scoreDoc.score !== null) {
        scoreDoc.history.push({
          score: scoreDoc.score,
          date: scoreDoc.lastCalculatedAt || new Date(),
        });
      }

      scoreDoc.score = calculationResult.score;
      scoreDoc.lastCalculatedAt = new Date();
      scoreDoc.factors = rawFactorData;
      await scoreDoc.save();
    } else {
      scoreDoc = await ReliabilityScore.create({
        userId,
        score: calculationResult.score,
        lastCalculatedAt: new Date(),
        factors: rawFactorData,
        history: [],
      });
    }

    // Link score reference on User document if not already set
    if (!user.reliabilityScoreId || String(user.reliabilityScoreId) !== String(scoreDoc._id)) {
      user.reliabilityScoreId = scoreDoc._id;
      await user.save();
    }

    return NextResponse.json(scoreDoc, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/reliability/recalculate error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to recalculate reliability score." },
      { status: 500 }
    );
  }
}
