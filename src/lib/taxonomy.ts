/**
 * Misión Venezuela — domain taxonomy.
 *
 * Single source of truth for report categories, severity, workflow status, and
 * Venezuela's first-level administrative divisions. The DB schema, Zod
 * validators, and UI all derive from these constants so they can never drift.
 *
 * Modeled on Mission 4636's pipeline (ingest → categorize → geolocate →
 * verify → publish) but retargeted to chronic service-shortage mapping.
 */

// ── Categories ────────────────────────────────────────────────────────────
export const CATEGORIES = [
  "electricity",
  "water",
  "medicine",
  "food",
  "fuel",
  "telecoms",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  electricity: "Electricidad",
  water: "Agua",
  medicine: "Medicinas",
  food: "Alimentos",
  fuel: "Combustible",
  telecoms: "Telecomunicaciones",
  other: "Otro",
};

/** Emoji + accent color per category, used on the map and in the queue. */
export const CATEGORY_META: Record<Category, { emoji: string; color: string }> =
  {
    electricity: { emoji: "⚡", color: "#f59e0b" },
    water: { emoji: "💧", color: "#0ea5e9" },
    medicine: { emoji: "💊", color: "#ef4444" },
    food: { emoji: "🍞", color: "#84cc16" },
    fuel: { emoji: "⛽", color: "#8b5cf6" },
    telecoms: { emoji: "📶", color: "#14b8a6" },
    other: { emoji: "📍", color: "#6b7280" },
  };

/** True when `value` is one of the canonical taxonomy categories. */
export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

/**
 * Resolve meta for any category string. Reporters may submit free-text
 * categories that don't exist yet (moderators recategorize later); those fall
 * back to the neutral `other` accent until reclassified.
 */
export function categoryMeta(value: string): { emoji: string; color: string } {
  return isCategory(value) ? CATEGORY_META[value] : CATEGORY_META.other;
}

/** Human label for any category string — known label or the raw custom text. */
export function categoryLabel(value: string): string {
  return isCategory(value) ? CATEGORY_LABELS[value] : value;
}

// ── Severity ──────────────────────────────────────────────────────────────
export const SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_LABELS: Record<Severity, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
};

// ── Workflow status ───────────────────────────────────────────────────────
// pending     → just ingested, untouched
// in_review   → a moderator is structuring it
// verified    → structured + confirmed (needs N agreements before publish)
// published   → live on the public map (PII-scrubbed)
// rejected    → spam / not actionable
// duplicate   → merged into another report (see duplicateOf)
export const STATUSES = [
  "pending",
  "in_review",
  "verified",
  "published",
  "rejected",
  "duplicate",
] as const;
export type Status = (typeof STATUSES)[number];

// ── Intake sources ────────────────────────────────────────────────────────
export const SOURCES = ["whatsapp", "telegram", "web"] as const;
export type Source = (typeof SOURCES)[number];

// ── Venezuela first-level divisions (23 estados + Distrito Capital) ─────────
// Approximate capital/centroid coords used to default the map view and to
// snap public pins to a coarse location when a precise one isn't safe to show.
// La Guaira leads the list — it's the earthquake epicenter and the default
// focus of the map — the rest follow alphabetically.
export const ESTADOS = [
  { name: "La Guaira", lat: 10.6, lng: -66.93 },
  { name: "Amazonas", lat: 5.66, lng: -67.62 },
  { name: "Anzoátegui", lat: 10.13, lng: -64.68 },
  { name: "Apure", lat: 7.89, lng: -67.47 },
  { name: "Aragua", lat: 10.24, lng: -67.6 },
  { name: "Barinas", lat: 8.62, lng: -70.21 },
  { name: "Bolívar", lat: 8.12, lng: -63.55 },
  { name: "Carabobo", lat: 10.17, lng: -68.0 },
  { name: "Cojedes", lat: 9.66, lng: -68.58 },
  { name: "Delta Amacuro", lat: 9.06, lng: -62.04 },
  { name: "Distrito Capital", lat: 10.5, lng: -66.92 },
  { name: "Falcón", lat: 11.4, lng: -69.67 },
  { name: "Guárico", lat: 9.92, lng: -67.35 },
  { name: "Lara", lat: 10.07, lng: -69.32 },
  { name: "Mérida", lat: 8.6, lng: -71.14 },
  { name: "Miranda", lat: 10.31, lng: -66.85 },
  { name: "Monagas", lat: 9.75, lng: -63.18 },
  { name: "Nueva Esparta", lat: 11.0, lng: -63.87 },
  { name: "Portuguesa", lat: 9.55, lng: -69.2 },
  { name: "Sucre", lat: 10.45, lng: -64.17 },
  { name: "Táchira", lat: 7.77, lng: -72.22 },
  { name: "Trujillo", lat: 9.37, lng: -70.43 },
  { name: "Yaracuy", lat: 10.34, lng: -68.74 },
  { name: "Zulia", lat: 10.64, lng: -71.64 },
] as const;

export const ESTADO_NAMES = ESTADOS.map((e) => e.name);
export type EstadoName = (typeof ESTADOS)[number]["name"];

/** Geographic center of Venezuela — used when showing the whole country. */
export const VENEZUELA_CENTER = { lat: 7.5, lng: -66.0, zoom: 5.2 };

/**
 * Map pan limits, as Mapbox [[swLng, swLat], [neLng, neLat]]. Constrains the
 * map to Venezuela (plus a little padding) so you can never drift away from
 * the country.
 */
export const VENEZUELA_BOUNDS: [[number, number], [number, number]] = [
  [-74.5, 0.0],
  [-59.0, 13.2],
];

/** Zoom range: country overview ↔ street level. */
export const MAP_MIN_ZOOM = 5;
export const MAP_MAX_ZOOM = 19;

/**
 * La Guaira — coastal epicenter. The default map view opens framing the
 * La Guaira coastline through to Caracas, so the whole affected corridor and
 * its point detail are visible at once.
 */
export const LA_GUAIRA = { lat: 10.565, lng: -66.925, zoom: 11.8 };

export function estadoCentroid(
  name: string,
): { lat: number; lng: number } | null {
  const match = ESTADOS.find((e) => e.name === name);
  return match ? { lat: match.lat, lng: match.lng } : null;
}
