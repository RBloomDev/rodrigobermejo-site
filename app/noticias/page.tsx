import type { Metadata } from "next";
import Link from "next/link";

import { leerCorpus } from "./corpus";
import { vistaDeIndice } from "./vista";

/**
 * `/noticias` — el índice del canal editorial.
 *
 * ## De dónde salen estas piezas, y de dónde no
 *
 * Del **corpus editorial publicado**, `content/noticias/`, y de ningún otro sitio. No del
 * feed de evidencia, no de `docs/plataforma/prototipo/datos/piezas.json` —que es el
 * fixture de un prototipo y referencia no normativa— y no de nada que el sitio calcule.
 * La frontera es de `docs/03-privacy-and-publication-policy.md` §4: el contenido editorial
 * puede *enlazar* a evidencia y **jamás derivarse de ella ni alimentarla**.
 *
 * Por eso el pie enlaza a `/evidencia` y ninguna superficie de evidencia enlaza aquí: esa
 * dirección del enlace es la que convertiría el editorial en respaldo (`01` §1.2,
 * prohibición 4). El «Noticias» del menú es cromo del sitio, idéntico en toda ruta, y §1.2
 * lo declara permitido y distinto de un enlace en el cuerpo.
 *
 * ## El estado vacío no es una entrega a medias
 *
 * Hoy el corpus no tiene ninguna pieza: publicar una es una decisión de Rodrigo, que toma
 * el comando de autorización (`02-editorial.md` §8.4), y ningún agente la puede tomar por
 * él. `01` §5.4 y §5.5 fijan que este vacío es **el estado correcto del sistema**, no un
 * defecto pendiente, y qué se renderiza: el canal existe y todavía no hay nada publicado.
 * Sin conteo de borradores —publicaría su existencia—, sin fecha prometida y sin
 * «próximamente».
 */

export const metadata: Metadata = {
  // Los dos textos salen de `docs/brand/02-arquitectura-y-urls.md` §5, que es su
  // autoridad. No se escriben a ojo y no se afirma ninguna cantidad: el corpus puede
  // estar vacío, y un metadato que prometiera piezas quedaría mintiendo sin que nada
  // fallara.
  title: "Noticias",
  description:
    "Noticias y análisis de IA, software y educación, con lo que cada hecho cambia y qué aplica en México.",
  alternates: { canonical: "/noticias" },
};

export default function NoticiasPage() {
  const entradas = vistaDeIndice(leerCorpus());

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <h1 className="text-4xl leading-tight text-ink-default sm:text-5xl">Noticias</h1>

      <p className="mt-6 text-lg leading-relaxed text-ink-balance">
        Noticias y análisis de IA, software y educación. De cada pieza se publica qué
        ocurrió y cuándo, qué fuentes lo sostienen, qué cambia para quien lo lee, qué aplica
        en México —incluso cuando la respuesta es que no se sabe— y qué sigue sin estar
        probado.
      </p>

      {entradas.length === 0 ? (
        /* El estado declarado de `01` §5.4. Ni error, ni lista fantasma, ni esqueleto:
           la ausencia es el contenido, no un hueco a la espera de datos. */
        <section className="mt-10" aria-labelledby="h-sin-piezas">
          <h2 id="h-sin-piezas" className="font-heading text-2xl text-ink-default">
            Todavía no hay ninguna pieza publicada
          </h2>
          <p className="mt-3 text-ink-balance">
            El canal existe y funciona; lo que no hay es nada publicado. Una pieza solo
            aparece aquí cuando una persona autoriza su publicación, y esa decisión no la
            toma ningún automatismo de este sitio.
          </p>
          <p className="mt-3 text-ink-balance">
            Tampoco hay una fecha comprometida. El criterio es el del canal: si en una
            semana no hay nada que resista las cinco preguntas —el hecho con su fecha, dos
            fuentes que lo sostengan, qué cambia, qué aplica en México y qué sigue sin
            probarse—, esa semana no se publica nada.
          </p>
        </section>
      ) : (
        <section className="mt-12" aria-labelledby="h-piezas">
          <h2 id="h-piezas" className="sr-only">
            Piezas publicadas
          </h2>
          {/* El criterio de orden, declarado en texto. Es temporal, no de magnitud: no hay
              destacados, no hay «más leído» y ninguna pieza se dibuja más grande que otra,
              porque eso sería un ranking dibujado (`01` §1.4 y §2.3). */}
          <p className="text-sm text-ink-muted">
            En orden cronológico, de lo más reciente a lo más antiguo, por la fecha del
            hecho.
          </p>

          <ul className="mt-6 space-y-10">
            {entradas.map((entrada) => (
              <li key={entrada.id} className="border-t border-border-subtle pt-6">
                <p className="text-sm uppercase tracking-wide text-ink-muted">
                  {entrada.tipoEtiqueta} · {entrada.ocurridoEn}
                </p>
                <h3 className="mt-2 font-heading text-2xl text-ink-default">
                  <Link
                    href={entrada.href}
                    className="underline underline-offset-4 decoration-border-default hover:decoration-brand-primary"
                  >
                    {entrada.titulo}
                  </Link>
                </h3>
                <p className="mt-2 text-ink-balance">{entrada.entradilla}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-16" aria-labelledby="h-como-se-hace">
        <h2 id="h-como-se-hace" className="font-heading text-2xl text-ink-default">
          Cómo se hace una pieza de este canal
        </h2>
        <p className="mt-3 text-ink-balance">
          Un hecho se detecta, se redacta contra un esquema, se comprueban sus afirmaciones
          contra las fuentes, y una persona decide si se publica. Las cuatro etapas se
          enseñan en cada pieza, con quién hizo cada una y con qué modelo cuando lo hubo.
        </p>
        <p className="mt-3 text-ink-balance">
          Cuando una comprobación queda a medias, la pieza lo dice donde se lee y enumera
          qué quedó sin comprobar. No hay pieza sin fuentes: mínimo dos, y con una sola no
          se redacta.
        </p>
      </section>

      <footer className="mt-16 border-t border-border-subtle pt-6 text-sm text-ink-muted">
        <p>
          Este canal no es evidencia de mi trabajo y no se cuenta como tal en ninguna parte
          del sitio. Lo que sí se puede comprobar de lo que afirmo está en{" "}
          <Link href="/evidencia" className="text-brand-primary underline underline-offset-2">
            cómo respaldo lo que afirmo
          </Link>
          , que es un registro aparte y no se alimenta de aquí.
        </p>
      </footer>
    </main>
  );
}
