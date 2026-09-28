import type { Metadata } from "next";
import Link from "next/link";
import { leerActividad, periodosCompletos } from "../../lib/proof/actividad.ts";
import { fechaEnProsa } from "../../lib/proof/proyectos-filtros.ts";

export const metadata: Metadata = {
  title: "Actividad registrada",
  description: "Qué volumen de trabajo quedó registrado por periodo, de qué fuente sale y qué parte del trabajo no cubre.",
  alternates: { canonical: "/actividad" },
};

const motivos = {
  sin_fuente_registrada: "Sin fuente registrada para este periodo.",
  fuera_del_periodo_medido: "Fuera del periodo medido por WakaTime.",
  fuente_no_respondio: "La fuente no respondió para este periodo.",
};
const limites = "No cubre reuniones, diseño, lectura, docencia presencial ni máquinas sin el plugin. La cobertura del trabajo es desconocida aunque la temporal sea alta; no se estima.";
const etiquetas = { commits: "Commits", pull_requests: "Pull requests", reviews: "Revisiones", releases: "Releases", deployments: "Despliegues" };

export default function ActividadPage() {
  const { proceso, actividad, claims, generatedAt } = leerActividad();
  const periodos = periodosCompletos([
    ...(proceso?.records.map(r => r.period) ?? []), ...(proceso?.absences.map(r => r.period) ?? []),
  ]);
  const periodosActividad = periodosCompletos(actividad?.buckets.map(b => b.period) ?? []);
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-ink-default sm:py-24">
      <h1 className="text-4xl leading-tight sm:text-5xl">Actividad registrada</h1>
      <p className="mt-6">Estas cifras no implican competencia, calidad ni seniority. Describen registros por periodo, no resumen a una persona.</p>
      <p className="mt-4">Los huecos declarados son el estado correcto del sistema: el permiso para publicar no crea el dato. No son un defecto pendiente.</p>

      <section id="editor" aria-labelledby="editor-titulo" className="mt-12 border-t border-border-subtle pt-6">
        <h2 id="editor-titulo" className="text-2xl">Proceso: tiempo humano registrado en editor</h2>
        <p className="mt-4">Fuente: WakaTime. Solo agregado por periodo. No se muestran cifras por proyecto: los nombres de proyecto son nombres de repositorios, muchos privados.</p>
        <p className="mt-4">{limites}</p>
        <p className="mt-4">Son segundos de actividad registrada acumulada, no tiempo transcurrido ni tiempo con el editor abierto. Esta declaración de proceso no respalda afirmaciones de evidencia.</p>
        {periodos.length === 0 ? <p className="mt-6">Sin dato publicado: {proceso ? "el artefacto de proceso no declara periodos medidos ni ausencias por periodo." : "no hay artefacto de proceso publicado; no hay un registro de WakaTime que el sitio pueda mostrar."} El periodo y su cobertura temporal tampoco están declarados.</p> : <>
          <p className="mt-6">Serie completa del rango publicado, en orden cronológico dentro de cada granularidad (meses y trimestres). No se conoce un rango fuera de los periodos declarados.</p>
          {[false, true].map(trimestre => {
            const serie = periodos.filter(p => p.includes("Q") === trimestre);
            return serie.length ? <p key={String(trimestre)} className="mt-2">Rango de {trimestre ? "trimestres" : "meses"}: {serie[0]} a {serie[serie.length - 1]}.</p> : null;
          })}
          <ul className="mt-4 space-y-6">
            {periodos.map(periodo => {
              const registro = proceso!.records.find(r => r.period === periodo);
              const ausencia = proceso!.absences.find(r => r.period === periodo);
              return <li key={periodo} data-periodo={periodo} className="border-t border-border-subtle pt-4">
                <p>Periodo: {periodo}. {registro ? <>Tiempo registrado en editor: {registro.seconds} segundos de actividad registrada. Cobertura temporal: {registro.coverage.dias_con_dato} de {registro.coverage.dias_del_periodo} días {registro.coverage.periodo_abierto ? "transcurridos: el periodo seguía en curso en la fecha de corte, así que los días que faltan por ocurrir no cuentan como cobertura perdida" : "del periodo, que ya estaba cerrado en la fecha de corte"}. Cobertura del trabajo: {registro.coverage.del_trabajo}.</> : <>Sin dato publicado. {ausencia ? motivos[ausencia.motivo_de_ausencia] : "El artefacto no declara dato ni motivo para este periodo; no se infiere la causa."}</>}</p>
                {registro && <details className="mt-2"><summary className="cursor-pointer underline">Fuente, unidad y límites del registro de {periodo}</summary><p className="mt-2">Fuente: WakaTime. Unidad: segundos de actividad registrada (recorded_activity_seconds), duración acumulada. {limites} Un cero publicado es una observación explícita, no un periodo ausente. El sitio lee el agregado publicado; no deduplica ni recalcula la medición.</p></details>}
              </li>;
            })}
          </ul>
        </>}
      </section>

      <section id="agentes" aria-labelledby="agentes-titulo" className="mt-12 border-t border-border-subtle pt-6">
        <h2 id="agentes-titulo" className="text-2xl">Proceso: duración de ejecuciones de agentes</h2>
        <p className="mt-4">Sin dato: no existe una fuente registrada que mida la duración de las ejecuciones de agentes. No se conocen periodo, unidad registrada ni cobertura. Este bloque no comparte total, serie ni eje con el tiempo humano en editor.</p>
      </section>

      <section id="actividad-feed" aria-labelledby="actividad-titulo" className="mt-12 border-t border-border-subtle pt-6">
        <h2 id="actividad-titulo" className="text-2xl">Actividad del feed vinculada a afirmaciones</h2>
        {!periodosActividad.length ? <p className="mt-4">Sin dato publicado: {actividad ? "el artefacto no contiene periodos de actividad." : "no hay artefacto de actividad publicado; el motor de evidencia no emite este artefacto."} Por eso no hay cifras.</p> : <>
          <p className="mt-4">Periodos en orden cronológico dentro de cada granularidad; afirmaciones en orden del Registry. La actividad de un proyecto colectivo corresponde al proyecto, no a una contribución personal.</p>
          <p className="mt-4">Fecha de generación del feed: {generatedAt ? fechaEnProsa(generatedAt) : "sin dato publicado"}.</p>
          <ul className="mt-4 space-y-6">{periodosActividad.map(periodo => <li key={periodo}>
            <h3>Periodo: {periodo}</h3>
            {actividad!.buckets.filter(b => b.period === periodo).length === 0 ? <p>Sin dato publicado. El feed no permite distinguir la causa de la ausencia.</p> : actividad!.buckets.filter(b => b.period === periodo).map((bucket, index) => <div key={index} className="mt-4 border-t border-border-subtle pt-4">
              <p>Alcance: {bucket.project_id ? "proyecto del claim" : "proyectos de las afirmaciones vinculadas"}. Fuentes {bucket.visibility_scope === "mixed" ? "públicas y privadas agregadas" : "públicas"}.</p>
              <ul>{claims.filter(c => bucket.claim_ids.includes(c.id)).map(c => <li key={c.id}><Link className="underline" href="/evidencia">{c.statement}</Link> (claim_ids: {c.id})</li>)}</ul>
              <ul>{(Object.keys(etiquetas) as (keyof typeof etiquetas)[]).map(key => <li key={key}>{etiquetas[key]}: {bucket.counts[key]} eventos registrados en {periodo}.</li>)}</ul>
              <details className="mt-2"><summary className="cursor-pointer underline">Fuente, cobertura y límites de estas cifras</summary><p>Fuente: activity.json del motor de evidencia. Unidad: eventos registrados en {periodo}. Cobertura: solo los eventos publicables de las afirmaciones vinculadas; el feed no declara una fracción del trabajo total. No cubre trabajo sin registro ni eventos excluidos por la política de publicación. Un cero es un conteo publicado, no una ausencia. El sitio no recalcula ni deduplica estos conteos.</p></details>
            </div>)}
          </li>)}</ul>
        </>}
      </section>
      <p className="mt-12">El índice canónico del sistema de evidencia está en <Link href="/evidencia" className="underline">cómo respaldo lo que afirmo</Link>. También puedes explorar <Link href="/proyectos" className="underline">los proyectos</Link>.</p>
    </main>
  );
}
