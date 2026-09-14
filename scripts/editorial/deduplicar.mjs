/**
 * Etapa 2 — Deduplicar (`docs/plataforma/02-editorial.md` §5.2).
 *
 * Los tres niveles, en orden, y cada uno atrapa lo que el anterior no ve:
 *
 *   1. URL canonica normalizada — sin `utm_*`, sin fragmento, sin barra final.
 *      Atrapa el mismo articulo llegando por dos campañas distintas.
 *   2. Huella `sha256` del titulo normalizado + el dominio de la fuente.
 *      Atrapa el mismo articulo republicado en otra URL del mismo medio.
 *   3. Registro persistente `estado/vistos.jsonl`, append-only.
 *      Atrapa la SEGUNDA EJECUCION. Es el nivel que hace idempotente al canal: sin el,
 *      los niveles 1 y 2 solo deduplican dentro de una misma corrida.
 *
 * La prueba que Rodrigo puso: una segunda ejecucion sobre las mismas entradas no debe
 * duplicar la pieza. Esa prueba la sostiene el nivel 3, y por eso `vistos.jsonl` se
 * escribe **antes** de saber si el item llego a ser pieza: lo que se registra es que el
 * item fue visto, no que produjo algo.
 */

import { RUTA_VISTOS, ahoraIso, anexarJsonl, leerJsonl } from './comun.mjs';

/**
 * @param {object[]} items  items de `detectar()`
 * @param {object}   opciones
 * @param {object[]} opciones.vistos  filas de `vistos.jsonl`
 * @param {object[]} opciones.piezas  corpus actual de `piezas.json`
 */
export function deduplicar(items, { vistos = [], piezas = [] } = {}) {
  const urlsVistas = new Set(vistos.map((v) => v.url_canonica));
  const huellasVistas = new Set(vistos.map((v) => v.huella));

  // El corpus tambien cuenta como "visto": una pieza publicada desde otra maquina, o un
  // `vistos.jsonl` truncado, no pueden reabrir la puerta a un duplicado.
  for (const p of piezas) {
    if (p.huella) huellasVistas.add(p.huella);
    for (const f of [p.fuente_primaria, ...(p.fuentes ?? [])]) {
      if (f?.url) urlsVistas.add(f.url);
    }
  }

  const nuevos = [];
  const repetidos = [];
  const urlsLote = new Set();
  const huellasLote = new Set();

  for (const item of items) {
    const motivo = motivoDeRepeticion(item, {
      urlsVistas, huellasVistas, urlsLote, huellasLote,
    });
    if (motivo) {
      repetidos.push({ ...item, motivo });
      continue;
    }
    urlsLote.add(item.url_canonica);
    huellasLote.add(item.huella);
    nuevos.push(item);
  }

  return { nuevos, repetidos };
}

function motivoDeRepeticion(item, { urlsVistas, huellasVistas, urlsLote, huellasLote }) {
  if (urlsLote.has(item.url_canonica)) return 'nivel_1_url_canonica_en_el_mismo_lote';
  if (urlsVistas.has(item.url_canonica)) return 'nivel_1_url_canonica_ya_vista';
  if (huellasLote.has(item.huella)) return 'nivel_2_huella_en_el_mismo_lote';
  if (huellasVistas.has(item.huella)) return 'nivel_3_huella_en_vistos_jsonl';
  return null;
}

/** Nivel 3: el registro append-only. Se escribe una fila por item nuevo. */
export function registrarVistos(items, { corrida }) {
  for (const i of items) {
    anexarJsonl(RUTA_VISTOS, {
      visto_en: ahoraIso(),
      corrida,
      fuente_id: i.fuente_id,
      titulo: i.titulo,
      url_canonica: i.url_canonica,
      huella: i.huella,
      fecha_publicacion: i.fecha_publicacion,
    });
  }
}

export function cargarVistos() {
  return leerJsonl(RUTA_VISTOS);
}
