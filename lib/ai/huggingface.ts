import { HfInference } from "@huggingface/inference";

export interface HistoricalDataPoint {
  date: string;
  quantityKg: number;
}

export interface WeeklyForecast {
  week: string;
  predictedKg: number;
}

export type ForecastTrend = "increasing" | "stable" | "decreasing";

export interface SupplyForecastResult {
  forecast: WeeklyForecast[];
  trend: ForecastTrend;
  confidence: number;
}

/**
 * Retrieves an initialized HfInference client instance.
 * @throws Error if HUGGINGFACE_API_KEY (or HF_TOKEN) is not defined.
 */
function getHfClient(): HfInference {
  const apiKey =
    process.env.HUGGINGFACE_API_KEY?.trim() ||
    process.env.HF_TOKEN?.trim() ||
    process.env.HUGGING_FACE_HUB_TOKEN?.trim();

  if (!apiKey) {
    throw new Error(
      "HUGGINGFACE_API_KEY is not defined in environment variables. Please add it to your .env file."
    );
  }

  return new HfInference(apiKey);
}

/**
 * Strips markdown code blocks/fences and extracts the outermost JSON substring from model output.
 */
function cleanJsonText(rawText: string): string {
  let cleaned = rawText.trim();

  // Remove markdown code fences if present (```json ... ``` or ``` ... ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i, "$1").trim();

  // Find boundaries of the outermost JSON object
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned.trim();
}

/**
 * Calculates a fallback trend string based on numerical forecast values.
 */
function determineTrend(forecast: WeeklyForecast[]): ForecastTrend {
  if (!forecast || forecast.length < 2) return "stable";

  const first = forecast[0].predictedKg;
  const last = forecast[forecast.length - 1].predictedKg;
  const diffPercent = first > 0 ? (last - first) / first : last > 0 ? 1 : 0;

  if (diffPercent > 0.05) return "increasing";
  if (diffPercent < -0.05) return "decreasing";
  return "stable";
}

/**
 * Forecasts expected waste supply volume for a given wasteType over the next 4 weeks
 * based on historical listing data using Hugging Face Inference API.
 *
 * @param wasteType - The category or material type of waste (e.g. 'organic', 'plastic', 'e-waste', 'metal')
 * @param historicalData - Array of historical data points containing date and quantityKg
 * @returns Strict typed SupplyForecastResult object with 4-week forecast, trend, and confidence
 * @throws Error if API key is missing, input data is invalid, API call fails, or parsing fails
 */
export async function forecastSupply(
  wasteType: string,
  historicalData: HistoricalDataPoint[]
): Promise<SupplyForecastResult> {
  if (!wasteType || typeof wasteType !== "string" || wasteType.trim().length === 0) {
    throw new Error("Invalid wasteType provided for supply forecasting.");
  }

  if (!Array.isArray(historicalData) || historicalData.length === 0) {
    throw new Error(
      "historicalData must be a non-empty array of { date: string, quantityKg: number } items."
    );
  }

  const hf = getHfClient();
  const modelName =
    process.env.HUGGINGFACE_MODEL?.trim() || "Qwen/Qwen2.5-72B-Instruct";

  // Sort historical data chronologically and format for the prompt
  const sortedHistory = [...historicalData]
    .filter((d) => d && typeof d.date === "string" && typeof d.quantityKg === "number" && !isNaN(d.quantityKg))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((d) => ({
      date: d.date,
      quantityKg: Math.max(0, Math.round(d.quantityKg * 100) / 100),
    }));

  if (sortedHistory.length === 0) {
    throw new Error("No valid historical data points found with date and quantityKg.");
  }

  const systemPrompt = `You are an expert time-series forecaster and circular economy supply chain analyst for CIIRS (Circular Industrial & Institutional Resource Recovery System).
Your task is to analyze historical waste supply listing data for a specific material and forecast the expected supply volume (in kg) for each of the next 4 consecutive weeks.

Guidelines:
1. Analyze the historical volume trajectory, velocity, variability, and trend pattern.
2. Predict the expected volume in kg for "Week 1", "Week 2", "Week 3", and "Week 4".
3. Classify the overall projected trajectory into one of the following exact trend values: "increasing", "stable", or "decreasing".
4. Provide a confidence score between 0.0 and 1.0 (higher confidence when historical data is consistent and low-variance).
5. All predictedKg numbers MUST be realistic non-negative numbers.

STRICT OUTPUT REQUIREMENT:
Return ONLY a valid JSON object matching the schema below. Do NOT include markdown code blocks, backticks, explanations, or commentary.
{
  "forecast": [
    { "week": "Week 1", "predictedKg": <number> },
    { "week": "Week 2", "predictedKg": <number> },
    { "week": "Week 3", "predictedKg": <number> },
    { "week": "Week 4", "predictedKg": <number> }
  ],
  "trend": "increasing" | "stable" | "decreasing",
  "confidence": <number between 0.0 and 1.0>
}`;

  const userPrompt = `Material Category: "${wasteType.trim()}"
Total Historical Records: ${sortedHistory.length}
Historical Supply Data (Chronological):
${JSON.stringify(sortedHistory, null, 2)}

Please project the expected supply volume for the next 4 weeks and return the STRICT JSON object.`;

  const TIMEOUT_MS = 25000;
  let timeoutTimer: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutTimer = setTimeout(() => {
      reject(
        new Error(
          `Hugging Face supply forecasting timed out after ${TIMEOUT_MS / 1000} seconds.`
        )
      );
    }, TIMEOUT_MS);
  });

  try {
    const apiCallPromise = (async (): Promise<string> => {
      // 1. Try chatCompletion endpoint first (standard for modern instruct models)
      try {
        const chatResponse = await hf.chatCompletion({
          model: modelName,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 1000,
          temperature: 0.1,
        });

        const text = chatResponse.choices?.[0]?.message?.content;
        if (text && typeof text === "string" && text.trim().length > 0) {
          return text;
        }
      } catch (chatError: any) {
        // If chatCompletion is not supported by the specified model, fallback to textGeneration
        console.warn(
          `Hugging Face chatCompletion attempt failed for model ${modelName}, falling back to textGeneration:`,
          chatError?.message || chatError
        );
      }

      // 2. Fallback to textGeneration endpoint
      const genResponse = await hf.textGeneration({
        model: modelName,
        inputs: `${systemPrompt}\n\n${userPrompt}\n\nStrict JSON:`,
        parameters: {
          max_new_tokens: 1000,
          temperature: 0.1,
          return_full_text: false,
        },
      });

      const genText = genResponse.generated_text;
      if (genText && typeof genText === "string" && genText.trim().length > 0) {
        return genText;
      }

      throw new Error(`Empty response received from Hugging Face model ${modelName}.`);
    })();

    const rawResponseText = await Promise.race([apiCallPromise, timeoutPromise]);
    if (timeoutTimer) clearTimeout(timeoutTimer);

    if (!rawResponseText || typeof rawResponseText !== "string") {
      throw new Error("Empty or invalid response received from Hugging Face Inference API.");
    }

    const cleanedJson = cleanJsonText(rawResponseText);

    let parsed: any;
    try {
      parsed = JSON.parse(cleanedJson);
    } catch (parseError: any) {
      throw new Error(
        `Failed to parse Hugging Face forecast response as JSON: ${parseError.message}. Response was: "${rawResponseText}"`
      );
    }

    // Validate parsed JSON structure
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid Hugging Face forecast response: root must be a JSON object.");
    }

    if (!Array.isArray(parsed.forecast) || parsed.forecast.length === 0) {
      throw new Error(
        `Invalid Hugging Face forecast response: "forecast" must be a non-empty array. Response was: "${rawResponseText}"`
      );
    }

    const validTrends: ForecastTrend[] = ["increasing", "stable", "decreasing"];

    const validatedForecast: WeeklyForecast[] = parsed.forecast.map(
      (item: any, index: number): WeeklyForecast => {
        const weekLabel =
          typeof item?.week === "string" && item.week.trim().length > 0
            ? item.week.trim()
            : `Week ${index + 1}`;

        const rawKg = Number(item?.predictedKg);
        const predictedKg =
          !isNaN(rawKg) && isFinite(rawKg)
            ? Math.max(0, Math.round(rawKg * 100) / 100)
            : 0;

        return {
          week: weekLabel,
          predictedKg,
        };
      }
    );

    const trend: ForecastTrend = validTrends.includes(parsed.trend)
      ? parsed.trend
      : determineTrend(validatedForecast);

    const rawConfidence = Number(parsed.confidence);
    const confidence =
      !isNaN(rawConfidence) && isFinite(rawConfidence)
        ? Math.max(0, Math.min(1, Math.round(rawConfidence * 100) / 100))
        : 0.75;

    return {
      forecast: validatedForecast,
      trend,
      confidence,
    };
  } catch (error: any) {
    if (timeoutTimer) clearTimeout(timeoutTimer);

    if (
      error.message?.includes("HUGGINGFACE_API_KEY is not defined") ||
      error.message?.includes("timed out") ||
      error.message?.includes("Failed to parse Hugging Face forecast response") ||
      error.message?.includes("Invalid Hugging Face forecast response") ||
      error.message?.includes("historicalData must be a non-empty array") ||
      error.message?.includes("Invalid wasteType provided")
    ) {
      throw error;
    }

    throw new Error(
      `Hugging Face supply forecasting failed: ${error.message || error}`
    );
  }
}
