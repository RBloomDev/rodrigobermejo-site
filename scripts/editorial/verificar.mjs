/**
 * Etapa 4 — Verificar hechos (`docs/plataforma/02-editorial.md` §5.4).
 *
 * ## El defecto que este modulo corrige
 *
 * La version anterior emitia esto sobre una pieza real:
 *
 *     verificar: OK  las-pantallas-por-si-solas... — 11 fuentes resuelven; fechas
 *     coincide/no_comprobada/no_confirmada/... ; 2 cifras halladas
 *
 * Una fecha confirmada de once, la mayoria de las fuentes sin leer, y el veredicto
 * decia `OK`. Tres errores encadenados, y los tres eran de diseño, no de codigo:
 *
 *   1. Un 403 o un timeout se tomaba como «no pasa nada»: la pieza seguia y ademas se
 *      contaba como si no hubiera contradicciones. **Ausencia de lectura no es ausencia
 *      de contradiccion.** Una fuente que no se pudo abrir no dice NADA, ni a favor ni
 *      en contra, y por tanto tampoco puede sostener la corroboracion minima de §3.
 *   2. Una URL que el redactor EXTRAJO del texto de otra fuente se contaba igual que la
 *      entrada del feed que leimos de primera mano. Que un articulo cite una URL solo
 *      prueba que la menciona; no prueba que ese documento respalde nada.
 *   3. El resultado era un booleano. Un booleano solo tiene dos casillas y aqui hay
 *      tres estados reales; el tercero —«no encontre contradicciones pero tampoco pude
 *      comprobarlo»— se iba a la casilla `true` porque no habia otra. Ese colapso es
 *      exactamente el defecto de RuntimeWire que §1 rechaza.
 *
 * ## Las tres clasificaciones, y por que no se colapsan
 *
 * **Estado de la fuente** — que sabemos del documento:
 *
 *   - `leida`          2xx y se obtuvo texto. Es la unica que permite afirmar algo.
 *   - `no_existe`      404 o 410. Esto SI es un fallo de la pieza: cita algo que no esta.
 *   - `no_consultada`  403, 429, 5xx, timeout, DNS, reset, TLS. No dice nada sobre el
 *                      documento. La mayoria de las editoriales academicas bloquean
 *                      clientes automatizados; tratarlo como inexistente haria que el
 *                      canal rechazara toda pieza que cite una revista cientifica.
 *
 * **Origen de la fuente** — de donde salio la URL:
 *
 *   - `detectada`            la entrada del feed, leida de primera mano por el canal.
 *   - `referencia_extraida`  la cito otra fuente y el redactor la copio. Hasta que se lea
 *                            Y se compruebe que respalda una afirmacion, no corrobora.
 *
 * Una `referencia_extraida` que ademas quedo `no_consultada` es doblemente debil —no
 * sabemos que dice ni sabemos que exista— y el informe lo dice con esas palabras.
 *
 * **Veredicto de la pieza** — tres valores, nunca un booleano:
 *
 *   - `verificada`     toda afirmacion relevante tiene respaldo legible, ninguna fuente
 *                      contradice, y no queda ninguna fuente sin consultar.
 *   - `parcial`        no hay contradicciones, pero queda al menos una afirmacion sin
 *                      respaldo legible o al menos una fuente que no se pudo consultar.
 *                      La pieza SIGUE SIENDO un borrador valido; lo que no recibe es el
 *                      sello de verificacion completa.
 *   - `no_verificada`  hay una contradiccion, o una fuente `no_existe`, o no se alcanza
 *                      la corroboracion minima de §3 contando SOLO fuentes `leida`.
 *
 * ## Las tres fechas, que no son la misma
 *
 * `fechasDeDocumento()` recogia cualquier fecha del HTML. Encontrar «una fecha» en una
 * pagina no confirma la fecha declarada: una nota al pie, un pie de foto o el año de
 * copyright del sitio bastaban para dar `coincide`. Ahora las fechas se extraen CON SU
 * ROL, y solo de los sitios donde el rol es explicito:
 *
 *   - publicacion:  `article:published_time`, `og:published_time`, `datePublished`
 *                   (JSON-LD o `itemprop`), `<time datetime ... pubdate>`.
 *   - modificacion: `article:modified_time`, `og:modified_time`, `dateModified`.
 *   - la **fecha del acontecimiento** NO sale del HTML. La declara la pieza y no se
 *     confirma con la pagina; el informe la reporta como no confirmable, no como fallo.
 *
 * Una fecha declarada se confirma SOLO contra la fecha de publicacion. Si en la pagina
 * solo hay fechas sueltas sin rol, el estado es `no_confirmada`, nunca `coincide`.
 * Si publicacion y modificacion difieren, el informe lo dice: la pieza puede estar
 * citando un texto que cambio despues de la fecha que cita.
 *
 * ## Lo que este modulo comprueba de las cifras, dicho con precision
 *
 * El control de cifras se conserva tal cual, con su alcance descrito sin adornos:
 * comprueba la **presencia** del numero en el texto legible de alguna fuente, no que la
 * afirmacion sea cierta. Una cifra que no aparece en ninguna fuente legible no pudo
 * leerse en ninguna parte y es, por definicion, inventada (§5.3: «si no, no se escribe»).
 * Que aparezca no significa que respalde nada: de eso se ocupa el juicio por afirmacion,
 * que delega en `verificar-afirmaciones.mjs` (`juzgarDeterminista`) y NO se reimplementa
 * aqui.
 *
 * El verificador NUNCA marca `por: "humano"`. Lo que hace es una comprobacion automatica,
 * y firmarla como revision humana seria el mismo defecto que esta etapa existe para
 * impedir: deja `por: "pendiente"`, escribe el veredicto y enumera lo que queda pendiente.
 */

import { aTextoPlano, normalizarUrl, obtener as obtenerPorRed, registrarError } from './comun.mjs';
import { cifrasEn, juzgarDeterminista, oraciones } from './verificar-afirmaciones.mjs';

const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const MESES_EN = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

export const ESTADOS_FUENTE = ['leida', 'no_existe', 'no_consultada'];
export const ORIGENES_FUENTE = ['detectada', 'referencia_extraida'];
export const VEREDICTOS_PIEZA = ['verificada', 'parcial', 'no_verificada'];

/** §3: «Minimo dos fuentes». Se cuenta SOLO con fuentes `leida`. */
export const MINIMO_CORROBORACION = 2;

const CAMPOS_NARRATIVOS = ['titulo', 'entradilla', 'hecho', 'que_cambia'];

/**
 * De donde se derivan afirmaciones. `no_establece[]` queda fuera a proposito: son las
 * cosas que la pieza declara que NO prueba, y exigirles respaldo legible seria pedir
 * que se demuestre una negativa. Entran igual en el corpus de cifras.
 */
const CAMPOS_CON_AFIRMACIONES = [...CAMPOS_NARRATIVOS];

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

// --- Fechas ----------------------------------------------------------------------

/**
 * TODAS las fechas que aparecen en el documento, SIN ROL.
 *
 * Se conserva para una sola cosa: contar y reportar cuantas fechas sueltas hay en la
 * pagina. **No sirve para confirmar nada** y por eso no decide ningun estado. Que en
 * una pagina aparezca la fecha que la pieza declara no dice que el documento se haya
 * publicado ese dia: puede ser un pie de foto, una cita, o el año del copyright.
 */
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
    const i = MESES_ES.indexOf(m[2].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
    if (i >= 0) encontradas.add(iso(m[3], i + 1, m[1]));
  }
  return encontradas;
}

function iso(a, m, d) {
  return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function atributo(etiqueta, nombre) {
  const re = new RegExp(`\\b${nombre}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i');
  const m = etiqueta.match(re);
  if (!m) return null;
  return m[2] ?? m[3] ?? m[4] ?? '';
}

/** La primera fecha legible de un valor de atributo, en ISO. `null` si no hay ninguna. */
export function primeraFechaIso(valor) {
  if (!valor) return null;
  const s = String(valor);
  // Sin `\b` al final a proposito: en `2026-09-11T09:00:00Z` no hay frontera de palabra
  // entre el dia y la «T», y con `\b` la fecha de publicacion de medio internet se
  // volvia invisible. Se acotan los lados con lookaround de digito, que es lo que de
  // verdad importa aqui.
  const isoDirecta = s.match(/(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/);
  if (isoDirecta) return isoDirecta[0];
  const en = s.match(/\b([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\b/);
  if (en) {
    const i = MESES_EN.indexOf(en[1].toLowerCase());
    if (i >= 0) return iso(en[3], i + 1, en[2]);
  }
  const es = s.match(/\b(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})\b/i);
  if (es) {
    const i = MESES_ES.indexOf(es[2].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
    if (i >= 0) return iso(es[3], i + 1, es[1]);
  }
  return null;
}

/**
 * Fechas CON SU ROL. Solo de los sitios donde el rol es explicito.
 *
 * @returns {{publicacion: string[], modificacion: string[], sin_rol: string[]}}
 */
export function fechasConRol(html) {
  const s = String(html ?? '');
  const publicacion = new Set();
  const modificacion = new Set();

  for (const m of s.matchAll(/<meta\b[^>]*>/gi)) {
    const etiqueta = m[0];
    const clave = (atributo(etiqueta, 'property') ?? atributo(etiqueta, 'name')
      ?? atributo(etiqueta, 'itemprop') ?? '').toLowerCase().trim();
    if (!clave) continue;
    const fecha = primeraFechaIso(atributo(etiqueta, 'content'));
    if (!fecha) continue;
    if (/published_time$/.test(clave) || clave === 'datepublished') publicacion.add(fecha);
    else if (/modified_time$/.test(clave) || clave === 'datemodified') modificacion.add(fecha);
  }

  // JSON-LD. `dateCreated` NO es fecha de publicacion y se queda sin rol a proposito.
  for (const m of s.matchAll(/"datePublished"\s*:\s*"([^"]+)"/gi)) {
    const f = primeraFechaIso(m[1]);
    if (f) publicacion.add(f);
  }
  for (const m of s.matchAll(/"dateModified"\s*:\s*"([^"]+)"/gi)) {
    const f = primeraFechaIso(m[1]);
    if (f) modificacion.add(f);
  }

  // <time datetime="..." pubdate> y <time datetime="..." itemprop="datePublished">
  for (const m of s.matchAll(/<time\b[^>]*>/gi)) {
    const etiqueta = m[0];
    const fecha = primeraFechaIso(atributo(etiqueta, 'datetime'));
    if (!fecha) continue;
    const prop = (atributo(etiqueta, 'itemprop') ?? '').toLowerCase().trim();
    if (/\bpubdate\b/i.test(etiqueta) || prop === 'datepublished') publicacion.add(fecha);
    else if (prop === 'datemodified') modificacion.add(fecha);
  }

  const conRol = new Set([...publicacion, ...modificacion]);
  const sinRol = [...fechasDeDocumento(s)].filter((f) => !conRol.has(f));

  return {
    publicacion: [...publicacion].sort(),
    modificacion: [...modificacion].sort(),
    sin_rol: sinRol.sort(),
  };
}

/**
 * Estado de la fecha declarada por la pieza frente a los roles hallados en la pagina.
 * Solo la fecha de PUBLICACION confirma. Una fecha suelta jamas da `coincide`.
 */
export function estadoDeFecha(declarada, roles) {
  if (declarada === null || declarada === undefined) return 'omitida_por_la_pieza';
  if (roles.publicacion.length === 0) return 'no_confirmada';
  if (roles.publicacion.includes(declarada)) return 'coincide';
  return 'discrepancia';
}

// --- Clasificacion de la respuesta y del origen -----------------------------------

/**
 * Que sabemos del documento a partir de la respuesta HTTP.
 * Un 2xx sin cuerpo tampoco es `leida`: no se obtuvo texto, asi que no dice nada.
 */
export function clasificarRespuesta(r) {
  if (r?.ok && typeof r.texto === 'string' && r.texto.trim()) return 'leida';
  if (r?.ok) return 'no_consultada';
  if (r?.codigo === 404 || r?.codigo === 410) return 'no_existe';
  return 'no_consultada';
}

function mismaUrl(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  try { return normalizarUrl(a) === normalizarUrl(b); } catch { return false; }
}

/**
 * De donde salio la URL. `componerPieza()` pone SIEMPRE la entrada del feed en
 * `fuentes[0]` y detras las que el modelo extrajo del texto; si la pieza trae `origen`
 * explicito, manda el campo.
 */
export function origenDeFuente(pieza, fuente, indice) {
  if (ORIGENES_FUENTE.includes(fuente?.origen)) return fuente.origen;
  const urlDetectada = pieza?.detectado_de ?? pieza?.fuentes?.[0]?.url ?? null;
  if (urlDetectada && mismaUrl(fuente?.url, urlDetectada)) return 'detectada';
  if (!urlDetectada && indice === 0) return 'detectada';
  return 'referencia_extraida';
}

// --- Afirmaciones relevantes ------------------------------------------------------

function esAnio(bruto) {
  return /^(19|20)\d{2}$/.test(bruto);
}

/**
 * Las afirmaciones que hay que poder respaldar leyendo una fuente.
 *
 * Si la pieza las declara (`pieza.afirmaciones[]`), se usan tal cual. Si no, se derivan:
 * cada oracion narrativa que carga una cifra que no es un año es una afirmacion
 * comprobable. Una oracion sin cifra no se deriva porque el juicio lexico no podria
 * decidirla, y marcarla «respaldada» sin poder medirlo seria justo la mentira que este
 * modulo existe para impedir.
 */
export function afirmacionesRelevantes(pieza) {
  if (Array.isArray(pieza?.afirmaciones) && pieza.afirmaciones.length) {
    return pieza.afirmaciones.map((a, i) => ({ id: a.id ?? `afirmacion:${i + 1}`, ...a }));
  }
  const salida = [];
  const vistas = new Set();
  const campos = [
    ...CAMPOS_CON_AFIRMACIONES.map((c) => [c, pieza?.[c] ?? '']),
    ['mexico.texto', pieza?.mexico?.texto ?? ''],
  ];
  for (const [campo, texto] of campos) {
    if (!String(texto).trim()) continue;
    for (const o of oraciones(String(texto))) {
      const cifras = cifrasEn(o.texto).filter((c) => !esAnio(c.bruto));
      if (!cifras.length) continue;
      const clave = o.texto.trim().toLowerCase();
      if (vistas.has(clave)) continue;
      vistas.add(clave);
      salida.push({
        id: `${campo}:${o.inicio}`,
        texto: o.texto.trim(),
        cifra: cifras[0].valor,
        campo,
        derivada: true,
      });
    }
  }
  return salida;
}

// --- Verificacion -----------------------------------------------------------------

/**
 * @param {object} pieza
 * @param {object} [opciones]
 * @param {Function} [opciones.obtener]    puerta de red inyectable; las pruebas corren sin red
 * @param {Function} [opciones.registrar]  escritura en `errores.jsonl`, inyectable
 * @param {Function} [opciones.juzgar]     juicio por afirmacion; por defecto `juzgarDeterminista`
 * @returns {Promise<object>} informe con `veredicto` de tres valores. NO devuelve `ok`.
 */
export async function verificarPieza(pieza, {
  obtener = obtenerPorRed,
  registrar = registrarError,
  juzgar = juzgarDeterminista,
  timeoutMs = 25000,
  minimoCorroboracion = MINIMO_CORROBORACION,
} = {}) {
  const fallos = [];
  const avisos = [];
  const informes = [];
  const leidas = [];
  let corpus = '';

  const fuentes = Array.isArray(pieza?.fuentes) ? pieza.fuentes : [];

  for (const [indice, fuente] of fuentes.entries()) {
    const origen = origenDeFuente(pieza, fuente, indice);
    const r = await obtener(fuente.url, { timeoutMs });
    const estado = clasificarRespuesta(r);
    const base = {
      url: fuente.url,
      medio: fuente.medio ?? null,
      http: r?.codigo ?? null,
      estado,
      origen,
      fecha_declarada: fuente.fecha ?? null,
      corrobora: false,
      respalda: [],
    };

    if (estado !== 'leida') {
      registrar({
        etapa: 'verificar',
        pieza_id: pieza?.id,
        fuente: fuente.medio,
        url: fuente.url,
        codigo: r?.codigo,
        mensaje: r?.mensaje,
        estado,
        origen,
        consecuencia: estado === 'no_existe'
          ? 'la fuente no existe: la pieza no pasa verificacion'
          : 'fuente NO CONSULTADA: no corrobora, no descarta contradicciones, y no cuenta para el minimo de §3',
      });
      if (estado === 'no_existe') {
        fallos.push(`fuente no existe: ${fuente.url} [${r?.codigo}] ${r?.mensaje ?? ''}`.trim());
      } else {
        avisos.push(
          `fuente NO CONSULTADA: ${fuente.url} [${r?.codigo}] — no se pudo leer. `
          + 'No corrobora y NO permite afirmar que no contradiga: de este documento no sabemos nada.',
        );
        if (origen === 'referencia_extraida') {
          avisos.push(
            `doblemente debil: ${fuente.url} es una referencia que otra fuente cito (no la leimos de `
            + 'primera mano) y ademas no se pudo consultar. Ni sabemos que dice, ni que exista.',
          );
        }
      }
      informes.push({
        ...base,
        fecha: 'no_comprobada',
        publicacion: [],
        modificacion: [],
        fechas_sin_rol: 0,
        nota: estado === 'no_existe'
          ? 'el documento citado no existe (404/410)'
          : 'no dice nada sobre el documento: ni corrobora, ni descarta una contradiccion',
      });
      continue;
    }

    const plano = aTextoPlano(r.texto);
    corpus += ' \n ' + plano;
    leidas.push({ url: fuente.url, texto: plano, origen });

    const roles = fechasConRol(r.texto);
    const estadoFecha = estadoDeFecha(fuente.fecha, roles);

    if (estadoFecha === 'discrepancia') {
      fallos.push(
        `fecha declarada ${fuente.fecha} no es la fecha de publicacion de ${fuente.url}: `
        + `el documento se publico ${roles.publicacion.join(', ')}`,
      );
    } else if (estadoFecha === 'no_confirmada') {
      avisos.push(
        `sin fecha de publicacion con rol explicito en ${fuente.url} (la pieza declara ${fuente.fecha}); `
        + `${roles.sin_rol.length} fechas sueltas en la pagina, que NO confirman nada`
        + (roles.sin_rol.includes(fuente.fecha)
          ? '. Una de esas fechas sueltas coincide con la declarada: coincidencia, no confirmacion'
          : ''),
      );
      if (roles.modificacion.includes(fuente.fecha)) {
        avisos.push(
          `${fuente.url}: la fecha declarada ${fuente.fecha} es la de MODIFICACION del documento, `
          + 'no la de publicacion. No confirma la fecha de la pieza.',
        );
      }
    } else if (estadoFecha === 'omitida_por_la_pieza') {
      // La pieza declaro que NO sabe la fecha. Eso no es una contradiccion: es una
      // omision, y se corrige sola diciendo cual es. Tratarla como fallo obligaba al
      // redactor a poner una fecha aunque no la viera --- justo el incentivo a fabricar
      // que este gate existe para cerrar.
      avisos.push(
        `la pieza no declaro fecha para ${fuente.url}; el documento declara publicacion `
        + `${roles.publicacion.join(', ') || '(ninguna con rol)'}. Se puede completar.`,
      );
    }

    if (roles.publicacion.length && roles.modificacion.length
      && roles.modificacion.some((m) => !roles.publicacion.includes(m))) {
      avisos.push(
        `${fuente.url} se publico ${roles.publicacion.join(', ')} y se modifico `
        + `${roles.modificacion.join(', ')}: la pieza puede estar citando un texto que cambio despues.`,
      );
    }

    informes.push({
      ...base,
      fecha: estadoFecha,
      publicacion: roles.publicacion,
      modificacion: roles.modificacion,
      fechas_sin_rol: roles.sin_rol.length,
      nota: null,
    });
  }

  // --- Afirmaciones: quien las respalda, y con que fuente --------------------------
  const afirmaciones = afirmacionesRelevantes(pieza);
  const porUrl = new Map(informes.map((i) => [i.url, i]));
  const juicios = [];

  for (const af of afirmaciones) {
    const respaldan = [];
    const contradicen = [];
    for (const f of leidas) {
      // `await` aunque el juez por defecto sea sincrono: asi el mismo punto de llamada
      // admite el juez asistido por modelo (`revisarAfirmacion`, asincrono), que es el
      // unico capaz de juzgar una afirmacion en espanol contra una fuente en ingles.
      // El lexico no cruza idiomas, y sin esto toda pieza sobre una fuente extranjera
      // quedaba «sin respaldo legible» por una limitacion del juez, no de la evidencia.
      const juicio = await juzgar(af, { id: f.url, url: f.url, texto: f.texto });
      if (juicio.veredicto === 'respaldada') {
        respaldan.push(f.url);
        porUrl.get(f.url)?.respalda.push(af.id);
      } else if (juicio.veredicto === 'contradicha') {
        contradicen.push({ url: f.url, motivo: juicio.motivo, pasaje: juicio.pasaje?.cita ?? null });
      }
    }
    const estado = contradicen.length
      ? 'contradicha'
      : (respaldan.length ? 'respaldada' : 'sin_respaldo_legible');
    juicios.push({
      id: af.id,
      texto: af.texto ?? null,
      cifra: af.cifra ?? null,
      estado,
      respaldada_por: respaldan,
      contradicha_por: contradicen.map((c) => c.url),
    });
    for (const c of contradicen) {
      fallos.push(
        `afirmacion contradicha por una fuente leida: «${af.texto}» — ${c.url} (${c.motivo})`
        + (c.pasaje ? ` · pasaje: «${c.pasaje}»` : ''),
      );
    }
  }

  const noConsultadas = informes.filter((i) => i.estado === 'no_consultada');
  const pendientes = juicios
    .filter((j) => j.estado === 'sin_respaldo_legible')
    .map((j) => ({
      afirmacion_id: j.id,
      texto: j.texto,
      motivo: leidas.length === 0
        ? 'no se pudo leer ninguna fuente: no hay donde comprobarlo'
        : `ninguna de las ${leidas.length} fuentes legibles la respalda`
          + (noConsultadas.length ? `; quedan ${noConsultadas.length} fuentes sin consultar` : ''),
    }));

  // --- Corroboracion minima de §3, contada SOLO con fuentes leidas -----------------
  //
  // Una `referencia_extraida` leida que no respalda ninguna afirmacion NO corrobora:
  // que un articulo mencione una URL solo prueba que la menciona. Cuando la pieza no
  // tiene ninguna afirmacion con cifra que juzgar, no hay nada que exigirle mas alla de
  // ser legible, y el informe lo dice para que nadie lea de mas en ese numero.
  for (const i of informes) {
    i.corrobora = i.estado === 'leida'
      && (i.origen === 'detectada' || i.respalda.length > 0 || afirmaciones.length === 0);
  }
  const corroborantes = informes.filter((i) => i.corrobora);
  const cumpleCorroboracion = corroborantes.length >= minimoCorroboracion;
  if (!cumpleCorroboracion) {
    fallos.push(
      `corroboracion insuficiente: ${corroborantes.length} de ${minimoCorroboracion} fuentes `
      + `corroborantes (leidas y utiles). Citadas ${informes.length}, leidas `
      + `${leidas.length}, no consultadas ${noConsultadas.length}, inexistentes `
      + `${informes.filter((i) => i.estado === 'no_existe').length}. §3 exige `
      + `${minimoCorroboracion} y se cuentan solo las leidas.`,
    );
  }

  // --- Cifras: PRESENCIA en el corpus legible, no veracidad ------------------------
  const enCorpus = cifrasDeCorpus(corpus);
  const cifras = cifrasDe(textoNarrativo(pieza));
  const huerfanas = cifras.filter((c) => !enCorpus.has(c));
  if (huerfanas.length) {
    fallos.push(
      `cifras del texto que no aparecen en ninguna fuente legible: ${huerfanas.join(', ')} `
      + '— §5.3: si no, no se escribe',
    );
  }

  const veredicto = fallos.length
    ? 'no_verificada'
    : (pendientes.length || noConsultadas.length ? 'parcial' : 'verificada');

  const conteo = {
    citadas: informes.length,
    leidas: leidas.length,
    no_consultadas: noConsultadas.length,
    no_existen: informes.filter((i) => i.estado === 'no_existe').length,
    corroborantes: corroborantes.length,
    minimo: minimoCorroboracion,
    cumple_minimo: cumpleCorroboracion,
    referencias_extraidas: informes.filter((i) => i.origen === 'referencia_extraida').length,
  };

  return {
    veredicto,
    fallos,
    avisos,
    pendientes,
    fuentes: informes,
    afirmaciones: juicios,
    corroboracion: conteo,
    cifras_comprobadas: cifras.filter((c) => enCorpus.has(c)),
    cifras_sin_respaldo: huerfanas,
    fecha_acontecimiento: {
      valor: pieza?.ocurrido_en ?? null,
      estado: 'no_confirmable_con_la_pagina',
      nota: 'la fecha del acontecimiento la declara la pieza; no sale del HTML de las fuentes '
        + 'y no se confirma con ellas',
    },
    detalle: componerDetalle({ veredicto, conteo, juicios, pendientes, informes, cifras, huerfanas, fallos }),
  };
}

function componerDetalle({ veredicto, conteo, juicios, pendientes, informes, cifras, huerfanas, fallos }) {
  const fechas = informes.map((i) => `${i.estado === 'leida' ? i.fecha : i.estado}`).join('/');
  const partes = [
    `VEREDICTO ${veredicto.toUpperCase()}.`,
    `Fuentes: ${conteo.citadas} citadas — ${conteo.leidas} leidas, ${conteo.no_consultadas} `
      + `no consultadas, ${conteo.no_existen} inexistentes; ${conteo.corroborantes}/${conteo.minimo} `
      + 'corroborantes contando solo fuentes leidas.',
    `Afirmaciones: ${juicios.filter((j) => j.estado === 'respaldada').length} con respaldo legible, `
      + `${pendientes.length} pendientes, `
      + `${juicios.filter((j) => j.estado === 'contradicha').length} contradichas.`,
    `Fechas por fuente: ${fechas || '(sin fuentes)'} — solo la fecha de publicacion confirma.`,
    `Cifras: ${cifras.length - huerfanas.length}/${cifras.length} presentes en el texto legible `
      + '(comprueba PRESENCIA de la cifra, no que la afirmacion sea cierta).',
  ];
  if (pendientes.length) {
    partes.push('PENDIENTES: ' + pendientes.map((p) => `«${p.texto}» (${p.motivo})`).join(' | '));
  }
  if (conteo.no_consultadas) {
    partes.push(
      `${conteo.no_consultadas} fuentes sin consultar: de ellas no se puede afirmar que no contradigan.`,
    );
  }
  if (fallos.length) partes.push('NO PASA: ' + fallos.join(' | '));
  partes.push('Revision humana pendiente.');
  return partes.join(' ');
}

/** Escribe el resultado en `procedencia.verificado` (§5.4). Nunca firma como humano. */
export function sellarVerificacion(pieza, informe) {
  pieza.procedencia.verificado = {
    por: 'pendiente',
    veredicto: informe.veredicto,
    detalle: informe.detalle + (informe.avisos.length ? ` Avisos: ${informe.avisos.join(' | ')}` : ''),
    pendientes: (informe.pendientes ?? []).map((p) => `${p.texto} — ${p.motivo}`),
  };
  return pieza;
}
