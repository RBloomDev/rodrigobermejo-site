import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { leerCorpus, leerPieza } from "../corpus";
import { vistaDePieza } from "../vista";

/**
 * `/noticias/[slug]` — una pieza del canal editorial.
 *
 * ## La regla que gobierna esta pantalla
 *
 * `docs/plataforma/02-editorial.md` §1: **«si no renderiza, no se declara»**. `01` §1.4 la
 * baja a un requisito comprobable —«no hay campo obligatorio que no se renderice»— y
 * enumera el mínimo: `tipo` siempre visible, `hecho` con `ocurrido_en` distinguido de
 * `redactado_en`, `que_cambia`, `mexico` con su estado, `no_establece[]` completo junto al
 * hallazgo, `fuente_primaria` y `fuentes[]` enlazadas con medio y fecha, la procedencia de
 * las cuatro etapas **abierta por defecto**, `relacion_declarada` cuando no sea `null`, y
 * `correcciones[]` cuando existan.
 *
 * Todo eso sale de `vistaDePieza`, y `tests/noticias-cinco-preguntas.test.ts` exige que
 * **cada** propiedad de ese modelo se renderice aquí. Un campo que se quede en el registro
 * y no llegue a la pantalla pone la suite roja.
 *
 * ## Qué no hay en esta pantalla, y es deliberado
 *
 * - **Ningún `<details>` sobre contenido de la pieza.** Ni la declaración de relación —un
 *   aviso que exige un clic es un aviso que no se dio (§1.3, requisito 3)—, ni los
 *   pendientes de verificación, ni la procedencia, que `01` §1.4 pide abierta por defecto
 *   porque «ellos la colapsan y el lector no se entera de que nadie revisó la nota».
 * - **Ninguna imagen.** El registro de §3 no tiene campo de imagen, y esta ficha no tiene
 *   ninguna ruta capaz de mostrar una. La regla de §4 —toda imagen generada con IA se
 *   atribuye con su modelo, y nunca se ilustra con IA la evidencia de la que depende la
 *   tesis— se cumple aquí por construcción: no hay ilustración que pueda sustituir a la
 *   fuente, que es el defecto ajeno del que nace la regla.
 * - **Ningún dato de evidencia.** Cero imports de `lib/proof`. El pie enlaza a
 *   `/evidencia`; nada viaja en la dirección contraria (`docs/03` §4).
 */

export function generateStaticParams(): { slug: string }[] {
  // Solo piezas publicadas. `leerCorpus` ya descartó los borradores al leer, así que un
  // borrador no tiene ruta y cada slug suyo responde 404 (`01` §1.1, requisito 2).
  return leerCorpus().map((pieza) => ({ slug: pieza.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pieza = leerPieza(slug);
  if (!pieza) return { title: "Noticias" };
  // `title` y `description` salen del corpus, **nunca del código**
  // (`docs/brand/02-arquitectura-y-urls.md` §5).
  return {
    title: pieza.titulo,
    description: pieza.entradilla,
    alternates: { canonical: `/noticias/${pieza.id}` },
  };
}

export default async function PiezaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pieza = leerPieza(slug);
  if (!pieza) notFound();

  const vista = vistaDePieza(pieza);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <p className="text-sm text-ink-muted">
        <Link href="/noticias" className="underline underline-offset-2">
          Noticias
        </Link>
      </p>

      {/* `tipo` visible y en palabras, nunca solo por color (§3). Junto a la fecha del
          hecho, que es la que fecha la pieza para el lector. */}
      <p className="mt-3 text-sm uppercase tracking-wide text-ink-muted">
        {vista.tipoEtiqueta} · {vista.ocurridoEn}
      </p>

      <h1 className="mt-2 text-4xl leading-tight text-ink-default sm:text-5xl">
        {vista.titulo}
      </h1>

      <p className="mt-6 text-lg leading-relaxed text-ink-balance">{vista.entradilla}</p>

      {/* CONFLICTO DE INTERES (§1.3): en el cuerpo, ANTES del primer párrafo del análisis,
          nunca plegado, y **solo cuando existe**. Un bloque «sin conflicto declarado» en
          toda pieza entrena al lector a ignorarlo, y entonces tampoco lee el que importa. */}
      {vista.relacion !== null && (
        <section
          className="mt-8 border-l-4 border-brand-primary bg-bg-section px-5 py-4"
          aria-labelledby="h-relacion"
        >
          <h2 id="h-relacion" className="text-sm uppercase tracking-wide text-ink-muted">
            Relación declarada
          </h2>
          <p className="mt-2 text-ink-default">{vista.relacion}</p>
        </section>
      )}

      <section className="mt-10" aria-labelledby="h-hecho">
        <h2 id="h-hecho" className="font-heading text-2xl text-ink-default">
          Qué ocurrió
        </h2>
        <p className="mt-3 text-ink-balance">{vista.hecho}</p>
        <p className="mt-2 text-sm text-ink-muted">Ocurrió el {vista.ocurridoEn}.</p>
      </section>

      <section className="mt-10" aria-labelledby="h-que-cambia">
        <h2 id="h-que-cambia" className="font-heading text-2xl text-ink-default">
          Qué cambia
        </h2>
        <p className="mt-3 text-ink-balance">{vista.queCambia}</p>
      </section>

      {/* MEXICO, con su estado y siempre (§2). `no_verificado` también se publica: sin un
          estado explícito, «en México» se convierte en relleno retórico en cuanto no hay
          dato local. */}
      <section className="mt-10" aria-labelledby="h-mexico">
        <h2 id="h-mexico" className="font-heading text-2xl text-ink-default">
          Qué aplica en México
        </h2>
        <p className="mt-3 text-sm uppercase tracking-wide text-ink-muted">
          {vista.mexico.etiqueta}
        </p>
        <p className="mt-2 text-ink-balance">{vista.mexico.texto}</p>
      </section>

      {/* Junto al hallazgo y no en un recuadro al final (§1.4). Completo: no se recorta. */}
      <section className="mt-10" aria-labelledby="h-no-establece">
        <h2 id="h-no-establece" className="font-heading text-2xl text-ink-default">
          Qué NO establece esta pieza
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-balance">
          {vista.noEstablece.map((limite) => (
            <li key={limite}>{limite}</li>
          ))}
        </ul>
      </section>

      {/* REVISION DE AFIRMACIONES: en el cuerpo, abierta, y con sus pendientes enumerados
          donde se leen. Un veredicto `parcial` sin sus pendientes a la vista es una pieza
          que parece comprobada; mandarlos a una nota al pie o a un `<details>` es la misma
          omisión con otra forma. */}
      <section className="mt-10" aria-labelledby="h-revision">
        <h2 id="h-revision" className="font-heading text-2xl text-ink-default">
          Revisión de afirmaciones
        </h2>
        <p className="mt-3 text-sm uppercase tracking-wide text-ink-muted">
          {vista.revision.etiqueta}
        </p>
        <p className="mt-2 text-ink-balance">{vista.revision.explicacion}</p>
        {vista.revision.tienePendientes && (
          <>
            <h3 className="mt-4 text-base text-ink-default">
              Lo que quedó sin comprobar
            </h3>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-ink-balance">
              {vista.revision.pendientes.map((pendiente) => (
                <li key={pendiente}>{pendiente}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* FUENTES: legibles y enlazables, con medio y fecha, y diciendo cuál es la primaria.
          Una lista de URLs desnudas no es legible, y una lista sin decir cuál sostiene el
          hecho no cumple §1.4. */}
      <section className="mt-12" aria-labelledby="h-fuentes">
        <h2 id="h-fuentes" className="font-heading text-2xl text-ink-default">
          Fuentes
        </h2>
        <p className="mt-3 text-ink-balance">
          La que sostiene el hecho es{" "}
          <a
            href={vista.fuentePrimaria.url}
            className="text-brand-primary underline underline-offset-2"
            rel="noopener noreferrer"
          >
            {vista.fuentePrimaria.titulo}
          </a>
          , de {vista.fuentePrimaria.medio} ({vista.fuentePrimaria.fecha}). Las demás
          corroboran: ninguna pieza se redacta con una sola.
        </p>
        <ul className="mt-4 space-y-4">
          {vista.fuentes.map((fuente) => (
            <li key={fuente.url} className="border-t border-border-subtle pt-3">
              <p className="text-sm uppercase tracking-wide text-ink-muted">{fuente.rol}</p>
              <p className="mt-1">
                <a
                  href={fuente.url}
                  className="text-brand-primary underline underline-offset-2"
                  rel="noopener noreferrer"
                >
                  {fuente.titulo}
                </a>
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                {fuente.medio} · {fuente.fecha}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* PROCEDENCIA, abierta por defecto y sin `<details>`: las cuatro etapas, con quién
          hizo cada una. Es lo que distingue este canal de una nota sin firma. */}
      <section className="mt-12" aria-labelledby="h-procedencia">
        <h2 id="h-procedencia" className="font-heading text-2xl text-ink-default">
          Procedencia
        </h2>
        <dl className="mt-4 space-y-4 border-t border-border-subtle pt-5">
          {vista.procedencia.map((etapa) => (
            <div key={etapa.clave} className="sm:grid sm:grid-cols-[9rem_1fr] sm:gap-4">
              <dt className="text-sm uppercase tracking-wide text-ink-muted">
                {etapa.etiqueta}
              </dt>
              <dd className="text-ink-default">
                {etapa.quien}
                {etapa.detalle !== "" && ` — ${etapa.detalle}`}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-ink-muted">
          De la redacción se guarda qué modelo la escribió, nunca qué se le dijo: el canal
          no conserva prompts ni transcripciones.
        </p>
      </section>

      {/* CORRECCIONES: cuando existan, con lo que la entrada declare y sin borrar el texto
          corregido. Si no hay ninguna, no hay bloque: un «sin correcciones» en toda pieza
          es ruido que enseña a no leer el aviso. */}
      {vista.correcciones.length > 0 && (
        <section className="mt-12" aria-labelledby="h-correcciones">
          <h2 id="h-correcciones" className="font-heading text-2xl text-ink-default">
            Correcciones
          </h2>
          <ul className="mt-4 space-y-4">
            {vista.correcciones.map((correccion, i) => (
              <li key={i} className="border-t border-border-subtle pt-3">
                <dl className="space-y-1">
                  {correccion.campos.map((campo) => (
                    <div key={campo.clave} className="sm:grid sm:grid-cols-[9rem_1fr] sm:gap-4">
                      <dt className="text-sm uppercase tracking-wide text-ink-muted">
                        {campo.clave}
                      </dt>
                      <dd className="text-ink-default">{campo.valor}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-16 border-t border-border-subtle pt-6 text-sm text-ink-muted">
        {/* `redactado_en` va aquí y rotulado como lo que es: la fecha de la pieza, no la
            del hecho. Confundirlas fecharía el hecho el día que se escribió sobre él. */}
        <p>
          Pieza redactada el {vista.redactadoEn}. El hecho que cubre ocurrió el{" "}
          {vista.ocurridoEn}.
        </p>
        <p className="mt-2">
          Esta pieza no es evidencia de mi trabajo ni se cuenta como tal.{" "}
          <Link href="/evidencia" className="text-brand-primary underline underline-offset-2">
            Cómo respaldo lo que afirmo
          </Link>{" "}
          es un registro aparte, y no se alimenta del canal editorial.
        </p>
      </footer>
    </main>
  );
}
