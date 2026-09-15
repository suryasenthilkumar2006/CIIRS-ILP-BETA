"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import {
  Loader2,
  Radio,
  Clock,
  Navigation,
  MapPin,
  RefreshCw,
  Truck,
  Compass,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface LiveLocationData {
  lat: number;
  lng: number;
  updatedAt?: string | Date;
}

export interface LiveTrackingMapProps {
  contractId: string;
  destinationLocation?: {
    lat: number;
    lng: number;
    label?: string;
  };
  pickupLocation?: {
    lat: number;
    lng: number;
    label?: string;
  };
  className?: string;
  height?: string | number;
}

// Default center: India (20.5937° N, 78.9629° E)
const DEFAULT_CENTER = {
  lat: 20.5937,
  lng: 78.9629,
};

const DEFAULT_ZOOM = 14;

// Dark mode styling JSON array (Uber/Ola dark aesthetic)
const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#18181b" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#71717a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#18181b" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#3f3f46" }],
  },
  {
    featureType: "administrative.country",
    elementType: "labels.text.fill",
    stylers: [{ color: "#a1a1aa" }],
  },
  {
    featureType: "administrative.land_parcel",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d4d4d8" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#71717a" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#141416" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#52525b" }],
  },
  {
    featureType: "road",
    elementType: "geometry.fill",
    stylers: [{ color: "#27272a" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#a1a1aa" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#323238" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3f3f46" }],
  },
  {
    featureType: "road.highway.controlled_access",
    elementType: "geometry",
    stylers: [{ color: "#52525b" }],
  },
  {
    featureType: "road.local",
    elementType: "labels.text.fill",
    stylers: [{ color: "#71717a" }],
  },
  {
    featureType: "transit",
    elementType: "labels.text.fill",
    stylers: [{ color: "#71717a" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#09090b" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#3f3f46" }],
  },
];

/**
 * Calculates straight-line distance between two geographic coordinates in kilometers
 * using the Haversine formula.
 */
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats relative time elapsed since the given timestamp.
 */
function formatTimeAgo(date: Date | string | null | undefined): string {
  if (!date) return "Just now";
  const now = Date.now();
  const past = new Date(date).getTime();
  const diffInSeconds = Math.max(0, Math.floor((now - past) / 1000));

  if (diffInSeconds < 5) return "Just now";
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

export default function LiveTrackingMap({
  contractId,
  destinationLocation,
  pickupLocation,
  className = "",
  height = "520px",
}: LiveTrackingMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [liveLocation, setLiveLocation] = useState<LiveLocationData | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [timeAgoText, setTimeAgoText] = useState<string>("Waiting for update...");
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(true);
  const isFirstLoadRef = useRef<boolean>(true);

  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || "";

  const { isLoaded, loadError } = useJsApiLoader({
    id: "ciirs-google-maps-sdk",
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const containerStyle = useMemo(
    () => ({
      width: "100%",
      height: typeof height === "number" ? `${height}px` : height,
      minHeight: "380px",
      borderRadius: "1rem",
    }),
    [height]
  );

  const mapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      styles: DARK_MAP_STYLES,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      backgroundColor: "#18181b",
    }),
    []
  );

  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onMapUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Poll live location endpoint
  const fetchLiveLocation = useCallback(async () => {
    if (!contractId) return;

    setIsPolling(true);
    try {
      const response = await fetch(`/api/contracts/${contractId}/location`, {
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        const locationData: LiveLocationData | null =
          data.liveLocation !== undefined ? data.liveLocation : data;

        if (
          locationData &&
          typeof locationData.lat === "number" &&
          typeof locationData.lng === "number" &&
          !isNaN(locationData.lat) &&
          !isNaN(locationData.lng)
        ) {
          setLiveLocation(locationData);
        } else {
          setLiveLocation(null);
        }
      }
    } catch (err) {
      console.error("Failed to poll contract live location:", err);
    } finally {
      setIsFetching(false);
      setIsPolling(false);
    }
  }, [contractId]);

  // Initial fetch and 8-10 second polling interval
  useEffect(() => {
    fetchLiveLocation();

    const pollInterval = setInterval(() => {
      fetchLiveLocation();
    }, 9000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [fetchLiveLocation]);

  // 1-second interval to update the "Last updated X seconds ago" string
  useEffect(() => {
    const updateTimer = () => {
      if (liveLocation?.updatedAt) {
        setTimeAgoText(formatTimeAgo(liveLocation.updatedAt));
      } else {
        setTimeAgoText("Waiting for update...");
      }
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [liveLocation]);

  // Pan or fit bounds smoothly when live coordinates update
  useEffect(() => {
    if (!map || !liveLocation) return;

    const refPoint = destinationLocation || pickupLocation;

    if (refPoint && isFirstLoadRef.current && typeof window !== "undefined" && (window as any).google) {
      isFirstLoadRef.current = false;
      const bounds = new (window as any).google.maps.LatLngBounds();
      bounds.extend({ lat: liveLocation.lat, lng: liveLocation.lng });
      bounds.extend({ lat: refPoint.lat, lng: refPoint.lng });
      map.fitBounds(bounds);
    } else {
      map.panTo({ lat: liveLocation.lat, lng: liveLocation.lng });
    }
  }, [map, liveLocation, destinationLocation, pickupLocation]);

  // Distance computation via Haversine
  const distanceEstimate = useMemo(() => {
    if (!liveLocation) return null;
    const refPoint = destinationLocation || pickupLocation;
    if (!refPoint) return null;

    const distanceKm = calculateHaversineDistance(
      liveLocation.lat,
      liveLocation.lng,
      refPoint.lat,
      refPoint.lng
    );

    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} meters`;
    }
    return `${distanceKm.toFixed(2)} km`;
  }, [liveLocation, destinationLocation, pickupLocation]);

  // Center coordinate for the map
  const activeCenter = useMemo(() => {
    if (liveLocation) {
      return { lat: liveLocation.lat, lng: liveLocation.lng };
    }
    if (destinationLocation) {
      return { lat: destinationLocation.lat, lng: destinationLocation.lng };
    }
    if (pickupLocation) {
      return { lat: pickupLocation.lat, lng: pickupLocation.lng };
    }
    return DEFAULT_CENTER;
  }, [liveLocation, destinationLocation, pickupLocation]);

  // Custom marker icon for the supplier's live vehicle
  const supplierMarkerIcon = useMemo(() => {
    if (typeof window !== "undefined" && (window as any).google?.maps) {
      return {
        path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
        fillColor: "#10b981", // Emerald green
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
        scale: 1.8,
        anchor: (window as any).google?.maps?.Point
          ? new (window as any).google.maps.Point(12, 22)
          : undefined,
      };
    }
    return undefined;
  }, []);

  // Destination / Facility marker icon
  const destinationMarkerIcon = useMemo(() => {
    if (typeof window !== "undefined" && (window as any).google?.maps) {
      return {
        path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
        fillColor: "#38bdf8", // Sky blue
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
        scale: 1.5,
        anchor: (window as any).google?.maps?.Point
          ? new (window as any).google.maps.Point(12, 22)
          : undefined,
      };
    }
    return undefined;
  }, []);

  // SDK Loading State
  if (!isLoaded && !loadError && apiKey) {
    return (
      <div
        className={`w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-8 flex flex-col items-center justify-center space-y-4 ${className}`}
        style={{ height: typeof height === "number" ? `${height}px` : height }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <div className="space-y-1 text-center">
          <h3 className="text-sm font-medium text-zinc-200">
            Initializing Live Telemetry Radar
          </h3>
          <p className="text-xs text-zinc-500">
            Loading real-time Google Maps telemetry...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl ${className}`}
      style={{ height: typeof height === "number" ? `${height}px` : height }}
    >
      {/* Google Map Display */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={activeCenter}
        zoom={liveLocation ? DEFAULT_ZOOM : 5}
        options={mapOptions}
        onLoad={onMapLoad}
        onUnmount={onMapUnmount}
      >
        {/* Supplier Live Location Marker */}
        {liveLocation && (
          <Marker
            position={{ lat: liveLocation.lat, lng: liveLocation.lng }}
            icon={supplierMarkerIcon}
            onClick={() => setIsInfoOpen(true)}
            title="Supplier Live Pickup Vehicle"
          >
            {isInfoOpen && (
              <InfoWindow
                position={{ lat: liveLocation.lat, lng: liveLocation.lng }}
                onCloseClick={() => setIsInfoOpen(false)}
              >
                <div className="p-1 min-w-[190px] text-zinc-900 font-sans space-y-1.5">
                  <div className="flex items-center gap-1.5 border-b border-zinc-200 pb-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="font-bold text-xs text-zinc-900">
                      Supplier Vehicle En Route
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-600 space-y-0.5">
                    <p>
                      <span className="text-zinc-500">Coordinates:</span>{" "}
                      {liveLocation.lat.toFixed(4)}°N, {liveLocation.lng.toFixed(4)}°E
                    </p>
                    {distanceEstimate && (
                      <p className="text-emerald-700 font-medium">
                        Distance: ~{distanceEstimate}
                      </p>
                    )}
                    <p className="text-[10px] text-zinc-400">
                      Last ping: {timeAgoText}
                    </p>
                  </div>
                </div>
              </InfoWindow>
            )}
          </Marker>
        )}

        {/* Optional Destination / Facility Marker */}
        {destinationLocation && (
          <Marker
            position={{
              lat: destinationLocation.lat,
              lng: destinationLocation.lng,
            }}
            icon={destinationMarkerIcon}
            title={destinationLocation.label || "Pickup Destination"}
          />
        )}
      </GoogleMap>

      {/* Floating Status & Telemetry Header Overlay */}
      <div className="absolute top-3 left-3 right-3 sm:right-auto z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="flex items-center gap-2.5 rounded-xl border border-zinc-800/90 bg-zinc-950/90 px-3.5 py-2 text-xs backdrop-blur-md shadow-xl">
          {liveLocation ? (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="font-semibold text-white">Live Tracking</span>
              <span className="text-zinc-600">•</span>
              <span className="font-mono text-[11px] text-zinc-400 flex items-center gap-1">
                <Clock className="h-3 w-3 text-emerald-400" />
                Last updated {timeAgoText}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 animate-pulse" />
              <span className="text-amber-200/90 font-medium">
                Waiting for supplier to start sharing location...
              </span>
            </div>
          )}
        </div>

        {/* Distance Badge if available */}
        {distanceEstimate && liveLocation && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/80 px-3 py-2 text-xs font-medium text-emerald-300 backdrop-blur-md shadow-xl">
            <Compass className="h-3.5 w-3.5 text-emerald-400" />
            <span>Est. Distance: <strong className="text-white font-mono">{distanceEstimate}</strong></span>
          </div>
        )}
      </div>

      {/* Waiting Radar Overlay State (when location is null) */}
      {!liveLocation && !isFetching && (
        <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center p-6 bg-zinc-950/60 backdrop-blur-[2px]">
          <div className="max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 text-center shadow-2xl backdrop-blur-md space-y-3 pointer-events-auto">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Radio className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">
                Waiting for supplier to start sharing location...
              </h4>
              <p className="text-xs text-zinc-400 mt-1">
                The supplier will broadcast their live GPS location during pickup dispatch. This radar will automatically update once the stream starts.
              </p>
            </div>
            <div className="pt-1 flex items-center justify-center gap-2 text-[11px] text-zinc-500 font-mono">
              <RefreshCw className={`h-3 w-3 ${isPolling ? "animate-spin text-emerald-400" : ""}`} />
              <span>Polling satellite feed every 9s</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Refresh Control */}
      <div className="absolute bottom-3 right-3 z-10">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fetchLiveLocation()}
          disabled={isPolling}
          className="h-8 rounded-xl border-zinc-800 bg-zinc-950/90 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white backdrop-blur-md shadow-lg"
        >
          <RefreshCw className={`h-3 w-3 mr-1.5 ${isPolling ? "animate-spin text-emerald-400" : ""}`} />
          {isPolling ? "Syncing..." : "Sync GPS"}
        </Button>
      </div>
    </div>
  );
}
