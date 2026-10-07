"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { setWorkerUrl } from "maplibre-gl";
import Map, { Layer, Marker, NavigationControl, Source, type MapRef } from "react-map-gl/maplibre";
import { LocateFixed, Map as MapIcon, Satellite } from "lucide-react";
import { isClosedRing, openRing, type LngLat } from "@/lib/plot-ring";
import "maplibre-gl/dist/maplibre-gl.css";

setWorkerUrl("/maplibre/maplibre-gl-worker.js");

const satelliteStyle = {
  version: 8 as const,
  sources: {
    esri: {
      type: "raster" as const,
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 18,
      attribution: "Esri, Maxar, Earthstar Geographics",
    },
  },
  layers: [{ id: "esri", type: "raster" as const, source: "esri" }],
};

export function PlotDrawMap({
  draft,
  onMapClick,
  focus = null,
  className = "",
}: {
  draft: LngLat[];
  onMapClick: (lng: number, lat: number) => void;
  focus?: { lng: number; lat: number; zoom?: number } | null;
  className?: string;
}) {
  const mapRef = useRef<MapRef>(null);
  const placedRef = useRef(false);
  const [mode, setMode] = useState<"satellite" | "street">("satellite");
  const mapStyle = useMemo(
    () => (mode === "satellite" ? structuredClone(satelliteStyle) : "https://tiles.openfreemap.org/styles/positron"),
    [mode],
  );

  const open = openRing(draft);
  const closed = isClosedRing(draft);
  const focusKey = focus ? `${focus.lng}:${focus.lat}:${focus.zoom ?? ""}` : "";

  // Keep a stable FeatureCollection + layer set. Swapping LineString↔Polygon
  // (or layer ids) inside one Source leaves MapLibre with a blank draft.
  const draftData = useMemo(() => {
    const features: GeoJSON.Feature[] = [];
    if (closed && draft.length >= 4) {
      features.push({
        type: "Feature",
        properties: { kind: "fill" },
        geometry: { type: "Polygon", coordinates: [draft] },
      });
    }
    if (open.length >= 2) {
      features.push({
        type: "Feature",
        properties: { kind: "line" },
        geometry: { type: "LineString", coordinates: closed ? draft : open },
      });
    }
    return { type: "FeatureCollection" as const, features };
  }, [draft, open, closed]);

  function flyToFocus() {
    const map = mapRef.current;
    if (!map || !focus) return;
    map.flyTo({
      center: [focus.lng, focus.lat],
      zoom: focus.zoom ?? 15,
      duration: 450,
    });
  }

  function fitDraft() {
    const map = mapRef.current;
    if (!map || open.length === 0) {
      flyToFocus();
      return;
    }
    const lngs = open.map((point) => point[0]);
    const lats = open.map((point) => point[1]);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 56, duration: 450, maxZoom: 18 },
    );
  }

  useEffect(() => {
    if (placedRef.current) return;
    if (!focus) return;
    flyToFocus();
    // Only auto-jump when place focus first arrives / changes before drawing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  return (
    <div className={`relative h-full min-h-0 overflow-hidden ${className}`}>
      <Map
        ref={mapRef}
        style={{ width: "100%", height: "100%" }}
        initialViewState={{
          longitude: focus?.lng ?? 100.9925,
          latitude: focus?.lat ?? 15.87,
          zoom: focus?.zoom ?? 6,
        }}
        maxZoom={20}
        mapStyle={mapStyle}
        cursor={closed ? "default" : "crosshair"}
        onClick={(event) => {
          if (closed) return;
          placedRef.current = true;
          // Snap to first vertex in screen space so tapping the start marker closes.
          if (open.length >= 3) {
            const map = mapRef.current;
            if (map) {
              const first = map.project(open[0]);
              const dx = first.x - event.point.x;
              const dy = first.y - event.point.y;
              if (dx * dx + dy * dy <= 28 * 28) {
                onMapClick(open[0][0], open[0][1]);
                return;
              }
            }
          }
          onMapClick(event.lngLat.lng, event.lngLat.lat);
        }}
        onLoad={() => {
          if (open.length > 0) fitDraft();
          else flyToFocus();
        }}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <Source id="draft" type="geojson" data={draftData}>
          <Layer
            id="draft-fill"
            type="fill"
            filter={["==", ["geometry-type"], "Polygon"]}
            paint={{ "fill-color": "#f4c35d", "fill-opacity": 0.42 }}
          />
          <Layer
            id="draft-line"
            type="line"
            filter={["==", ["geometry-type"], "LineString"]}
            paint={{ "line-color": "#f4c35d", "line-width": 2.5 }}
          />
        </Source>
        {open.map((point, index) => (
          <Marker key={`${point[0]}:${point[1]}:${index}`} longitude={point[0]} latitude={point[1]} anchor="center">
            <span
              className={`pointer-events-none block rounded-full border-2 border-white shadow ${
                index === 0 ? "h-3.5 w-3.5 bg-brand" : "h-3 w-3 bg-accent"
              }`}
            />
          </Marker>
        ))}
      </Map>

      <div className="absolute left-3 top-3 z-10 flex gap-1.5">
        <button
          type="button"
          aria-label="ภาพถ่าย"
          onClick={() => setMode("satellite")}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl shadow-sm ${
            mode === "satellite" ? "bg-brand-dark text-white" : "bg-white/95 text-brand-dark"
          }`}
        >
          <Satellite size={14} />
        </button>
        <button
          type="button"
          aria-label="ถนน"
          onClick={() => setMode("street")}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl shadow-sm ${
            mode === "street" ? "bg-brand-dark text-white" : "bg-white/95 text-brand-dark"
          }`}
        >
          <MapIcon size={14} />
        </button>
        <button
          type="button"
          aria-label="จัดมุมมอง"
          onClick={fitDraft}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 text-brand-dark shadow-sm"
        >
          <LocateFixed size={14} />
        </button>
      </div>
    </div>
  );
}
