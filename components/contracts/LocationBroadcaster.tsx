"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Navigation,
  Radio,
  Pause,
  Play,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  MapPin,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface LocationBroadcasterProps {
  contractId: string;
  className?: string;
}

interface Coordinates {
  lat: number;
  lng: number;
  accuracy?: number;
}

export default function LocationBroadcaster({
  contractId,
  className = "",
}: LocationBroadcasterProps) {
  const [isSharing, setIsSharing] = useState<boolean>(true);
  const [currentCoords, setCurrentCoords] = useState<Coordinates | null>(null);
  const [lastBroadcastAt, setLastBroadcastAt] = useState<Date | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [broadcastCount, setBroadcastCount] = useState<number>(0);

  // References to handle geolocation watchers, timers, and the latest coordinate values
  const watchIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const latestCoordsRef = useRef<Coordinates | null>(null);
  const hasSentFirstPingRef = useRef<boolean>(false);

  // Function to send GPS coordinates to the location API
  const sendLocationUpdate = useCallback(
    async (coords: Coordinates) => {
      if (!contractId || !coords) return;

      setIsBroadcasting(true);
      try {
        const response = await fetch(`/api/contracts/${contractId}/location`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lat: coords.lat,
            lng: coords.lng,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setLastBroadcastAt(new Date());
          setBroadcastCount((prev) => prev + 1);
          setErrorMsg(null);
        } else {
          setErrorMsg(
            data.error || "Failed to update live location on server."
          );
        }
      } catch (err: any) {
        setErrorMsg(
          err.message || "Network connection error while transmitting GPS location."
        );
      } finally {
        setIsBroadcasting(false);
      }
    },
    [contractId]
  );

  // Stop Geolocation tracking and cleanup
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }, []);

  // Start Geolocation tracking and 10s interval broadcast
  const startTracking = useCallback(() => {
    stopTracking();
    setErrorMsg(null);

    if (typeof window === "undefined" || !navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your current browser.");
      return;
    }

    // 1. Setup watchPosition for high-accuracy live coordinate stream
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords: Coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        latestCoordsRef.current = coords;
        setCurrentCoords(coords);
        setErrorMsg(null);

        // Immediate first broadcast upon acquiring GPS lock
        if (!hasSentFirstPingRef.current) {
          hasSentFirstPingRef.current = true;
          sendLocationUpdate(coords);
        }
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setErrorMsg(
              "Location permission denied. Please allow GPS/location access in your browser settings to enable pickup tracking."
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setErrorMsg(
              "GPS position unavailable. Searching for satellite/network fix..."
            );
            break;
          case error.TIMEOUT:
            setErrorMsg("GPS acquisition request timed out. Retrying...");
            break;
          default:
            setErrorMsg("An unexpected geolocation error occurred.");
            break;
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    watchIdRef.current = watchId;

    // 2. Setup ~10 second throttled broadcast interval to avoid spamming the backend
    const intervalId = setInterval(() => {
      if (latestCoordsRef.current) {
        sendLocationUpdate(latestCoordsRef.current);
      }
    }, 10000);

    intervalIdRef.current = intervalId;
  }, [sendLocationUpdate, stopTracking]);

  // Effect to handle mount/unmount and isSharing state changes
  useEffect(() => {
    if (isSharing) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [isSharing, startTracking, stopTracking]);

  const handleToggleSharing = () => {
    setIsSharing((prev) => !prev);
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 ${
        isSharing
          ? "border-emerald-500/40 bg-gradient-to-b from-emerald-950/30 to-zinc-950/80 shadow-lg shadow-emerald-500/5"
          : "border-zinc-800 bg-zinc-950/80"
      } p-4 sm:p-5 backdrop-blur-md ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Status and Information */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            {isSharing ? (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
            ) : (
              <span className="h-3 w-3 rounded-full bg-zinc-600" />
            )}

            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              {isSharing ? "Sharing Live Location" : "Location Sharing Paused"}
              {isSharing && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                  <Radio className="h-3 w-3 animate-pulse" />
                  Live GPS
                </span>
              )}
            </h4>
          </div>

          <p className="text-xs text-zinc-400">
            {isSharing
              ? "Transmitting your pickup vehicle location every 10 seconds to the startup."
              : "Live telemetry is paused. Start sharing when en route for pickup."}
          </p>

          {/* Coordinate & Telemetry Details */}
          {currentCoords && isSharing && (
            <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-zinc-400">
              <span className="flex items-center gap-1 text-zinc-300">
                <MapPin className="h-3 w-3 text-emerald-400" />
                {currentCoords.lat.toFixed(5)}°N, {currentCoords.lng.toFixed(5)}°E
              </span>
              {currentCoords.accuracy && (
                <span className="text-zinc-500">
                  Acc: ±{Math.round(currentCoords.accuracy)}m
                </span>
              )}
              {lastBroadcastAt && (
                <span className="text-emerald-400/90 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Synced {lastBroadcastAt.toLocaleTimeString()} ({broadcastCount} pings)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions and Live Transmission Status */}
        <div className="flex items-center gap-3 self-start sm:self-center">
          {isBroadcasting && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span className="hidden sm:inline">Broadcasting...</span>
            </div>
          )}

          <Button
            type="button"
            variant={isSharing ? "outline" : "default"}
            size="sm"
            onClick={handleToggleSharing}
            className={
              isSharing
                ? "border-zinc-700 bg-zinc-900/90 text-zinc-200 hover:bg-zinc-800 hover:text-white"
                : "bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-600/20"
            }
          >
            {isSharing ? (
              <>
                <Pause className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
                Pause Sharing
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
                Start Sharing
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error / Permission Alert */}
      {errorMsg && (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-amber-300">Location Telemetry Notice</p>
            <p className="text-amber-200/90 mt-0.5">{errorMsg}</p>
          </div>
          <button
            type="button"
            onClick={startTracking}
            className="text-[11px] font-semibold text-amber-300 underline hover:text-amber-100 flex-shrink-0 ml-2"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
