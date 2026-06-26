"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { Crosshair } from "lucide-react";
import mapboxgl from "mapbox-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PublicReport } from "@/db/schema";
import { env } from "@/env";
import { PUBLIC_REPORTS_CHANNEL, type ReportEvent } from "@/lib/realtime";
import { createClient } from "@/lib/supabase/client";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_META,
  type Category,
  LA_GUAIRA,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  SEVERITY_LABELS,
  type Severity,
  VENEZUELA_BOUNDS,
} from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

mapboxgl.accessToken = env.NEXT_PUBLIC_MAPBOX_TOKEN;

const DEFAULT_STYLE =
  env.NEXT_PUBLIC_MAP_STYLE_URL ?? "mapbox://styles/mapbox/dark-v11";

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c] as string,
  );
}

function markerEl(report: PublicReport): HTMLElement {
  const meta = CATEGORY_META[(report.category as Category) ?? "other"];
  const el = document.createElement("div");
  el.style.cssText = `
    display:flex;align-items:center;justify-content:center;
    width:26px;height:26px;border-radius:9999px;cursor:pointer;
    background:${meta.color};color:#fff;font-size:13px;line-height:1;
    box-shadow:0 2px 6px rgba(0,0,0,.45);
    border:2px solid rgba(255,255,255,.92);
    transition:transform .12s ease;`;
  el.textContent = meta.emoji;
  el.title = report.summary ?? "";
  el.addEventListener("mouseenter", () => {
    el.style.transform = "scale(1.18)";
  });
  el.addEventListener("mouseleave", () => {
    el.style.transform = "scale(1)";
  });
  return el;
}

function popupHtml(r: PublicReport): string {
  const cat = (r.category as Category) ?? "other";
  const meta = CATEGORY_META[cat];
  const sev = r.severity
    ? (SEVERITY_LABELS[r.severity as Severity] ?? r.severity)
    : null;
  const loc = [r.parroquia, r.municipio, r.estado].filter(Boolean).join(", ");
  return `
    <div class="mv-pop-title">
      <span class="mv-pop-dot" style="background:${meta.color}"></span>
      ${CATEGORY_LABELS[cat]}
      ${sev ? `<span class="mv-pop-sev">· ${escapeHtml(sev)}</span>` : ""}
    </div>
    ${r.summary ? `<div class="mv-pop-body">${escapeHtml(r.summary)}</div>` : ""}
    ${loc ? `<div class="mv-pop-loc">${escapeHtml(loc)}</div>` : ""}`;
}

export function ReportMap({
  initialReports,
}: {
  initialReports: PublicReport[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [active, setActive] = useState<Set<Category>>(new Set(CATEGORIES));
  const [reports, setReports] = useState<PublicReport[]>(initialReports);

  // Initialize the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: DEFAULT_STYLE,
      // Open at the La Guaira epicenter, at street level.
      center: [LA_GUAIRA.lng, LA_GUAIRA.lat],
      zoom: LA_GUAIRA.zoom,
      // Never let the view leave Venezuela.
      maxBounds: VENEZUELA_BOUNDS,
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      attributionControl: false,
    });
    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right",
    );
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right",
    );
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Live updates: append newly published reports as they happen.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(PUBLIC_REPORTS_CHANNEL)
      .on("broadcast", { event: "report-event" }, ({ payload }) => {
        const evt = payload as ReportEvent;
        if (evt.type === "report:published") {
          setReports((prev) =>
            prev.some((r) => r.id === evt.report.id)
              ? prev
              : [evt.report, ...prev],
          );
        } else if (evt.type === "report:removed") {
          setReports((prev) => prev.filter((r) => r.id !== evt.id));
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const visible = useMemo(
    () =>
      reports.filter(
        (r) =>
          r.lat != null &&
          r.lng != null &&
          active.has((r.category as Category) ?? "other"),
      ),
    [reports, active],
  );

  // Per-category counts for the legend (independent of the active filter).
  const counts = useMemo(() => {
    const c = {} as Record<Category, number>;
    for (const cat of CATEGORIES) c[cat] = 0;
    for (const r of reports) {
      if (r.lat == null || r.lng == null) continue;
      c[(r.category as Category) ?? "other"]++;
    }
    return c;
  }, [reports]);

  // Reconcile markers with the visible set.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = markersRef.current;
    const next = new Set(visible.map((r) => r.id));

    for (const [id, marker] of markers) {
      if (!next.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }
    for (const r of visible) {
      if (markers.has(r.id) || r.lat == null || r.lng == null) continue;
      const popup = new mapboxgl.Popup({
        offset: 16,
        closeButton: false,
      }).setHTML(popupHtml(r));
      const marker = new mapboxgl.Marker({ element: markerEl(r) })
        .setLngLat([r.lng, r.lat])
        .setPopup(popup)
        .addTo(map);
      markers.set(r.id, marker);
    }
  }, [visible]);

  function toggle(cat: Category) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function focusLaGuaira() {
    mapRef.current?.flyTo({
      center: [LA_GUAIRA.lng, LA_GUAIRA.lat],
      zoom: LA_GUAIRA.zoom,
      duration: 1200,
      essential: true,
    });
  }

  function focusCountry() {
    mapRef.current?.fitBounds(VENEZUELA_BOUNDS, {
      padding: 32,
      duration: 1200,
    });
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {/* Legend / category filter */}
      <div className="absolute left-3 top-3 z-10 w-[212px] border border-border bg-card/95 backdrop-blur">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Capas
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {visible.length}/{reports.length}
          </span>
        </div>
        <div className="flex flex-col">
          {CATEGORIES.map((cat) => {
            const on = active.has(cat);
            const meta = CATEGORY_META[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggle(cat)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-1.5 text-left text-[12px] transition-colors hover:bg-accent",
                  on ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span
                  className="size-2.5 shrink-0 border border-black/10"
                  style={{
                    backgroundColor: meta.color,
                    opacity: on ? 1 : 0.25,
                  }}
                />
                <span className="flex-1">{CATEGORY_LABELS[cat]}</span>
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  {counts[cat]}
                </span>
              </button>
            );
          })}
        </div>
        {/* Quick views */}
        <div className="grid grid-cols-2 gap-px border-t border-border bg-border">
          <button
            type="button"
            onClick={focusLaGuaira}
            className="flex items-center justify-center gap-1.5 bg-card px-2 py-2 text-[11px] text-foreground transition-colors hover:bg-accent"
          >
            <Crosshair className="size-3" />
            Epicentro
          </button>
          <button
            type="button"
            onClick={focusCountry}
            className="bg-card px-2 py-2 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Todo el país
          </button>
        </div>
      </div>

      {/* Live indicator */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 border border-border bg-card/95 px-2.5 py-1.5 backdrop-blur">
        <span className="relative flex size-2 items-center justify-center">
          <span
            className="absolute size-2 rounded-full bg-emerald-500"
            style={{ animation: "mv-pulse 2.2s ease-out infinite" }}
          />
          <span className="size-1.5 rounded-full bg-emerald-500" />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
          {visible.length} en vivo
        </span>
      </div>
    </div>
  );
}
