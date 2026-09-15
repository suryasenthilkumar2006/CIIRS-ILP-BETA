"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Handshake,
  Coins,
  MapPin,
  Award,
  Sparkles,
  Layers,
  Clock,
  ExternalLink,
} from "lucide-react";

export interface NotificationItem {
  _id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

interface NotificationBellProps {
  userId?: string;
  className?: string;
}

/**
 * Calculates human-readable time elapsed (e.g. "Just now", "5m ago", "2h ago", "Yesterday").
 */
function formatTimeAgo(dateString: string | Date): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 45) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NotificationBell({
  userId: propUserId,
  className = "",
}: NotificationBellProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeUserId = propUserId || (session?.user as any)?.id;

  // Fetch notifications from GET /api/notifications
  const fetchNotifications = useCallback(async () => {
    if (!activeUserId) return;

    try {
      const res = await fetch(
        `/api/notifications?userId=${encodeURIComponent(activeUserId)}`
      );
      if (res.ok) {
        const data: NotificationItem[] = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.warn("Failed to fetch notifications:", err);
    }
  }, [activeUserId]);

  // Initial fetch and automatic polling every 18 seconds
  useEffect(() => {
    if (!activeUserId) return;

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 18000);

    return () => clearInterval(interval);
  }, [activeUserId, fetchNotifications]);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Handle clicking a notification: mark read (PATCH) and navigate
  const handleNotificationClick = async (notification: NotificationItem) => {
    // 1. Optimistically mark as read in local state
    if (!notification.read) {
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notification._id ? { ...n, read: true } : n
        )
      );

      // 2. Call PATCH /api/notifications to persist read state
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: notification._id }),
        });
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
      }
    }

    setIsOpen(false);

    // 3. Navigate to notification link if defined
    if (notification.link) {
      router.push(notification.link);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    const unreadItems = notifications.filter((n) => !n.read);
    if (unreadItems.length === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      await Promise.all(
        unreadItems.map((item) =>
          fetch("/api/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: item._id }),
          })
        )
      );
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  // Helper to render relevant icon based on notification type
  const renderNotificationIcon = (type: string) => {
    switch (type) {
      case "contract_request":
        return <Handshake className="h-4 w-4 text-blue-400" />;
      case "green_credits":
      case "credit":
        return <Coins className="h-4 w-4 text-emerald-400" />;
      case "pickup_scheduled":
      case "pickup":
        return <MapPin className="h-4 w-4 text-amber-400" />;
      case "impact_certificate":
      case "certificate":
        return <Award className="h-4 w-4 text-purple-400" />;
      case "listing":
        return <Layers className="h-4 w-4 text-teal-400" />;
      default:
        return <Sparkles className="h-4 w-4 text-emerald-400" />;
    }
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex h-8 w-8 items-center justify-center rounded-xl border transition-all ${
          isOpen
            ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
            : "border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
        }`}
        title="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="h-4 w-4" />

        {/* Unread Badge Count or Pulsing Dot */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-zinc-950 shadow-md ring-2 ring-zinc-950 animate-in fade-in zoom-in-75">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-zinc-800 bg-zinc-950/98 p-4 shadow-2xl backdrop-blur-2xl z-50 text-xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Bell className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-zinc-100 text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-emerald-400 transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 space-y-2">
                <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-zinc-900 text-zinc-600">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium text-zinc-400">No notifications yet</p>
                <p className="text-[11px] text-zinc-500 max-w-[200px] mx-auto">
                  Updates on contract requests, pickup OTPs, and Green Credits will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    notif.read
                      ? "border-zinc-850/60 bg-zinc-900/30 text-zinc-400 hover:bg-zinc-900/60 hover:border-zinc-700"
                      : "border-zinc-700/80 bg-zinc-900/80 text-zinc-200 hover:bg-zinc-850 hover:border-emerald-500/40 shadow-sm"
                  }`}
                >
                  {/* Type Icon */}
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800/80 border border-zinc-700/50 mt-0.5">
                    {renderNotificationIcon(notif.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs font-semibold truncate ${
                          notif.read ? "text-zinc-300" : "text-white"
                        }`}
                      >
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-zinc-500 shrink-0 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                  </div>

                  {/* Unread indicator dot */}
                  {!notif.read && (
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0 mt-1.5 ring-2 ring-emerald-500/20" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-zinc-800/80 pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push("/contracts");
                }}
                className="text-[11px] text-zinc-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
              >
                <span>View contracts workspace</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
