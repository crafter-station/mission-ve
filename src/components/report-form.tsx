"use client";

import {
  Check,
  Crosshair,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_META,
  categoryMeta,
  ESTADO_NAMES,
} from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 3;

type Photo = { file: File; url: string };

/**
 * Resize + re-encode an image on the client. Drawing to a canvas drops ALL
 * metadata (EXIF, GPS) — so a photo can never leak the reporter's location.
 */
async function processImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const MAX = 1600;
  const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.82),
  );
  if (!blob) return file;
  return new File([blob], "foto.webp", { type: "image/webp" });
}

export function ReportForm({ photosEnabled }: { photosEnabled: boolean }) {
  const [text, setText] = useState("");
  // A report can span several services at once. `categories` holds canonical
  // taxonomy keys plus any free-text labels the reporter adds for "otro".
  const [categories, setCategories] = useState<string[]>([]);
  const [customCat, setCustomCat] = useState("");
  const [estado, setEstado] = useState<string>("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [processing, setProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Revoke object URLs on unmount to avoid leaks.
  useEffect(() => {
    return () => {
      for (const p of photos) URL.revokeObjectURL(p.url);
    };
  }, [photos]);

  function locate() {
    if (!navigator.geolocation) {
      toast.error("Tu navegador no permite ubicación.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success("Ubicación añadida (se mostrará de forma aproximada).");
      },
      () => toast.error("No pudimos obtener tu ubicación."),
    );
  }

  function toggleCategory(c: string) {
    setCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  }

  function addCustom() {
    const label = customCat.trim();
    if (!label) return;
    if (label.length > 40) {
      toast.error("Esa categoría es muy larga.");
      return;
    }
    const exists = categories.some(
      (c) => c.toLowerCase() === label.toLowerCase(),
    );
    if (!exists) setCategories((prev) => [...prev, label]);
    setCustomCat("");
  }

  async function addPhotos(list: FileList | null) {
    if (!list?.length) return;
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      toast.error(`Máximo ${MAX_PHOTOS} fotos.`);
      return;
    }
    setProcessing(true);
    try {
      const incoming = Array.from(list)
        .filter((f) => f.type.startsWith("image/"))
        .slice(0, room);
      const processed = await Promise.all(
        incoming.map(async (f) => {
          const file = await processImage(f);
          return { file, url: URL.createObjectURL(file) };
        }),
      );
      setPhotos((prev) => [...prev, ...processed]);
    } finally {
      setProcessing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => {
      const next = [...prev];
      const [gone] = next.splice(idx, 1);
      if (gone) URL.revokeObjectURL(gone.url);
      return next;
    });
  }

  function reset() {
    for (const p of photos) URL.revokeObjectURL(p.url);
    setTicket(null);
    setText("");
    setCategories([]);
    setCustomCat("");
    setEstado("");
    setCoords(null);
    setPhotos([]);
  }

  async function submit() {
    if (text.trim().length < 3) {
      toast.error("Cuéntanos qué está pasando.");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("text", text);
      for (const c of categories) fd.append("categories", c);
      if (estado) fd.append("estado", estado);
      if (coords) {
        fd.append("lat", String(coords.lat));
        fd.append("lng", String(coords.lng));
      }
      for (const p of photos) fd.append("photos", p.file);

      const res = await fetch("/api/reports", { method: "POST", body: fd });
      if (!res.ok) throw new Error("submit failed");
      const { id } = (await res.json()) as { id: string };
      for (const p of photos) URL.revokeObjectURL(p.url);
      setTicket(id);
    } catch {
      toast.error("No se pudo enviar. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (ticket) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader
          right={
            <Button asChild size="sm" variant="ghost">
              <Link href="/">Ver mapa</Link>
            </Button>
          }
        />
        <main className="flex flex-1 items-center justify-center p-0 sm:p-4">
          <div className="w-full border-y border-border bg-card sm:max-w-[420px] sm:border">
            <div className="flex flex-col items-center gap-4 border-b border-border px-6 py-8 text-center">
              <div className="flex size-11 items-center justify-center border border-emerald-500/40 text-emerald-500">
                <Check className="size-5" />
              </div>
              <div className="space-y-1">
                <h1 className="text-[18px] font-medium tracking-tight">
                  Reporte recibido
                </h1>
                <p className="text-[13px] text-muted-foreground">
                  Gracias por ayudar a tu comunidad.
                </p>
              </div>
              <div className="flex items-center gap-2 border border-border bg-background px-3 py-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Folio
                </span>
                <span className="font-mono text-sm font-medium tracking-tight">
                  {ticket}
                </span>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Un equipo de voluntarios lo revisará. Si procede, aparecerá en
                el mapa público{" "}
                <span className="text-foreground">
                  sin tus datos personales
                </span>
                . Nunca compartimos tu identidad ni tu ubicación exacta.
              </p>
            </div>
            <div className="flex gap-2 border-t border-border p-4">
              <Button asChild variant="outline" className="flex-1">
                <Link href="/">Ver el mapa</Link>
              </Button>
              <Button className="flex-1" onClick={reset}>
                Otro reporte
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        right={
          <Button asChild size="sm" variant="ghost">
            <Link href="/">Ver mapa</Link>
          </Button>
        }
      />
      <main className="flex flex-1 flex-col p-0 sm:items-center sm:justify-center sm:p-4">
        <div className="flex w-full flex-1 flex-col border-border bg-card sm:max-w-[460px] sm:flex-none sm:border">
          <div className="border-b border-border px-5 py-5 sm:px-6">
            <h1 className="text-[19px] font-semibold tracking-tight sm:text-[18px]">
              Reportar un problema
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Cortes de luz o agua, escasez de medicinas, alimentos o
              combustible. Es anónimo.
            </p>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:space-y-5 sm:px-6">
            <div className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                ¿Qué está pasando?
              </span>
              <Textarea
                placeholder="Ej: Sin luz desde hace 2 días en El Paraíso, Caracas."
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Categorías
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  Puedes elegir varias
                </span>
              </div>
              <div className="grid grid-cols-2 gap-px border border-border bg-border">
                {CATEGORIES.map((c) => {
                  const on = categories.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCategory(c)}
                      className={cn(
                        "flex min-h-12 items-center gap-2 px-3 py-2.5 text-left text-[13px] transition-colors",
                        on
                          ? "bg-secondary text-foreground"
                          : "bg-card text-muted-foreground hover:bg-accent active:bg-accent",
                      )}
                    >
                      <span
                        className="size-2.5 shrink-0 border border-black/10"
                        style={{
                          backgroundColor: CATEGORY_META[c].color,
                          opacity: on ? 1 : 0.5,
                        }}
                      />
                      <span className="flex-1">{CATEGORY_LABELS[c]}</span>
                      {on ? <Check className="size-3.5" /> : null}
                    </button>
                  );
                })}
              </div>

              {/* Custom / not-yet-listed categories — recategorized later. */}
              <div className="flex items-center gap-px border border-border bg-border">
                <input
                  value={customCat}
                  onChange={(e) => setCustomCat(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustom();
                    }
                  }}
                  placeholder="¿Otra? Escríbela y añádela"
                  maxLength={40}
                  className="h-11 flex-1 bg-card px-3 text-[13px] outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={addCustom}
                  className="flex h-11 items-center gap-1 bg-card px-3 text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Plus className="size-3.5" />
                  Añadir
                </button>
              </div>

              {/* Selected chips — shows the full picked set, custom included. */}
              {categories.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {categories.map((c) => {
                    const meta = categoryMeta(c);
                    const label =
                      CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS] ?? c;
                    return (
                      <span
                        key={c}
                        className="flex items-center gap-1.5 border border-border bg-background py-1 pl-2 pr-1 text-[12px]"
                      >
                        <span
                          className="size-2 shrink-0"
                          style={{ backgroundColor: meta.color }}
                        />
                        {label}
                        <button
                          type="button"
                          onClick={() => toggleCategory(c)}
                          className="text-muted-foreground transition-colors hover:text-foreground"
                          aria-label={`Quitar ${label}`}
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Estado
              </span>
              <Select value={estado} onValueChange={setEstado}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona tu estado" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADO_NAMES.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Photos — optional supporting evidence. Stripped of metadata in
                the browser and kept private until a moderator approves one. */}
            {photosEnabled ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    Fotos
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {photos.length}/{MAX_PHOTOS} · opcional
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((p, i) => (
                    <div
                      key={p.url}
                      className="group relative aspect-square overflow-hidden border border-border bg-background"
                    >
                      {/* biome-ignore lint/performance/noImgElement: local blob preview */}
                      <img
                        src={p.url}
                        alt={`Adjunto ${i + 1}`}
                        className="size-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute right-1 top-1 flex size-7 items-center justify-center border border-border bg-background/90 text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Quitar foto"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                  {photos.length < MAX_PHOTOS ? (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={processing}
                      className="flex aspect-square flex-col items-center justify-center gap-1 border border-dashed border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                    >
                      {processing ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ImagePlus className="size-4" />
                      )}
                      <span className="text-[10px]">Añadir</span>
                    </button>
                  ) : null}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => addPhotos(e.target.files)}
                />
              </div>
            ) : null}

            <button
              type="button"
              onClick={locate}
              className={cn(
                "flex min-h-12 w-full items-center gap-2.5 border px-3 py-3 text-left text-[13px] transition-colors",
                coords
                  ? "border-emerald-500/40 bg-emerald-500/5 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent active:bg-accent",
              )}
            >
              {coords ? (
                <MapPin className="size-4 text-emerald-500" />
              ) : (
                <Crosshair className="size-4" />
              )}
              <span className="flex-1">
                {coords
                  ? "Ubicación añadida"
                  : "Añadir mi ubicación (opcional)"}
              </span>
              {coords ? <Check className="size-3.5 text-emerald-500" /> : null}
            </button>

            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Tu ubicación exacta nunca se publica: en el mapa se muestra de
              forma aproximada para proteger tu privacidad.
            </p>
          </div>

          <div className="sticky bottom-0 border-t border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              className="h-11 w-full text-[15px]"
              onClick={submit}
              disabled={submitting}
            >
              {submitting ? "Enviando…" : "Enviar reporte"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
