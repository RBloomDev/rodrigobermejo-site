/**
 * Etapa 4 — Verificar hechos (`docs/plataforma/02-editorial.md` §5.4).
 *
 * Tres comprobaciones, contra la red, no contra el recuerdo del redactor:
 *
 *   1. **Cada URL de `fuentes[]` resuelve.** Un 4xx, un 5xx, un timeout o un TLS invalido
 *      es un fallo de la pieza, no una nota al pie, y va a `errores.jsonl`.
 *   2. **Las fechas coinciden.** Se extraen las fechas que el documento declara
 *      (JSON-LD `datePublished`/`dateModified`, ISO en el marcado, «Month D, YYYY»,
 *      «D de mes de YYYY»). Tres desenlaces, y la distincion importa:
 *        - `coincide`      la fecha declarada esta entre las del documento.
 *        - `discrepancia`  el documento declara fechas y ninguna es la de la pieza. FALLA.
 *        - `no_confirmada` el documento no declara ninguna fecha legible. No falla, pero
 *                          queda escrito en `procedencia.verificado`. Un «no se pudo
 *                          comprobar» que se presenta como «comprobado» es la mentira que
 *                          esta etapa existe para impedir.
 *   3. **Toda cifra del texto existe en alguna fuente.** Se extraen los numeros de los
 *      campos narrativos (titulo, entradilla, hecho, que_cambia, mexico.texto,
 *      no_establece[]) y cada uno debe aparecer en el texto de alguna de las fuentes
 *      descargadas. Un numero que el redactor no pudo haber leido en ninguna fuente es,
 *      por definicion, inventado. §5.3: «si no, no se escribe».
 *
 * El resultado se registra en `procedencia.verificado` (§5.4). El verificador NUNCA marca
 * `por: "humano"`. Lo que hace es una comprobacion automatica, y firmarla como revision
 * humana seria justo el defecto de RuntimeWire que §1 rechaza: deja `por: "pendiente"` y
 * describe en `detalle` exactamente que se comprobo y que no.
 */

import { aTextoPlano, obtener, registrarError } from './comun.mjs';

const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const MESES_EN = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

const CAMPOS_NARRATIVOS = ['titulo', 'entradilla', 'hecho', 'que_cambia'];

export function textoNarrativo(pieza) {
  return [
    ...CAMPOS_NARRATIVOS.map((c) => pieza[c] ?? ''),
    pieza.mexico?.texto ?? '',
    ...(pieza.no_establece ?? []),
  ].join(' \n ');
}

/** Numeros del texto, normalizados: «2,000» y «2000» son el mismo numero. */
export function cifrasDe(texto) {
  const crudas = texto.match(/\d[\d.,]*/g) ?? [];
  return [...new Set(crudas.map(normalizarCifra).filter((c) => c !== null))];
}

function normalizarCifra(s) {
  const limpio = s.replace(/[.,]$/, '');
  const n = Number(limpio.replace(/,/g, ''));
  if (Number.isNaN(n)) return null;
  return String(n);
}

function cifrasDeCorpus(texto) {
  return new Set(cifrasDe(texto));
}

export function fechasDeDocumento(html) {
  const encontradas = new Set();
  for (const m of html.matchAll(/"date(?:Published|Modified|Created)"\s*:\s*"(\d{4}-\d{2}-\d{2})/g)) {
    encontradas.add(m[1]);
  }
  for (const m of html.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)) encontradas.add(m[1]);
  const plano = aTextoPlano(html);
  for (const m of plano.matchAll(/\b([A-Z][a-z]+)\s+(\d{1,2}),\s*(\d{4})\b/g)) {
    const i = MESES_EN.indexOf(m[1].toLowerCase());
    if (i >= 0) encontradas.add(iso(m[3], i + 1, m[2]));
  }
  for (const m of plano.matchAll(/\b(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})\b/gi)) {
    const i = MESES_ES.indexOf(m[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    if (i >= 0) encontradas.add(iso(m[3], i + 1, m[1]));
  }
  return encontradas;
}

function iso(a, m, d) {
  return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * @returns {Promise<{ok: boolean, fallos: string[], avisos: string[], fuentes: object[], detalle: string}>}
 */
export async function verificarPieza(pieza) {
  const fallos = [];
  const avisos = [];
  const informes = [];
  let corpus = '';

  for (const fuente of pieza.fuentes) {
    const r = await obtener(fuente.url, { timeoutMs: 25000 });
    if (!r.ok) {
      registrarError({
        etapa: 'verificar',
        pieza_id: pieza.id,
        fuente: fuente.medio,
        url: fuente.url,
        codigo: r.codigo,
        mensaje: r.mensaje,
        consecuencia: 'la pieza no pasa verificacion; no entra al corpus',
      });
      fallos.push(`fuente no resuelve: ${fuente.url} [${r.codigo}] ${r.mensaje}`);
      informes.push({ url: fuente.url, http: r.codigo, fecha: 'no_comprobada' });
      continue;
    }

    corpus += ' \n ' + aTextoPlano(r.texto);

    const declaradas = fechasDeDocumento(r.texto);
    let estadoFecha;
    if (declaradas.size === 0) {
      estadoFecha = 'no_confirmada';
      avisos.push(`el documento no declara fecha legible: ${fuente.url} (declarada ${fuente.fecha})`);
    } else if (declaradas.has(fuente.fecha)) {
      estadoFecha = 'coincide';
    } else {
      estadoFecha = 'discrepancia';
      fallos.push(
        `fecha declarada ${fuente.fecha} no aparece en ${fuente.url}; el documento declara ${[...declaradas].slice(0, 5).join(', ')}`,
      );
    }
    informes.push({ url: fuente.url, http: r.codigo, fecha: estadoFecha });
  }

  const enCorpus = cifrasDeCorpus(corpus);
  const cifras = cifrasDe(textoNarrativo(pieza));
  const huerfanas = cifras.filter((c) => !enCorpus.has(c));
  if (huerfanas.length) {
    fallos.push(
      `cifras del texto que no existen en ninguna fuente: ${huerfanas.join(', ')} — §5.3: si no, no se escribe`,
    );
  }

  const ok = fallos.length === 0;
  return {
    ok,
    fallos,
    avisos,
    fuentes: informes,
    cifras_comprobadas: cifras,
    detalle: ok
      ? `Comprobacion automatica: ${informes.length} fuentes resuelven; fechas ${informes.map((i) => i.fecha).join('/')}; ${cifras.length} cifras del texto halladas en las fuentes. Revision humana pendiente.`
      : `No pasa: ${fallos.join(' | ')}`,
  };
}

/** Escribe el resultado en `procedencia.verificado` (§5.4). Nunca firma como humano. */
export function sellarVerificacion(pieza, informe) {
  pieza.procedencia.verificado = {
    por: 'pendiente',
    detalle: informe.detalle + (informe.avisos.length ? ` Avisos: ${informe.avisos.join(' | ')}` : ''),
  };
  return pieza;
}
