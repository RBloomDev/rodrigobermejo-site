/**
 * Utilidades compartidas del canal editorial.
 *
 * Node puro, sin dependencias. `AGENTS.md` prohibe añadir dependencias sin decision de
 * Rodrigo, y un RSS no necesita una libreria.
 */

import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { seguirConGuarda } from './red-segura.mjs';

export const DIR_EDITORIAL = dirname(fileURLToPath(import.meta.url));

/**
 * El fixture TRACKEADO del prototipo. **Nadie del canal lo escribe** —§8.3, fila «Fixture
 * del prototipo»—: existe aqui para que `guard:canal` pueda comprobar que sigue intacto
 * despues de correr, que es la unica razon por la que un modulo del canal nombra una ruta
 * del arbol publico.
 *
 * Se llamaba `RUTA_PIEZAS`, y el nombre mentia por dos lados: sugeria «la ruta del corpus»
 * cuando ese corpus intermedio ya no existe (§8.6 fila 2, cerrada por la tarea que partio
 * el comando), y se confundia a simple vista con la funcion que resolvia la variable del
 * corpus intermedio. Las dos desaparecieron con el corpus; esta constante no es lo mismo,
 * no la escribe nadie, y ahora el nombre lo dice.
 */
export const RUTA_FIXTURE_PROTOTIPO = join(
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

// --- Directorios privados: obligatorios, sin valor por defecto ---------------------

/**
 * `docs/plataforma/02-editorial.md` §8.3. El estado y las redacciones viven FUERA de
 * todo repositorio, y las dos variables que los localizan son **obligatorias**.
 *
 * **Aqui no hay `||`, y esa ausencia es el arreglo entero.** La version anterior resolvia
 * `process.env.EDITORIAL_ESTADO_DIR || DIR_ESTADO`, con `DIR_ESTADO` apuntando dentro del
 * repositorio; las redacciones ni siquiera consultaban variable. El modo de fallo no era
 * un error: era que el canal corria, no fallaba, y el estado aparecia en un `git status`
 * que alguien commiteaba sin leer. Asi llegaron cinco archivos de estado al repositorio
 * PUBLICO. Un default dentro del repositorio es exactamente como esta regla se rompe sin
 * que nadie lo note, y por eso no existe ninguno.
 *
 * Se resuelve en cada llamada, nunca se cachea: las pruebas montan su propio directorio
 * en `tmpdir` y lo pasan por estas mismas variables. Mismo patron que `PROOF_FEED_DIR`.
 */
export class ConfiguracionAusente extends Error {
  constructor(variable) {
    super(mensajeDeConfiguracion(variable));
    this.name = 'ConfiguracionAusente';
    this.codigo = 'CONFIG_AUSENTE';
    this.variable = variable;
  }
}

function mensajeDeConfiguracion(variable) {
  return [
    `${variable} no esta definida, y el canal editorial no arranca sin ella.`,
    '',
    'NO tiene valor por defecto a proposito: un default dentro del repositorio es',
    'exactamente como el estado del canal acaba publicado en un repositorio publico',
    '(docs/plataforma/02-editorial.md §8.3).',
    '',
    'Define las DOS variables obligatorias, con rutas FUERA de todo arbol de git:',
    '  EDITORIAL_ESTADO_DIR       bitacora, fallos y el vistos.jsonl heredado',
    '  EDITORIAL_REDACCIONES_DIR  borradores y redacciones',
    '',
    'No se escribio nada.',
  ].join('\n');
}

/**
 * §8.3, tercera prohibicion, literal: «Aceptar una ruta que resuelva dentro de un arbol de
 * trabajo de git, sea este repositorio u otro. Un directorio privado dentro de un repo
 * privado tampoco vale: la regla es que el estado no esta versionado, no que el
 * repositorio sea discreto.» Y §8.6 punto 3 la pide como comprobacion del gate.
 *
 * **Quitar el `||` no cierra esto.** Cierra el default silencioso, pero deja la misma
 * puerta abierta con la variable puesta: `EDITORIAL_ESTADO_DIR=./scripts/editorial/estado`
 * pasaria y el canal volveria a escribir dentro del repositorio publico, esta vez con el
 * `.gitignore` nuevo tapandolo del `git status`. El mismo defecto con mejor camuflaje.
 */
export class DirectorioVersionado extends Error {
  constructor(variable, ruta, arbol) {
    super([
      `${variable} apunta a una ruta dentro de un arbol de trabajo de git, y el canal`,
      'editorial no arranca asi.',
      '',
      `  ruta:  ${ruta}`,
      `  arbol: ${arbol}`,
      '',
      'El estado y las redacciones NO estan versionados (docs/plataforma/02-editorial.md',
      '§8.3). Un directorio privado dentro de un repo privado tampoco vale: la regla es que',
      'el estado no este versionado, no que el repositorio sea discreto.',
      '',
      'Apunta la variable a un directorio FUERA de todo arbol de git.',
      '',
      'No se escribio nada.',
    ].join('\n'));
    this.name = 'DirectorioVersionado';
    this.codigo = 'DIRECTORIO_VERSIONADO';
    this.variable = variable;
    this.ruta = ruta;
    this.arbol = arbol;
  }
}

/**
 * El arbol de trabajo de git que contiene `rutaResuelta`, o `null` si no hay ninguno.
 *
 * Se camina hacia arriba buscando `.git`, que es como git descubre su propio arbol. **No
 * se invoca `git rev-parse --is-inside-work-tree`** y la eleccion no es de estilo: la ruta
 * puede no existir todavia —el canal la crea al arrancar, y `rev-parse` necesita un `cwd`
 * que exista—, git puede no estar en el PATH del runner, y `dirEstado()` se llama una vez
 * por cada lectura de la bitacora: serian cientos de procesos por corrida. Caminar el
 * arbol son unos pocos `existsSync` y no depende de nada instalado.
 *
 * `.git` cuenta sea directorio (repositorio normal) o archivo (worktree enlazado o
 * submodulo, que guardan ahi un `gitdir:`). Las dos formas son un arbol de trabajo, y este
 * repositorio se opera justamente con worktrees.
 */
function arbolDeGitQueContiene(rutaResuelta) {
  let dir = rutaResuelta;
  for (;;) {
    if (existsSync(join(dir, '.git'))) return dir;
    const padre = dirname(dir);
    if (padre === dir) return null; // raiz del volumen
    dir = padre;
  }
}

function exigirDirectorio(variable) {
  const crudo = process.env[variable];
  if (typeof crudo !== 'string' || crudo.trim() === '') throw new ConfiguracionAusente(variable);
  const ruta = resolve(crudo.trim());
  const arbol = arbolDeGitQueContiene(ruta);
  if (arbol !== null) throw new DirectorioVersionado(variable, ruta, arbol);
  return ruta;
}

/** Raiz del estado: bitacora, fallos y el `vistos.jsonl` heredado. */
export function dirEstado() {
  return exigirDirectorio('EDITORIAL_ESTADO_DIR');
}

/** Raiz de los borradores y redacciones. */
export function dirRedacciones() {
  return exigirDirectorio('EDITORIAL_REDACCIONES_DIR');
}

/**
 * **La ruta del borrador privado de una pieza, y el unico sitio donde se decide.**
 *
 * Los tres comandos del canal (§8.1) la tienen que resolver igual o dejan de hablar del
 * mismo archivo: `generar` lo escribe, `verificar` lo sella en su sitio y `autorizar` lo
 * lee. Hasta que el comando se partio, el orquestador escribia un corpus intermedio en una
 * ruta de archivo completa que no se derivaba de nada, y `autorizar` leia `<id>.json`: dos
 * rutas distintas que solo coincidian si quien corria el canal las apuntaba a mano.
 * Derivarla de `dirRedacciones()` cierra esa divergencia sin inventar una tercera variable,
 * que §8.3 prohibe («Son dos, y solo dos»).
 *
 * @param {string} id  id kebab-case de la pieza (§3)
 */
export function rutaBorrador(id) {
  return join(dirRedacciones(), `${id}.json`);
}

export function rutaErrores() {
  return join(dirEstado(), 'errores.jsonl');
}

/**
 * Comprueba las dos de una vez, ANTES de abrir ningun archivo. La llama `ejecutar()` en
 * su primera linea: abortar a mitad de corrida ya habria escrito, y §8.3 exige que no se
 * escriba nada.
 *
 * @returns {{estado: string, redacciones: string}} las dos rutas resueltas
 */
export function exigirDirectoriosPrivados() {
  return { estado: dirEstado(), redacciones: dirRedacciones() };
}

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

/**
 * Un fallo del canal no puede ser lo que publique el estado: `errores.jsonl` se resuelve
 * desde `$EDITORIAL_ESTADO_DIR` como todo lo demas, no desde una constante del
 * repositorio (§8.6, fila «errores.jsonl»).
 */
export function registrarError(error) {
  const fila = { registrado_en: ahoraIso(), ...error };
  anexarJsonl(rutaErrores(), fila);
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
