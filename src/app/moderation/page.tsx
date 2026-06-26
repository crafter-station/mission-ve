import Link from "next/link";
import { redirect } from "next/navigation";
import { ReportCard } from "@/components/moderation/report-card";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { getQueue, getStatusCounts } from "@/db/queries";
import { destroySession, getModerator } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Consola de moderación · Reporte VE" };

async function logout() {
  "use server";
  await destroySession();
  redirect("/moderation/login");
}

const STAT_LABELS: Record<string, string> = {
  pending: "Pendientes",
  verified: "Verificados",
  published: "Publicados",
  rejected: "Descartados",
};

export default async function ModerationPage() {
  const moderator = await getModerator();
  if (!moderator) redirect("/moderation/login");

  const [queue, counts] = await Promise.all([
    getQueue("pending"),
    getStatusCounts(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        tagline="Consola de moderación"
        right={
          <>
            <Button asChild size="sm" variant="ghost">
              <Link href="/">Ver mapa</Link>
            </Button>
            <form action={logout}>
              <Button type="submit" variant="outline" size="sm">
                Salir
              </Button>
            </form>
          </>
        }
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {/* Status stats */}
        <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
          {(["pending", "verified", "published", "rejected"] as const).map(
            (s) => (
              <div key={s} className="bg-card px-4 py-3">
                <div className="font-mono text-2xl font-medium tabular-nums tracking-tight">
                  {counts[s] ?? 0}
                </div>
                <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {STAT_LABELS[s]}
                </div>
              </div>
            ),
          )}
        </div>

        {/* Queue */}
        <div className="mt-6 mb-3 flex items-center justify-between">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Cola de revisión · {queue.length}
          </h2>
          <span className="font-mono text-[11px] text-muted-foreground">
            {moderator}
          </span>
        </div>

        {queue.length === 0 ? (
          <div className="flex flex-col items-center gap-1 border border-dashed border-border bg-card px-8 py-16 text-center">
            <p className="text-sm font-medium">Todo al día</p>
            <p className="text-[13px] text-muted-foreground">
              No hay reportes pendientes por revisar.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {queue.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                mediaUrls={report.media}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
