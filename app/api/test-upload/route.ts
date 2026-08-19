import { NextRequest, NextResponse } from "next/server";
import { uploadWastePhoto } from "@/lib/cloudinary";
import { connectDB } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cloudinaryConfigured = Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    let dbStatus = {
      connected: false,
      message: "Not checked",
    };

    try {
      if (process.env.MONGODB_URI) {
        // Test connection with a short 3-second timeout
        const dbPromise = connectDB();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("MongoDB connection timed out after 3s")), 3000)
        );
        await Promise.race([dbPromise, timeoutPromise]);
        dbStatus = {
          connected: true,
          message: "MongoDB connected successfully",
        };
      } else {
        dbStatus = {
          connected: false,
          message: "MONGODB_URI not configured in .env",
        };
      }
    } catch (dbErr: any) {
      dbStatus = {
        connected: false,
        message: dbErr?.message || "Failed to connect to MongoDB",
      };
    }

    return NextResponse.json({
      status: "online",
      timestamp: new Date().toISOString(),
      cloudinary: {
        isConfigured: cloudinaryConfigured,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
        hasApiKey: Boolean(process.env.CLOUDINARY_API_KEY),
        hasApiSecret: Boolean(process.env.CLOUDINARY_API_SECRET),
      },
      mongodb: dbStatus,
      auth: {
        hasNextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
        hasNextAuthUrl: Boolean(process.env.NEXTAUTH_URL),
      },
      ai: {
        hasGemini: Boolean(process.env.GEMINI_API_KEY),
        hasAnthropic: Boolean(process.env.ANTHROPIC_API_KEY),
        hasHuggingFace: Boolean(process.env.HUGGINGFACE_API_KEY),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to retrieve status" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "ciirs-listings";

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided in form data." },
        { status: 400 }
      );
    }

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const startTime = Date.now();
    // Call the uploadWastePhoto function created in lib/cloudinary.ts
    const secureUrl = await uploadWastePhoto(buffer, folder);
    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      secureUrl,
      folder,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      durationMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Test upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Cloudinary upload failed",
      },
      { status: 500 }
    );
  }
}
