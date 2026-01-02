"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface SubscriptionBlockProps {
  source?: string;
  className?: string;
}

export function SubscriptionBlock({
  source = "general",
  className = "",
}: SubscriptionBlockProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });

      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  return (
    <div
      className={`bg-bg-section border border-border-subtle rounded-xl p-8 ${className}`}
    >
      <div className="max-w-xl mx-auto text-center">
        <h3 className="font-heading font-bold text-xl text-ink-default mb-2">
          Notas privadas de operación
        </h3>
        <p className="font-body text-ink-muted text-sm mb-6 leading-relaxed">
          Escribo ocasionalmente sobre sistemas, decisiones técnicas y lecciones
          de operar automatizaciones reales. Sin ruido, solo señal.
        </p>

        {status === "success" ? (
          <div className="bg-green-50 text-green-800 p-4 rounded-md text-sm border border-green-100">
            <strong>¡Listo!</strong> Tu correo quedó registrado.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-2 border border-border-default rounded-md focus:ring-2 focus:ring-brand-accent focus:border-brand-accent outline-none text-ink-default bg-white transition-all placeholder:text-gray-400"
              required
              disabled={status === "loading"}
            />
            <Button
              variant="secondary"
              size="sm"
              disabled={status === "loading"}
              className="w-full sm:w-auto"
            >
              {status === "loading" ? "Guardando..." : "Recibir notas"}
            </Button>
          </form>
        )}

        {status === "error" && (
          <p className="mt-2 text-xs text-red-600">
            Hubo un error al registrar. Intenta de nuevo.
          </p>
        )}

        <p className="mt-4 text-xs text-ink-muted/60">
          * Cero spam. Frecuencia baja. Te das de baja cuando quieras.
        </p>
      </div>
    </div>
  );
}
