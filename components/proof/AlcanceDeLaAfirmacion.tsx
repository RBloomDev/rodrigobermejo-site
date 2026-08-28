import type { FeedClaim, FeedProject } from "@/lib/proof/schema";

/**
 * Lo que acompaña a una afirmación que todavía no se puede comprobar.
 *
 * ## El encuadre, que es la mitad del componente
 *
 * **La ausencia de evidencia no es un hueco: es el contenido.**
 * `docs/00` define el éxito como que el lector compruebe la afirmación **o
 * entienda exactamente por qué no puede comprobarla**. Esa segunda mitad es texto
 * declarado por un humano, no un vacío a la espera de datos.
 *
 * Por eso esto ocupa el sitio donde luego irá la lista de evidencia, y por eso no
 * lleva icono, ni color de estado, ni caja de alerta: un fondo ámbar con un
 * triángulo lo convierte en advertencia, o sea, en fracaso. Va con la misma tinta
 * que el resto, porque tiene el mismo estatus.
 *
 * Y **sin las palabras «todavía», «aún», «pronto» ni «en construcción»**: la
 * tercera fila explica una condición del mundo, no un retraso del proyecto.
 *
 * ## Por qué el motivo vive aquí y no en el feed
 *
 * «Por qué hoy no puedes comprobarlo» es prosa editorial sobre los límites del
 * sistema, no un campo del contrato — el feed no tiene dónde alojarlo, y añadirlo
 * sería publicar un campo nuevo en la superficie pública, que decide Rodrigo
 * (`docs/03` §7). El contrato de presentación pide una frase **específica del
 * claim y nunca una plantilla**; el fallback existe para que un claim nuevo no
 * salga sin explicación, y decir eso es más honesto que inventarle un motivo.
 */

const MOTIVO: Record<string, string> = {
  "construyo-sistemas":
    "La mayor parte de estos sistemas vive en repositorios privados. De un repositorio privado no se ingiere nada que se pueda publicar, así que el trabajo existe y la prueba no.",
  "decido-arquitectura":
    "Las decisiones de arquitectura de este proyecto están escritas y son públicas, pero el motor todavía no las recolecta como evidencia: hoy son documentos, no registros.",
  "ensino-y-mentoreo":
    "Enseñar no deja artefacto público. Ninguna de las fuentes que este sistema lee produce evidencia de que alguien aprendió algo.",
};

const FALLBACK =
  "No hay una fuente que produzca evidencia comprobable de esta afirmación. Que la hubiera es un cambio del sistema, no de la afirmación.";

export function AlcanceDeLaAfirmacion({
  claim,
  proyectos,
}: {
  claim: FeedClaim;
  proyectos: FeedProject[];
}) {
  const publicos = proyectos.filter((p) => p.public_sources.length > 0);
  const respaldo =
    publicos.length > 0
      ? `Commits, pull requests y releases públicos en ${publicos.length} de los ${proyectos.length} proyectos que la sostienen.`
      : `Ninguno de los ${proyectos.length} proyectos que la sostienen tiene fuentes públicas de las que recolectar evidencia.`;

  return (
    <dl className="mt-6 space-y-4 border-t border-border-subtle pt-5 text-base">
      <div className="sm:grid sm:grid-cols-[11rem_1fr] sm:gap-4">
        <dt className="text-sm uppercase tracking-wide text-ink-muted">Quién lo afirma</dt>
        <dd className="text-ink-default">Rodrigo Bermejo, en primera persona.</dd>
      </div>
      <div className="sm:grid sm:grid-cols-[11rem_1fr] sm:gap-4">
        <dt className="text-sm uppercase tracking-wide text-ink-muted">Qué lo respaldaría</dt>
        {/* Es una promesa falsable: dice contra qué se le puede pedir cuentas. */}
        <dd className="text-ink-default">{respaldo}</dd>
      </div>
      <div className="sm:grid sm:grid-cols-[11rem_1fr] sm:gap-4">
        <dt className="text-sm uppercase tracking-wide text-ink-muted">
          Por qué hoy no puedes comprobarlo
        </dt>
        <dd className="text-ink-default">{MOTIVO[claim.id] ?? FALLBACK}</dd>
      </div>
    </dl>
  );
}
