"use client";

import { Check, MapPin } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { moderateReport, rejectReport } from "@/app/moderation/actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Report } from "@/db/schema";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_META,
  categoryLabel,
  categoryMeta,
  ESTADO_NAMES,
  SEVERITIES,
  SEVERITY_LABELS,
} from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

const inputClass =
  "h-9 w-full border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40";

export function ReportCard({
  report,
  mediaUrls = [],
}: {
  report: Report;
  mediaUrls?: string[];
}) {
  const [category, setCategory] = useState(
    report.category ?? report.categories[0] ?? "",
  );
  const [severity, setSeverity] = useState(report.severity ?? "");
  const [estado, setEstado] = useState(report.estado ?? "");
  const [municipio, setMunicipio] = useState(report.municipio ?? "");
  const [summary, setSummary] = useState(
    report.summary ?? report.rawText ?? "",
  );
  // Indices of attached photos the moderator marked to publish on the map.
  const [publish, setPublish] = useState<Set<number>>(new Set());
  const [pending, startTransition] = useTransition();

  function togglePublish(i: number) {
    setPublish((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function verify() {
    if (!category || !severity || !estado || summary.trim().length < 3) {
      toast.error("Completa categoría, severidad, estado y resumen.");
      return;
    }
    const publishMedia = Array.from(publish)
      .map((i) => report.media[i])
      .filter(Boolean);
    startTransition(async () => {
      const res = await moderateReport(report.id, {
        category,
        severity,
        summary,
        estado,
        municipio: municipio || undefined,
        lat: report.lat ?? undefined,
        lng: report.lng ?? undefined,
        publishMedia: publishMedia.length ? publishMedia : undefined,
      });
      if (res.ok) toast.success(`${report.id} confirmado.`);
      else toast.error(res.error);
    });
  }

  function reject() {
    startTransition(async () => {
      const res = await rejectReport(report.id);
      if (res.ok) toast(`${report.id} descartado.`);
      else toast.error(res.error);
    });
  }

  return (
    <div className="border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="font-mono text-xs font-medium tracking-tight">
          {report.id}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            {report.source}
          </span>
          {report.verifiedBy.length > 0 ? (
            <span className="border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-500">
              {report.verifiedBy.length} ✓
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 p-4">
        {/* Original message — internal only */}
        <div className="border-l-2 border-border bg-background px-3 py-2 text-sm leading-relaxed">
          {report.rawText ?? (
            <em className="text-muted-foreground">(sin texto)</em>
          )}
        </div>
        {report.lat != null && report.lng != null ? (
          <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <MapPin className="size-3" />
            {report.lat.toFixed(3)}, {report.lng.toFixed(3)} · se mostrará
            aproximada
          </p>
        ) : null}

        {/* Attached photos — private. Tap to mark which ones to publish. */}
        {mediaUrls.length > 0 ? (
          <div className="space-y-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              Fotos · marca las que publicar
            </span>
            <div className="grid grid-cols-3 gap-2">
              {mediaUrls.map((url, i) => {
                const on = publish.has(i);
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => togglePublish(i)}
                    className={cn(
                      "group relative aspect-square overflow-hidden border bg-background",
                      on ? "border-emerald-500" : "border-border",
                    )}
                  >
                    {/* biome-ignore lint/performance/noImgElement: signed preview */}
                    <img
                      src={url}
                      alt={`Adjunto ${i + 1}`}
                      className="size-full object-cover"
                    />
                    <span
                      className={cn(
                        "absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 py-1 font-mono text-[9px] uppercase tracking-wide",
                        on
                          ? "bg-emerald-500 text-black"
                          : "bg-background/85 text-muted-foreground",
                      )}
                    >
                      {on ? (
                        <>
                          <Check className="size-3" /> Publicar
                        </>
                      ) : (
                        "Privada"
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : report.media.length > 0 ? (
          <p className="font-mono text-[11px] text-muted-foreground">
            {report.media.length} foto(s) adjunta(s) · vista previa no
            disponible
          </p>
        ) : null}

        {/* Reporter-supplied category hints — click one to set the primary. */}
        {report.categories.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              Sugeridas
            </span>
            {report.categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className="flex items-center gap-1.5 border border-border bg-background px-2 py-0.5 text-[12px] transition-colors hover:bg-accent"
              >
                <span
                  className="size-2 shrink-0"
                  style={{ backgroundColor: categoryMeta(c).color }}
                />
                {categoryLabel(c)}
              </button>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  <span
                    className="mr-1.5 inline-block size-2 align-middle"
                    style={{ backgroundColor: CATEGORY_META[c].color }}
                  />
                  {CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Severidad" />
            </SelectTrigger>
            <SelectContent>
              {SEVERITIES.map((s) => (
                <SelectItem key={s} value={s}>
                  {SEVERITY_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              {ESTADO_NAMES.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            value={municipio}
            onChange={(e) => setMunicipio(e.target.value)}
            placeholder="Municipio / parroquia"
            className={inputClass}
          />
        </div>

        <Textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Resumen público (sin datos personales)"
          rows={2}
          className="resize-none"
        />
      </div>

      <div className="flex justify-end gap-2 border-t border-border p-3">
        <Button variant="ghost" size="sm" onClick={reject} disabled={pending}>
          Descartar
        </Button>
        <Button size="sm" onClick={verify} disabled={pending}>
          {pending ? "Guardando…" : "Confirmar"}
        </Button>
      </div>
    </div>
  );
}
