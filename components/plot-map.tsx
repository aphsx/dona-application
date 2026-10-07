"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { setWorkerUrl } from "maplibre-gl";
import Map, { Layer, NavigationControl, Source, type MapRef } from "react-map-gl/maplibre";
import { LocateFixed, Map as MapIcon, Satellite } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";

setWorkerUrl("/maplibre/maplibre-gl-worker.js");

export type PlotMapItem = {
  id: string;
  name: string;
  polygon: number[][];
};

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

function asRing(polygon: number[][]): [number, number][] {
  return polygon
    .map((point) => [Number(point[0]), Number(point[1])] as [number, number])
    .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));
}

function centroid(ring: [number, number][]) {
  if (ring.length === 0) return null;
  const lng = ring.reduce((sum, p) => sum + p[0], 0) / ring.length;
  const lat = ring.reduce((sum, p) => sum + p[1], 0) / ring.length;
  return { lng, lat };
}

export function PlotMap({
  plots,
  selectedId = null,
  focus = null,
  className = "",
}: {
  plots: PlotMapItem[];
  selectedId?: string | null;
  focus?: { lng: number; lat: number; zoom?: number } | null;
  className?: string;
}) {
  const mapRef = useRef<MapRef>(null);
  const [mode, setMode] = useState<"satellite" | "street">("satellite");
  const mapStyle = useMemo(
    () => (mode === "satellite" ? structuredClone(satelliteStyle) : "https://tiles.openfreemap.org/styles/positron"),
    [mode],
  );

  const drawn = useMemo(
    () =>
      plots
        .map((plot) => ({ ...plot, ring: asRing(plot.polygon) }))
        .filter((plot) => plot.ring.length >= 4),
    [plots],
  );

  const data = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: drawn.map((plot) => ({
        type: "Feature" as const,
        properties: { id: plot.id, name: plot.name },
        geometry: { type: "Polygon" as const, coordinates: [plot.ring] },
      })),
    }),
    [drawn],
  );

  const frameKey = `${selectedId ?? ""}|${mode}|${drawn.map((p) => p.id).join(",")}|${focus?.lng ?? ""}:${focus?.lat ?? ""}`;

  function fitFrame() {
    const map = mapRef.current;
    if (!map) return;

    const subject = selectedId ? drawn.filter((plot) => plot.id === selectedId) : drawn;
    if (subject.length === 0) {
      if (focus) {
        map.flyTo({
          center: [focus.lng, focus.lat],
          zoom: focus.zoom ?? 14,
          duration: 450,
        });
      }
      return;
    }

    const lngs = subject.flatMap((plot) => plot.ring.map((point) => point[0]));
    const lats = subject.flatMap((plot) => plot.ring.map((point) => point[1]));
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 48, duration: 450, maxZoom: 17 },
    );
  }

  useEffect(() => {
    fitFrame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameKey]);

  const selected = drawn.find((plot) => plot.id === selectedId) ?? null;
  const selectedCenter = selected ? centroid(selected.ring) : null;

  return (
    <div className={`relative min-h-0 overflow-hidden ${className}`}>
      <Map
        ref={mapRef}
        style={{ width: "100%", height: "100%" }}
        initialViewState={{
          longitude: focus?.lng ?? selectedCenter?.lng ?? 100.9925,
          latitude: focus?.lat ?? selectedCenter?.lat ?? 15.87,
          zoom: focus?.zoom ?? 6,
        }}
        maxZoom={20}
        mapStyle={mapStyle}
        onLoad={fitFrame}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <Source id="plots" type="geojson" data={data}>
          <Layer
            id="plot-fill"
            type="fill"
            paint={{
              "fill-color": "#1d8a6a",
              "fill-opacity": 0.45,
            }}
          />
          <Layer
            id="plot-line"
            type="line"
            paint={{
              "line-color": "#f4c35d",
              "line-width": 2.5,
            }}
          />
        </Source>
      </Map>

      <div className="absolute left-3 top-3 z-10 flex gap-1.5">
        <button
          type="button"
          aria-label="ภาพถ่าย"
          onClick={() => setMode("satellite")}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${
            mode === "satellite" ? "bg-brand-dark text-white" : "bg-white text-brand-dark"
          }`}
        >
          <Satellite size={14} />
        </button>
        <button
          type="button"
          aria-label="ถนน"
          onClick={() => setMode("street")}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${
            mode === "street" ? "bg-brand-dark text-white" : "bg-white text-brand-dark"
          }`}
        >
          <MapIcon size={14} />
        </button>
        <button
          type="button"
          aria-label="จัดขอบเขตแปลง"
          onClick={fitFrame}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-brand-dark"
        >
          <LocateFixed size={14} />
        </button>
      </div>
    </div>
  );
}
