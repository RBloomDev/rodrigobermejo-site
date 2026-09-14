/**
 * Utileria de las pruebas de `verificar.mjs`. SIN RED y sin tocar disco.
 *
 * Las dos inyecciones no son comodidad, son el requisito: `obtener` falso para que
 * ninguna prueba dependa de que un servidor ajeno conteste hoy lo mismo que ayer, y
 * `registrar` falso para que la suite no escriba en `estado/errores.jsonl`, que es un
 * log append-only del canal y no un basurero de pruebas.
 */

import { verificarPieza } from '../verificar.mjs';

export const RESPUESTA = {
  /** 2xx con cuerpo: la unica que permite afirmar algo del documento. */
  leible: (texto) => ({ ok: true, codigo: 200, texto, mensaje: 'OK', ms: 1 }),
  /** 2xx sin cuerpo: resolvio, pero no se obtuvo texto. No dice nada. */
  vacia: () => ({ ok: true, codigo: 200, texto: '', mensaje: 'OK', ms: 1 }),
  prohibida: () => ({ ok: false, codigo: 403, texto: '', mensaje: 'HTTP 403 Forbidden', ms: 1 }),
  saturada: () => ({ ok: false, codigo: 429, texto: '', mensaje: 'HTTP 429 Too Many Requests', ms: 1 }),
  caida: () => ({ ok: false, codigo: 503, texto: '', mensaje: 'HTTP 503 Service Unavailable', ms: 1 }),
  agotada: () => ({ ok: false, codigo: 'TIMEOUT', texto: '', mensaje: 'AbortError: The operation was aborted', ms: 1 }),
  inexistente: () => ({ ok: false, codigo: 404, texto: '', mensaje: 'HTTP 404 Not Found', ms: 1 }),
  ida: () => ({ ok: false, codigo: 410, texto: '', mensaje: 'HTTP 410 Gone', ms: 1 }),
};

/**
 * Documento de prueba. Las fechas se colocan donde el rol es EXPLICITO; las «sueltas»
 * se escriben en el cuerpo, que es justo donde una fecha no significa nada.
 */
export function documento({ publicado = null, modificado = null, sueltas = [], cuerpo = '' } = {}) {
  const metas = [
    publicado ? `<meta property="article:published_time" content="${publicado}T09:00:00Z">` : '',
    modificado ? `<meta property="article:modified_time" content="${modificado}T18:30:00Z">` : '',
  ].join('');
  const parrafos = sueltas.map((f) => `<p>Nota al pie fechada ${f}.</p>`).join('');
  return `<!doctype html><html><head><title>Documento</title>${metas}</head>`
    + `<body>${parrafos}<p>${cuerpo}</p></body></html>`;
}

/** Corre `verificarPieza` con red falsa. Devuelve el informe y lo que se habria registrado. */
export async function verificar(pieza, respuestas, opciones = {}) {
  const registros = [];
  const pedidas = [];
  const informe = await verificarPieza(pieza, {
    obtener: async (url) => {
      pedidas.push(url);
      if (!(url in respuestas)) throw new Error(`prueba mal armada: no hay respuesta para ${url}`);
      return respuestas[url];
    },
    registrar: (fila) => registros.push(fila),
    ...opciones,
  });
  return { informe, registros, pedidas };
}

/**
 * Pieza minima valida para esta etapa. El texto narrativo lleva UNA sola cifra
 * comprobable (40 escuelas) para que cada prueba mida una cosa y no dos.
 */
export function pieza(fuentes, campos = {}) {
  return {
    id: 'programa-en-el-sureste',
    tipo: 'nota',
    titulo: 'El programa crecio en el sureste',
    entradilla: 'Una ampliacion que se anuncio sin metas publicas.',
    estado: 'borrador',
    ocurrido_en: '2026-09-10',
    redactado_en: '2026-09-12T10:00Z',
    hecho: 'El programa alcanzo 40 escuelas en 2026.',
    que_cambia: 'La cobertura deja de ser un piloto y pasa a ser politica ordinaria.',
    mexico: { estado: 'aplica_con_datos_locales', texto: 'Aplica al sureste del pais.' },
    no_establece: ['No prueba que los resultados de aprendizaje hayan mejorado.'],
    fuentes,
    procedencia: {
      detectado: { por: 'agente', detalle: 'feed' },
      redactado: { por: 'ia', modelo: 'modelo-de-prueba' },
      verificado: { por: 'pendiente', detalle: 'sin verificar' },
      publicado: { por: 'pendiente', detalle: 'nada se publica' },
    },
    ...campos,
  };
}

/** Fuente de la pieza. El primer elemento de `fuentes[]` es, por contrato, la detectada. */
export function fuente(url, fecha = '2026-09-11', extra = {}) {
  return { titulo: 'Documento', medio: 'medio.example', url, fecha, tipo: 'primaria', ...extra };
}

/** Texto que SI respalda «El programa alcanzo 40 escuelas en 2026». */
export const CUERPO_QUE_RESPALDA =
  'La Secretaria informo que el programa alcanzo 40 escuelas durante 2026.';

/** Texto legible que NO habla del tema: no respalda, y tampoco contradice. */
export const CUERPO_AJENO =
  'El boletin describe una feria del libro y un concurso de robotica escolar.';
