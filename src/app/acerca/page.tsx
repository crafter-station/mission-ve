import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { GithubBadge } from "@/components/github-badge";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Acerca · Reporte VE" };

const PIPELINE = [
  "Ingreso",
  "Clasificación",
  "Geolocalización",
  "Verificación",
  "Publicación",
];

const PRIVACY = [
  "Nunca almacenamos tu número de teléfono; solo un hash irreversible.",
  "Tu ubicación exacta jamás se publica: se muestra de forma aproximada.",
  "Cada reporte es revisado por voluntarios antes de aparecer en el mapa.",
  "Eliminamos automáticamente datos personales del texto público.",
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </div>
  );
}

export default function AcercaPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        right={
          <>
            <GithubBadge className="hidden sm:inline-flex" />
            <Button asChild size="sm" variant="ghost">
              <Link href="/">Mapa</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/reportar">Reportar</Link>
            </Button>
          </>
        }
      />

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <div className="space-y-3">
          <SectionLabel>Acerca del proyecto</SectionLabel>
          <h1 className="text-[28px] font-medium leading-tight tracking-tight">
            Un mapa ciudadano, abierto y privado por diseño.
          </h1>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            Reporte VE reúne reportes de la población para mapear cortes de
            electricidad y agua, y la escasez de medicinas, alimentos y
            combustible en todo el país — sin exponer a quien reporta.
          </p>
        </div>

        <div className="my-10 h-px bg-border" />

        <section className="space-y-4">
          <SectionLabel>Inspirado en Mission 4636</SectionLabel>
          <p className="text-[14px] leading-relaxed text-foreground/90">
            Tras el terremoto de Haití en 2010, miles de voluntarios de la
            diáspora tradujeron, clasificaron y geolocalizaron mensajes SMS para
            dirigir la ayuda. Adaptamos ese mismo flujo a la realidad
            venezolana: reportes por WhatsApp, procesados por una comunidad,
            mostrados en un mapa público.
          </p>
          <div className="flex flex-wrap items-center gap-x-1 gap-y-2 border border-border bg-card p-3">
            {PIPELINE.map((step, i) => (
              <div key={step} className="flex items-center gap-1">
                <span className="border border-border bg-background px-2 py-1 font-mono text-[11px] tracking-tight">
                  {step}
                </span>
                {i < PIPELINE.length - 1 ? (
                  <ArrowRight className="size-3 text-muted-foreground" />
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <div className="my-10 h-px bg-border" />

        <section className="space-y-4">
          <SectionLabel>Privacidad primero</SectionLabel>
          <ul className="divide-y divide-border border border-border bg-card">
            {PRIVACY.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 px-3 py-2.5 text-[14px] leading-relaxed"
              >
                <span className="mt-2 size-1.5 shrink-0 bg-foreground" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <div className="my-10 h-px bg-border" />

        <section className="space-y-3">
          <SectionLabel>Código abierto</SectionLabel>
          <p className="text-[14px] leading-relaxed text-foreground/90">
            Todo el proyecto es de código abierto. Puedes verlo, auditarlo y
            contribuir en{" "}
            <a
              className="text-foreground underline underline-offset-4 hover:opacity-80"
              href="https://github.com/crafter-station/mission-ve"
            >
              github.com/crafter-station/mission-ve
            </a>
            .
          </p>
        </section>

        <div className="mt-10 flex items-center gap-2">
          <Button asChild>
            <Link href="/reportar">Reportar un problema</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Ver el mapa</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
