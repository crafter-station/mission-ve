import Link from "next/link";
import { redirect } from "next/navigation";
import { ReportCard } from "@/components/moderation/report-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getQueue, getStatusCounts } from "@/db/queries";
import { destroySession, getModerator } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cola de moderación · Misión Venezuela" };

async function logout() {
  "use server";
  await destroySession();
  redirect("/moderation/login");
}

export default async function ModerationPage() {
  const moderator = await getModerator();
  if (!moderator) redirect("/moderation/login");

  const [queue, counts] = await Promise.all([
    getQueue("pending"),
    getStatusCounts(),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Cola de moderación</h1>
          <p className="text-muted-foreground text-sm">
            Conectado como <span className="font-mono">{moderator}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">Ver mapa</Link>
          </Button>
          <form action={logout}>
            <Button type="submit" variant="outline" size="sm">
              Salir
            </Button>
          </form>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        {(["pending", "verified", "published", "rejected"] as const).map(
          (s) => (
            <Badge key={s} variant="secondary">
              {s}: {counts[s] ?? 0}
            </Badge>
          ),
        )}
      </div>

      {queue.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          No hay reportes pendientes. 🎉
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {queue.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </main>
  );
}
