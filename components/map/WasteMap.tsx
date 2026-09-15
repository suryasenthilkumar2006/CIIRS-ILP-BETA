"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import {
  Loader2,
  AlertCircle,
  ExternalLink,
  Layers,
} from "lucide-react";

export interface MapListing {
  _id: string;
  wasteType: string;
  subType?: string;
  status: string;
  quantityKg?: number;
  unit?: string;
  priceEstimate?: number;
  location: {
    type?: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
}

export interface WasteMapProps {
  listings?: MapListing[];
  className?: string;
  height?: string | number;
}

// Waste type color definitions
export const WASTE_TYPE_COLORS: Record<string, string> = {
  organic: "#22c55e", // Green
  plastic: "#06b6d4", // Cyan
  textile: "#a855f7", // Purple
  "e-waste": "#f97316", // Orange
  ewaste: "#f97316",
  electronic: "#f97316",
  metal: "#38bdf8", // Sky Blue
  paper: "#eab308", // Yellow
  cardboard: "#eab308",
  glass: "#14b8a6", // Teal
  hazardous: "#ef4444", // Red
};

export function getWasteColor(wasteType?: string): string {
  if (!wasteType) return "#10b981";
  const normalized = wasteType.toLowerCase().trim();
  for (const [key, color] of Object.entries(WASTE_TYPE_COLORS)) {
    if (normalized.includes(key)) {
      return color;
    }
  }
  return "#10b981"; // Default Emerald
}

// Default center: India (20.5937° N, 78.9629° E)
const DEFAULT_CENTER = {
  lat: 20.5937,
  lng: 78.9629,
};

const DEFAULT_ZOOM = 5;

// Uber/Ola inspired dark mode styling JSON for Google Maps
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

const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

export default function WasteMap({
  listings = [],
  className = "",
  height = "550px",
}: WasteMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedListing, setSelectedListing] = useState<MapListing | null>(null);

  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    "";

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

  // Filter valid geographic coordinates
  const validListings = useMemo(() => {
    return listings.filter((item) => {
      const coords = item?.location?.coordinates;
      return (
        Array.isArray(coords) &&
        coords.length === 2 &&
        typeof coords[0] === "number" &&
        typeof coords[1] === "number" &&
        !isNaN(coords[0]) &&
        !isNaN(coords[1])
      );
    });
  }, [listings]);

  // Fit bounds to listings if any exist
  useEffect(() => {
    if (!map || validListings.length === 0 || typeof window === "undefined" || !(window as any).google) {
      return;
    }

    try {
      const bounds = new (window as any).google.maps.LatLngBounds();
      validListings.forEach((listing) => {
        const [lng, lat] = listing.location.coordinates;
        bounds.extend({ lat, lng });
      });

      map.fitBounds(bounds);

      if (validListings.length === 1) {
        map.setZoom(12);
      }
    } catch {
      // Ignored
    }
  }, [map, validListings]);

  // Generate customized pin marker icon
  const getMarkerIcon = useCallback(
    (wasteType: string, isSelected: boolean) => {
      const color = getWasteColor(wasteType);
      if (typeof window !== "undefined" && (window as any).google?.maps) {
        return {
          path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
          fillColor: color,
          fillOpacity: 1,
          strokeColor: isSelected ? "#ffffff" : "#09090b",
          strokeWeight: isSelected ? 2.5 : 1.5,
          scale: isSelected ? 1.6 : 1.3,
          anchor: (window as any).google?.maps?.Point
            ? new (window as any).google.maps.Point(12, 22)
            : undefined,
        };
      }
      return undefined;
    },
    []
  );

  // If Google Maps SDK fails or is not configured, render interactive OpenStreetMap spatial interface
  if (loadError || !apiKey) {
    return (
      <div
        className={`relative w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl flex flex-col ${className}`}
        style={{ height: typeof height === "number" ? `${height}px` : height, minHeight: "380px" }}
      >
        {/* Interactive Spatial Grid Fallback */}
        <div className="relative flex-1 w-full bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] bg-zinc-950 p-6 flex flex-col justify-between overflow-hidden">
          {/* Header Bar */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-white">Spatial Resource Ledger</span>
              <span className="text-[10px] text-zinc-500 font-mono">({validListings.length} Geolocated Batches)</span>
            </div>

            <div className="rounded-full border border-zinc-800 bg-zinc-900/90 px-3 py-1 text-[11px] font-mono text-zinc-300">
              India Network Grid
            </div>
          </div>

          {/* Interactive Batch Coordinate Nodes */}
          <div className="relative my-4 flex-1 w-full rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {validListings.slice(0, 9).map((item) => {
                const color = getWasteColor(item.wasteType);
                const isSelected = selectedListing?._id === item._id;
                const [lng, lat] = item.location.coordinates;

                return (
                  <div
                    key={item._id}
                    onClick={() => setSelectedListing(item)}
                    className={`cursor-pointer rounded-xl border p-3 transition-all hover:scale-[1.02] ${
                      isSelected
                        ? "border-emerald-500 bg-zinc-900 shadow-lg shadow-emerald-500/10"
                        : "border-zinc-800/80 bg-zinc-950/80 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-bold text-xs text-white capitalize truncate">
                          {item.wasteType}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {lat.toFixed(2)}°N, {lng.toFixed(2)}°E
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
                      <span>{item.quantityKg ? `${item.quantityKg} ${item.unit || "kg"}` : "Batch"}</span>
                      {item.priceEstimate && (
                        <span className="font-semibold text-emerald-400">₹{item.priceEstimate.toLocaleString("en-IN")}</span>
                      )}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-zinc-500">
                        {item.status}
                      </span>
                      <Link
                        href={`/listings/${item._id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        <span>Details</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Floating Dark Mode Legend */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800/90 bg-zinc-900/90 px-3.5 py-2 text-xs text-zinc-300 backdrop-blur-md shadow-xl z-10">
            <div className="flex items-center gap-1.5 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider pr-1 border-r border-zinc-800">
              <Layers className="h-3 w-3 text-emerald-400" />
              <span>Streams</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
              <span>Organic</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="h-2 w-2 rounded-full bg-[#06b6d4]" />
              <span>Plastic</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="h-2 w-2 rounded-full bg-[#a855f7]" />
              <span>Textile</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="h-2 w-2 rounded-full bg-[#f97316]" />
              <span>E-Waste</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
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
            Initializing CIIRS Spatial Ledger
          </h3>
          <p className="text-xs text-zinc-500">
            Loading Google Maps Dark Mode interface...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl ${className}`}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        options={mapOptions}
        onLoad={onMapLoad}
        onUnmount={onMapUnmount}
      >
        {validListings.map((listing) => {
          const [lng, lat] = listing.location.coordinates;
          const isSelected = selectedListing?._id === listing._id;
          const icon = getMarkerIcon(listing.wasteType, isSelected);

          return (
            <Marker
              key={listing._id}
              position={{ lat, lng }}
              onClick={() => setSelectedListing(listing)}
              icon={icon}
              title={`${listing.wasteType} Listing`}
            />
          );
        })}

        {selectedListing && (
          <InfoWindow
            position={{
              lat: selectedListing.location.coordinates[1],
              lng: selectedListing.location.coordinates[0],
            }}
            onCloseClick={() => setSelectedListing(null)}
          >
            <div className="p-1 min-w-[210px] max-w-[260px] text-zinc-900 font-sans space-y-2.5">
              <div className="flex items-center justify-between gap-2 border-b border-zinc-200 pb-2">
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: getWasteColor(selectedListing.wasteType),
                    }}
                  />
                  <span className="font-bold text-sm text-zinc-900 capitalize truncate">
                    {selectedListing.wasteType}
                  </span>
                </div>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-300"
                >
                  {selectedListing.status}
                </span>
              </div>

              <div className="space-y-1 text-xs text-zinc-600">
                {selectedListing.subType && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Stream:</span>
                    <span className="font-medium text-zinc-800 capitalize">
                      {selectedListing.subType}
                    </span>
                  </div>
                )}
                {selectedListing.quantityKg !== undefined && selectedListing.quantityKg > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Available:</span>
                    <span className="font-semibold text-zinc-900">
                      {selectedListing.quantityKg} {selectedListing.unit || "kg"}
                    </span>
                  </div>
                )}
                {selectedListing.priceEstimate !== undefined && selectedListing.priceEstimate > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Est. Value:</span>
                    <span className="font-semibold text-emerald-700">
                      ₹{selectedListing.priceEstimate.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-1">
                <Link
                  href={`/listings/${selectedListing._id}`}
                  className="flex items-center justify-center gap-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs py-1.5 px-3 rounded-lg shadow-sm transition-colors text-center"
                >
                  <span>View Details</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Floating Dark Mode Legend */}
      <div className="absolute bottom-4 left-4 z-10 hidden sm:flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800/90 bg-zinc-950/90 px-3.5 py-2 text-xs text-zinc-300 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-1.5 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider pr-1 border-r border-zinc-800">
          <Layers className="h-3 w-3 text-emerald-400" />
          <span>Streams</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
          <span>Organic</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="h-2 w-2 rounded-full bg-[#06b6d4]" />
          <span>Plastic</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="h-2 w-2 rounded-full bg-[#a855f7]" />
          <span>Textile</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="h-2 w-2 rounded-full bg-[#f97316]" />
          <span>E-Waste</span>
        </div>
      </div>

      {/* Counter Pill */}
      <div className="absolute top-4 right-4 z-10 rounded-full border border-zinc-800/90 bg-zinc-950/90 px-3 py-1 text-[11px] font-mono text-zinc-300 backdrop-blur-md shadow-lg flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
        <span>{validListings.length} {validListings.length === 1 ? "listing" : "listings"} mapped</span>
      </div>
    </div>
  );
}
