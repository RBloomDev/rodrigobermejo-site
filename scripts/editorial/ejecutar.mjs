/**
 * Orquestador del canal editorial (`docs/plataforma/02-editorial.md` §5).
 *
 *   detectar -> deduplicar -> redactar -> verificar -> escribir el corpus
 *
 * Las dos propiedades que esta corrida tiene que sostener, y como:
 *
 *   1. **Idempotencia.** Una segunda ejecucion sobre las mismas entradas no produce una
 *      pieza duplicada. Lo garantiza el nivel 3 de §5.2 (`estado/vistos.jsonl`), mas el
 *      corpus mismo como segunda barrera: `upsert()` no reescribe un `id` ni una `huella`
 *      que ya existan.
 *   2. **Un error de acceso no fabrica una noticia.** Una fuente caida produce una fila en
 *      `estado/errores.jsonl` y CERO items. Sin items no hay expediente, sin expediente no
 *      hay pieza. No hay ninguna rama del codigo en la que el conocimiento del modelo
 *      sustituya a una fuente que no se pudo leer (§5.5).
 *
 * Codigos de salida — un exito parcial tiene que ser distinguible de un exito:
 *   0  exito: todo lo previsto se leyo y se produjo.
 *   2  EXITO PARCIAL: hubo fallos de acceso o de verificacion; se produjo lo que si se
 *      pudo leer y queda constancia de lo que no (§5.5).
 *   1  fallo: la corrida no pudo completarse.
 *
 * Uso:
 *   node scripts/editorial/ejecutar.mjs
 *   node scripts/editorial/ejecutar.mjs --incluir el-economista   # fuerza un fallo real
 *   node scripts/editorial/ejecutar.mjs --entradas <snapshot.json>  # mismas entradas
 */

import { randomUUID } from 'node:crypto';
import {
  RUTA_PIEZAS, ahoraIso, argumentos, esCli, escribirJson, leerJson, registrarError,
} from './comun.mjs';
import { detectar, resolverFuentes } from './detectar.mjs';
import { cargarVistos, deduplicar, registrarVistos } from './deduplicar.mjs';
import { prepararExpediente, redactar } from './redactar.mjs';
import { sellarVerificacion, verificarPieza } from './verificar.mjs';

export async function ejecutar(banderas = {}) {
  const corrida = randomUUID().slice(0, 8);
  const inicio = ahoraIso();
  const linea = (s) => { if (!banderas.silencioso) console.log(s); };

  const piezasAntes = leerJson(RUTA_PIEZAS, []);
  linea(`== corrida ${corrida} · ${inicio}`);
  linea(`piezas en el corpus ANTES: ${piezasAntes.length}`);

  const fuentes = resolverFuentes(banderas);
  linea(`fuentes: ${fuentes.map((f) => `${f.id}[${f.estado}]`).join(', ')}`);

  // --- 1. detectar -------------------------------------------------------------
  let items;
  let erroresDeteccion = [];
  if (banderas.entradas) {
    items = leerJson(banderas.entradas, []);
    linea(`detectar: OMITIDO — se reusan ${items.length} entradas de ${banderas.entradas}`);
  } else {
    const d = await detectar({ fuentes });
    items = d.items;
    erroresDeteccion = d.errores;
    linea(`detectar: ${items.length} items de ${d.fuentesLeidas.length}/${fuentes.length} fuentes`);
    for (const e of erroresDeteccion) {
      linea(`  ! ERROR DE ACCESO  ${e.fuente_id} [${e.codigo}] ${e.mensaje}`);
      linea(`    -> ${e.consecuencia}  (escrito en estado/errores.jsonl)`);
    }
  }

  // --- 2. deduplicar -----------------------------------------------------------
  const { nuevos, repetidos } = deduplicar(items, { vistos: cargarVistos(), piezas: piezasAntes });
  linea(`deduplicar: ${nuevos.length} nuevos, ${repetidos.length} ya vistos`);
  const porMotivo = repetidos.reduce((a, r) => ({ ...a, [r.motivo]: (a[r.motivo] ?? 0) + 1 }), {});
  for (const [motivo, n] of Object.entries(porMotivo)) linea(`  - ${motivo}: ${n}`);
  registrarVistos(nuevos, { corrida });

  // --- 3. redactar -------------------------------------------------------------
  const expedientes = nuevos.map(prepararExpediente);
  let candidatas = [];
  let pendientes = [];
  const erroresRedaccion = [];
  try {
    const r = redactar(expedientes);
    candidatas = r.piezas;
    pendientes = r.pendientes;
  } catch (e) {
    erroresRedaccion.push(
      registrarError({
        etapa: 'redactar', corrida, codigo: 'ESQUEMA', mensaje: e.message,
        consecuencia: 'ninguna pieza de este lote entra al corpus',
      }),
    );
    linea(`  ! ERROR DE ESQUEMA  ${e.message}`);
  }
  linea(`redactar: ${candidatas.length} candidatas, ${pendientes.length} expedientes sin redaccion`);

  // --- 4. verificar ------------------------------------------------------------
  const verificadas = [];
  const rechazadas = [];
  for (const pieza of candidatas) {
    const informe = await verificarPieza(pieza);
    if (informe.ok) {
      verificadas.push(sellarVerificacion(pieza, informe));
      linea(`verificar: OK   ${pieza.id} — ${informe.detalle}`);
    } else {
      rechazadas.push({ id: pieza.id, fallos: informe.fallos });
      linea(`verificar: FALLA ${pieza.id}`);
      for (const f of informe.fallos) linea(`    - ${f}`);
    }
    for (const a of informe.avisos) linea(`    (aviso) ${a}`);
  }

  // --- 5. escribir el corpus ---------------------------------------------------
  const { corpus, insertadas, omitidas } = upsert(piezasAntes, verificadas);
  if (insertadas.length || !leerJson(RUTA_PIEZAS, null)) escribirJson(RUTA_PIEZAS, corpus);

  linea(`corpus: +${insertadas.length} insertadas, ${omitidas.length} omitidas por ya existir`);
  for (const o of omitidas) linea(`  - ${o.id}: ${o.motivo}`);
  linea(`piezas en el corpus DESPUES: ${corpus.length}`);

  const erroresTotales = erroresDeteccion.length + erroresRedaccion.length + rechazadas.length;
  const parcial = erroresTotales > 0;
  linea(parcial
    ? `== EXITO PARCIAL: se produjo lo que si se pudo leer; ${erroresTotales} fallo(s) con constancia en estado/errores.jsonl`
    : '== EXITO: sin fallos de acceso ni de verificacion');

  return {
    corrida, parcial,
    antes: piezasAntes.length, despues: corpus.length,
    detectados: items.length, nuevos: nuevos.length, repetidos: repetidos.length,
    insertadas: insertadas.map((p) => p.id), omitidas, rechazadas,
    errores: [...erroresDeteccion, ...erroresRedaccion],
    pendientes: pendientes.length,
  };
}

/**
 * Segunda barrera de idempotencia, independiente de `vistos.jsonl`: el corpus no admite
 * dos veces el mismo `id` ni la misma `huella`. Si alguien borra `vistos.jsonl`, la
 * duplicacion sigue sin ocurrir.
 */
export function upsert(corpusActual, piezas) {
  const corpus = [...corpusActual];
  const ids = new Set(corpus.map((p) => p.id));
  const huellas = new Set(corpus.map((p) => p.huella));
  const insertadas = [];
  const omitidas = [];
  for (const p of piezas) {
    if (ids.has(p.id)) { omitidas.push({ id: p.id, motivo: 'el id ya existe en el corpus' }); continue; }
    if (huellas.has(p.huella)) { omitidas.push({ id: p.id, motivo: 'la huella ya existe en el corpus' }); continue; }
    ids.add(p.id);
    huellas.add(p.huella);
    corpus.push(p);
    insertadas.push(p);
  }
  return { corpus, insertadas, omitidas };
}

if (esCli(import.meta.url)) {
  const banderas = argumentos(process.argv.slice(2));
  try {
    const r = await ejecutar(banderas);
    process.exit(r.parcial ? 2 : 0);
  } catch (e) {
    console.error(`ejecutar: FALLO ${e.stack}`);
    process.exit(1);
  }
}
