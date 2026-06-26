import Link from "next/link";
import { Brand } from "@/components/brand";
import { ReportMap } from "@/components/map/report-map";
import { Button } from "@/components/ui/button";
import { getPublicReports } from "@/db/queries";

// Always reflect the latest published reports.
export const dynamic = "force-dynamic";

export default async function Home() {
  // Last 14 days of published, PII-free reports.
  const initialReports = await getPublicReports({ sinceHours: 24 * 14 });

  return (
    <main className="relative flex h-screen flex-col overflow-hidden">
      <header className="z-20 flex h-14 items-center justify-between gap-2 border-b border-border bg-sidebar px-3 sm:px-4">
        <Brand href={null} />
        <div className="flex items-center gap-1.5">
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="hidden sm:inline-flex"
          >
            <Link href="/acerca">Acerca</Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="hidden sm:inline-flex"
          >
            <Link href="/moderation">Consola</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/reportar">Reportar</Link>
          </Button>
        </div>
      </header>

      <div className="relative flex-1">
        <ReportMap initialReports={initialReports} />
      </div>
    </main>
  );
}
