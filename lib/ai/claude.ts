import Anthropic from "@anthropic-ai/sdk";

export interface WasteListingAiGrading {
  grade?: string;
  contaminationLevel?: string;
  confidence?: number;
  notes?: string;
  rawResponse?: string;
}

export interface WasteListingLocation {
  type?: string;
  coordinates?: [number, number]; // [longitude, latitude]
  address?: string;
}

export interface WasteListingMatchInput {
  _id?: string | any;
  id?: string;
  wasteType: string;
  subType?: string;
  quantityKg: number;
  unit?: string;
  aiGrading?: WasteListingAiGrading;
  location?: WasteListingLocation | string;
  priceEstimate?: number;
  isRecurring?: boolean;
  recurrencePattern?: string;
  availableFrom?: Date | string;
  [key: string]: any;
}

export interface CandidateStartupInput {
  _id?: string | any;
  id?: string;
  startupId?: string;
  organizationName?: string;
  name?: string;
  organizationType?: string;
  address?: string;
  location?: WasteListingLocation | string;
  bio?: string;
  acceptedWasteTypes?: string[];
  processingCapacityKg?: number;
  [key: string]: any;
}

export interface StartupMatch {
  startupId: string;
  score: number; // 0 - 100
  reasoning: string;
}

export interface MatchingResponse {
  matches: StartupMatch[];
}

export interface WasteBotChatContext {
  userId?: string;
  userName?: string;
  organizationName?: string;
  organizationType?: string;
  currentListing?: WasteListingMatchInput | Record<string, any>;
  recentListings?: WasteListingMatchInput[] | Record<string, any>[];
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  [key: string]: any;
}

/**
 * Initializes and returns an Anthropic client instance using the ANTHROPIC_API_KEY.
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

  // Strip standard markdown code blocks (```json ... ``` or ``` ... ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i, "$1").trim();

  // If there are still surrounding backticks or extraneous text, locate the outermost JSON object boundaries
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned.trim();
}

/**
 * Helper to safely extract a string ID from candidate startup objects.
 */
function getStartupIdentifier(startup: CandidateStartupInput, index: number): string {
  if (startup.startupId) return String(startup.startupId);
  if (startup.id) return String(startup.id);
  if (startup._id) return String(startup._id);
  return `startup_${index + 1}`;
}

/**
 * Formats a location object or string into a human-readable representation for prompt injection.
 */
function formatLocation(location?: WasteListingLocation | string): string {
  if (!location) return "Not specified";
  if (typeof location === "string") return location;
  if (location.coordinates && Array.isArray(location.coordinates)) {
    const [lng, lat] = location.coordinates;
    const addr = location.address ? ` (${location.address})` : "";
    return `Longitude: ${lng}, Latitude: ${lat}${addr}`;
  }
  if (location.address) return location.address;
  return JSON.stringify(location);
}

/**
 * Evaluates and ranks candidate valorization/recycling startups for a given waste listing using Claude.
 * Performs deep contextual reasoning about material compatibility, contamination tolerances,
 * processing scale, and geographic logistics.
 *
 * @param listing - WasteListing data including waste type, grade, contamination, quantity, and location
 * @param candidateStartups - Array of candidate startup profiles
 * @returns Strict JSON response ranking startups by fit (highest score first)
 * @throws Error if API key is missing, API call fails, or JSON parsing fails
 */
export async function matchListingToStartups(
  listing: WasteListingMatchInput,
  candidateStartups: CandidateStartupInput[]
): Promise<MatchingResponse> {
  if (!candidateStartups || candidateStartups.length === 0) {
    return { matches: [] };
  }

  const anthropic = getAnthropicClient();
  const modelName = process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-sonnet-20240620";

  // Normalize candidate startups with clean identifiers for reliable matching
  const formattedCandidates = candidateStartups.map((startup, index) => {
    const startupId = getStartupIdentifier(startup, index);
    return {
      startupId,
      organizationName: startup.organizationName || startup.name || "Unnamed Organization",
      organizationType: startup.organizationType || "startup",
      address: startup.address || "Address not provided",
      location: formatLocation(startup.location),
      bio: startup.bio || undefined,
      acceptedWasteTypes: startup.acceptedWasteTypes || undefined,
      processingCapacityKg: startup.processingCapacityKg || undefined,
    };
  });

  const listingSummary = {
    id: listing.id || (listing._id ? String(listing._id) : "listing_target"),
    wasteType: listing.wasteType,
    subType: listing.subType || "Unspecified sub-category",
    quantityKg: listing.quantityKg,
    unit: listing.unit || "kg",
    aiGrading: {
      grade: listing.aiGrading?.grade || "Ungraded",
      contaminationLevel: listing.aiGrading?.contaminationLevel || "Unknown",
      confidence: listing.aiGrading?.confidence ?? undefined,
      notes: listing.aiGrading?.notes || undefined,
    },
    location: formatLocation(listing.location),
    isRecurring: listing.isRecurring ?? false,
    recurrencePattern: listing.recurrencePattern || undefined,
    priceEstimate: listing.priceEstimate || undefined,
  };

  const systemPrompt = `You are the Intelligent Matching Engine for CIIRS (Circular Industrial & Institutional Resource Recovery System), an advanced B2B marketplace connecting waste generators with recycling, upcycling, and valorization startups.

Your mission is to perform rigorous technical, qualitative, and logistical reasoning to match a waste listing with candidate startups.

Evaluate the fit based on:
1. Material Suitability: Does the candidate's organization type, domain, and accepted waste streams match this waste type (${listingSummary.wasteType} / ${listingSummary.subType})?
2. Quality & Contamination Tolerance: Can the startup process material of Grade ${listingSummary.aiGrading.grade} with ${listingSummary.aiGrading.contaminationLevel} contamination? (e.g., high-grade pure inputs vs lower-grade organic/industrial inputs).
3. Volume & Operational Scale: Is the quantity (${listingSummary.quantityKg} ${listingSummary.unit}) viable for the startup's capacity?
4. Logistical Feasibility: Evaluate geographic compatibility between generator location and startup address/coordinates.

OUTPUT FORMAT INSTRUCTIONS:
- You must return STRICT JSON ONLY.
- Do NOT wrap output in markdown code fences (\`\`\`json).
- Do NOT include any conversational preamble, explanations, or trailing commentary.
- Every candidate in the provided list MUST be evaluated and included in the "matches" array.
- The "matches" array MUST be sorted in descending order of "score" (best-fit candidate first).
- Match schema:
{
  "matches": [
    {
      "startupId": "<exact startupId string matching input>",
      "score": <integer from 0 to 100 representing suitability>,
      "reasoning": "<1-2 sentences explaining specific material fit, contamination handling, and logistical feasibility>"
    }
  ]
}`;

  const userPrompt = `Please analyze and rank the candidate startups for this waste listing:

=== WASTE LISTING ===
${JSON.stringify(listingSummary, null, 2)}

=== CANDIDATE STARTUPS ===
${JSON.stringify(formattedCandidates, null, 2)}

Evaluate all candidates and return the JSON object with the ranked "matches" array.`;

  try {
    const response = await anthropic.messages.create({
      model: modelName,
      max_tokens: 2048,
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
      throw new Error("Empty response received from Claude API.");
    }

    const cleanedJson = cleanJsonText(rawResponseText);

    let parsed: any;
    try {
      parsed = JSON.parse(cleanedJson);
    } catch (parseError: any) {
      throw new Error(
        `Failed to parse Claude matching response as JSON: ${parseError.message}. Response was: "${rawResponseText}"`
      );
    }

    if (!parsed || !Array.isArray(parsed.matches)) {
      throw new Error(
        `Invalid Claude response format: missing or invalid "matches" array. Response was: "${rawResponseText}"`
      );
    }

    const matches: StartupMatch[] = parsed.matches.map((item: any, idx: number) => {
      const startupId =
        typeof item.startupId === "string" && item.startupId.trim().length > 0
          ? item.startupId.trim()
          : formattedCandidates[idx]?.startupId || `startup_${idx + 1}`;

      const rawScore = Number(item.score);
      const score = !isNaN(rawScore)
        ? Math.max(0, Math.min(100, Math.round(rawScore)))
        : 50;

      const reasoning =
        typeof item.reasoning === "string" && item.reasoning.trim().length > 0
          ? item.reasoning.trim()
          : "Match score evaluated based on material compatibility and operational profile.";

      return {
        startupId,
        score,
        reasoning,
      };
    });

    // Ensure strictly ordered best-fit first (descending by score)
    matches.sort((a, b) => b.score - a.score);

    return { matches };
  } catch (error: any) {
    if (
      error.message?.includes("Failed to parse Claude matching response") ||
      error.message?.includes("Invalid Claude response format") ||
      error.message?.includes("ANTHROPIC_API_KEY is not defined")
    ) {
      throw error;
    }
    throw new Error(`Claude startup matching failed: ${error.message || error}`);
  }
}

/**
 * Generates an intelligent conversational response for WasteBot, the CIIRS AI Marketplace Assistant.
 * Provides guidance on waste categorization, AI grading interpretations, valorization strategies,
 * pricing estimates, green credits, and circular economy matchmaking.
 *
 * @param userMessage - The message or question sent by the user
 * @param context - Optional context such as user profile, active listing details, or platform state
 * @returns Plain text response generated by Claude
 * @throws Error if API key is missing or API call fails
 */
export async function generateChatResponse(
  userMessage: string,
  context?: WasteBotChatContext | Record<string, any>
): Promise<string> {
  const anthropic = getAnthropicClient();
  const modelName = process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-sonnet-20240620";

  const systemPrompt = `You are WasteBot, the dedicated AI assistant for CIIRS (Circular Industrial & Institutional Resource Recovery System).
CIIRS is an intelligent B2B marketplace and circular economy platform connecting waste generators (temples, apartments, restaurants, factories, institutions) with recycling and valorization startups.

Your role and personality:
- You are professional, knowledgeable, environmentally conscious, and practical.
- You assist users with waste classification, material grading (Grades A, B, C and contamination levels), upcycling potential, marketplace transactions, ESG impact, green credits, and platform workflows.
- You provide clear, concise, actionable answers with practical advice on waste segregation, material purity, and maximizing valorization value.
- When context is provided (e.g., current listing details or user profile), use it seamlessly to deliver personalized, relevant answers.
- Return clean, plain text formatted with standard markdown (paragraphs, bullet points, bold text for key terms) suitable for direct display in a chat interface. Do NOT output raw JSON.`;

  let promptContent = userMessage;
  if (context && Object.keys(context).length > 0) {
    promptContent = `[Current Context / Marketplace State]
${JSON.stringify(context, null, 2)}

[User Message]
${userMessage}`;
  }

  try {
    const response = await anthropic.messages.create({
      model: modelName,
      max_tokens: 1024,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: promptContent,
        },
      ],
    });

    const responseText = extractTextContent(response);
    if (!responseText) {
      throw new Error("Empty response received from WasteBot chat generation.");
    }

    return responseText;
  } catch (error: any) {
    if (error.message?.includes("ANTHROPIC_API_KEY is not defined")) {
      throw error;
    }
    throw new Error(`WasteBot chat response generation failed: ${error.message || error}`);
  }
}
