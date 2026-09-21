import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { leerFeed, claimsDeProyecto } from "@/lib/proof/feed";
import { proyectoAVista } from "@/lib/proof/proyectos-vista";
import { DIMENSION_COPY, fechaEnProsa } from "@/lib/proof/proyectos-filtros";
import { ClaimCard } from "@/components/proof/ClaimCard";

/**
 * `/proyectos/[slug]` — la ficha de un proyecto.
 *
 * **Regla G6:** los claims que sostiene se computan filtrando `claims` por
 * `project_ids`. El índice inverso `Project → Claims` no se persiste en ningún
 * artefacto: la arista la posee `claims[].project_ids`, y guardar la inversa
 * crearía una segunda fuente de verdad para la misma relación, capaz de discrepar
 * sin que nada fallara.
 *
 * ## Contribución y crédito, separados también aquí
 *
 * `decisions/0015` §4-ter no distingue superficies: donde se presenta un proyecto
 * hay que separar lo que el sujeto declara haber hecho de lo que es de un equipo.
 * Si el índice lo separara y la ficha no, la distinción sería decorativa — la
 * ficha es justo donde un lector va a buscar «¿y esto lo hizo él?».
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

  const vista = proyectoAVista(estado.feed, proyecto);
  const claims = claimsDeProyecto(estado.feed, proyecto.id);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <p className="text-sm text-ink-muted">
        <Link href="/proyectos" className="underline underline-offset-2">
          Proyectos
        </Link>
      </p>

      <h1 className="mt-3 text-4xl leading-tight text-ink-default sm:text-5xl">
        {vista.titulo}
      </h1>

      <p className="mt-4 text-sm uppercase tracking-wide text-ink-muted">
        {vista.tipo}, {vista.estado} · desde {vista.inicioEnProsa}
        {vista.finEnProsa && ` hasta ${vista.finEnProsa}`}
      </p>

      <p className="mt-6 text-lg leading-relaxed text-ink-balance">
        <span className="text-sm uppercase tracking-wide text-ink-muted">
          Propósito declarado:{" "}
        </span>
        {vista.tesis}
      </p>

      {/* Artefactos: estado DECLARADO, nunca un espacio en blanco donde iria una
          captura. Un hueco se lee como que algo fallo; esta frase se lee como lo
          que es. `docs/03` §7 reserva a un humano publicar un valor nuevo en la
          superficie publica, y la politica que autorizaria un activo no existe. */}
      <section className="mt-10" aria-labelledby="h-artefactos">
        <h2 id="h-artefactos" className="text-sm uppercase tracking-wide text-ink-muted">
          Artefactos de este proyecto
        </h2>
        <p className="mt-3 text-ink-balance">
          <strong>Ninguno publicado.</strong> Publicar la captura de un proyecto abre
          superficie pública nueva, y quién autoriza un activo —y contra qué se comprueba esa
          autorización— no está escrito en la especificación de este sistema. Sin esa
          decisión no hay imagen, y en el código de esta ficha no existe ninguna ruta capaz
          de mostrar una.
        </p>
      </section>

      {/* Contribucion y credito, SEPARADOS. El contrato no guarda personas ---
          guarda rol y contexto--- y por eso no hay ningun porcentaje de autoria
          que publicar: publicarlo revelaria composicion de equipo ajena. */}
      <section className="mt-10" aria-labelledby="h-participacion">
        <h2 id="h-participacion" className="font-heading text-2xl text-ink-default">
          Participación
        </h2>
        <dl className="mt-4 space-y-4 border-t border-border-subtle pt-5 text-base">
          <div className="sm:grid sm:grid-cols-[11rem_1fr] sm:gap-4">
            <dt className="text-sm uppercase tracking-wide text-ink-muted">
              Contribución declarada
            </dt>
            <dd className="text-ink-default">
              Rol en el feed: {vista.rol}.{" "}
              {vista.dimensiones.length > 0
                ? `Sostiene ${vista.dimensiones.map((d) => DIMENSION_COPY[d]).join(" y ")}.`
                : "No sostiene ninguna afirmación publicada."}
            </dd>
          </div>
          <div className="sm:grid sm:grid-cols-[11rem_1fr] sm:gap-4">
            <dt className="text-sm uppercase tracking-wide text-ink-muted">Crédito</dt>
            <dd className="text-ink-default">
              {vista.colectivo
                ? `Trabajo en el contexto de ${vista.contexto}, con más manos que las suyas: el crédito es del equipo. ` +
                  "Qué parte del trabajo es de quién no se publica, porque esa cifra describiría a personas que no lo decidieron."
                : "Trabajo personal. El feed guarda el rol y el contexto, nunca a las personas, así que aquí no hay nombres ni reparto de autoría."}
            </dd>
          </div>
        </dl>
      </section>

      {vista.fuentesPublicas.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm uppercase tracking-wide text-ink-muted">Fuentes públicas</h2>
          <ul className="mt-2 space-y-1">
            {vista.fuentesPublicas.map((s) => (
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
          <p className="mt-3 border-l-2 border-border-default pl-4 text-sm text-ink-balance">
            <strong>Poder abrir un repositorio no es haberlo hecho.</strong> Un enlace prueba
            que el código existe y es público; lo que dice de la participación es el rol
            declarado de arriba, y nada más.
          </p>
        </section>
      )}

      {/* `has_private_sources` es la forma correcta de decir "hay mas trabajo del
          que se puede mostrar", sin nombrar nada. Es senal de credibilidad, no de
          carencia, y por eso se escribe en prosa y no como un contador. */}
      {vista.tieneFuentesPrivadas && (
        <p className="mt-6 text-ink-balance">
          Parte del trabajo de este proyecto vive en repositorios privados. Se publica el
          hecho, nunca la identidad de esos repositorios.
        </p>
      )}

      <section className="mt-14">
        <h2 className="font-heading text-2xl text-ink-default">Afirmaciones que sostiene</h2>
        {claims.length === 0 ? (
          /* Nunca una seccion de claims vacia: con doce proyectos y tres
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

      <section className="mt-14">
        <h2 className="font-heading text-2xl text-ink-default">Actividad de este proyecto</h2>
        <p className="mt-3 text-ink-balance">
          <strong>Sin dato publicado.</strong> La actividad por periodo vive en un archivo
          propio del feed que el motor de evidencia no emite, así que no hay registro que
          leer. No hay cifra, y tampoco un cero: un cero afirmaría que no hubo trabajo.
        </p>
      </section>

      <footer className="mt-16 border-t border-border-subtle pt-6 text-sm text-ink-muted">
        <p>
          El feed que sostiene esta ficha se publicó el{" "}
          {fechaEnProsa(estado.feed.meta.generated_at)}.
        </p>
        <p className="mt-2">
          <Link href="/evidencia" className="text-brand-primary underline underline-offset-2">
            Cómo decido qué puedo probar
          </Link>
        </p>
      </footer>
    </main>
  );
}
