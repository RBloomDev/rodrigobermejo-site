/**
 * Etapa 1 — Detectar (`docs/plataforma/02-editorial.md` §5.1).
 *
 * Lee los feeds autorizados de §6 y registra por cada item: titulo, URL canonica, medio,
 * fecha de publicacion y fecha de lectura. **Nada mas.**
 *
 * La regla que este archivo hace cumplir de forma mecanica: de una fuente cuyo `uso` es
 * `solo_detectar` NO se guarda el cuerpo. Ni el `description`, ni el `content:encoded`.
 * No es una convencion de estilo: `extraerItem()` simplemente no lo lee de esas fuentes,
 * asi que no existe un camino por el que ese texto llegue al disco.
 *
 * Todo fallo de acceso se registra en `estado/fallos.jsonl` **con la etapa `detectar`** y
 * la deteccion continua con las demas fuentes (§5.5). Una fuente caida no detiene la
 * corrida, y tampoco produce items inventados: produce cero items y un fallo registrado.
 *
 * La etapa importa y no es decorativa: un 403 leyendo un feed (no se supo que el hecho
 * existe) no es lo mismo que un 403 revisando una fuente al verificar una pieza ya
 * redactada (el hecho existe y la comprobacion no se pudo cerrar). Mezclarlos en un solo
 * `errores.jsonl` sin etapa hacia imposible decidir cual de los dos hay que atender.
 *
 * Uso directo:
 *   node scripts/editorial/detectar.mjs
 *   node scripts/editorial/detectar.mjs --fuente observatorio-tec --incluir el-economista
 */

import {
  ahoraIso,
  argumentos,
  esCli,
  descodificar,
  dominioDe,
  huellaDe,
  normalizarUrl,
  obtener,
} from './comun.mjs';
import { registrarFallo } from './estado.mjs';
import { activas, porId } from './fuentes.mjs';

/** Cuantos items de la cabeza de cada feed se miran por corrida. Ver el corte mas abajo. */
const MAX_ITEMS_POR_DEFECTO = 25;

/** Parser de RSS/Atom escrito a mano. Suficiente y auditable: un RSS no necesita libreria. */
export function parsearFeed(xml) {
  const bloques = [
    ...[...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map((m) => m[0]),
    ...[...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi)].map((m) => m[0]),
  ];
  return bloques.map((b) => ({
    titulo: campo(b, 'title'),
    enlace: enlaceDe(b),
    fecha: campo(b, 'pubDate') || campo(b, 'dc:date') || campo(b, 'published') || campo(b, 'updated'),
    guid: campo(b, 'guid') || campo(b, 'id'),
  }));
}

function campo(bloque, etiqueta) {
  const re = new RegExp(`<${etiqueta}(?:\\s[^>]*)?>([\\s\\S]*?)</${etiqueta}>`, 'i');
  const m = bloque.match(re);
  return m ? descodificar(m[1]) : '';
}

function enlaceDe(bloque) {
  const propio = campo(bloque, 'link');
  if (propio && /^https?:/i.test(propio)) return propio;
  const atom = bloque.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i)
    || bloque.match(/<link[^>]*href=["']([^"']+)["']/i);
  if (atom) return descodificar(atom[1]);
  const guid = campo(bloque, 'guid');
  return /^https?:/i.test(guid) ? guid : '';
}

function aFechaIso(crudo) {
  if (!crudo) return null;
  const d = new Date(crudo);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Detecta sobre las fuentes dadas.
 * @returns {Promise<{items: object[], errores: object[], fuentesLeidas: string[]}>}
 */
export async function detectar({ fuentes = activas(), leidoEn = ahoraIso(), corrida = null } = {}) {
  const items = [];
  const errores = [];
  const fuentesLeidas = [];

  const fallo = (fuente, codigo, mensaje, consecuencia) => registrarFallo({
    etapa: 'detectar',
    entrada_id: null, // no hay entrada todavia: el fallo es de la fuente, no de un hecho
    codigo,
    mensaje,
    consecuencia,
    contexto: { fuente_id: fuente.id, fuente: fuente.medio, url: fuente.url },
    corrida,
  });

  for (const fuente of fuentes) {
    const r = await obtener(fuente.url);
    if (!r.ok) {
      // §5.5: el fallo es un dato. Se registra con etapa, fuente, codigo y consecuencia,
      // y de aqui NO sale ningun item. El conocimiento del modelo no sustituye una
      // fuente caida.
      errores.push(fallo(
        fuente, r.codigo, r.mensaje,
        'sin items de esta fuente en esta corrida; no se genera pieza a partir de ella. '
        + 'La fuente se vuelve a intentar en la corrida siguiente.',
      ));
      continue;
    }

    let crudos;
    try {
      crudos = parsearFeed(r.texto);
    } catch (e) {
      errores.push(fallo(
        fuente, 'PARSEO', `${e.name}: ${e.message}`,
        'sin items de esta fuente; el feed respondio pero no se pudo interpretar',
      ));
      continue;
    }

    if (crudos.length === 0) {
      errores.push(fallo(
        fuente, 'FEED_VACIO', 'La respuesta fue 200 pero no contiene items.',
        'sin items de esta fuente; un 200 vacio no es una fuente sin novedades comprobada',
      ));
      continue;
    }

    fuentesLeidas.push(fuente.id);
    // Se lee la cabeza del feed, no su archivo historico. `openai.com/news/rss.xml`
    // sirve ~1200 items: arrastrarlos todos en cada corrida llena `vistos.jsonl` de
    // ruido de 2022 y no detecta nada mas. Un canal de novedades mira lo reciente.
    for (const c of crudos.slice(0, fuente.max_items ?? MAX_ITEMS_POR_DEFECTO)) {
      const item = extraerItem(c, fuente, leidoEn);
      if (item) items.push(item);
    }
  }

  return { items, errores, fuentesLeidas };
}

/**
 * Lo unico que se guarda de un item, para cualquier fuente: titulo, URL, medio, fecha de
 * publicacion y fecha de lectura. Sin cuerpo, sin resumen, sin `content:encoded`, incluso
 * cuando la fuente es CC BY: la etapa de deteccion no es la etapa de redaccion, y guardar
 * el cuerpo "por si acaso" es exactamente como se rompe §5.1.
 */
function extraerItem(crudo, fuente, leidoEn) {
  if (!crudo.titulo || !crudo.enlace) return null;
  let urlCanonica;
  try {
    urlCanonica = normalizarUrl(crudo.enlace);
  } catch {
    return null;
  }
  return {
    fuente_id: fuente.id,
    medio: fuente.medio,
    licencia: fuente.licencia,
    uso: fuente.uso,
    titulo: crudo.titulo.replace(/\s+/g, ' ').trim(),
    url: crudo.enlace.trim(),
    url_canonica: urlCanonica,
    dominio: dominioDe(urlCanonica),
    fecha_publicacion: aFechaIso(crudo.fecha),
    fecha_lectura: leidoEn,
    huella: huellaDe(crudo.titulo, urlCanonica),
  };
}

export function resolverFuentes({ incluir = [], soloFuente = [] } = {}) {
  const base = soloFuente.length ? soloFuente.map(porId) : activas();
  const extra = incluir.map(porId);
  const vistos = new Set();
  return [...base, ...extra].filter((f) => (vistos.has(f.id) ? false : vistos.add(f.id)));
}

if (esCli(import.meta.url)) {
  const banderas = argumentos(process.argv.slice(2));
  const { items, errores } = await detectar({ fuentes: resolverFuentes(banderas) });
  console.log(`detectar: ${items.length} items, ${errores.length} errores`);
  for (const e of errores) {
    console.log(`  ERROR [${e.etapa}] ${e.contexto?.fuente_id} [${e.codigo}] ${e.mensaje}`);
  }
  for (const i of items) console.log(`  ${i.fecha_publicacion} ${i.fuente_id} :: ${i.titulo}`);
}
