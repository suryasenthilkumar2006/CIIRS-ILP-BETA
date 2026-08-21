import { GoogleGenerativeAI } from "@google/generative-ai";

let sharp: any = null;
try {
  sharp = require("sharp");
} catch {
  sharp = null;
}

export interface WasteAnalysisResult {
  grade: "A" | "B" | "C";
  contaminationLevel: "none" | "low" | "medium" | "high";
  estimatedQuantityKg: number | null;
  confidence: number;
  notes: string;
}

/**
 * Optimizes image URLs (specifically Cloudinary CDN URLs) to automatically
 * resize to max 1024px dimension, optimize quality, and format as JPEG,
 * minimizing network transfer overhead before processing.
 */
function getOptimizedImageUrl(imageUrl: string): string {
  if (imageUrl.includes("res.cloudinary.com") && imageUrl.includes("/upload/")) {
    if (!imageUrl.includes("/upload/w_") && !imageUrl.includes("/upload/c_")) {
      return imageUrl.replace(
        "/upload/",
        "/upload/w_1024,c_limit,q_auto:good,f_jpg/"
      );
    }
  }
  return imageUrl;
}

/**
 * Fetches an image from a URL, resizes/compresses it to a max dimension of 1024px
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

    // If sharp is available, resize/compress image buffer to max 1024px dimension at 80% JPEG quality
    if (sharp) {
      try {
        buffer = await sharp(buffer)
          .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 80 })
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
  // Specifically use gemini-2.0-flash for fast, cost-effective vision classification
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
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

  // 1. Fetch image with size optimization (max 1024px) & base64 conversion
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

    return {
      grade,
      contaminationLevel,
      estimatedQuantityKg,
      confidence,
      notes,
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
