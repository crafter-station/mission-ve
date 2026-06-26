/**
 * Brand mark — a map pin rendered as a square-cornered diamond with a beacon
 * dot at its heart and a short stem grounding it to a location. Monochrome line
 * art in `currentColor`, square caps to match the sharp-cornered design system.
 * A located signal, not a flag.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-label="Reporte VE"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="square"
      strokeLinejoin="miter"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* pin head (square diamond) */}
      <path d="M12 3 L19 10 L12 17 L5 10 Z" />
      {/* beacon at the center */}
      <rect
        x="11"
        y="9"
        width="2"
        height="2"
        fill="currentColor"
        stroke="none"
      />
      {/* stem to the ground */}
      <path d="M12 17 V21" />
    </svg>
  );
}
