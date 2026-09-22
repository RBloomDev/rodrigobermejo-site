"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import {
  DIMENSION_COPY,
  FILTROS_VACIOS,
  creditoDe,
  filtrarProyectos,
  opcionesDeDimension,
  opcionesDePeriodo,
  opcionesDeProyecto,
  type Dimension,
  type Filtros,
  type ProyectoVista,
} from "@/lib/proof/proyectos-filtros";

/**
 * El explorador de `/proyectos`: los tres filtros y lo que dejan ver.
 *
 * ## Qué lo autoriza
 *
 * Autorizaciones **D** y **E** de `decisions/0015` §4, aterrizadas en
 * `docs/plataforma/01-noticias-y-actividad.md` §4. Aquí se puede filtrar porque
 * aquí no se afirma nada sobre nadie; en `/evidencia` el índice se queda
 * completo, sin filtros y en orden de Registry, y esa reserva es parte de la
 * misma frase que concede el permiso.
 *
 * ## Las reglas que este componente tiene que sostener, y dónde se ven
 *
 * - **Ningún control muestra conteos por opción** (§4.2). El control dice
 *   «Formo», nunca «Formo (2)»: un conteo por opción pone las tres dimensiones
 *   una al lado de otra con su número, y eso las ordena. El recuento de
 *   resultados sí es legítimo, y por eso vive **fuera** del control.
 * - **Sin orden por magnitud** (§2.3). El orden es el del Registry, entra y sale
 *   igual, y la pantalla lo declara en texto.
 * - **Sin filtro por defecto** (§4.4.4): la primera carga muestra las doce filas.
 * - **Un filtro no oculta un hueco** (§4.4.3): el bloque de actividad no se
 *   filtra, porque su hueco no es un resultado de búsqueda.
 * - **Estado vacío honesto** (§4.4.1): dice que no hay resultados *para ese
 *   filtro*, y ofrece limpiarlo. Nunca «no hay trabajo».
 *
 * ## Por qué no hay ninguna imagen, y por qué eso se dice en pantalla
 *
 * Este componente **no puede** renderizar una captura: no importa `next/image`,
 * no recibe ningún campo de imagen y `ProyectoVista` no lo transporta. La razón
 * no es de diseño. Publicar la pantalla de un proyecto es publicar un valor nuevo
 * en la superficie pública, y `docs/03` §7 reserva esa decisión a un humano; lo
 * que falta no es la imagen sino la política que la autorizaría —quién autoriza
 * un activo y contra qué se comprueba esa autorización—, y esa política no está
 * escrita en `docs/`. Decisión de Rodrigo del 2026-09-21.
 *
 * Y el estado se **declara**: un espacio vacío donde debería ir una captura se
 * lee como que algo falló; una frase que dice que no hay artefactos publicados y
 * por qué se lee como lo que es. Sin prometer fecha, que es lo que prohíbe
 * `docs/05` § *Contrato de presentación* y comprueba
 * `tests/proof-sin-promesas-de-futuro.test.ts`.
 */

function Ficha({ p }: { p: ProyectoVista }) {
  return (
    <li className="border-t border-border-subtle py-6">
      <h4 className="font-heading text-xl text-ink-default">
        <Link href={`/proyectos/${p.id}`} className="underline underline-offset-2">
          {p.titulo}
        </Link>
      </h4>
      {/* La tesis se desmarca del statement de un claim a proposito: se lee como
          una afirmacion, pero el contrato no le da procedencia ni verificabilidad
          --- no existen en projects.json. */}
      <p className="mt-1 text-sm text-ink-muted">
        <span className="uppercase tracking-wide">Propósito declarado:</span> {p.tesis}
      </p>
      <p className="mt-2 text-sm text-ink-muted">
        {p.tipo}, {p.estado} · desde {p.inicioEnProsa}
        {p.finEnProsa && ` hasta ${p.finEnProsa}`}
        {p.tieneFuentesPrivadas && " · parte del trabajo no es público"}
      </p>
      {/* Contribucion y credito, SEPARADOS y rotulados, en cada fila.
          `decisions/0015` §4-ter: trabajo colectivo no es contribucion personal.
          Aqui no hay porcentaje de autoria que ocultar porque el contrato no
          guarda personas ---guarda rol y contexto---, y publicar ese reparto
          describiria a terceros que no lo decidieron.

          La frase de credito la construye `creditoDe`, no esta fila: la ficha
          del proyecto usa la MISMA, y una redaccion por superficie acabaria
          afirmando de mas en una de las dos. */}
      <dl className="mt-3 space-y-2 text-sm">
        <div className="sm:grid sm:grid-cols-[11rem_1fr] sm:gap-4">
          <dt className="uppercase tracking-wide text-ink-muted">Contribución declarada</dt>
          <dd className="text-ink-default">
            Rol en el feed: {p.rol}.{" "}
            {p.dimensiones.length > 0
              ? `Sostiene ${p.dimensiones.map((d) => DIMENSION_COPY[d]).join(" y ")}.`
              : "No sostiene ninguna afirmación publicada."}
          </dd>
        </div>
        <div className="sm:grid sm:grid-cols-[11rem_1fr] sm:gap-4">
          <dt className="uppercase tracking-wide text-ink-muted">Crédito</dt>
          <dd className="text-ink-default">{creditoDe(p.contexto)}</dd>
        </div>
      </dl>
    </li>
  );
}

export function ExploradorDeProyectos({ proyectos }: { proyectos: ProyectoVista[] }) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);

  const visibles = filtrarProyectos(proyectos, filtros);
  const conAfirmacion = visibles.filter((p) => p.dimensiones.length > 0);
  const sinAfirmacion = visibles.filter((p) => p.dimensiones.length === 0);

  const dimensiones = opcionesDeDimension();
  const proyectosOpc = opcionesDeProyecto(proyectos);
  const periodos = opcionesDePeriodo(proyectos);

  // Handler currificado a proposito: deja la etiqueta del boton pegada a
  // `{o.etiqueta}` y sin nada mas, que es lo que comprueba AC-PRY-02.
  const aplicarDimension = (valor: Dimension | "todas") => () =>
    setFiltros((f) => ({ ...f, dimension: valor }));

  const limpiar = () => setFiltros(FILTROS_VACIOS);

  // El formulario existe por semantica y por teclado; no hay nada que enviar,
  // porque el sitio es estatico y el filtrado ocurre en la misma pagina.
  const prevenirEnvio = (e: FormEvent<HTMLFormElement>) => e.preventDefault();

  const total = proyectos.length;
  const recuento =
    visibles.length === total
      ? `Se muestran los ${total} proyectos del Registry.`
      : `Se muestran ${visibles.length} de los ${total} proyectos del Registry, con los filtros aplicados.`;

  return (
    <>
      <section className="mt-12" aria-labelledby="h-filtros">
        <h2 id="h-filtros" className="font-heading text-2xl text-ink-default">
          Filtrar el registro
        </h2>
        <p className="mt-2 text-ink-balance">
          Los filtros recortan lo que ves; no cambian el orden, que es el del Registry, ni
          añaden nada que no estuviera publicado. El índice de las afirmaciones —
          <Link href="/evidencia" className="text-brand-primary underline underline-offset-2">
            /evidencia
          </Link>
          — no se filtra: ahí el conjunto se muestra entero a propósito.
        </p>

        <form
          className="mt-6 space-y-6 border-t border-border-subtle pt-6"
          onSubmit={prevenirEnvio}
        >
          <fieldset className="border-0 p-0">
            <legend className="text-sm uppercase tracking-wide text-ink-muted">
              Dimensión
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {dimensiones.map((o) => (
                <button
                  key={o.valor}
                  type="button"
                  aria-pressed={filtros.dimension === o.valor}
                  onClick={aplicarDimension(o.valor)}
                  className="border border-border-default px-3 py-1 text-sm text-ink-default underline-offset-4 aria-pressed:border-ink-default aria-pressed:underline"
                >
                  {o.etiqueta}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="f-proyecto"
                className="block text-sm uppercase tracking-wide text-ink-muted"
              >
                Proyecto
              </label>
              <select
                id="f-proyecto"
                className="mt-2 w-full border border-border-default bg-bg-page px-3 py-2 text-sm text-ink-default"
                value={filtros.proyecto}
                onChange={(e) => setFiltros((f) => ({ ...f, proyecto: e.target.value }))}
              >
                {proyectosOpc.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.etiqueta}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="f-periodo"
                className="block text-sm uppercase tracking-wide text-ink-muted"
              >
                Periodo
              </label>
              <select
                id="f-periodo"
                className="mt-2 w-full border border-border-default bg-bg-page px-3 py-2 text-sm text-ink-default"
                value={filtros.periodo}
                onChange={(e) => setFiltros((f) => ({ ...f, periodo: e.target.value }))}
              >
                {periodos.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.etiqueta}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={limpiar}
            className="border border-border-default px-3 py-1 text-sm text-ink-default"
          >
            Quitar los filtros
          </button>
        </form>

        {/* El recuento de RESULTADOS vive fuera del control: describe lo que estas
            viendo. Un conteo por opcion seria otra cosa, y esa esta prohibida. */}
        <p className="mt-4 text-ink-balance" role="status">
          {recuento}
        </p>
        {/* `decisions/0015` §3, condicion 6: que estas cifras no impliquen
            competencia, calidad ni seniority no se deja implicito ni se manda a
            una pagina de metodologia. Va junto a la cifra, sin desplegar nada. */}
        <p className="mt-2 text-ink-balance">
          Es un recuento de lo declarado en un registro, no una medida de nadie: no implica
          competencia, calidad ni seniority, y no hay ningún número aquí que resuma a una
          persona.
        </p>
        <details className="mt-2 text-sm text-ink-balance">
          <summary className="cursor-pointer text-ink-muted">
            Qué cubre este recuento y qué no
          </summary>
          <div className="mt-2 space-y-2 border-l-2 border-border-default pl-4">
            <p>
              <strong>Fuente:</strong> el Registry publicado en el feed de este sitio, leído
              en build. No se consulta ninguna API desde el navegador.
            </p>
            <p>
              <strong>Unidad:</strong> proyectos declarados, no repositorios ni entregas. Un
              proyecto es una unidad de trabajo con dueño e intención; un repositorio es un
              artefacto suyo.
            </p>
            <p>
              <strong>Qué no cubre:</strong> el universo de repositorios en el que se trabaja
              es mayor que este registro, y lo que está bajo acuerdo de confidencialidad no
              aparece aquí en ninguna forma, ni contado. Este número no mide volumen de
              trabajo, ni dificultad, ni competencia.
            </p>
          </div>
        </details>
      </section>

      {/* ARTEFACTOS: estado DECLARADO, no un hueco. Y no se filtra, por la misma
          razon que el bloque de actividad: `docs/plataforma/01` §4.4.3 --- un
          filtro recorta resultados, y esto no es un resultado. */}
      <section className="mt-16" aria-labelledby="h-artefactos">
        <h2 id="h-artefactos" className="font-heading text-2xl text-ink-default">
          Artefactos de estos proyectos
        </h2>
        <p className="mt-3 text-ink-balance">
          <strong>No hay ninguno publicado, y no es un hueco de esta pantalla.</strong>{" "}
          Publicar la captura de un proyecto es abrir superficie pública nueva, y quién
          autoriza un activo —contra qué se comprueba esa autorización, y qué pasa cuando el
          Registry cambia la visibilidad de un proyecto— es una decisión que no está escrita
          en la especificación de este sistema. Sin esa decisión no se publica ninguna
          imagen.
        </p>
        <p className="mt-3 text-ink-balance">
          No es un interruptor apagado: en el código de esta pantalla no existe ninguna ruta
          capaz de mostrar una imagen de un proyecto. Si alguien la añade sin que exista
          antes la autorización, la prueba que cubre esta regla se pone roja.
        </p>
        <p className="mt-3 text-sm text-ink-muted">
          Lo que queda es lo declarado en el Registry —propósito, tipo, estado, periodo y
          rol—, y no se completa con nada más. Un registro sin ilustraciones dice menos, y
          dice solo lo que puede sostener.
        </p>
      </section>

      <section className="mt-16" aria-labelledby="h-indice">
        <h2 id="h-indice" className="font-heading text-2xl text-ink-default">
          El registro
        </h2>
        <p className="mt-2 border-l-2 border-border-default pl-4 text-ink-balance">
          <strong>Cobertura: los proyectos declarados en el Registry, y nada más.</strong> El
          universo de repositorios en el que se trabaja es mayor que esta lista, y lo que
          está bajo acuerdo de confidencialidad no aparece aquí en ninguna forma, ni contado.
          De lo privado se publica el hecho de que existe, nunca su identidad.
        </p>
        <p className="mt-2 border-l-2 border-border-default pl-4 text-ink-balance">
          <strong>Crédito.</strong> Donde el trabajo es de una organización con equipo, el
          crédito es del equipo y la fila lo dice. Donde el contexto declarado no dice eso,
          tampoco se afirma lo contrario: el feed guarda el contexto del trabajo, no a las
          personas, así que no hay de dónde saber cuántas hubo. Por eso aquí no aparece ningún
          nombre —tampoco el suyo— como si el mérito fuera de uno solo.
        </p>

        {conAfirmacion.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm uppercase tracking-wide text-ink-muted">
              Proyectos que sostienen una afirmación
            </h3>
            <ul className="mt-2">
              {conAfirmacion.map((p) => (
                <Ficha key={p.id} p={p} />
              ))}
            </ul>
          </div>
        )}

        {sinAfirmacion.length > 0 && (
          <div className="mt-10">
            <h3 className="text-sm uppercase tracking-wide text-ink-muted">
              Proyectos que no sostienen ninguna afirmación
            </h3>
            <p className="mt-2 text-ink-balance">
              Existen y se muestran. Lo que no hacen es respaldar ninguna afirmación pública,
              así que no tienen dimensión asignada y desaparecen de la lista en cuanto se
              filtra por una. No es un defecto de los proyectos: es dónde están hoy.
            </p>
            <ul className="mt-2">
              {sinAfirmacion.map((p) => (
                <Ficha key={p.id} p={p} />
              ))}
            </ul>
          </div>
        )}

        {visibles.length === 0 && (
          <p className="mt-8 text-ink-balance">
            Ningún proyecto del Registry cumple esa combinación de filtros. No hay nada
            oculto detrás: quita los filtros y vuelve el registro completo.
          </p>
        )}

        <p className="mt-8 text-sm text-ink-muted">
          Orden del Registry, el mismo con o sin filtros. No hay orden por volumen, ni
          ranking, ni destacados: ordenar por cantidad convertiría el registro en marcador.
        </p>
      </section>
    </>
  );
}
