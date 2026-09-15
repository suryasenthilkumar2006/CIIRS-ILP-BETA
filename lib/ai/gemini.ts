import { GoogleGenerativeAI } from "@google/generative-ai";

let sharp: any = null;
try {
  // Use dynamic evaluation so webpack does not attempt static module resolution if sharp is not installed
  sharp = eval("require")("sharp");
} catch {
  sharp = null;
}

export interface WasteAnalysisResult {
  grade: "A" | "B" | "C";
  contaminationLevel: "none" | "low" | "medium" | "high";
  estimatedQuantityKg: number | null;
  confidence: number;
  notes: string;
  lowConfidence: boolean;
}

/**
 * Optimizes image URLs (specifically Cloudinary CDN URLs) to automatically
 * resize to max 1568px dimension, optimize quality, and format as JPEG,
 * minimizing network transfer overhead while preserving visual detail for inspection.
 */
function getOptimizedImageUrl(imageUrl: string): string {
  if (imageUrl.includes("res.cloudinary.com") && imageUrl.includes("/upload/")) {
    if (!imageUrl.includes("/upload/w_") && !imageUrl.includes("/upload/c_")) {
      return imageUrl.replace(
        "/upload/",
        "/upload/w_1568,c_limit,q_auto:good,f_jpg/"
      );
    }
  }
  return imageUrl;
}

/**
 * Fetches an image from a URL, resizes/compresses it to a max dimension of 1568px
 * (using sharp if available, or Cloudinary URL transformations / quality capping),
 * and converts it to the inlineData base64 format expected by GoogleGenerativeAI.
 */
async function urlToGenerativePart(imageUrl: string, fetchTimeoutMs: number = 8000) {
  const optimizedUrl = getOptimizedImageUrl(imageUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), fetchTimeoutMs);

  try {
    const response = await fetch(optimizedUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch image from URL: ${optimizedUrl} (Status: ${response.status} ${response.statusText})`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);
    let mimeType =
      (response.headers.get("content-type") || "image/jpeg").split(";")[0].trim() ||
      "image/jpeg";

    // If sharp is available, resize/compress image buffer to max 1568px dimension at 85% JPEG quality
    if (sharp) {
      try {
        buffer = await sharp(buffer)
          .resize(1568, 1568, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();
        mimeType = "image/jpeg";
      } catch (sharpError) {
        console.warn("sharp resize fallback:", sharpError);
      }
    }

    return {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType,
      },
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error(
        `Image download timed out after ${fetchTimeoutMs / 1000}s from URL: ${imageUrl}`
      );
    }
    throw err;
  }
}

/**
 * Strips markdown code blocks/fences from the model response text.
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
 * Analyzes a waste photo using the fast and cost-effective gemini-2.0-flash model
 * and returns a quality inspection assessment with a hard 15-second timeout.
 *
 * @param imageUrl - Public URL of the waste image (e.g. from Cloudinary)
 * @param wasteType - Category/type of waste (e.g. plastic, organic, e-waste, metal, paper, textile)
 * @returns Strict typed WasteAnalysisResult object
 * @throws Error if GEMINI_API_KEY is missing, image fetch fails, call times out, or parsing fails
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
  // Pick up model from process.env.GEMINI_MODEL with fallback to gemini-2.0-flash
  const modelName = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  const prompt = `You are an expert waste quality inspector and materials recovery specialist for a circular economy B2B waste marketplace.
Analyze the provided waste photograph for waste type: "${wasteType}".

Evaluate the material purity, contamination, condition, segregation, and estimated visible volume/mass.

Grading Rubric:
- Grade A: Clean, minimal foreign material, uniform and well-segregated batch. (contaminationLevel: "none" or "low")
- Grade B: Some visible contamination or mixed material, but still usable for circular recycling/valorization. (contaminationLevel: "low" or "medium")
- Grade C: Significant contamination, non-target materials, or material degradation. (contaminationLevel: "medium" or "high")

In your reasoning/notes, you must reference this grading rubric explicitly and explain how the visual observations justify the assigned grade and contamination level.

You must return STRICT JSON ONLY (no commentary, no explanations, no markdown formatting outside JSON). The response must match this exact JSON schema:
{
  "grade": "A" | "B" | "C",
  "contaminationLevel": "none" | "low" | "medium" | "high",
  "estimatedQuantityKg": <number or null if not determinable>,
  "confidence": <number between 0.0 and 1.0>,
  "notes": "<concise inspection notes explicitly referencing the grading rubric, observed contaminants, material uniformity, and grade justification>",
  "lowConfidence": <boolean, true if confidence is below 0.5, false otherwise>
}`;

  // 1. Fetch image with size optimization (max 1568px) & base64 conversion
  const imagePart = await urlToGenerativePart(imageUrl);

  // 2. Set up hard 15-second timeout for the Gemini API call using Promise.race()
  const TIMEOUT_MS = 15000;
  let timeoutTimer: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutTimer = setTimeout(() => {
      reject(
        new Error(
          `Gemini AI waste photo analysis timed out after ${TIMEOUT_MS / 1000} seconds.`
        )
      );
    }, TIMEOUT_MS);
  });

  try {
    const generatePromise = (async () => {
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      return response.text();
    })();

    const responseText = await Promise.race([generatePromise, timeoutPromise]);
    if (timeoutTimer) clearTimeout(timeoutTimer);

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

    const lowConfidence =
      typeof parsed.lowConfidence === "boolean"
        ? parsed.lowConfidence || confidence < 0.5
        : confidence < 0.5;

    return {
      grade,
      contaminationLevel,
      estimatedQuantityKg,
      confidence,
      notes,
      lowConfidence,
    };
  } catch (error: any) {
    if (timeoutTimer) clearTimeout(timeoutTimer);

    if (
      error.message?.includes("timed out") ||
      error.message?.includes("Failed to parse Gemini response") ||
      error.message?.includes("Failed to fetch image")
    ) {
      throw error;
    }
    throw new Error(`Gemini waste photo analysis failed: ${error.message || error}`);
  }
}
