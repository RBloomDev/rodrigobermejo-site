import Link from "next/link";

import type { FeedClaim, FeedProject } from "@/lib/proof/schema";
import { AlcanceDeLaAfirmacion } from "./AlcanceDeLaAfirmacion";
import { ParEtiquetas } from "./ParEtiquetas";

/**
 * La unidad canónica de la superficie de evidencia. **Una sola.**
 *
 * Si el índice y el detalle fueran componentes distintos, divergirían en el
 * primer cambio y uno de los dos acabaría sin el par de etiquetas — que el
 * criterio 6 del Definition of Done hace obligatorio. Un componente con
 * `densidad` en vez de dos que se parecen.
 *
 * La dimensión (`build`/`lead`/`teach`) es una **etiqueta, no un filtro**: con
 * tres claims y tres dimensiones, un control de filtro filtra un elemento por
 * opción y convierte la dimensión en un eje de comparación.
 */

const DIMENSION: Record<FeedClaim["dimension"], string> = {
  build: "Construir",
  lead: "Decidir",
  teach: "Enseñar",
};

export function ClaimCard({
  claim,
  proyectos,
  densidad = "completa",
}: {
  claim: FeedClaim;
  proyectos: FeedProject[];
  densidad?: "completa" | "compacta";
}) {
  return (
    <article className="rounded-lg border border-border-subtle bg-bg-page p-6 sm:p-8">
      <p className="text-sm uppercase tracking-wide text-ink-muted">
        {DIMENSION[claim.dimension]}
      </p>
      <h3 className="mt-2 font-heading text-2xl leading-snug text-ink-default">
        {claim.statement}
      </h3>

      <ParEtiquetas provenance={claim.provenance} verifiability={claim.verifiability} />

      {densidad === "completa" && (
        <>
          {claim.verifiability === "unverifiable" && (
            <AlcanceDeLaAfirmacion claim={claim} proyectos={proyectos} />
          )}

          {proyectos.length > 0 && (
            <div className="mt-6 border-t border-border-subtle pt-5">
              <p className="text-sm uppercase tracking-wide text-ink-muted">
                Se apoya en
              </p>
              <ul className="mt-2 space-y-1">
                {proyectos.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/proyectos/${p.id}`}
                      className="text-brand-primary underline underline-offset-2"
                    >
                      {p.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </article>
  );
}
