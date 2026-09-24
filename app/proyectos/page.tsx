import type { Metadata } from "next";
import Link from "next/link";

import { ExploradorDeProyectos } from "@/components/proof/ExploradorDeProyectos";
import { vistaDeProyectos } from "@/lib/proof/proyectos-vista";

/**
 * `/proyectos` — el **desglose**, no el índice.
 *
 * El índice canónico es `/evidencia`, porque la cadena del dominio va
 * `Claim → Project → Evidence` y entrar por los proyectos la invierte. La
 * autorización **F** de `decisions/0015` §4 concede a esta ruta presencia visual
 * plena **sin** que reclame ser el índice: enlaza a él y lo dice.
 *
 * ## Qué cambia con la enmienda, y qué no
 *
 * Cambia que hay filtros por proyecto, periodo y dimensión (autorizaciones D y
 * E), y que la contribución personal y el crédito al equipo se rotulan por
 * separado en cada fila. No cambia ninguna regla de presentación: sin ranking,
 * sin barras, sin flechas, sin contadores animados, y toda cifra con su detalle.
 * Las seis reglas de forma están traducidas una por una en
 * `docs/plataforma/01-noticias-y-actividad.md` §2.
 *
 * ## Lo que la autorización F concede y esta entrega no usa
 *
 * Presencia visual plena incluiría enseñar el trabajo. No se enseña ninguno:
 * publicar la captura de un proyecto es publicar un valor nuevo en la superficie
 * pública (`docs/03` §7, decisión humana), y la política que autorizaría un
 * activo —quién lo autoriza y contra qué se comprueba— no está escrita en
 * `docs/`. Decisión de Rodrigo del 2026-09-21: sin esa política, cero imágenes.
 * El estado se declara en pantalla en vez de dejar el espacio en blanco.
 *
 * ## Por qué esta pantalla casi no tiene cifras
 *
 * Porque no hay de dónde sacarlas sin romper algo. Un conteo de actividad es
 * **métrica de evidencia** y necesita `claim_ids` (`AGENTS.md`); vive en
 * `activity.json`, que el motor no emite (`docs/plataforma/01` §5.3). Y el sitio
 * no computa métricas: solo lee y renderiza. Así que donde iría esa cifra hay un
 * hueco rotulado, que es el estado correcto del sistema y no una entrega a medias
 * (`decisions/0015` § *Consecuencias*, punto 3).
 */

export const metadata: Metadata = {
  title: "Proyectos",
  description:
    "Los proyectos sobre los que se apoyan mis afirmaciones, con su propósito declarado y su estado real.",
};

export default function ProyectosPage() {
  const vista = vistaDeProyectos();

  if (vista.estado === "ausente") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <h1 className="text-4xl leading-tight text-ink-default sm:text-5xl">Proyectos</h1>
        <p className="mt-6 text-lg leading-relaxed text-ink-balance">
          La publicación estructurada no está disponible. Los proyectos se publican como
          archivos versionados y en este sitio no hay ninguno: sin ese archivo no hay
          proyectos que mostrar, y duplicarlos en el código crearía una segunda fuente de
          verdad.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-ink-balance">
          <Link href="/evidencia" className="text-brand-primary underline underline-offset-2">
            Cómo respaldo lo que afirmo
          </Link>{" "}
          explica de dónde saldría, y con qué límites.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <h1 className="text-4xl leading-tight text-ink-default sm:text-5xl">Proyectos</h1>

      <p className="mt-6 text-lg leading-relaxed text-ink-balance">
        De cada proyecto está lo declarado en el Registry: qué se propone, de qué tipo es,
        en qué estado, desde cuándo, y qué papel tuvo él dentro. Donde el trabajo es de un
        equipo, el crédito se atribuye al equipo y se dice en la misma fila.
      </p>
      <p className="mt-4 text-lg leading-relaxed text-ink-balance">
        Un proyecto es una unidad de trabajo con dueño e intención; un repositorio es un
        artefacto suyo, no el proyecto. El índice canónico de este sistema son{" "}
        <Link href="/evidencia" className="text-brand-primary underline underline-offset-2">
          las afirmaciones
        </Link>
        , y esta pantalla no lo sustituye: lo desglosa.
      </p>

      <ExploradorDeProyectos proyectos={vista.proyectos} />

      {/* ACTIVIDAD: hueco declarado, y se queda visible con cualquier filtro.
          `docs/plataforma/01` §4.4.3 --- un filtro no oculta un hueco --- y §5.3,
          que fija literalmente qué se renderiza cuando el artefacto no existe:
          sin cifras, sin ceros, sin esqueleto y sin prometer fecha. */}
      <section className="mt-16" aria-labelledby="h-actividad">
        <h2 id="h-actividad" className="font-heading text-2xl text-ink-default">
          Actividad registrada por proyecto
        </h2>
        <p className="mt-3 text-ink-balance">
          <strong>Sin dato publicado.</strong> La actividad por periodo se publica en un
          archivo propio del feed, y el motor de evidencia no lo emite: no hay ningún
          registro que leer. Por eso aquí no hay ninguna cifra —ni un cero, que afirmaría que
          no hubo trabajo y sería falso—.
        </p>
        <p className="mt-3 text-ink-balance">
          Cuando ese archivo exista, la actividad colgará de las afirmaciones que sostiene y
          se mostrará por periodo. Los periodos sin dato seguirán rotulados como huecos: una
          fuente ausente es un dato desconocido, no un cero y no una promesa.
        </p>
        <p className="mt-3 text-sm text-ink-muted">
          El sitio no mide nada por su cuenta: lee lo que el motor publica y lo renderiza. No
          consulta ninguna API, no guarda credenciales y no computa métricas.
        </p>
      </section>

      {/* METODOLOGIA: extensa, al detalle y fuera de la pantalla principal. Los
          avisos de cobertura y de límites NO bajan aquí --- siguen pegados al
          contenido que califican, arriba. */}
      <section className="mt-16" aria-labelledby="h-metodologia">
        <h2 id="h-metodologia" className="font-heading text-2xl text-ink-default">
          Metodología y límites de publicación
        </h2>
        <p className="mt-3 text-ink-balance">
          Hay dos razones distintas para que falte un número, y no se parecen: que no exista
          la fuente, o que la fuente exista, el dato esté medido y pese a eso no se publique
          porque publicarlo señalaría a un tercero. Lo de arriba es de la primera clase; esto
          explica la segunda.
        </p>

        <div className="mt-6 space-y-4 text-ink-balance">
          <details className="border-t border-border-subtle pt-4">
            <summary className="cursor-pointer text-ink-default">
              Por qué esta pantalla se puede filtrar y el índice de evidencia no
            </summary>
            <div className="mt-3 space-y-3 border-l-2 border-border-default pl-4">
              <p>
                Filtrar por proyecto, por periodo y por dimensión está autorizado{" "}
                <strong>solo</strong> en las superficies de proyectos y de actividad. En{" "}
                <Link
                  href="/evidencia"
                  className="text-brand-primary underline underline-offset-2"
                >
                  /evidencia
                </Link>{" "}
                no hay ningún filtro: es el índice canónico, se muestra completo y en orden
                de Registry, y un índice filtrado deja al lector sin saber qué no está
                viendo.
              </p>
              <p>
                Aquí se puede filtrar porque aquí no se afirma nada sobre nadie: se recorta
                una lista de trabajo declarado. Y el control nunca dice cuántos resultados
                hay por opción, porque eso pondría las dimensiones una al lado de otra con su
                número, que es exactamente la comparación que la regla evita.
              </p>
            </div>
          </details>

          <details className="border-t border-border-subtle pt-4">
            <summary className="cursor-pointer text-ink-default">
              Medido, y deliberadamente no publicado
            </summary>
            <div className="mt-3 space-y-3 border-l-2 border-border-default pl-4">
              <p>
                De las fuentes que este sistema puede leer, solo es publicable lo que sale de
                repositorios públicos: es lo único que un tercero puede recontar por su
                cuenta sin que revele volumen de trabajo que no está publicado.
              </p>
              <p>
                El agregado de todos los contextos está medido y no se publica, ni como
                total, ni por mes, ni por organización. Combinar sujetos no basta: si uno
                solo aporta la mayor parte del total, el total lo describe a él. Y no se
                publican dos cortes que se resten entre sí, porque el tercero quedaría
                despejado por diferencia.
              </p>
              <p>
                Esta nota no dice cuánto es ninguna de esas cifras. Decirlo sería publicar en
                prosa lo que se declara no publicar. Lo que cuesta la regla es que la parte
                publicable es una esquina pequeña del trabajo real, y esa es la incomodidad
                correcta: antes una cifra comprobable y modesta que una persuasiva que señale
                a un tercero.
              </p>
            </div>
          </details>

          <details className="border-t border-border-subtle pt-4">
            <summary className="cursor-pointer text-ink-default">
              Qué no significa nada de lo que hay en esta pantalla
            </summary>
            <div className="mt-3 space-y-3 border-l-2 border-border-default pl-4">
              <p>
                <strong>Tener acceso a un repositorio no es haberlo hecho.</strong> Ni el
                acceso ni la presencia en este registro dicen quién construyó qué, y por eso
                lo que se publica de la participación es el rol declarado y el contexto del
                trabajo.
              </p>
              <p>
                <strong>Trabajo colectivo no es contribución personal.</strong> Donde el
                trabajo es de equipo se atribuye al equipo. El reparto de autoría dentro de
                un repositorio compartido no se publica en ninguna forma: describiría a
                personas que no lo decidieron.
              </p>
              <p>
                <strong>Nada de esto implica competencia, calidad ni seniority.</strong> Los
                conteos y la telemetría describen actividad; no otorgan ninguna de las tres.
                No existe un número que resuma a una persona, y no es una función que falte:
                está fuera del producto.
              </p>
            </div>
          </details>
        </div>
      </section>

      {/* Fecha absoluta y en prosa, nunca relativa. Y los conteos dentro de una
          oracion, nunca como fila de cifras: una fila de cifras es el dashboard
          que este sistema existe para no ser (`docs/05`). */}
      <footer className="mt-16 border-t border-border-subtle pt-6 text-sm text-ink-muted">
        {/* Una sola cifra en toda la pantalla, y vive arriba con su detalle: el
            recuento de resultados. Repetir aquí el total de proyectos y el de
            afirmaciones crearía dos cifras más sin nada que añadir, y la regla
            pide que el detalle aporte lo que la cifra no dice. */}
        <p>El feed que sostiene esta pantalla se publicó el {vista.publicadoEl}.</p>
        <p className="mt-2">
          <Link href="/evidencia" className="text-brand-primary underline underline-offset-2">
            Cómo respaldo lo que afirmo
          </Link>
        </p>
      </footer>
    </main>
  );
}
