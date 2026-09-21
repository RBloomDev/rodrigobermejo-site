import type { Metadata } from "next";
import Link from "next/link";

/**
 * Trayectoria, Inadaptados y docencia, en una sola página con secciones
 * ancladas. `docs/brand/02-arquitectura-y-urls.md` §1 y §2.
 *
 * ## Por qué una página y no dos rutas
 *
 * Porque el contenido no alcanza para dos páginas. Una `/inadaptados` y una
 * `/docencia` con tres párrafos cada una serían dos páginas delgadas: peor
 * arquitectura, peor señal de profundidad, y dos superficies más que mantener,
 * indexar y meter en el sitemap. Si alguna crece hasta justificar su ruta, el
 * ascenso es barato —`/sobre-mi#inadaptados` → `/inadaptados` es una redirección
 * de **ruta**, que sí se puede escribir—; romper una ruta ya indexada no lo es.
 *
 * ## Los `id` son contrato, no decoración
 *
 * `inadaptados` y `docencia` son **parte del contrato de esta página**
 * (`docs/brand/02` §2). El menú enlaza `/sobre-mi#inadaptados` y
 * `/sobre-mi#docencia`: si el copy renombra las secciones, los `id` no cambian.
 * `tests/portada-identidad.test.ts` lo vigila sobre el cierre de imports de esta
 * ruta, así que renombrar uno pone la prueba roja.
 *
 * ## Cero cifras sin fuente
 *
 * Todo el texto sale de `docs/brand/03-copy-deck.md` §5. «Llevo años» va sin
 * número **a propósito**: no hay una fecha de inicio verificable publicada, y
 * poner una cifra sería inventarla. La única fecha de la página, «desde 2024»,
 * no es una estimación: sale de `timeframe.start: "2024-08-01"` del proyecto
 * `docencia-universitaria`, y el copy deck la cita como tal. Esta ruta no lee el
 * feed —es copy editorial estático (`docs/brand/02` §1)—, así que la fecha viaja
 * transcrita, no derivada.
 */

export const metadata: Metadata = {
  // `docs/brand/03-copy-deck.md` §7.
  title: "Trayectoria",
  description:
    "Dirección tecnológica en Inadaptados, sistemas en producción y docencia universitaria.",
  alternates: { canonical: "/sobre-mi" },
};

export default function SobreMi() {
  return (
    <main className="flex flex-col flex-grow">
      {/* ---------------------------------------------------------------- */}
      {/* Titular y entradilla — copy deck §5                               */}
      {/* ---------------------------------------------------------------- */}
      <section className="py-20 md:py-28 bg-bg-page">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl">
            <h1 className="font-heading font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.12] text-ink-default tracking-tight">
              Trayectoria
            </h1>
            <p className="mt-8 font-body text-lg md:text-xl leading-relaxed text-ink-muted">
              Llevo años en la intersección entre tecnología y negocio. Hoy
              dirijo tecnología en una escuela, construyo sistemas que opero yo
              mismo, y doy clase.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* #inadaptados — copy deck §5. El `id` es contrato de la página.     */}
      {/* ---------------------------------------------------------------- */}
      <section
        id="inadaptados"
        className="py-16 md:py-24 bg-bg-section border-y border-border-subtle scroll-mt-24"
      >
        <div className="container mx-auto px-6">
          <div className="max-w-3xl">
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-ink-default">
              Inadaptados
            </h2>
            <div className="mt-6 font-body text-lg leading-relaxed text-ink-muted space-y-6">
              <p>
                Soy CTO. Dirijo la plataforma que sostiene la operación
                educativa —LMS, web, certificados y contenido—, la
                infraestructura interna, y el sistema que automatiza la
                captación y el seguimiento comercial. La currícula con la que se
                forman los desarrolladores también sale de ahí.
              </p>
              {/* Crédito al equipo: regla 3 de §0 del copy deck. Inadaptados es
               * una organización con más gente; se escribe «dirijo» y
               * «diseño», nunca «hice yo solo». */}
              <p>
                Inadaptados es un equipo. Lo que aquí se describe es mi parte.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* #docencia — copy deck §5. El `id` es contrato de la página.        */}
      {/* ---------------------------------------------------------------- */}
      <section id="docencia" className="py-16 md:py-24 bg-bg-page scroll-mt-24">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl">
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-ink-default">
              Docencia
            </h2>
            <div className="mt-6 font-body text-lg leading-relaxed text-ink-muted space-y-6">
              <p>
                Imparto ingeniería de software y bases de datos a nivel
                universitario desde 2024, y diseño la currícula y los materiales
                con los que se forman desarrolladores en Inadaptados.
              </p>
              <p>
                Enseñar no deja artefacto público, así que esta es la dimensión
                de la que menos evidencia comprobable existe. Está dicho en{" "}
                <Link
                  href="/evidencia"
                  className="text-brand-primary hover:text-brand-accent transition-colors underline underline-offset-4 decoration-border-default hover:decoration-brand-accent"
                >
                  /evidencia
                </Link>{" "}
                y no se maquilla aquí.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
