import type { Metadata } from "next";
import Link from "next/link";

import { leerFeed } from "@/lib/proof/feed";
import { ClaimCard } from "@/components/proof/ClaimCard";

/**
 * `/evidencia` — **el índice canónico del sistema**.
 *
 * ## Por qué el índice son las afirmaciones y no los proyectos
 *
 * `docs/02` §0 llama a la dirección `Claim → Project → Evidence` «la decisión de
 * diseño más importante del sistema», y dice que la inversa produce vanity. Una
 * rejilla de proyectos como puerta de entrada **invierte esa cadena en la capa
 * donde el lector la percibe**: aterrizas en once tarjetas de las que solo
 * algunas sostienen una afirmación. Eso es `Source → Dashboard` con otro nombre.
 *
 * ## Por qué esta página no es un aviso legal
 *
 * La versión anterior del plan la describía como «metodología, los dos ejes y los
 * límites»: tres bloques de prosa a un clic desde el pie, que nadie abre. Y sin
 * embargo aquí vive algo que **no se puede delegar a ningún otro sitio**: que
 * existe trabajo bajo NDA que no aparece en ninguna forma. Un contador de
 * proyectos ocultos sería un dato atribuible en cuanto el conjunto fuera pequeño,
 * así que la única forma honesta de decirlo es esta prosa. Si nadie la lee, esa
 * honestidad no ocurre — por eso está arriba y no en un pie.
 */

export const metadata: Metadata = {
  title: "Cómo respaldo lo que afirmo — Rodrigo Bermejo",
  description:
    "Cada afirmación profesional, con su procedencia, su verificabilidad y el límite exacto de lo que hoy se puede comprobar.",
};

export default function EvidenciaPage() {
  const estado = leerFeed();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <h1 className="font-display text-4xl leading-tight text-ink-default sm:text-5xl">
        Cómo respaldo lo que afirmo
      </h1>

      <p className="mt-6 text-lg leading-relaxed text-ink-balance">
        Este sistema funciona si puedes comprobar una afirmación{" "}
        <strong>o entender exactamente por qué no puedes comprobarla</strong>. Las dos
        mitades cuentan igual, y ahora mismo casi todo está en la segunda.
      </p>

      <p className="mt-4 text-lg leading-relaxed text-ink-balance">
        Hay trabajo bajo acuerdo de confidencialidad que no aparece aquí en ninguna forma,
        ni siquiera contado. No hay un número de proyectos ocultos porque ese número también
        diría algo sobre quién los encargó.
      </p>

      {estado.estado === "ausente" ? (
        /* Sin feed no hay claims que mostrar: viven en `claims.json`. Duplicarlos
           aquí crearía la segunda fuente de verdad que el contrato existe para
           evitar. Se dice lo que pasa, no se inventa contenido. */
        <section className="mt-12 rounded-lg border border-border-subtle p-6">
          <h2 className="font-heading text-xl text-ink-default">
            La publicación estructurada no está disponible
          </h2>
          <p className="mt-3 text-ink-balance">
            Las afirmaciones y los proyectos se publican como archivos versionados, y ahora
            mismo no hay ninguno en este sitio. Cuando lo haya, aparecerán aquí con su
            procedencia y su verificabilidad.
          </p>
        </section>
      ) : (
        <>
          <section className="mt-14 space-y-8">
            <h2 className="font-heading text-2xl text-ink-default">Las afirmaciones</h2>
            {/* Orden del Registry, y se dice. Cualquier otro orden se lee como
                ranking; ordenar por cantidad de evidencia sería un puntaje. */}
            {estado.feed.claims.map((c) => (
              <ClaimCard
                key={c.id}
                claim={c}
                proyectos={estado.feed.projects.filter((p) => c.project_ids.includes(p.id))}
              />
            ))}
          </section>

          <section className="mt-16">
            <h2 className="font-heading text-2xl text-ink-default">Los dos ejes</h2>
            <p className="mt-3 text-ink-balance">
              Toda afirmación lleva dos etiquetas, y son independientes. Una dice{" "}
              <strong>cómo se obtuvo</strong> el dato; la otra, <strong>si alguien más
              puede comprobarlo</strong>. Se puede recolectar automáticamente algo que
              ningún tercero puede verificar, y separarlas es lo que hace honesto al
              sistema.
            </p>

            <div className="mt-6 grid gap-8 sm:grid-cols-2">
              <div>
                <h3 className="text-sm uppercase tracking-wide text-ink-muted">Procedencia</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div>
                    <dt className="font-medium text-ink-default">lo afirmo yo</dt>
                    <dd className="text-ink-muted">Lo escribí a mano. No hay nada detrás salvo mi palabra.</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-ink-default">leído de la fuente</dt>
                    <dd className="text-ink-muted">Se leyó de la API de un sistema, sin intervención mía.</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-ink-default">calculado a partir de lo leído</dt>
                    <dd className="text-ink-muted">Se computó desde datos recolectados.</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-ink-default">unido entre fuentes</dt>
                    <dd className="text-ink-muted">Se obtuvo cruzando sistemas o entidades distintas.</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h3 className="text-sm uppercase tracking-wide text-ink-muted">Verificabilidad</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div>
                    <dt className="font-medium text-ink-default">no puedes comprobarlo sin confiar en mí</dt>
                    <dd className="text-ink-muted">Solo yo lo he visto.</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-ink-default">enlaza a algo que alojo yo</dt>
                    <dd className="text-ink-muted">Hay un enlace, pero el servidor es mío.</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-ink-default">cualquiera puede abrirlo y comprobarlo</dt>
                    <dd className="text-ink-muted">Una URL pública de un tercero.</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-ink-default">comprobable sin confiar en nadie</dt>
                    <dd className="text-ink-muted">Una firma que se verifica sola.</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <section className="mt-16">
            <h2 className="font-heading text-2xl text-ink-default">Lo que esto no prueba</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-balance">
              <li>
                <strong>Calidad.</strong> Que un commit exista no dice si el código era bueno.
              </li>
              <li>
                <strong>Impacto.</strong> Nada de lo que hay aquí mide si algo le sirvió a
                alguien.
              </li>
              <li>
                <strong>Seniority.</strong> No hay puntaje, ni nivel, ni ranking. No existe un
                número que resuma a una persona, y no es una función pendiente: está fuera
                del producto.
              </li>
              <li>
                <strong>Liderazgo ni docencia.</strong> Las fuentes que este sistema lee no
                producen evidencia de ninguna de las dos cosas.
              </li>
            </ul>
          </section>

          <footer className="mt-16 border-t border-border-subtle pt-6 text-sm text-ink-muted">
            {/* Fecha absoluta y en prosa, nunca relativa: "hace 3 dias" convierte la
                frescura en metrica y a los dos meses el sitio se autodenuncia como
                abandonado. Y los conteos van dentro de una oracion, no como fila de
                cifras: una fila de cifras es el dashboard que esto existe para no ser. */}
            <p>
              Publicado el {estado.feed.meta.generated_at.slice(0, 10)}. Este archivo contiene{" "}
              {estado.feed.projects.length} proyectos y {estado.feed.claims.length} afirmaciones.
            </p>
            <p className="mt-2">
              <Link href="/proyectos" className="text-brand-primary underline underline-offset-2">
                Ver los proyectos que las sostienen
              </Link>
            </p>
          </footer>
        </>
      )}
    </main>
  );
}
