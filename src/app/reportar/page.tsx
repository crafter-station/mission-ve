"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  ESTADO_NAMES,
} from "@/lib/taxonomy";

export default function ReportarPage() {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<string>("");
  const [estado, setEstado] = useState<string>("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<string | null>(null);

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

  async function submit() {
    if (text.trim().length < 3) {
      toast.error("Cuéntanos qué está pasando.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text,
          category: category || undefined,
          estado: estado || undefined,
          lat: coords?.lat,
          lng: coords?.lng,
        }),
      });
      if (!res.ok) throw new Error("submit failed");
      const { id } = (await res.json()) as { id: string };
      setTicket(id);
    } catch {
      toast.error("No se pudo enviar. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (ticket) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>¡Gracias! 🇻🇪</CardTitle>
            <CardDescription>Recibimos tu reporte.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              Tu folio es{" "}
              <span className="font-mono font-semibold">{ticket}</span>.
            </p>
            <p className="text-muted-foreground text-sm">
              Voluntarios lo revisarán. Si procede, aparecerá en el mapa público
              <strong> sin tus datos personales</strong>. Nunca compartimos tu
              identidad.
            </p>
          </CardContent>
          <CardFooter className="justify-center gap-2">
            <Button asChild variant="outline">
              <Link href="/">Ver el mapa</Link>
            </Button>
            <Button
              onClick={() => {
                setTicket(null);
                setText("");
                setCategory("");
                setEstado("");
                setCoords(null);
              }}
            >
              Otro reporte
            </Button>
          </CardFooter>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reportar un problema</CardTitle>
          <CardDescription>
            Cortes de luz, agua, escasez de medicinas, alimentos o combustible.
            Es anónimo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="¿Qué está pasando y dónde? Ej: Sin luz desde hace 2 días en El Paraíso."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
          />
          <div className="grid grid-cols-2 gap-3">
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
          </div>
          <Button
            type="button"
            variant={coords ? "secondary" : "outline"}
            className="w-full"
            onClick={locate}
          >
            {coords ? "Ubicación añadida ✓" : "Añadir mi ubicación (opcional)"}
          </Button>
          <p className="text-muted-foreground text-xs">
            Tu ubicación exacta nunca se publica: en el mapa se muestra de forma
            aproximada.
          </p>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button className="w-full" onClick={submit} disabled={submitting}>
            {submitting ? "Enviando…" : "Enviar reporte"}
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/">Volver al mapa</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
