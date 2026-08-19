import { GoogleGenerativeAI } from "@google/generative-ai";

export interface WasteAnalysisResult {
  grade: "A" | "B" | "C";
  contaminationLevel: "none" | "low" | "medium" | "high";
  estimatedQuantityKg: number | null;
  confidence: number;
  notes: string;
}

/**
 * Fetches an image from a URL and converts it to the inlineData format
 * expected by GoogleGenerativeAI.
 */
async function urlToGenerativePart(imageUrl: string) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch image from URL: ${imageUrl} (Status: ${response.status} ${response.statusText})`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const mimeType = contentType.split(";")[0].trim();

  return {
    inlineData: {
      data: Buffer.from(arrayBuffer).toString("base64"),
      mimeType,
    },
  };
}

/**
 * Strips markdown code blocks/fences from the model response text.
 */
function cleanJsonText(rawText: string): string {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

/**
 * Analyzes a waste photo using the Gemini Vision model and returns a quality inspection assessment.
 *
 * @param imageUrl - Public URL of the waste image (e.g. from Cloudinary)
 * @param wasteType - Category/type of waste (e.g. plastic, organic, e-waste, metal, paper, textile)
 * @returns Strict typed WasteAnalysisResult object
 * @throws Error if GEMINI_API_KEY is missing, image fetch fails, or parsing fails
 */
export async function analyzeWastePhoto(
  imageUrl: string,
  wasteType: string
): Promise<WasteAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not defined in environment variables. Please add it to your .env file."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  const prompt = `You are an expert waste quality inspector and materials recovery specialist for a circular economy B2B waste marketplace.
Analyze the provided waste photograph for waste type: "${wasteType}".

Evaluate the material purity, contamination, condition, and estimated visible volume/mass.

You must return STRICT JSON ONLY (no commentary, no explanations, no preamble). The response must match this exact JSON schema:
{
  "grade": "A" | "B" | "C",
  "contaminationLevel": "none" | "low" | "medium" | "high",
  "estimatedQuantityKg": <number or null if not determinable>,
  "confidence": <number between 0.0 and 1.0>,
  "notes": "<concise inspection notes explaining observed contamination, segregation quality, condition, and justification for the grade>"
}

Grading Guidelines:
- Grade A: Clean, segregated, homogenous material with little to no contamination (contaminationLevel: "none" or "low").
- Grade B: Moderate quality, partially segregated, minor presence of non-target items or mild moisture/dirt (contaminationLevel: "low" or "medium").
- Grade C: Highly contaminated, mixed, degraded, or poorly sorted material (contaminationLevel: "medium" or "high").`;

  // Fetch the image and convert to inline generative part
  const imagePart = await urlToGenerativePart(imageUrl);

  try {
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const responseText = response.text();

    if (!responseText) {
      throw new Error("Empty response received from Gemini API.");
    }

    const cleanedText = cleanJsonText(responseText);

    let parsed: any;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (parseError: any) {
      throw new Error(
        `Failed to parse Gemini response as JSON: ${parseError.message}. Response was: "${responseText}"`
      );
    }

    const validGrades = ["A", "B", "C"] as const;
    const validContaminations = ["none", "low", "medium", "high"] as const;

    const grade = validGrades.includes(parsed.grade) ? parsed.grade : "B";
    const contaminationLevel = validContaminations.includes(parsed.contaminationLevel)
      ? parsed.contaminationLevel
      : "medium";
    const confidence =
      typeof parsed.confidence === "number" && !isNaN(parsed.confidence)
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.8;
    const estimatedQuantityKg =
      typeof parsed.estimatedQuantityKg === "number" && !isNaN(parsed.estimatedQuantityKg)
        ? parsed.estimatedQuantityKg
        : null;
    const notes =
      typeof parsed.notes === "string" && parsed.notes.trim().length > 0
        ? parsed.notes.trim()
        : "Inspection completed.";

    return {
      grade,
      contaminationLevel,
      estimatedQuantityKg,
      confidence,
      notes,
    };
  } catch (error: any) {
    if (error.message?.includes("Failed to parse Gemini response") || error.message?.includes("Failed to fetch image")) {
      throw error;
    }
    throw new Error(`Gemini waste photo analysis failed: ${error.message || error}`);
  }
}
