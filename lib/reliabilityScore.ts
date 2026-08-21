import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export interface ReliabilityRawFactors {
  onTimeRate?: number; // 0.0 - 1.0 (e.g. 0.95 = 95%)
  cancellationRate?: number; // 0.0 - 1.0 (e.g. 0.02 = 2%)
  avgResponseTime?: number; // Average response time in hours (e.g. 1.5)
  disputeRate?: number; // 0.0 - 1.0 (e.g. 0.01 = 1%)
  volumeConsistency?: number; // 0.0 - 1.0 (e.g. 0.90 = 90%)
  completionRate?: number; // 0.0 - 1.0 (e.g. 0.98 = 98%)
  verifiedTransactionCount?: number; // Count of completed transactions (e.g. 15)
  tenureMonths?: number; // Platform tenure in months (e.g. 6)
  avgRating?: number; // 1.0 - 5.0 star rating (e.g. 4.8)
  recurringContractRate?: number; // 0.0 - 1.0 (e.g. 0.40 = 40%)
  disputeResolutionRate?: number; // 0.0 - 1.0 (e.g. 0.95 = 95%)
  photoAccuracyRate?: number; // 0.0 - 1.0 (e.g. 0.92 = 92%)
  [key: string]: any;
}

export interface FactorBreakdown {
  completionRate: number;
  onTimeRate: number;
  photoAccuracyRate: number;
  volumeConsistency: number;
  verifiedTransactionCount: number;
  disputeRate: number;
  disputeResolutionRate: number;
  avgRating: number;
  recurringContractRate: number;
  avgResponseTime: number;
  tenureMonths: number;
  cancellationRate: number;
  [key: string]: number;
}

export interface ReliabilityScoreResult {
  score: number; // Overall reliability score (0 - 850)
  breakdown: FactorBreakdown;
  reasoning: string;
}

const ReliabilityScoreSchema = z.object({
  score: z.number().min(0).max(850),
  breakdown: z.object({
    completionRate: z.number(),
    onTimeRate: z.number(),
    photoAccuracyRate: z.number(),
    volumeConsistency: z.number(),
    verifiedTransactionCount: z.number(),
    disputeRate: z.number(),
    disputeResolutionRate: z.number(),
    avgRating: z.number(),
    recurringContractRate: z.number(),
    avgResponseTime: z.number(),
    tenureMonths: z.number(),
    cancellationRate: z.number(),
  }),
  reasoning: z.string().min(1),
});

/**
 * Initializes and returns an Anthropic client instance using ANTHROPIC_API_KEY.
 * @throws Error if ANTHROPIC_API_KEY is not defined in environment variables.
 */
function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not defined in environment variables. Please add it to your .env file."
    );
  }
  return new Anthropic({ apiKey });
}

/**
 * Extracts plain text from the Anthropic message response content blocks.
 */
function extractTextContent(response: Anthropic.Messages.Message): string {
  return response.content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

/**
 * Strips markdown code blocks/fences and isolates JSON content from model output.
 */
function cleanJsonText(rawText: string): string {
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i, "$1").trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned.trim();
}

/**
 * Calculates a comprehensive B2B supplier/startup Reliability Score (0 - 850 scale)
 * using Claude by encoding a 12-factor weighted actuarial methodology.
 *
 * @param userId - The unique identifier of the user/organization
 * @param rawFactorData - Key performance indicators and behavioral metrics for the user
 * @returns Strict JSON containing { score, breakdown, reasoning }
 * @throws Error if API key is missing, API response is malformed, or score is out of 0-850 range
 */
export async function calculateReliabilityScore(
  userId: string,
  rawFactorData: ReliabilityRawFactors | Record<string, any>
): Promise<ReliabilityScoreResult> {
  const anthropic = getAnthropicClient();
  const modelName = process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-sonnet-20240620";

  const systemPrompt = `You are the CIIRS Actuarial Reliability Engine. CIIRS is a B2B circular economy marketplace connecting waste generators (suppliers) with valorization startups.

Your task is to compute the official CIIRS Reliability Score (0 to 850 scale, structured identically to standard credit ratings like FICO/CIBIL) based on 12 key performance factors.

### 12-FACTOR WEIGHTING METHODOLOGY (Total Max = 850 points):
1. completionRate (Max: 150 points): Proportion of accepted contracts completed without default (1.0 = 150 pts, 0.0 = 0 pts).
2. onTimeRate (Max: 120 points): Punctuality against scheduled pickup/delivery windows (1.0 = 120 pts, 0.0 = 0 pts).
3. photoAccuracyRate (Max: 90 points): Consistency between listing photos/AI grading and actual verified batch quality (1.0 = 90 pts, 0.0 = 0 pts).
4. volumeConsistency (Max: 80 points): Accuracy of actual measured batch mass vs declared mass (1.0 = 80 pts, 0.0 = 0 pts).
5. verifiedTransactionCount (Max: 70 points): Scale and transaction volume maturity (0 tx = 10 pts, 5 tx = 35 pts, 20+ tx = 70 pts).
6. disputeRate (Max: 60 points): Frequency of disputes raised against the user (0% dispute = 60 pts, 5% = 30 pts, >= 15% = 0 pts).
7. disputeResolutionRate (Max: 50 points): Cooperative resolution of contested transactions (1.0 = 50 pts, 0.0 = 0 pts).
8. avgRating (Max: 60 points): Direct counterparty satisfaction rating out of 5 stars (5.0 = 60 pts, 4.0 = 45 pts, <= 2.0 = 0 pts).
9. recurringContractRate (Max: 50 points): Long-term supply consistency and recurring partnerships (1.0 = 50 pts, 0.0 = 0 pts).
10. avgResponseTime (Max: 40 points): Responsiveness to marketplace bids and messages (<= 1 hr = 40 pts, 6 hrs = 25 pts, >= 48 hrs = 0 pts).
11. tenureMonths (Max: 40 points): Platform longevity and operational track record (12+ months = 40 pts, 6 months = 25 pts, 0 months = 10 pts).
12. cancellationRate (Max: 40 points): Contract cancellation avoidance (0% = 40 pts, 5% = 20 pts, >= 15% = 0 pts).

### RULES:
- The final score MUST be an integer between 0 and 850.
- The "breakdown" object MUST contain numeric contribution points for all 12 factor keys.
- The sum of all breakdown factor points should closely match the final "score" (within rounding).
- If any factor is missing in the input, apply a sensible baseline score for a new/standard user (e.g. 50-70% of max points for transaction-dependent metrics).
- Output STRICT JSON ONLY. Do NOT use markdown code fences. Do NOT include any conversation or introductory text.

### OUTPUT JSON SCHEMA:
{
  "score": <integer between 0 and 850>,
  "breakdown": {
    "completionRate": <number>,
    "onTimeRate": <number>,
    "photoAccuracyRate": <number>,
    "volumeConsistency": <number>,
    "verifiedTransactionCount": <number>,
    "disputeRate": <number>,
    "disputeResolutionRate": <number>,
    "avgRating": <number>,
    "recurringContractRate": <number>,
    "avgResponseTime": <number>,
    "tenureMonths": <number>,
    "cancellationRate": <number>
  },
  "reasoning": "<concise paragraph summarizing overall creditworthiness, primary strengths, risk factors, and recommended credit tier>"
}`;

  const userPrompt = `Calculate the official CIIRS Reliability Score for user ID "${userId}" based on the following raw factor metrics:

${JSON.stringify(rawFactorData, null, 2)}

Return strict JSON only matching the specified schema.`;

  try {
    const response = await anthropic.messages.create({
      model: modelName,
      max_tokens: 1500,
      temperature: 0.1,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const rawResponseText = extractTextContent(response);
    if (!rawResponseText) {
      throw new Error("Empty response received from Claude API during reliability score calculation.");
    }

    const cleanedJson = cleanJsonText(rawResponseText);

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(cleanedJson);
    } catch (parseError: any) {
      throw new Error(
        `Failed to parse Claude reliability score response as JSON: ${parseError.message}. Response was: "${rawResponseText}"`
      );
    }

    // Validate structure and 0-850 range with Zod
    const validationResult = ReliabilityScoreSchema.safeParse(parsedJson);
    if (!validationResult.success) {
      throw new Error(
        `Invalid reliability score output structure: ${validationResult.error.message}. Response was: "${rawResponseText}"`
      );
    }

    const validatedData = validationResult.data;

    // Ensure score is an integer within 0-850
    const roundedScore = Math.max(0, Math.min(850, Math.round(validatedData.score)));

    return {
      score: roundedScore,
      breakdown: validatedData.breakdown as FactorBreakdown,
      reasoning: validatedData.reasoning.trim(),
    };
  } catch (error: any) {
    if (
      error.message?.includes("ANTHROPIC_API_KEY is not defined") ||
      error.message?.includes("Invalid reliability score output") ||
      error.message?.includes("Failed to parse Claude reliability score")
    ) {
      throw error;
    }
    throw new Error(`Reliability score calculation failed: ${error.message || error}`);
  }
}
