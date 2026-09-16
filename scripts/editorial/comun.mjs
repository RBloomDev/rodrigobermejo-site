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
import { seguirConGuarda } from './red-segura.mjs';

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

export const AGENTE_UA = 'rodrigobermejo-editorial/0.1 (+https://www.rodrigobermejo.com)';

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

/**
 * Una sola puerta de red para todo el canal. Devuelve siempre un objeto; nunca lanza.
 * Quien llama decide, y el fallo SIEMPRE es un dato registrable, no una excepcion que
 * se traga (§5.5).
 *
 * **Toda la mecanica vive en `red-segura.mjs`.** Antes este modulo tenia su propio
 * `fetch` con su propio bucle de redirecciones, y el redactor tenia otro con `curl`:
 * dos implementaciones distintas del mismo problema, o sea dos sitios donde acertar.
 * Ahora las dos son capas sobre `seguirConGuarda`, que valida el destino, **fija la
 * direccion ya validada en la conexion** --- conservando Host, SNI y validacion de
 * certificado --- y revalida cada salto de redireccion.
 *
 * Esta funcion solo traduce la forma del resultado a la que el canal ya esperaba.
 */
export async function obtener(url, { timeoutMs = 20000, metodo = 'GET', resolver } = {}) {
  const r = await seguirConGuarda(url, {
    metodo,
    timeoutMs,
    resolver,
    cabeceras: { 'user-agent': AGENTE_UA, accept: '*/*' },
  });
  // `DESTINO_VETADO` es deliberadamente NO 404: `verificar.mjs` clasifica 404/410 como
  // `no_existe` --- fallo de la pieza --- y todo lo demas como `no_consultada`. Que
  // nosotros nos neguemos a pedir una URL no prueba que el documento no exista; prueba
  // que no lo consultamos.
  return {
    ok: r.ok,
    codigo: r.codigo,
    texto: r.texto ?? '',
    ms: r.ms ?? 0,
    mensaje: r.mensaje,
  };
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
    else if (a === '--limite') {
      // `Number(x) || null` convertia `--limite 0` en `null`, y `null` significa
      // SIN LIMITE aguas abajo: pedir cero piezas invocaba al modelo una vez por
      // pendiente --- hoy 41 --- que es lo contrario de lo que se pidio. Lo mismo
      // con un valor no numerico. Ahora cero es cero y la basura se rechaza.
      const crudo = argv[++i];
      // `Number('')` y `Number('  ')` dan 0, que es un entero valido. Pero una cadena
      // vacia es una errata de quien invoca, no la peticion de un limite de cero, y
      // confundirlas devuelve el mismo defecto por otra puerta.
      const n = typeof crudo === 'string' && crudo.trim() === '' ? NaN : Number(crudo);
      if (!Number.isInteger(n) || n < 0) {
        throw new Error(`--limite espera un entero >= 0, se recibio: ${JSON.stringify(crudo)}`);
      }
      banderas.limite = n;
    }
  }
  return banderas;
}
