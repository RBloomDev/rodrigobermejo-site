/**
 * Utilidades compartidas del canal editorial.
 *
 * Node puro, sin dependencias. `AGENTS.md` prohibe añadir dependencias sin decision de
 * Rodrigo, y un RSS no necesita una libreria.
 */

import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { destinoPermitido } from './red-segura.mjs';

export const DIR_EDITORIAL = dirname(fileURLToPath(import.meta.url));
export const DIR_ESTADO = join(DIR_EDITORIAL, 'estado');
export const DIR_REDACCIONES = join(DIR_EDITORIAL, 'redacciones');
export const RUTA_VISTOS = join(DIR_ESTADO, 'vistos.jsonl');
export const RUTA_ERRORES = join(DIR_ESTADO, 'errores.jsonl');
export const RUTA_PIEZAS = join(
  DIR_EDITORIAL,
  '..',
  '..',
  'docs',
  'plataforma',
  'prototipo',
  'datos',
  'piezas.json',
);

export const AGENTE_UA = 'rodrigobermejo-editorial/0.1 (+https://rodrigobermejo.com)';

export function ahoraIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function asegurarDir(ruta) {
  mkdirSync(dirname(ruta), { recursive: true });
}

// --- JSONL append-only -----------------------------------------------------------

export function leerJsonl(ruta) {
  if (!existsSync(ruta)) return [];
  return readFileSync(ruta, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

/**
 * Append-only a proposito (§5.2 nivel 3). Nunca se reescribe una linea: el registro de
 * lo visto es un log, y un log que se reescribe no prueba nada.
 */
export function anexarJsonl(ruta, objeto) {
  asegurarDir(ruta);
  appendFileSync(ruta, JSON.stringify(objeto) + '\n', 'utf8');
}

export function registrarError(error) {
  const fila = { registrado_en: ahoraIso(), ...error };
  anexarJsonl(RUTA_ERRORES, fila);
  return fila;
}

// --- Normalizacion (§5.2) --------------------------------------------------------

const PARAMS_BASURA = /^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$|ref$|source$|igshid$)/i;

/** Nivel 1 de §5.2: URL canonica normalizada — sin `utm_*`, sin fragmento, sin barra final. */
export function normalizarUrl(url) {
  const u = new URL(url.trim());
  u.hash = '';
  u.protocol = u.protocol.toLowerCase();
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
  for (const clave of [...u.searchParams.keys()]) {
    if (PARAMS_BASURA.test(clave)) u.searchParams.delete(clave);
  }
  u.searchParams.sort();
  let s = u.toString();
  s = s.replace(/\?$/, '');
  if (u.pathname !== '/') s = s.replace(/\/(\?|$)/, '$1');
  return s;
}

export function dominioDe(url) {
  return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
}

/** Titulo normalizado: minusculas, sin acentos, sin puntuacion, espacios colapsados. */
export function normalizarTitulo(titulo) {
  return titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Nivel 2 de §5.2: sha256 del titulo normalizado + el dominio de la fuente. */
export function huellaDe(titulo, url) {
  const base = `${normalizarTitulo(titulo)}|${dominioDe(url)}`;
  return 'sha256:' + createHash('sha256').update(base, 'utf8').digest('hex');
}

// --- HTTP ------------------------------------------------------------------------

// La guarda de destino vive en `red-segura.mjs` porque el redactor tambien
// descarga por su cuenta y comparte el mismo riesgo. Aqui se aplica a TODO el
// canal: esta es la unica puerta de red, asi que es el unico sitio donde hay
// que acertar.
const MAX_SALTOS_RED = 5;

/**
 * Una sola puerta de red para todo el canal. Devuelve siempre un objeto; nunca lanza.
 * Quien llama decide, y el fallo SIEMPRE es un dato registrable, no una excepcion que
 * se traga (§5.5).
 */
export async function obtener(url, { timeoutMs = 20000, metodo = 'GET' } = {}) {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), timeoutMs);
  const t0 = Date.now();
  try {
    // --- La guarda, antes de tocar la red ---------------------------------------
    // Estas URLs no las elegimos: salen de feeds RSS de terceros y del texto de
    // articulos ajenos que el redactor cita. Son entrada de un atacante, no
    // configuracion. Sin esta comprobacion, `http://169.254.169.254/` --- el
    // endpoint de metadatos de la nube --- pasa como cualquier otra.
    //
    // Y las redirecciones se siguen A MANO, revalidando cada salto: `redirect:
    // 'follow'` obedece un 302 hacia `http://127.0.0.1:6379/` sin volver a
    // preguntar, y entonces validar la primera URL no habria servido de nada.
    let actual = url;
    let r = null;
    for (let salto = 0; salto <= MAX_SALTOS_RED; salto += 1) {
      const permiso = await destinoPermitido(actual);
      if (!permiso.permitido) {
        return {
          ok: false,
          // Codigo propio, y deliberadamente NO 404: `verificar.mjs` clasifica
          // 404/410 como `no_existe` --- fallo de la pieza --- y todo lo demas
          // como `no_consultada`. Que nosotros nos neguemos a pedir una URL no
          // prueba que el documento no exista; prueba que no lo consultamos.
          codigo: 'DESTINO_VETADO',
          texto: '',
          ms: Date.now() - t0,
          mensaje: `destino no permitido: ${permiso.motivo}`,
        };
      }
      r = await fetch(actual, {
        method: metodo,
        signal: control.signal,
        redirect: 'manual',
        headers: { 'user-agent': AGENTE_UA, accept: '*/*' },
      });
      if (r.status < 300 || r.status >= 400) break;
      const destino = r.headers.get('location');
      if (!destino) break;            // redireccion sin Location: se entrega tal cual
      actual = new URL(destino, actual).href;
      r = null;
    }
    if (!r) {
      return {
        ok: false,
        codigo: 'DEMASIADAS_REDIRECCIONES',
        texto: '',
        ms: Date.now() - t0,
        mensaje: `mas de ${MAX_SALTOS_RED} redirecciones desde ${url}`,
      };
    }
    const texto = metodo === 'HEAD' ? '' : await r.text();
    return {
      ok: r.ok,
      codigo: r.status,
      texto,
      ms: Date.now() - t0,
      mensaje: r.ok ? 'OK' : `HTTP ${r.status} ${r.statusText}`.trim(),
    };
  } catch (e) {
    return {
      ok: false,
      codigo: clasificarFallo(e),
      texto: '',
      ms: Date.now() - t0,
      mensaje: `${e.name}: ${e.message}${e.cause?.code ? ` (${e.cause.code})` : ''}`,
    };
  } finally {
    clearTimeout(reloj);
  }
}

function clasificarFallo(e) {
  if (e.name === 'AbortError') return 'TIMEOUT';
  const causa = e.cause?.code ?? '';
  if (/CERT|SSL|TLS/i.test(causa)) return 'TLS_INVALIDO';
  if (/ENOTFOUND|EAI_AGAIN/i.test(causa)) return 'DNS';
  if (causa) return causa;
  return 'RED';
}

// --- Texto -----------------------------------------------------------------------

const ENTIDADES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', laquo: '«', raquo: '»',
  hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”',
};

export function descodificar(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTIDADES[n.toLowerCase()] ?? m)
    .trim();
}

export function aTextoPlano(html) {
  return descodificar(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ');
}

// --- JSON de trabajo -------------------------------------------------------------

export function leerJson(ruta, porDefecto) {
  if (!existsSync(ruta)) return porDefecto;
  const crudo = readFileSync(ruta, 'utf8').trim();
  return crudo ? JSON.parse(crudo) : porDefecto;
}

export function escribirJson(ruta, valor) {
  asegurarDir(ruta);
  writeFileSync(ruta, JSON.stringify(valor, null, 2) + '\n', 'utf8');
}

/**
 * ¿Se invoco este modulo directamente? En Windows `process.argv[1]` es una ruta con
 * backslashes y `import.meta.url` un `file:///C:/...`: compararlas a mano falla en
 * silencio y el script no hace nada. `pathToFileURL` es la unica comparacion correcta.
 */
export function esCli(urlModulo) {
  return urlModulo === pathToFileURL(process.argv[1]).href;
}

export function argumentos(argv) {
  const banderas = {
    incluir: [], soloFuente: [], entradas: null, silencioso: false,
    // Cuantas entradas se intentan redactar en esta corrida. Sin limite, una
    // corrida con el redactor conectado invoca al modelo una vez por pendiente
    // --- con la cola actual eso son horas. El limite no descarta nada: lo que
    // no se procesa hoy sigue pendiente y se retoma manana.
    limite: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--incluir') banderas.incluir.push(argv[++i]);
    else if (a === '--fuente') banderas.soloFuente.push(argv[++i]);
    else if (a === '--entradas') banderas.entradas = argv[++i];
    else if (a === '--silencioso') banderas.silencioso = true;
    else if (a === '--limite') banderas.limite = Number(argv[++i]) || null;
  }
  return banderas;
}
