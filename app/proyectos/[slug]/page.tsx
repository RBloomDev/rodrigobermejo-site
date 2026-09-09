import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { leerFeed, claimsDeProyecto } from "@/lib/proof/feed";
import { ClaimCard } from "@/components/proof/ClaimCard";

/**
 * `/proyectos/[slug]` — la ficha de un proyecto.
 *
 * **Regla G6:** los claims que sostiene se computan filtrando `claims` por
 * `project_ids`. El índice inverso `Project → Claims` no se persiste en ningún
 * artefacto: la arista la posee `claims[].project_ids`, y guardar la inversa
 * crearía una segunda fuente de verdad para la misma relación, capaz de discrepar
 * sin que nada fallara.
 */

export function generateStaticParams(): { slug: string }[] {
  const estado = leerFeed();
  if (estado.estado === "ausente") return [];
  return estado.feed.projects.map((p) => ({ slug: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const estado = leerFeed();
  if (estado.estado === "ausente") return { title: "Proyecto — Rodrigo Bermejo" };
  const p = estado.feed.projects.find((x) => x.id === slug);
  return p
    ? { title: `${p.title} — Rodrigo Bermejo`, description: p.thesis }
    : { title: "Proyecto — Rodrigo Bermejo" };
}

const KIND_COPY: Record<string, string> = {
  product: "Producto",
  tool: "Herramienta",
  education: "Formación",
  lab: "Laboratorio",
  experiment: "Experimento",
};

const LIFECYCLE_COPY: Record<string, string> = {
  production: "en producción",
  maintenance: "en mantenimiento",
  beta: "en beta",
  alpha: "en alfa",
  prototype: "prototipo",
  discovery: "en exploración",
  archived: "archivado",
};

export default async function ProyectoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const estado = leerFeed();
  if (estado.estado === "ausente") notFound();

  const proyecto = estado.feed.projects.find((p) => p.id === slug);
  if (!proyecto) notFound();

  const claims = claimsDeProyecto(estado.feed, proyecto.id);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <p className="text-sm text-ink-muted">
        <Link href="/proyectos" className="underline underline-offset-2">
          Proyectos
        </Link>
      </p>

      <h1 className="mt-3 font-display text-4xl leading-tight text-ink-default sm:text-5xl">
        {proyecto.title}
      </h1>

      <p className="mt-4 text-sm uppercase tracking-wide text-ink-muted">
        {KIND_COPY[proyecto.kind] ?? proyecto.kind},{" "}
        {LIFECYCLE_COPY[proyecto.lifecycle] ?? proyecto.lifecycle} · desde{" "}
        {proyecto.timeframe.start}
        {proyecto.timeframe.end && ` hasta ${proyecto.timeframe.end}`}
      </p>

      <p className="mt-6 text-lg leading-relaxed text-ink-balance">
        <span className="text-sm uppercase tracking-wide text-ink-muted">
          Propósito declarado:{" "}
        </span>
        {proyecto.thesis}
      </p>

      {proyecto.public_sources.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm uppercase tracking-wide text-ink-muted">Fuentes públicas</h2>
          <ul className="mt-2 space-y-1">
            {proyecto.public_sources.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  className="text-brand-primary underline underline-offset-2"
                  rel="noopener noreferrer"
                >
                  {s.url}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* `has_private_sources` es la forma correcta de decir "hay mas trabajo del
          que se puede mostrar", sin nombrar nada. Es senal de credibilidad, no de
          carencia, y por eso se escribe en prosa y no como un contador. */}
      {proyecto.has_private_sources && (
        <p className="mt-6 text-ink-balance">
          Parte del trabajo de este proyecto vive en repositorios privados. Se publica el
          hecho, nunca la identidad de esos repositorios.
        </p>
      )}

      <section className="mt-14">
        <h2 className="font-heading text-2xl text-ink-default">
          Afirmaciones que sostiene
        </h2>
        {claims.length === 0 ? (
          /* Nunca una seccion de claims vacia: con once proyectos y tres
             afirmaciones, este caso es mayoritario, no un borde. */
          <p className="mt-3 text-ink-balance">
            Ninguna. Este proyecto está publicado porque existe, no porque respalde una
            afirmación.
          </p>
        ) : (
          <div className="mt-6 space-y-8">
            {claims.map((c) => (
              <ClaimCard
                key={c.id}
                claim={c}
                proyectos={estado.feed.projects.filter((p) => c.project_ids.includes(p.id))}
                densidad="compacta"
              />
            ))}
          </div>
        )}
      </section>

      <footer className="mt-16 border-t border-border-subtle pt-6 text-sm text-ink-muted">
        <p>Publicado el {estado.feed.meta.generated_at.slice(0, 10)}.</p>
        <p className="mt-2">
          <Link href="/evidencia" className="text-brand-primary underline underline-offset-2">
            Cómo decido qué puedo probar
          </Link>
        </p>
      </footer>
    </main>
  );
}
