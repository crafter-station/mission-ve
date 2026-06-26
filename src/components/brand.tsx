import Link from "next/link";
import { MissionMark } from "@/components/mission-mark";
import { cn } from "@/lib/utils";

/**
 * The brand lockup: a square bordered mark + wordmark + tagline. Used in the
 * header of every page. `href` makes the whole lockup a link back home.
 */
export function Brand({
  className,
  href = "/",
  tagline = "Mapa ciudadano de servicios",
}: {
  className?: string;
  href?: string | null;
  tagline?: string | null;
}) {
  const inner = (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex size-9 items-center justify-center border border-border bg-background text-foreground">
        <MissionMark className="size-[18px]" />
      </div>
      <div className="leading-tight">
        <div className="text-[13px] font-medium tracking-tight text-foreground">
          Misión Venezuela
        </div>
        {tagline ? (
          <div className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground min-[380px]:block">
            {tagline}
          </div>
        ) : null}
      </div>
    </div>
  );

  if (!href) return inner;
  return (
    <Link href={href} className="transition-opacity hover:opacity-80">
      {inner}
    </Link>
  );
}
