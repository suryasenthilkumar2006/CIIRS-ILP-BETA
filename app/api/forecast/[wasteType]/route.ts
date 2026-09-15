import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import WasteListing from "@/models/WasteListing";
import { forecastSupply } from "@/lib/ai/huggingface";

/**
 * Calculates the start date (Monday) of the week for a given date in YYYY-MM-DD format.
 */
function getWeekStartDate(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0: Sunday, 1: Monday, ..., 6: Saturday
  // Calculate difference to set Monday as the first day of the week
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
  return monday.toISOString().split("T")[0];
}

/**
 * GET /api/forecast/[wasteType]
 *
 * Fetches historical WasteListing records for the specified wasteType,
 * aggregates total supply volume (kg) by week, and uses Hugging Face AI
 * to project supply volume for the next 4 weeks.
 *
 * If fewer than 3 weeks of historical data exist, returns a clear message
 * indicating insufficient data rather than invoking the AI model.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { wasteType: string } }
) {
  try {
    const rawWasteType = params?.wasteType;

    if (!rawWasteType || typeof rawWasteType !== "string" || rawWasteType.trim().length === 0) {
      return NextResponse.json(
        { error: "wasteType parameter is required." },
        { status: 400 }
      );
    }

    const decodedWasteType = decodeURIComponent(rawWasteType).trim();

    await connectDB();

    // Query listings matching the wasteType (case-insensitive)
    const listings = await WasteListing.find({
      wasteType: { $regex: new RegExp(`^${decodedWasteType}$`, "i") },
    })
      .select("quantityKg createdAt")
      .sort({ createdAt: 1 })
      .lean();

    if (!listings || listings.length === 0) {
      return NextResponse.json(
        {
          message: `No historical listings found for waste type "${decodedWasteType}". At least 3 weeks of historical data are required to generate a supply forecast.`,
          historicalData: [],
          forecast: [],
          trend: "stable",
          confidence: 0,
        },
        { status: 200 }
      );
    }

    // Aggregate quantityKg grouped by week (based on createdAt)
    const weeklyTotals = new Map<string, number>();

    for (const listing of listings) {
      if (!listing.createdAt) continue;
      const quantity =
        typeof listing.quantityKg === "number" && !isNaN(listing.quantityKg)
          ? listing.quantityKg
          : 0;

      if (quantity <= 0) continue;

      const weekKey = getWeekStartDate(new Date(listing.createdAt));
      weeklyTotals.set(weekKey, (weeklyTotals.get(weekKey) || 0) + quantity);
    }

    // Convert map to sorted historical data points
    const historicalData = Array.from(weeklyTotals.entries())
      .map(([date, quantityKg]) => ({
        date,
        quantityKg: Math.round(quantityKg * 100) / 100,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Check if at least 3 weeks of historical data exist
    if (historicalData.length < 3) {
      return NextResponse.json(
        {
          message: `Insufficient historical data for "${decodedWasteType}". At least 3 weeks of historical supply data are required to generate an accurate forecast (found ${historicalData.length} ${historicalData.length === 1 ? "week" : "weeks"}).`,
          historicalData,
          forecast: [],
          trend: "stable",
          confidence: 0,
        },
        { status: 200 }
      );
    }

    // Call Hugging Face time-series supply forecasting
    const forecastResult = await forecastSupply(decodedWasteType, historicalData);

    return NextResponse.json(
      {
        wasteType: decodedWasteType,
        historicalData,
        forecast: forecastResult.forecast,
        trend: forecastResult.trend,
        confidence: forecastResult.confidence,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("GET /api/forecast/[wasteType] error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to generate supply forecast.",
      },
      { status: 500 }
    );
  }
}
