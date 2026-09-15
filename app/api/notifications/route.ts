import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";

/**
 * GET /api/notifications?userId=...
 * Returns notifications for a specified user, sorted newest first.
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      return NextResponse.json(
        { error: "userId query parameter is required." },
        { status: 400 }
      );
    }

    const notifications = await Notification.find({ userId: userId.trim() })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json(notifications, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * Accepts { id } in the request body and marks the specified notification as read.
 */
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const { id } = body;

    if (!id || typeof id !== "string" || id.trim().length === 0) {
      return NextResponse.json(
        { error: "Notification id is required in the request body." },
        { status: 400 }
      );
    }

    const updatedNotification = await Notification.findByIdAndUpdate(
      id.trim(),
      { read: true },
      { new: true }
    );

    if (!updatedNotification) {
      return NextResponse.json(
        { error: `Notification with ID "${id}" not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedNotification, { status: 200 });
  } catch (error: any) {
    console.error("PATCH /api/notifications error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
