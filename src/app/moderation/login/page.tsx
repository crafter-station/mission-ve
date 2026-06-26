import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { checkPassword, createSession, getModerator } from "@/lib/auth";

export const metadata = { title: "Acceso de voluntarios · Reporte VE" };

async function login(formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "");
  const alias = String(formData.get("alias") ?? "").trim() || "voluntario";
  const next = String(formData.get("next") ?? "/moderation");

  if (!checkPassword(password)) {
    redirect("/moderation/login?error=1");
  }
  // The alias becomes the moderator's audit/verify identity.
  await createSession(alias.slice(0, 40));
  redirect(next.startsWith("/moderation") ? next : "/moderation");
}

const inputClass =
  "h-9 w-full border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  if (await getModerator()) redirect("/moderation");
  const { error, next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="flex size-11 items-center justify-center border border-border text-foreground">
            <BrandMark className="size-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-[20px] font-medium tracking-tight">
              Acceso de voluntarios
            </h1>
            <p className="text-[13px] text-muted-foreground">
              Consola de moderación. Solo personas autorizadas.
            </p>
          </div>
        </div>

        <form
          action={login}
          className="flex flex-col gap-4 border border-border bg-card p-6"
        >
          <input type="hidden" name="next" value={next ?? "/moderation"} />

          <div className="space-y-1.5">
            <label
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
              htmlFor="alias"
            >
              Alias
            </label>
            <input
              id="alias"
              name="alias"
              placeholder="p. ej. maria-caracas"
              className={inputClass}
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <label
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
              htmlFor="password"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className={inputClass}
            />
          </div>

          {error ? (
            <p className="border border-destructive/40 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
              Contraseña incorrecta.
            </p>
          ) : null}

          <Button type="submit" className="mt-1">
            Entrar
          </Button>
        </form>
      </div>
    </main>
  );
}
