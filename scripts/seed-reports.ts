/**
 * Seed sample published reports — Reporte VE.
 *
 * Populates the public map with realistic, PII-free demo points so the
 * clustering, category colors, and multi-category popups can be evaluated.
 * Heavily weighted to the La Guaira → Caracas corridor (the earthquake
 * epicenter) so the cluster behavior is visible at the default zoom.
 *
 * Idempotent: every row id is prefixed `seed_`, and the script clears the
 * previous batch before inserting, so it's safe to re-run. To remove the demo
 * data entirely:  delete from reports where id like 'seed_%';
 *
 *   bun --env-file=.env.local scripts/seed-reports.ts
 */
import { like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { type NewReport, reports } from "../src/db/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("✗ DATABASE_URL is missing — run with --env-file=.env.local");
  process.exit(1);
}

// Places, weighted by `n` — the corridor around La Guaira/Caracas dominates so
// clusters form at the default view; secondary cities give national context.
const PLACES = [
  {
    estado: "La Guaira",
    municipio: "Vargas",
    parroquia: "Maiquetía",
    lat: 10.601,
    lng: -66.972,
    n: 3,
  },
  {
    estado: "La Guaira",
    municipio: "Vargas",
    parroquia: "Catia La Mar",
    lat: 10.597,
    lng: -67.03,
    n: 3,
  },
  {
    estado: "La Guaira",
    municipio: "Vargas",
    parroquia: "La Guaira",
    lat: 10.602,
    lng: -66.931,
    n: 3,
  },
  {
    estado: "La Guaira",
    municipio: "Vargas",
    parroquia: "Macuto",
    lat: 10.607,
    lng: -66.886,
    n: 2,
  },
  {
    estado: "La Guaira",
    municipio: "Vargas",
    parroquia: "Caraballeda",
    lat: 10.612,
    lng: -66.851,
    n: 2,
  },
  {
    estado: "La Guaira",
    municipio: "Vargas",
    parroquia: "Naiguatá",
    lat: 10.617,
    lng: -66.74,
    n: 2,
  },
  {
    estado: "Distrito Capital",
    municipio: "Libertador",
    parroquia: "El Paraíso",
    lat: 10.498,
    lng: -66.928,
    n: 2,
  },
  {
    estado: "Distrito Capital",
    municipio: "Libertador",
    parroquia: "Catia",
    lat: 10.515,
    lng: -66.93,
    n: 2,
  },
  {
    estado: "Distrito Capital",
    municipio: "Libertador",
    parroquia: "El Valle",
    lat: 10.46,
    lng: -66.9,
    n: 2,
  },
  {
    estado: "Miranda",
    municipio: "Sucre",
    parroquia: "Petare",
    lat: 10.477,
    lng: -66.81,
    n: 3,
  },
  {
    estado: "Miranda",
    municipio: "Chacao",
    parroquia: "Chacao",
    lat: 10.497,
    lng: -66.853,
    n: 1,
  },
  {
    estado: "Miranda",
    municipio: "Baruta",
    parroquia: "Baruta",
    lat: 10.432,
    lng: -66.875,
    n: 1,
  },
  {
    estado: "Zulia",
    municipio: "Maracaibo",
    parroquia: "Maracaibo",
    lat: 10.654,
    lng: -71.64,
    n: 2,
  },
  {
    estado: "Carabobo",
    municipio: "Valencia",
    parroquia: "Valencia",
    lat: 10.168,
    lng: -68.0,
    n: 2,
  },
  {
    estado: "Lara",
    municipio: "Iribarren",
    parroquia: "Barquisimeto",
    lat: 10.066,
    lng: -69.347,
    n: 1,
  },
  {
    estado: "Aragua",
    municipio: "Girardot",
    parroquia: "Maracay",
    lat: 10.246,
    lng: -67.596,
    n: 1,
  },
  {
    estado: "Bolívar",
    municipio: "Caroní",
    parroquia: "Ciudad Guayana",
    lat: 8.354,
    lng: -62.65,
    n: 1,
  },
  {
    estado: "Táchira",
    municipio: "San Cristóbal",
    parroquia: "San Cristóbal",
    lat: 7.767,
    lng: -72.225,
    n: 1,
  },
  {
    estado: "Mérida",
    municipio: "Libertador",
    parroquia: "Mérida",
    lat: 8.595,
    lng: -71.144,
    n: 1,
  },
  {
    estado: "Anzoátegui",
    municipio: "Sotillo",
    parroquia: "Puerto La Cruz",
    lat: 10.213,
    lng: -64.617,
    n: 1,
  },
  {
    estado: "Sucre",
    municipio: "Sucre",
    parroquia: "Cumaná",
    lat: 10.454,
    lng: -64.177,
    n: 1,
  },
  {
    estado: "Monagas",
    municipio: "Maturín",
    parroquia: "Maturín",
    lat: 9.748,
    lng: -63.176,
    n: 1,
  },
];

// Report "profiles": a primary category, optional extra categories (multi-tag),
// some with a free-text custom label that doesn't exist in the taxonomy yet.
const PROFILES: {
  category: string;
  extra: string[];
  severity: string;
  custom?: string;
}[] = [
  { category: "electricity", extra: [], severity: "high" },
  { category: "water", extra: [], severity: "high" },
  { category: "electricity", extra: ["water"], severity: "critical" },
  { category: "medicine", extra: [], severity: "critical" },
  { category: "food", extra: [], severity: "medium" },
  { category: "fuel", extra: [], severity: "high" },
  { category: "telecoms", extra: ["electricity"], severity: "medium" },
  { category: "water", extra: ["medicine"], severity: "high" },
  { category: "other", extra: [], severity: "low", custom: "Gas doméstico" },
  {
    category: "other",
    extra: ["food"],
    severity: "medium",
    custom: "Recolección de basura",
  },
  { category: "electricity", extra: ["telecoms"], severity: "high" },
  { category: "fuel", extra: ["food"], severity: "medium" },
  {
    category: "other",
    extra: [],
    severity: "low",
    custom: "Transporte público",
  },
];

const SUMMARY: Record<string, (p: string) => string> = {
  electricity: (p) =>
    `Sin electricidad desde hace más de 18 horas en ${p}. Hogares y comercios afectados.`,
  water: (p) =>
    `Más de cuatro días sin agua por tubería en ${p}; las familias dependen de cisternas.`,
  medicine: (p) =>
    `Farmacias de ${p} sin insulina ni antibióticos básicos disponibles.`,
  food: (p) =>
    `Escasez de harina, aceite y otros alimentos básicos en los abastos de ${p}.`,
  fuel: (p) => `Cola de más de seis horas para surtir gasolina en ${p}.`,
  telecoms: (p) =>
    `Sin señal de internet ni telefonía móvil en ${p} desde anoche.`,
  other: (p) => `Servicio público interrumpido en ${p}.`,
};

const jitter = () => (Math.random() - 0.5) * 0.012; // ≈ ±0.65 km
const round4 = (v: number) => Number(v.toFixed(4));

function buildRows(): NewReport[] {
  const rows: NewReport[] = [];
  let i = 0;
  for (const place of PLACES) {
    for (let k = 0; k < place.n; k++) {
      const profile = PROFILES[i % PROFILES.length];
      const summaryFn = SUMMARY[profile.category] ?? SUMMARY.other;
      const summary = profile.custom
        ? `${profile.custom} interrumpido en ${place.parroquia}, ${place.estado}.`
        : summaryFn(`${place.parroquia}, ${place.estado}`);
      // Reporter-tagged categories: custom label leads when present.
      const categories = Array.from(
        new Set(
          profile.custom
            ? [profile.custom, ...profile.extra]
            : [profile.category, ...profile.extra],
        ),
      );

      const ageHours = Math.floor(Math.random() * 12 * 24); // last ~12 days
      const publishedAt = new Date(Date.now() - ageHours * 3_600_000);
      const createdAt = new Date(publishedAt.getTime() - 2 * 3_600_000);

      rows.push({
        id: `seed_${String(i + 1).padStart(3, "0")}`,
        source: "web",
        rawText: summary,
        category: profile.category as NewReport["category"],
        categories,
        severity: profile.severity as NewReport["severity"],
        summary,
        estado: place.estado,
        municipio: place.municipio,
        parroquia: place.parroquia,
        // Precise coords stay internal/null — only the coarse public point.
        publicLat: round4(place.lat + jitter()),
        publicLng: round4(place.lng + jitter()),
        status: "published",
        publishedAt,
        createdAt,
        updatedAt: publishedAt,
      });
      i++;
    }
  }
  return rows;
}

async function main() {
  const client = postgres(DATABASE_URL as string, { prepare: false, max: 1 });
  const db = drizzle(client);
  try {
    const rows = buildRows();
    const cleared = await db
      .delete(reports)
      .where(like(reports.id, "seed_%"))
      .returning({ id: reports.id });
    await db.insert(reports).values(rows);
    console.log(
      `✓ Cleared ${cleared.length} previous seed rows, inserted ${rows.length} published sample reports.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
