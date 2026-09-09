import type { Metadata } from "next";
import Link from "next/link";

import { leerFeed, claimsDeProyecto } from "@/lib/proof/feed";
import type { Feed, FeedProject } from "@/lib/proof/schema";

/**
 * `/proyectos` — el **desglose**, no el índice.
 *
 * El índice canónico es `/evidencia`, porque la cadena del dominio va
 * `Claim → Project → Evidence` y entrar por los proyectos la invierte. Esta
 * página existe para responder «¿y qué hay detrás de esas afirmaciones?», y su
 * encabezado lo dice literalmente.
 *
 * ## Los proyectos que no sostienen ninguna afirmación
 *
 * Se muestran, agrupados al final y rotulados por lo que son. Ocultarlos sería
 * menos creíble que nombrarlos, y con once proyectos y tres afirmaciones ese caso
 * no es un borde: es una parte grande del conjunto.
 *
 * ## Agrupación
 *
 * Un solo agrupamiento, por `lifecycle`, sin control visible. Agrupar once
 * elementos por dos ejes a la vez genera grupos de uno, y un control que produce
 * grupos de uno es ruido con aspecto de función.
 */

export const metadata: Metadata = {
  title: "Proyectos — Rodrigo Bermejo",
  description:
    "Los proyectos sobre los que se apoyan las afirmaciones, con su naturaleza, su madurez y sus fuentes públicas.",
};

const LIFECYCLE_ORDEN = [
  "production",
  "maintenance",
  "beta",
  "alpha",
  "prototype",
  "discovery",
  "archived",
] as const;

const LIFECYCLE_COPY: Record<string, string> = {
  production: "En producción",
  maintenance: "En mantenimiento",
  beta: "En beta",
  alpha: "En alfa",
  prototype: "Prototipos",
  discovery: "En exploración",
  archived: "Archivados",
};

const KIND_COPY: Record<string, string> = {
  product: "producto",
  tool: "herramienta",
  education: "formación",
  lab: "laboratorio",
  experiment: "experimento",
};

function FichaProyecto({ p, feed }: { p: FeedProject; feed: Feed }) {
  const claims = claimsDeProyecto(feed, p.id);
  return (
    <li className="border-t border-border-subtle py-6">
      <h3 className="font-heading text-xl text-ink-default">
        <Link href={`/proyectos/${p.id}`} className="underline underline-offset-2">
          {p.title}
        </Link>
      </h3>
      {/* La tesis se desmarca del statement de un claim a proposito: se lee como
          una afirmacion, pero el contrato no le da procedencia ni verificabilidad
          --- no existen en projects.json. Rotularla evita mostrar una afirmacion
          sin sus dos etiquetas. */}
      <p className="mt-1 text-sm text-ink-muted">
        <span className="uppercase tracking-wide">Propósito declarado:</span> {p.thesis}
      </p>
      <p className="mt-2 text-sm text-ink-muted">
        {KIND_COPY[p.kind] ?? p.kind}
        {p.has_private_sources && " · parte del trabajo no es público"}
        {claims.length === 0 && " · no sostiene ninguna afirmación publicada"}
      </p>
    </li>
  );
}

export default function ProyectosPage() {
  const estado = leerFeed();

  if (estado.estado === "ausente") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <h1 className="font-display text-4xl leading-tight text-ink-default">Proyectos</h1>
        <p className="mt-6 text-lg text-ink-balance">
          La publicación estructurada no está disponible. Los proyectos se publican como
          archivos versionados y ahora mismo no hay ninguno en este sitio.
        </p>
      </main>
    );
  }

  const { feed } = estado;
  const conClaim = feed.projects.filter((p) => claimsDeProyecto(feed, p.id).length > 0);
  const sinClaim = feed.projects.filter((p) => claimsDeProyecto(feed, p.id).length === 0);

  const porCiclo = LIFECYCLE_ORDEN.map((l) => ({
    lifecycle: l,
    proyectos: conClaim.filter((p) => p.lifecycle === l),
  })).filter((g) => g.proyectos.length > 0);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <h1 className="font-display text-4xl leading-tight text-ink-default sm:text-5xl">
        Proyectos
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-ink-balance">
        Los proyectos sobre los que se apoyan{" "}
        <Link href="/evidencia" className="text-brand-primary underline underline-offset-2">
          las afirmaciones
        </Link>
        . Un proyecto es una unidad de trabajo con dueño e intención; un repositorio es un
        artefacto suyo, no el proyecto.
      </p>

      {porCiclo.map((g) => (
        <section key={g.lifecycle} className="mt-12">
          <h2 className="font-heading text-2xl text-ink-default">
            {LIFECYCLE_COPY[g.lifecycle] ?? g.lifecycle}
          </h2>
          <ul>
            {g.proyectos.map((p) => (
              <FichaProyecto key={p.id} p={p} feed={feed} />
            ))}
          </ul>
        </section>
      ))}

      {sinClaim.length > 0 && (
        <section className="mt-16">
          <h2 className="font-heading text-2xl text-ink-default">
            Proyectos publicados que hoy no sostienen ninguna afirmación
          </h2>
          <p className="mt-2 text-ink-muted">
            Están aquí porque existen, no porque prueben algo. Mostrarlos con esa etiqueta es
            más honesto que esconderlos.
          </p>
          <ul className="mt-4">
            {sinClaim.map((p) => (
              <FichaProyecto key={p.id} p={p} feed={feed} />
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-16 border-t border-border-subtle pt-6 text-sm text-ink-muted">
        <p>Publicado el {feed.meta.generated_at.slice(0, 10)}.</p>
      </footer>
    </main>
  );
}
