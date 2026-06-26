import { createHmac } from "node:crypto";
import { env } from "@/env";

/**
 * Privacy is the load-bearing requirement of this project (see Mission 4636's
 * post-mortem: a public crisis map exposed at-risk people). Helpers here exist
 * to make "private by default" the path of least resistance.
 */

/**
 * One-way, salted hash of a reporter's phone number. We store ONLY this, never
 * the raw number, so reporters can't be deanonymized from the database while we
 * can still dedupe/count distinct senders.
 */
export function hashReporter(phone: string): string {
  const normalized = phone.replace(/[^\d]/g, "");
  return createHmac("sha256", env.REPORTER_HASH_SECRET)
    .update(normalized)
    .digest("hex")
    .slice(0, 32);
}

// Patterns that should never reach a public surface.
const PHONE_RE = /(\+?\d[\d\s().-]{6,}\d)/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
// Venezuelan national ID ("cédula"), e.g. "V-12.345.678" / "E-9876543".
const CEDULA_RE = /\b[VEJPGve][-\s]?\d{1,2}\.?\d{3}\.?\d{3}\b/g;

/**
 * Strip obvious PII from free text before it can be shown publicly. This is a
 * safety net, not a substitute for the moderator authoring a clean `summary`.
 */
export function scrubPII(text: string): string {
  return text
    .replace(EMAIL_RE, "[correo oculto]")
    .replace(CEDULA_RE, "[cédula oculta]")
    .replace(PHONE_RE, "[número oculto]")
    .trim();
}

/**
 * Coarsen precise coordinates to a privacy-preserving public location by
 * snapping to a grid. Default ~0.02° ≈ 2.2 km cells: enough to be useful on a
 * map without pinpointing a specific home.
 */
export function coarsenCoords(
  lat: number,
  lng: number,
  cell = 0.02,
): { lat: number; lng: number } {
  const snap = (v: number) => Math.round(v / cell) * cell;
  return {
    lat: Number(snap(lat).toFixed(4)),
    lng: Number(snap(lng).toFixed(4)),
  };
}
