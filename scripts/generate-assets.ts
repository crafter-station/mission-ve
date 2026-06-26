/**
 * Brand asset generator — Reporte VE.
 *
 * Renders the OpenGraph / Twitter share cards and the multi-size favicon from
 * the same source of truth as the app: the BrandMark glyph and the dark,
 * monochrome design tokens. Pure SVG → PNG via sharp, so output stays crisp.
 *
 * Idempotent: re-run any time the brand changes.
 *   bun run assets:generate
 *
 * Outputs:
 *   public/og.png            1200×630  (OpenGraph)
 *   public/og-twitter.png    1200×600  (Twitter summary_large_image)
 *   src/app/favicon.ico      16/32/48  (Next 16 App Router favicon)
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import pngToIco from "png-to-ico";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");

// ── Design tokens (mirror src/app/globals.css `.dark` + taxonomy accents) ────
const C = {
  bg: "#121212", // canvas
  panel: "#181818", // card
  border: "#2c2c2c", // hairline
  fg: "#f4f4f4", // foreground
  muted: "#8f8f8f", // muted-foreground
};

// The single splash of colour — category accents from src/lib/taxonomy.ts.
const CATEGORY_COLORS = [
  "#f59e0b", // electricity
  "#0ea5e9", // water
  "#ef4444", // medicine
  "#84cc16", // food
  "#8b5cf6", // fuel
  "#14b8a6", // telecoms
  "#6b7280", // other
];

/**
 * The BrandMark glyph (square diamond pin + beacon + stem), as inner SVG.
 * Mirrors src/components/brand-mark.tsx. `t`/`s` place it inside a 24-unit
 * box; `stroke`/`w` control colour and weight.
 */
function markPaths(stroke: string, w = 1.6): string {
  return `
    <path d="M12 3 L19 10 L12 17 L5 10 Z" fill="none" stroke="${stroke}"
      stroke-width="${w}" stroke-linecap="square" stroke-linejoin="miter" />
    <rect x="11" y="9" width="2" height="2" fill="${stroke}" />
    <path d="M12 17 V21" fill="none" stroke="${stroke}"
      stroke-width="${w}" stroke-linecap="square" stroke-linejoin="miter" />`;
}

// ── Share card ───────────────────────────────────────────────────────────────
function cardSvg(width: number, height: number): string {
  const pad = 64;
  const markBox = 104;
  const cx = 90; // content left edge

  // Vertically centre the lockup stack.
  const stackH = markBox + 34 + 60 + 22 + 30 + 30 + 14;
  const top = Math.round((height - stackH) / 2);

  const titleY = top + markBox + 34 + 56;
  const tagY = titleY + 40;
  const dotsY = tagY + 28;

  // Sparse graticule — a faint map grid, the only texture.
  const lines: string[] = [];
  for (let x = 120; x < width; x += 120) {
    lines.push(
      `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="#ffffff" stroke-opacity="0.022" stroke-width="1" />`,
    );
  }
  for (let y = 105; y < height; y += 105) {
    lines.push(
      `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#ffffff" stroke-opacity="0.022" stroke-width="1" />`,
    );
  }

  const dots = CATEGORY_COLORS.map(
    (color, i) =>
      `<rect x="${cx + i * 26}" y="${dotsY}" width="13" height="13" fill="${color}" />`,
  ).join("");

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"
    xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="${C.bg}" />
  ${lines.join("")}

  <!-- inset frame -->
  <rect x="${pad}" y="${pad}" width="${width - pad * 2}" height="${height - pad * 2}"
    fill="none" stroke="${C.border}" stroke-width="1" />

  <!-- mark in a bordered square (echoes the in-app Brand lockup) -->
  <rect x="${cx}" y="${top}" width="${markBox}" height="${markBox}"
    fill="${C.panel}" stroke="${C.border}" stroke-width="1.5" />
  <g transform="translate(${cx + markBox * 0.26}, ${top + markBox * 0.26}) scale(${(markBox * 0.48) / 24})">
    ${markPaths(C.fg, 1.6)}
  </g>

  <!-- wordmark -->
  <text x="${cx}" y="${titleY}" fill="${C.fg}"
    font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
    font-size="60" font-weight="600" letter-spacing="-1.5">Reporte VE</text>

  <!-- tagline -->
  <text x="${cx + 2}" y="${tagY}" fill="${C.muted}"
    font-family="'SF Mono', 'Menlo', ui-monospace, monospace"
    font-size="21" letter-spacing="3" font-weight="400">MAPA CIUDADANO · PRIVADO POR DISEÑO</text>

  ${dots}

  <!-- footer url -->
  <text x="${cx + 1}" y="${height - pad - 22}" fill="${C.muted}"
    font-family="'SF Mono', 'Menlo', ui-monospace, monospace"
    font-size="20" letter-spacing="1.5">ve.crafter.run</text>
</svg>`;
}

// ── Favicon ──────────────────────────────────────────────────────────────────
function faviconSvg(): string {
  // 256-unit canvas; mark centred with padding, bold stroke for tiny sizes.
  const pad = 52;
  const scale = (256 - pad * 2) / 24;
  return `<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <rect width="256" height="256" fill="${C.bg}" />
  <rect x="8" y="8" width="240" height="240" fill="none" stroke="${C.border}" stroke-width="6" />
  <g transform="translate(${pad}, ${pad}) scale(${scale})">
    ${markPaths(C.fg, 2)}
  </g>
</svg>`;
}

async function svgToPng(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main() {
  await mkdir(path.join(ROOT, "public"), { recursive: true });

  // OG + Twitter cards.
  const og = await svgToPng(cardSvg(1200, 630));
  await writeFile(path.join(ROOT, "public/og.png"), og);
  console.log("✓ public/og.png            1200×630");

  const tw = await svgToPng(cardSvg(1200, 600));
  await writeFile(path.join(ROOT, "public/og-twitter.png"), tw);
  console.log("✓ public/og-twitter.png    1200×600");

  // Favicon — render once, downscale to the classic ICO sizes.
  const faviconBase = Buffer.from(faviconSvg());
  const sizes = [16, 32, 48];
  const pngs = await Promise.all(
    sizes.map((s) =>
      sharp(faviconBase).resize(s, s, { fit: "cover" }).png().toBuffer(),
    ),
  );
  const ico = await pngToIco(pngs);
  await writeFile(path.join(ROOT, "src/app/favicon.ico"), ico);
  console.log("✓ src/app/favicon.ico      16/32/48");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
