"use client";

import { useState } from "react";
import { MapPinned } from "lucide-react";
import type { Plot } from "@/lib/api";

export function PlotThumb({ plot }: { plot: Pick<Plot, "previewUrl" | "name"> }) {
  const [failed, setFailed] = useState(false);
  const src = plot.previewUrl?.trim() || "";
  const showImage = Boolean(src) && !failed;

  return (
    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-card-tint text-brand">
      {showImage ? (
        // Native img: remote Storage URLs without Next image optimizer quirks.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={48}
          height={48}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="grid h-full w-full place-items-center">
          <MapPinned size={22} />
        </span>
      )}
    </span>
  );
}
