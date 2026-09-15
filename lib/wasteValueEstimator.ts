import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export interface WastePriceRange {
  min: number;
  max: number;
}

export interface WasteValueEstimate {
  estimatedPricePerKg: number;
  priceRange: WastePriceRange;
  reasoning: string;
}

const WasteValueEstimateSchema = z.object({
  estimatedPricePerKg: z.number().nonnegative(),
  priceRange: z.object({
    min: z.number().nonnegative(),
    max: z.number().nonnegative(),
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
 * Estimates the market value of recyclable and organic waste materials in Indian Rupees (INR)
 * using Claude configured as an Indian circular economy and waste commodity pricing analyst.
 *
 * @param wasteType - Category of waste (e.g., 'Organic', 'Plastic', 'Paper', 'Metal', 'Glass', 'E-Waste')
 * @param subType - Specific sub-category (e.g., 'Temple Flower Waste', 'PET Bottles', 'Corrugated Cardboard', 'Spent Coffee Grounds')
 * @param quantityKg - Total batch quantity in kilograms
 * @param grade - Quality grade ('A', 'B', 'C', or custom grade description)
 * @param contaminationLevel - Contamination severity ('none', 'low', 'moderate', 'high')
 * @returns Strict JSON object containing { estimatedPricePerKg, priceRange: { min, max }, reasoning }
 * @throws Error if API key is missing, API call fails, or JSON response is malformed/invalid
 */
export async function estimateWasteValue(
  wasteType: string,
  subType?: string,
  quantityKg?: number,
  grade?: string,
  contaminationLevel?: string
): Promise<WasteValueEstimate> {
  const anthropic = getAnthropicClient();
  const modelName = process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-sonnet-20240620";

  const systemPrompt = `You are a senior market pricing analyst specializing in Indian recyclable, industrial byproduct, and organic waste markets for CIIRS (Circular Industrial & Institutional Resource Recovery System).

Your mission is to estimate accurate, realistic market prices in Indian Rupees (INR - ₹ per kg) for valorizable waste streams across Indian secondary raw material markets.

### PRICING METHODOLOGY FACTORS:
1. Material Category & Sub-type:
   - Temple/Floral waste, spent coffee grounds, citrus peels, sugarcane bagasse, agri-biomass
   - Post-consumer & industrial plastics: PET, HDPE, LDPE, PP, multilayer plastics
   - Paper/Board: OCC kraft, sorted white paper, mixed paper
   - Metals & Minerals: Ferrous, aluminum cans, copper, brass, foundry slag
   - Glass cullet, textile scrap, electronics/battery scrap
2. Quality Grade & Purity:
   - Grade A (Clean, segregated, dry, uncontaminated): Premium market rate
   - Grade B (Mixed colors, minor moisture/impurities): Moderate market discount (15-30% discount)
   - Grade C (High moisture, mixed polymers/debris): Significant penalty or processing fee (40-70% discount)
3. Contamination Penalties:
   - None / Low: Standard or premium spot rate
   - Moderate: Down-cycling deduction
   - High: Marginal value or token logistics recovery
4. Volume Scale:
   - Bulk commercial volumes (>= 500 kg) command institutional buyer stability. Small batches carry sorting overhead.

### RULES & CONSTRAINTS:
- All monetary values MUST be in INR (₹) per kilogram.
- Prices should reflect realistic wholesale/B2B transaction rates in Indian urban/semi-urban clusters.
- "estimatedPricePerKg" must be a positive number (or 0 for zero-value waste) within the [priceRange.min, priceRange.max] interval.
- Output STRICT JSON ONLY. Do NOT include markdown code blocks, preamble, or conversational commentary.

### REQUIRED OUTPUT JSON SCHEMA:
{
  "estimatedPricePerKg": <number in INR/kg, rounded to 2 decimal places>,
  "priceRange": {
    "min": <number in INR/kg>,
    "max": <number in INR/kg>
  },
  "reasoning": "<concise explanation detailing market demand drivers in India, material purity impact, grade adjustments, and pricing rationale>"
}`;

  const materialDetails = {
    wasteType: wasteType || "Recyclable Waste",
    subType: subType || "General / Unsorted",
    quantityKg: typeof quantityKg === "number" && quantityKg > 0 ? quantityKg : "Standard commercial batch",
    grade: grade || "Standard (Ungraded)",
    contaminationLevel: contaminationLevel || "Low / None",
  };

  const userPrompt = `Analyze the fair market value in INR (₹/kg) for this waste material:

${JSON.stringify(materialDetails, null, 2)}

Return strict JSON only matching the specified schema.`;

  try {
    const response = await anthropic.messages.create({
      model: modelName,
      max_tokens: 1024,
      temperature: 0.2,
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
      throw new Error("Empty response received from Claude API during waste value estimation.");
    }

    const cleanedJson = cleanJsonText(rawResponseText);

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(cleanedJson);
    } catch (parseError: any) {
      throw new Error(
        `Failed to parse Claude waste value estimation response as JSON: ${parseError.message}. Response was: "${rawResponseText}"`
      );
    }

    const validationResult = WasteValueEstimateSchema.safeParse(parsedJson);
    if (!validationResult.success) {
      throw new Error(
        `Invalid waste value estimate structure: ${validationResult.error.message}. Response was: "${rawResponseText}"`
      );
    }

    const data = validationResult.data;

    // Ensure min is less than or equal to max
    const minPrice = Math.min(data.priceRange.min, data.priceRange.max);
    const maxPrice = Math.max(data.priceRange.min, data.priceRange.max);
    const estimatedPrice = Math.max(
      minPrice,
      Math.min(maxPrice, Math.round(data.estimatedPricePerKg * 100) / 100)
    );

    return {
      estimatedPricePerKg: estimatedPrice,
      priceRange: {
        min: Math.round(minPrice * 100) / 100,
        max: Math.round(maxPrice * 100) / 100,
      },
      reasoning: data.reasoning.trim(),
    };
  } catch (error: any) {
    if (
      error.message?.includes("ANTHROPIC_API_KEY is not defined") ||
      error.message?.includes("Failed to parse Claude waste value estimation") ||
      error.message?.includes("Invalid waste value estimate structure")
    ) {
      throw error;
    }
    throw new Error(`Waste value estimation failed: ${error.message || error}`);
  }
}
