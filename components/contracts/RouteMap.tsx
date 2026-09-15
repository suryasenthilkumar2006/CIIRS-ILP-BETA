"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsRenderer,
} from "@react-google-maps/api";
import {
  Navigation,
  Clock,
  MapPin,
  Truck,
  AlertCircle,
  Loader2,
  Building2,
  Factory,
  ShieldCheck,
  Compass,
} from "lucide-react";

export interface LatLngPoint {
  lat: number;
  lng: number;
  label?: string;
  address?: string;
}

export interface RouteMapProps {
  supplierLocation?: LatLngPoint | { lat?: number; lng?: number } | [number, number] | any;
  startupLocation?: LatLngPoint | { lat?: number; lng?: number } | [number, number] | any;
  className?: string;
  height?: string | number;
}

// Default center: India (20.5937° N, 78.9629° E)
const DEFAULT_CENTER = {
  lat: 20.5937,
  lng: 78.9629,
};

// Dark mode styling JSON array (Cyberpunk / Dark Zinc aesthetic)
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
    stylers: [{ color: "#52525b" }],
  },
];

/**
 * Safely parses various location input shapes ({ lat, lng }, [lng, lat], or GeoJSON { coordinates: [lng, lat] }).
 */
function parseCoordinates(loc: any): { lat: number; lng: number } | null {
  if (!loc) return null;

  // 1. Direct { lat, lng } object
  if (
    typeof loc.lat === "number" &&
    typeof loc.lng === "number" &&
    !isNaN(loc.lat) &&
    !isNaN(loc.lng)
  ) {
    return { lat: loc.lat, lng: loc.lng };
  }

  // 2. Direct [lng, lat] coordinate array (GeoJSON standard)
  if (Array.isArray(loc) && loc.length === 2) {
    const [lng, lat] = loc;
    if (typeof lat === "number" && typeof lng === "number" && !isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }

  // 3. Nested GeoJSON object { type: "Point", coordinates: [lng, lat] }
  if (loc.coordinates && Array.isArray(loc.coordinates) && loc.coordinates.length === 2) {
    const [lng, lat] = loc.coordinates;
    if (typeof lat === "number" && typeof lng === "number" && !isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }

  // 4. Nested location field { location: { coordinates: [lng, lat] } }
  if (loc.location) {
    return parseCoordinates(loc.location);
  }

  return null;
}

const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

export default function RouteMap({
  supplierLocation,
  startupLocation,
  className = "",
  height = "420px",
}: RouteMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  const { isLoaded, loadError } = useJsApiLoader({
    id: "ciirs-google-maps-sdk",
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [startAddress, setStartAddress] = useState<string | null>(null);
  const [endAddress, setEndAddress] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  // Normalize locations
  const origin = useMemo(() => parseCoordinates(supplierLocation), [supplierLocation]);
  const destination = useMemo(() => parseCoordinates(startupLocation), [startupLocation]);

  const hasBothLocations = Boolean(origin && destination);

  // Calculate driving route using Google Maps DirectionsService
  useEffect(() => {
    if (!isLoaded || !window.google || !origin || !destination) {
      return;
    }

    setIsCalculating(true);
    setRouteError(null);

    const directionsService = new google.maps.DirectionsService();

    directionsService.route(
      {
        origin: new google.maps.LatLng(origin.lat, origin.lng),
        destination: new google.maps.LatLng(destination.lat, destination.lng),
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: false,
      },
      (result, status) => {
        setIsCalculating(false);

        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
          const leg = result.routes[0]?.legs[0];
          if (leg) {
            setDistance(leg.distance?.text || null);
            setDuration(leg.duration?.text || null);
            setStartAddress(leg.start_address || null);
            setEndAddress(leg.end_address || null);
          }
        } else {
          console.warn("Directions request failed with status:", status);
          setRouteError("Unable to calculate driving route for the specified coordinates.");
        }
      }
    );
  }, [isLoaded, origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  const mapContainerStyle = useMemo(
    () => ({
      width: "100%",
      height: typeof height === "number" ? `${height}px` : height,
      borderRadius: "0.75rem",
    }),
    [height]
  );

  const mapOptions: google.maps.MapOptions = useMemo(
    () => ({
      styles: DARK_MAP_STYLES,
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
      backgroundColor: "#09090b",
    }),
    []
  );

  // Fallback: Missing locations state
  if (!hasBothLocations) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/60 p-8 text-center backdrop-blur-md ${className}`}
        style={{ minHeight: typeof height === "number" ? `${height}px` : height }}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500 mb-3">
          <MapPin className="h-7 w-7" />
        </div>
        <h4 className="text-base font-semibold text-zinc-200">Location not available</h4>
        <p className="text-xs text-zinc-500 max-w-sm mt-1">
          {!origin && !destination
            ? "Neither supplier nor startup geographic coordinates are registered."
            : !origin
            ? "Supplier pickup location is missing or coordinates are invalid."
            : "Startup destination facility coordinates are missing."}
        </p>
      </div>
    );
  }

  // Fallback: Google Maps Loader Error
  if (loadError) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-2xl border border-rose-900/50 bg-rose-950/20 p-8 text-center ${className}`}
        style={{ minHeight: typeof height === "number" ? `${height}px` : height }}
      >
        <AlertCircle className="h-8 w-8 text-rose-400 mb-2" />
        <h4 className="text-sm font-semibold text-rose-200">Google Maps Failed to Load</h4>
        <p className="text-xs text-rose-300/80 mt-1">
          {loadError.message || "Please check your NEXT_PUBLIC_GOOGLE_MAPS_API_KEY configuration."}
        </p>
      </div>
    );
  }

  // Fallback: Loading Map Script
  if (!isLoaded) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/60 p-8 text-center backdrop-blur-md ${className}`}
        style={{ minHeight: typeof height === "number" ? `${height}px` : height }}
      >
        <Loader2 className="h-8 w-8 text-emerald-400 animate-spin mb-3" />
        <p className="text-xs font-medium text-zinc-300">Loading Driving Transit Route...</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Map Canvas */}
      <div className="relative overflow-hidden rounded-xl border border-zinc-800 shadow-xl bg-zinc-950">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={origin || DEFAULT_CENTER}
          zoom={12}
          options={mapOptions}
        >
          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={{
                suppressMarkers: false,
                polylineOptions: {
                  strokeColor: "#10b981", // Emerald driving path
                  strokeWeight: 5,
                  strokeOpacity: 0.9,
                },
              }}
            />
          )}
        </GoogleMap>

        {/* Floating Route Status Pill */}
        <div className="absolute top-3 left-3 flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/90 px-3 py-1.5 backdrop-blur-md shadow-lg text-xs">
          <Truck className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold text-white">Driving Transit Route</span>
          {isCalculating && (
            <Loader2 className="h-3.5 w-3.5 text-emerald-400 animate-spin ml-1" />
          )}
        </div>
      </div>

      {/* Transit Metrics Strip & Route Summary */}
      {directions && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Distance Card */}
          <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5 backdrop-blur-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Navigation className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-zinc-400 block">
                Total Driving Distance
              </span>
              <span className="text-lg font-bold text-white tracking-tight">
                {distance || "—"}
              </span>
            </div>
          </div>

          {/* Duration Card */}
          <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5 backdrop-blur-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-zinc-400 block">
                Estimated Transit Time
              </span>
              <span className="text-lg font-bold text-white tracking-tight">
                {duration || "—"}
              </span>
            </div>
          </div>

          {/* Mode & Custody Guarantee */}
          <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5 backdrop-blur-sm sm:col-span-2 lg:col-span-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-zinc-400 block">
                Logistics Route Mode
              </span>
              <span className="text-xs font-semibold text-zinc-200">
                Direct Custody Handover
              </span>
            </div>
          </div>
        </div>
      )}

      {routeError && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{routeError}</span>
        </div>
      )}
    </div>
  );
}
