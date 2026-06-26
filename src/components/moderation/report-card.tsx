"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { moderateReport, rejectReport } from "@/app/moderation/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
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
  ESTADO_NAMES,
  SEVERITIES,
  SEVERITY_LABELS,
} from "@/lib/taxonomy";

export function ReportCard({ report }: { report: Report }) {
  const [category, setCategory] = useState(report.category ?? "");
  const [severity, setSeverity] = useState(report.severity ?? "");
  const [estado, setEstado] = useState(report.estado ?? "");
  const [municipio, setMunicipio] = useState(report.municipio ?? "");
  const [summary, setSummary] = useState(
    report.summary ?? report.rawText ?? "",
  );
  const [pending, startTransition] = useTransition();

  function verify() {
    if (!category || !severity || !estado || summary.trim().length < 3) {
      toast.error("Completa categoría, severidad, estado y resumen.");
      return;
    }
    startTransition(async () => {
      const res = await moderateReport(report.id, {
        category,
        severity,
        summary,
        estado,
        municipio: municipio || undefined,
        lat: report.lat ?? undefined,
        lng: report.lng ?? undefined,
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
    <Card>
      <CardHeader className="gap-1">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-muted-foreground">
            {report.id}
          </span>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline">{report.source}</Badge>
            {report.verifiedBy.length > 0 ? (
              <Badge variant="secondary">{report.verifiedBy.length} ✓</Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Original message — internal only */}
        <div className="rounded-md bg-muted p-2 text-sm">
          {report.rawText ?? (
            <em className="text-muted-foreground">(sin texto)</em>
          )}
        </div>
        {report.lat != null && report.lng != null ? (
          <p className="text-xs text-muted-foreground">
            📍 Ubicación adjunta: {report.lat.toFixed(3)},{" "}
            {report.lng.toFixed(3)} (se mostrará aproximada)
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_META[c].emoji} {CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger>
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
            <SelectTrigger>
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
            className="border-input bg-transparent rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <Textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Resumen público (sin datos personales)"
          rows={2}
        />
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={reject} disabled={pending}>
          Descartar
        </Button>
        <Button size="sm" onClick={verify} disabled={pending}>
          {pending ? "Guardando…" : "Confirmar"}
        </Button>
      </CardFooter>
    </Card>
  );
}
