"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Coords = { lat: number; lng: number };

export type GeoStatus =
  | "idle"
  | "prompting"
  | "granted"
  | "denied"
  | "unavailable";

// Cached for the session so the coords captured on the map flow straight into
// the report form without prompting the reporter a second time.
const CACHE_KEY = "mv:coords";

function readCache(): Coords | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Coords) : null;
  } catch {
    return null;
  }
}

function writeCache(coords: Coords): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(coords));
  } catch {
    /* sessionStorage may be unavailable (private mode) — non-fatal. */
  }
}

/**
 * Requests the reporter's location. Location is the single most valuable field
 * for a report, so by default we prompt the browser permission dialog
 * immediately on mount — but it's always optional: a denial just leaves
 * `coords` null and the report still submits.
 */
export function useGeolocation(auto = true) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<GeoStatus>("idle");
  // Guards against firing a second prompt while one is already in flight.
  const inFlight = useRef(false);

  const request = useCallback(() => {
    if (inFlight.current) return;
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }
    inFlight.current = true;
    setStatus("prompting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        setStatus("granted");
        writeCache(c);
        inFlight.current = false;
      },
      (err) => {
        setStatus(
          err.code === err.PERMISSION_DENIED ? "denied" : "unavailable",
        );
        inFlight.current = false;
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }, []);

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setCoords(cached);
      setStatus("granted");
      return;
    }
    if (auto) request();
  }, [auto, request]);

  return { coords, status, request };
}
