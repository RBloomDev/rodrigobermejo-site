import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

/**
 * La portada de **identidad**. Quién es Rodrigo y a dónde ir.
 *
 * Hasta este cambio, `app/page.tsx` montaba la cadena comercial completa —`Hero`,
 * `Problems`, `HowItWorks`, `Offers`, `About`, `FAQ`, `FinalCTA`—. Esa cadena no
 * se perdió: vive entera en `/colaborar`, y desde aquí se llega con un enlace.
 * `docs/brand/02-arquitectura-y-urls.md` §1 lo declara así.
 *
 * ## Dos reglas que gobiernan este archivo
 *
 * **1. Todo el texto sale de `docs/brand/03-copy-deck.md` §2.** No hay copy
 * escrito aquí. Cada bloque lleva su cita. Si un día este componente dice algo
 * distinto del copy deck, el componente está mal —es literal en su encabezado—.
 *
 * **2. Cero lecturas del feed.** Este archivo es entrada de `guard:funnel`, y el
 * comentario que lo añadió nombra la tentación exacta: «un import del feed
 * añadido en `app/page.tsx` —que es donde resulta más tentador ponerlo, para
 * "enseñar unos proyectos en la home"— no lo veía nadie». El «trabajo» de la
 * portada es **copy editorial estático** y llega a la lista canónica con un
 * `<Link>`. Enlazar sí; importar no (`docs/brand/02` §3).
 *
 * ## La cifra que el copy deck propone y aquí no se escribe
 *
 * §2 → Cierre propone el rótulo «`03 · Trabajo` — Doce proyectos, con lo que cada
 * uno se propone». **El numeral se omite, y es deliberado.** Su fuente es
 * `public/proof/v1/projects.json`, que esta ruta tiene prohibido leer: quedaría
 * como una constante escrita a mano que el motor puede desmentir en el siguiente
 * publish sin que ningún gate lo note. La regla 2 de §0 del mismo copy deck lo
 * prohíbe de frente —«cero cifras sin fuente […] ni de proyectos entregados»— y
 * manda sobre la propuesta de §2. El conteo real vive en `/proyectos`, que sí lee
 * el feed. El resto del bloque se conserva literal.
 */

/** El rótulo numerado de cada bloque. `docs/brand/03-copy-deck.md` §2. */
function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <span className="block mb-4 font-heading font-semibold uppercase tracking-[0.2em] text-xs text-brand-accent">
      {children}
    </span>
  );
}

/** Las tres dimensiones de `docs/brand/03-copy-deck.md` §2 → Las tres dimensiones. */
const DIMENSIONES = [
  {
    eje: "Lead",
    verbo: "Dirijo",
    texto:
      "Arquitectura y dirección tecnológica en Inadaptados: la plataforma que sostiene la operación educativa —LMS, web, certificados y contenido— y la infraestructura que la mantiene de pie.",
  },
  {
    eje: "Build",
    verbo: "Construyo",
    texto:
      "Software, IA y automatización en producción. No solo escribo software: lo opero. Cuando algo falla, el que responde soy yo.",
  },
  {
    eje: "Teach",
    verbo: "Formo",
    texto:
      "Diseño la currícula y los materiales con los que se forman desarrolladores en Inadaptados, e imparto ingeniería de software y bases de datos a nivel universitario.",
  },
] as const;

export default function Home() {
  return (
    <main className="flex flex-col flex-grow">
      {/* ---------------------------------------------------------------- */}
      {/* 01 · Ahora — copy deck §2 → Apertura                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="py-20 md:py-28 bg-bg-page">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto grid md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-14 md:gap-20 items-center">
            <div>
              <Rotulo>01 · Ahora</Rotulo>

              {/* El titular de §1. Tres verbos en primera persona, paralelos,
               * sin adjetivos: mapean uno a uno con LEAD → BUILD → TEACH de
               * `docs/00-product-brief.md`. §10.1 dejaba abierta la variante
               * «Doy clase» en lugar de «Formo talento»; **Rodrigo decidió
               * «Formo talento» el 2026-09-21**, viendo las dos maquetadas como
               * pedía el copy deck. La decisión está registrada en
               * `docs/brand/03-copy-deck.md` §10.1 y no se reabre desde aquí. */}
              <h1 className="font-heading font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.12] text-ink-default tracking-tight">
                Dirijo tecnología.
                <br />
                Construyo sistemas.
                <br />
                <span className="text-brand-primary">Formo talento.</span>
              </h1>

              <p className="mt-8 font-body text-lg md:text-xl leading-relaxed text-ink-muted max-w-2xl">
                Soy CTO en Inadaptados, una escuela donde se aprende
                construyendo. Dirijo la plataforma que sostiene su operación
                educativa, diseño la currícula con la que se forman
                desarrolladores, y doy clase.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row sm:items-center gap-4">
                <Button href="/proyectos" variant="primary" size="md">
                  Ver mi trabajo
                </Button>
                {/* Enlazar la superficie de evidencia desde la portada es
                 * explícitamente legítimo: la frontera del funnel es de datos,
                 * no de navegación (`docs/05-feed-contract.md`). */}
                <Link
                  href="/evidencia"
                  className="font-heading font-semibold text-brand-primary hover:text-brand-accent transition-colors underline underline-offset-4 decoration-border-default hover:decoration-brand-accent"
                >
                  Cómo respaldo lo que afirmo →
                </Link>
              </div>
            </div>

            <div className="flex flex-col items-center md:items-start">
              <div className="w-56 h-56 md:w-72 md:h-72 relative">
                <div className="w-full h-full rounded-full overflow-hidden border-8 border-bg-section shadow-2xl relative z-10">
                  {/* El retrato lleva la marca de agua visible de Google AI y
                   * Rodrigo decidió el 2026-09-12 usarlo tal cual: recortarla
                   * sería borrar una señal de origen en un sitio cuyo producto
                   * es la procedencia (`docs/brand/03` §10.4). */}
                  <Image
                    src="/images/profile.jpg"
                    alt="Rodrigo Bermejo"
                    fill
                    className="object-cover"
                    unoptimized
                    priority
                  />
                </div>
                <div className="absolute -bottom-6 -right-6 w-40 h-40 bg-brand-accent/10 rounded-full blur-2xl -z-0"></div>
                <div className="absolute -top-6 -left-6 w-40 h-40 bg-brand-primary/10 rounded-full blur-2xl -z-0"></div>
              </div>

              {/* Pie del retrato, copy deck §2. La localidad que el borrador
               * ponía aquí («Aguascalientes, México») está retirada y escalada
               * a Rodrigo: no aparece hoy en ninguna parte del repositorio, y
               * publicarla sería publicar un valor nuevo en la superficie
               * pública sin autorización (`docs/03` §7). */}
              <p className="mt-8 font-quote italic text-lg text-ink-muted text-center md:text-left">
                Escribo sobre lo que opero.
              </p>
              <Link
                href="/blog"
                className="mt-3 font-heading font-semibold text-sm text-brand-primary hover:text-brand-accent transition-colors underline underline-offset-4 decoration-border-default hover:decoration-brand-accent"
              >
                Escribo →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 02 · Tres dimensiones — copy deck §2 → Las tres dimensiones       */}
      {/* ---------------------------------------------------------------- */}
      <section className="py-20 md:py-28 bg-bg-section border-y border-border-subtle">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            {/* El rótulo es deliberado y viene de `docs/00-product-brief.md`:
             * evita que la página se lea como un ranking de facetas. */}
            <Rotulo>02 · Tres dimensiones, ninguna sustituye a las otras</Rotulo>

            <div className="mt-10 grid md:grid-cols-3 gap-8">
              {DIMENSIONES.map((dimension) => (
                <article
                  key={dimension.eje}
                  className="bg-bg-page rounded-lg border border-border-subtle p-8 flex flex-col"
                >
                  <h2 className="font-heading font-bold text-2xl text-ink-default">
                    {dimension.verbo}
                  </h2>
                  <p className="mt-4 font-body text-base leading-relaxed text-ink-muted">
                    {dimension.texto}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 03 · Trabajo — copy deck §2 → Cierre                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="py-20 md:py-28 bg-bg-page">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-14 md:gap-20">
            <div>
              <Rotulo>03 · Trabajo</Rotulo>
              <p className="font-body text-lg md:text-xl leading-relaxed text-ink-muted">
                Un proyecto es una unidad de trabajo con dueño e intención; un
                repositorio es un artefacto suyo, no el proyecto. Buena parte
                del mío vive en repos privados y por eso no aparece entero.
              </p>
              <Link
                href="/proyectos"
                className="mt-6 inline-block font-heading font-semibold text-brand-primary hover:text-brand-accent transition-colors underline underline-offset-4 decoration-border-default hover:decoration-brand-accent"
              >
                Ver mi trabajo →
              </Link>
            </div>

            {/* ------------------------------------------------------------ */}
            {/* 04 · Método — copy deck §2 → Cierre                          */}
            {/* ------------------------------------------------------------ */}
            <div>
              <Rotulo>04 · Método</Rotulo>
              <h2 className="font-heading font-bold text-2xl md:text-3xl text-ink-default mb-5">
                Puedes comprobar lo que afirmo, o ver por qué no puedes.
              </h2>
              {/* «todavía» aparece aquí a propósito. El copy deck lo marca y lo
               * autoriza **en la portada**, porque describe el estado del
               * sistema en prosa editorial; lo que está prohibido es usarlo en
               * las rutas de evidencia. Si este bloque se mueve a `/evidencia`,
               * se reescribe (`docs/brand/03` §2, aviso de implementación). */}
              <p className="font-body text-lg leading-relaxed text-ink-muted">
                Publico mis afirmaciones con su procedencia y su
                verificabilidad. Hoy casi todo es material declarado: lo afirmo
                yo, y todavía no hay forma de que un tercero lo compruebe. Eso
                también está dicho.
              </p>
              <Link
                href="/evidencia"
                className="mt-6 inline-block font-heading font-semibold text-brand-primary hover:text-brand-accent transition-colors underline underline-offset-4 decoration-border-default hover:decoration-brand-accent"
              >
                Cómo respaldo lo que afirmo →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 05 · Trabajar conmigo                                             */}
      {/*                                                                   */}
      {/* La sección breve de cierre que pide `docs/brand/02` §4 (mitigación */}
      {/* 4): deja viva la URL compartible `/#trabajar-conmigo` y le da a    */}
      {/* quien aterriza en la portada buscando comercio una puerta sin      */}
      {/* scrollear a ciegas. Es una **puerta**, no la oferta: ni precios ni */}
      {/* alcance ni plazos viven en esta ruta. La etiqueta sale del copy    */}
      {/* deck §3 y §9 («Navegación → Trabajar conmigo»).                    */}
      {/* ---------------------------------------------------------------- */}
      <section
        id="trabajar-conmigo"
        className="py-16 md:py-20 bg-bg-section border-t border-border-subtle"
      >
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <Rotulo>05 · Trabajar conmigo</Rotulo>
            <Button href="/colaborar" variant="primary" size="md">
              Trabajar conmigo
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
