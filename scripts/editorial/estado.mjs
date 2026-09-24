/**
 * Maquina de estados del canal editorial.
 *
 * ================================ EL DEFECTO QUE CIERRA ================================
 *
 * El canal anterior fundia cuatro cosas distintas en una sola: `vistos.jsonl`. Una entrada
 * se marcaba como vista **en cuanto se detectaba**. Si despues no se redactaba, o fallaba
 * la verificacion, o el proceso se caia, la segunda corrida la consideraba «ya vista» y la
 * descartaba. La idempotencia se consiguio al precio de perder pendientes: el registro
 * decia «visto» donde el negocio necesitaba decir «leido, pero sin terminar».
 *
 * Aqui esas cuatro cosas son cuatro estados distintos:
 *
 *   1. DETECCION            la entrada existe y se leyo            -> `detectada`
 *   2. TRABAJO PENDIENTE    detectada, aun sin borrador terminado  -> `pendiente_redaccion`
 *                                                                     `pendiente_verificacion`
 *   3. REINTENTO            fallo una etapa, se puede reintentar   -> `fallida_reintentable`
 *   4. BORRADOR TERMINADO   hay pieza; reprocesar no duplica       -> `terminada`
 *   5. DECISION HUMANA      un humano autorizo publicar            -> `autorizada`
 *
 * Y un sexto estado para lo que no debe volver: `descartada`.
 *
 * `terminada` y `autorizada` NO son lo mismo y la distancia entre las dos es el producto:
 * `terminada` es «hay borrador verificado, sin publicar»; `autorizada` es «un humano
 * decidio publicarlo». Solo el segundo escribe en `content/noticias/`
 * (`docs/plataforma/02-editorial.md` §8.1, §8.2).
 *
 * ================================ TABLA DE TRANSICIONES ================================
 *
 * | Desde                  | Evento           | Hacia                  | Cuando                                                    |
 * |------------------------|------------------|------------------------|-----------------------------------------------------------|
 * | (no existe)            | detectada        | detectada              | primera lectura de la entrada en un feed                  |
 * | detectada              | expediente_listo | pendiente_redaccion    | se preparo el expediente para el redactor                 |
 * | detectada              | fallo            | fallida_reintentable   | fallo al preparar el expediente                           |
 * | detectada              | descartada       | descartada             | duplicada, vetada, o fuera de alcance                     |
 * | pendiente_redaccion    | redactada        | pendiente_verificacion | el redactor entrego borrador                              |
 * | pendiente_redaccion    | fallo            | fallida_reintentable   | el borrador no compone contra el esquema de §3            |
 * | pendiente_redaccion    | descartada       | descartada             | decision explicita                                        |
 * | pendiente_verificacion | verificada       | terminada              | la pieza paso §5.4 y entro al corpus                      |
 * | pendiente_verificacion | fallo            | fallida_reintentable   | una fuente no resuelve, fecha discrepante, cifra huerfana |
 * | pendiente_verificacion | descartada       | descartada             | decision explicita                                        |
 * | fallida_reintentable   | expediente_listo | pendiente_redaccion    | el reintento reconstruyo el expediente                    |
 * | fallida_reintentable   | redactada        | pendiente_verificacion | el reintento si obtuvo borrador                           |
 * | fallida_reintentable   | verificada       | terminada              | el reintento si paso verificacion                         |
 * | fallida_reintentable   | fallo            | fallida_reintentable   | vuelve a fallar; `intentos` sube en uno                   |
 * | fallida_reintentable   | fallo (agotado)  | descartada             | `intentos` alcanzo MAX_INTENTOS                           |
 * | fallida_reintentable   | descartada       | descartada             | decision explicita                                        |
 * | terminada              | autorizada       | autorizada             | un humano autorizo la publicacion (§8.2). Unica salida    |
 * | autorizada             | (ninguno)        | autorizada             | TERMINAL. Una correccion posterior va en `correcciones[]` |
 * | descartada             | reabierta        | detectada              | unica salida, y es explicita: `reabrir(id, motivo)`       |
 *
 * Cualquier par (estado, evento) que no aparezca en esta tabla es ilegal y `aplicar()`
 * lanza. Un log append-only con transiciones ilegales dentro no prueba nada.
 *
 * La unica excepcion, y es deliberada: el evento `detectada` sobre una entrada que ya
 * existe NO es ilegal y NO mueve nada. Reprocesar es normal; reprocesar no debe deshacer.
 *
 * =============================== PERSISTENCIA: JSONL =================================
 *
 * Sin base de datos: `AGENTS.md` prohibe dependencias nuevas sin decision de Rodrigo, y
 * esto no la necesita. El estado **no se guarda**: se guarda el log de eventos en
 * `estado/bitacora.jsonl`, append-only, y el estado actual se recompone plegandolo
 * (`plegar()`). Dos consecuencias que importan:
 *
 *   - Nunca se reescribe una linea. Un proceso que muere a media corrida deja el log
 *     coherente hasta el ultimo evento completo; `plegar()` tolera una ultima linea
 *     truncada y la registra como fallo de la etapa `estado` en vez de tragarsela.
 *   - Se puede responder «por que esta esto aqui» leyendo la traza, no adivinando.
 *
 * =============================== QUE NO ENTRA AL LOG =================================
 *
 * Solo los campos de `CAMPOS_ENTRADA`: titulo, URL, medio, licencia y fechas, que es lo
 * que §5.1 autoriza. **Ni cuerpos, ni prompts, ni transcripciones**, venga la fuente de
 * donde venga (`AGENTS.md`, `02-editorial.md` §3 y §4). No es una convencion de estilo:
 * `soloCamposPermitidos()` descarta cualquier otra clave antes de escribir, asi que no
 * existe un camino por el que ese texto llegue al disco.
 *
 * =============================== IDENTIDAD DE UN HECHO ===============================
 *
 * La identidad de una entrada es **el hecho**: su propia URL canonica y su propia huella
 * (titulo + dominio del medio que lo publica). **Nunca sus referencias.** Dos noticias
 * distintas que citan el mismo documento son dos hechos, no uno; el documento compartido
 * no las hace la misma cosa. El canal anterior indexaba como «visto» todo `fuentes[]` de
 * toda pieza del corpus, asi que una sola referencia compartida borraba un hecho entero.
 *
 * Nota de divergencia con `docs/plataforma/02-editorial.md` §5.2, que describe el nivel 2
 * como «el dominio de la fuente primaria»: aqui es el dominio de la **entrada detectada**.
 * Con el dominio de la fuente primaria, dos noticias que comparten documento primario
 * comparten media huella, que es justo el colapso que este modulo existe para impedir.
 */

import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ahoraIso, dirEstado } from './comun.mjs';

// --- Configuracion -----------------------------------------------------------------

/** Reintentos antes de que una entrada caiga a `descartada` por agotamiento. */
export const MAX_INTENTOS = 3;

/** Etapas que pueden fallar. El registro de un fallo tiene que decir cual fue. */
export const ETAPAS = ['detectar', 'redactar', 'verificar', 'estado'];

export const ESTADOS = [
  'detectada',
  'pendiente_redaccion',
  'pendiente_verificacion',
  'fallida_reintentable',
  'descartada',
  'terminada',
  'autorizada',
];

/**
 * La tabla de transiciones de arriba, como dato. Es la unica autoridad: `aplicar()` no
 * tiene ninguna rama `if` que invente un estado por su cuenta.
 */
export const TRANSICIONES = Object.freeze({
  __inexistente__: { detectada: 'detectada' },
  detectada: {
    expediente_listo: 'pendiente_redaccion',
    fallo: 'fallida_reintentable',
    descartada: 'descartada',
  },
  pendiente_redaccion: {
    redactada: 'pendiente_verificacion',
    fallo: 'fallida_reintentable',
    descartada: 'descartada',
  },
  pendiente_verificacion: {
    verificada: 'terminada',
    fallo: 'fallida_reintentable',
    descartada: 'descartada',
  },
  fallida_reintentable: {
    expediente_listo: 'pendiente_redaccion',
    redactada: 'pendiente_verificacion',
    verificada: 'terminada',
    fallo: 'fallida_reintentable',
    descartada: 'descartada',
  },
  // `terminada` gana EXACTAMENTE una salida, y ninguna otra (§8.2). `expediente_listo`,
  // `redactada` y `fallo` siguen siendo ilegales desde aqui: autorizar no redacta ni
  // reverifica, y una pieza publicada no vuelve a la cola.
  terminada: { autorizada: 'autorizada' },
  autorizada: {},
  descartada: { reabierta: 'detectada' },
});

/** Lo unico que del hecho detectado se guarda. Ver «QUE NO ENTRA AL LOG». */
const CAMPOS_ENTRADA = [
  'fuente_id', 'medio', 'licencia', 'uso', 'titulo',
  'url', 'url_canonica', 'dominio', 'fecha_publicacion', 'fecha_lectura', 'huella',
];

// --- Rutas -------------------------------------------------------------------------

/**
 * Raiz del estado. Vive en `comun.mjs` y es **obligatoria, sin valor por defecto**: se
 * re-exporta aqui porque este modulo es el que la usa, no porque la resuelva. Ver el
 * bloque «Directorios privados» de `comun.mjs` y §8.3.
 */
export { dirEstado };

export function rutaBitacora() {
  return join(dirEstado(), 'bitacora.jsonl');
}

export function rutaFallos() {
  return join(dirEstado(), 'fallos.jsonl');
}

/** `vistos.jsonl` del canal anterior. Se lee, nunca se escribe. Ver `plegar()`. */
export function rutaVistosLegado() {
  return join(dirEstado(), 'vistos.jsonl');
}

// --- Log append-only ---------------------------------------------------------------

function anexar(ruta, fila) {
  mkdirSync(dirEstado(), { recursive: true });
  appendFileSync(ruta, JSON.stringify(fila) + '\n', 'utf8');
  return fila;
}

/**
 * Lee un JSONL tolerando que la ULTIMA linea este truncada, que es exactamente lo que
 * deja un proceso muerto a media escritura. Una linea rota en medio del archivo no se
 * tolera: eso no es una caida, es corrupcion, y callarla seria perder trabajo en silencio.
 * @returns {{filas: object[], colaTruncada: boolean}}
 */
export function leerLog(ruta) {
  if (!existsSync(ruta)) return { filas: [], colaTruncada: false };
  const lineas = readFileSync(ruta, 'utf8').split('\n');
  const filas = [];
  let colaTruncada = false;
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i].trim();
    if (!l) continue;
    try {
      filas.push(JSON.parse(l));
    } catch (e) {
      const esUltima = lineas.slice(i + 1).every((r) => r.trim() === '');
      if (!esUltima) {
        throw new Error(`bitacora corrupta en la linea ${i + 1} de ${ruta}: ${e.message}`);
      }
      colaTruncada = true;
    }
  }
  return { filas, colaTruncada };
}

// --- Registro de fallos, por etapa --------------------------------------------------

/**
 * Registra un fallo en `estado/fallos.jsonl`. **Con etapa.** Un fallo de verificacion no
 * es un fallo de acceso, y un fallo de acceso leyendo un feed no es lo mismo que uno
 * revisando una fuente durante la verificacion: el registro tiene que distinguirlos o no
 * sirve para decidir nada.
 *
 * @param {object} fallo
 * @param {'detectar'|'redactar'|'verificar'|'estado'} fallo.etapa
 * @param {string|null} [fallo.entrada_id]   entrada afectada, si la hay
 * @param {string|number} fallo.codigo       403, 'TIMEOUT', 'ESQUEMA', 'CIFRA_HUERFANA'...
 * @param {string} fallo.mensaje
 * @param {string} fallo.consecuencia        que deja de pasar por culpa de este fallo
 * @param {object} [fallo.contexto]          fuente_id, url, pieza_id. Nunca cuerpos.
 * @param {string} [fallo.corrida]
 * @returns {object} la fila escrita
 */
export function registrarFallo(fallo) {
  const faltantes = ['etapa', 'codigo', 'mensaje', 'consecuencia'].filter((c) => {
    const v = fallo?.[c];
    return v === undefined || v === null || String(v).trim() === '';
  });
  if (faltantes.length) {
    throw new Error(
      `fallo sin ${faltantes.join(', ')}: un registro que no dice etapa, codigo y consecuencia no sirve para decidir nada`,
    );
  }
  if (!ETAPAS.includes(fallo.etapa)) {
    throw new Error(`etapa desconocida: ${fallo.etapa} (validas: ${ETAPAS.join(', ')})`);
  }
  return anexar(rutaFallos(), {
    registrado_en: ahoraIso(),
    etapa: fallo.etapa,
    entrada_id: fallo.entrada_id ?? null,
    codigo: fallo.codigo,
    mensaje: String(fallo.mensaje),
    consecuencia: fallo.consecuencia,
    contexto: fallo.contexto ?? null,
    corrida: fallo.corrida ?? null,
  });
}

/** @returns {object[]} todas las filas de `fallos.jsonl` */
export function fallosRegistrados() {
  return leerLog(rutaFallos()).filas;
}

// --- Identidad ----------------------------------------------------------------------

/**
 * Clave estable de un hecho, derivada **solo de la entrada misma**: su URL canonica.
 * Jamas de sus referencias. Ver «IDENTIDAD DE UN HECHO».
 * @param {{url_canonica: string}} entrada
 * @returns {string} p. ej. `hecho:9f2c1a2b3c4d5e6f`
 */
export function claveDe(entrada) {
  const url = entrada?.url_canonica;
  if (!url) throw new Error('claveDe: la entrada no tiene `url_canonica`');
  return 'hecho:' + createHash('sha256').update(url, 'utf8').digest('hex').slice(0, 16);
}

function soloCamposPermitidos(entrada) {
  const limpia = {};
  for (const c of CAMPOS_ENTRADA) if (entrada?.[c] !== undefined) limpia[c] = entrada[c];
  return limpia;
}

// --- Plegado del log ----------------------------------------------------------------

function nuevaEntrada(id, datos, ts) {
  return {
    id,
    estado: 'detectada',
    ...soloCamposPermitidos(datos),
    intentos: 0,
    etapa_fallida: null,
    ultimo_error: null,
    motivo_descarte: null,
    redaccion_id: null,
    modelo: null,
    pieza_id: null,
    // La decision humana de §8.8. `null` mientras nadie haya autorizado, que es el estado
    // correcto de una entrada sobre la que no se ha decidido nada.
    autorizado_por: null,
    autorizado_en: null,
    version_borrador: null,
    pendientes_aceptados: null,
    acepta_limites: null,
    detectada_en: ts,
    actualizada_en: ts,
  };
}

/**
 * Aplica un evento a una entrada segun `TRANSICIONES`. Pura: no toca disco.
 * @param {object|null} entrada  estado previo, o null si el hecho no existe aun
 * @param {object} evento        {id, evento, ts, ...datos}
 * @returns {object} el estado resultante
 * @throws si el par (estado, evento) no esta en la tabla
 */
export function aplicar(entrada, evento) {
  const desde = entrada ? entrada.estado : '__inexistente__';
  const legales = TRANSICIONES[desde] ?? {};
  const hacia = legales[evento.evento];

  if (!hacia) {
    // `detectada` sobre algo que ya existe no es ilegal: es reprocesar, y reprocesar no
    // debe mover nada. Sostiene la propiedad 4 (una pieza terminada no se duplica) y la 1
    // (una pendiente sigue pendiente en vez de volver al principio).
    if (evento.evento === 'detectada' && entrada) return entrada;
    throw new Error(
      `transicion ilegal: ${desde} --${evento.evento}--> (nada). `
      + `Legales desde ${desde}: ${Object.keys(legales).join(', ') || '(ninguna, es terminal)'}`,
    );
  }

  if (!entrada) return nuevaEntrada(evento.id, evento.datos ?? {}, evento.ts);

  const sig = { ...entrada, actualizada_en: evento.ts };

  if (evento.evento === 'fallo') {
    sig.intentos = entrada.intentos + 1;
    sig.etapa_fallida = evento.etapa ?? null;
    sig.ultimo_error = evento.mensaje ?? null;
    if (sig.intentos >= MAX_INTENTOS) {
      sig.estado = 'descartada';
      sig.motivo_descarte =
        `reintentos_agotados: ${sig.intentos} intentos fallidos en la etapa ${sig.etapa_fallida}`;
      return sig;
    }
    sig.estado = hacia;
    return sig;
  }

  sig.estado = hacia;
  if (evento.evento === 'redactada') {
    sig.redaccion_id = evento.redaccion_id ?? null;
    sig.modelo = evento.modelo ?? null;
    sig.etapa_fallida = null;
  }
  if (evento.evento === 'verificada') {
    sig.pieza_id = evento.pieza_id ?? null;
    sig.etapa_fallida = null;
    sig.ultimo_error = null;
  }
  if (evento.evento === 'autorizada') {
    // Los cinco campos del registro de §8.8, tal cual llegaron. `aplicar()` es pura y no
    // valida: quien emite el evento es `marcarAutorizada()`, y ahi estan las exigencias.
    sig.pieza_id = evento.pieza_id ?? sig.pieza_id;
    sig.autorizado_por = evento.autorizado_por ?? null;
    sig.autorizado_en = evento.autorizado_en ?? null;
    sig.version_borrador = evento.version_borrador ?? null;
    sig.pendientes_aceptados = evento.pendientes_aceptados ?? null;
    sig.acepta_limites = evento.acepta_limites ?? null;
  }
  if (evento.evento === 'expediente_listo') sig.etapa_fallida = null;
  if (evento.evento === 'descartada') sig.motivo_descarte = evento.motivo ?? 'sin motivo declarado';
  if (evento.evento === 'reabierta') {
    sig.motivo_descarte = null;
    sig.intentos = 0;
    sig.etapa_fallida = null;
  }
  return sig;
}

/**
 * Recompone el estado actual plegando el log completo.
 * @returns {{entradas: Map<string, object>, porUrl: Map<string, string>, porHuella: Map<string, string>, colaTruncada: boolean}}
 */
export function plegar() {
  const entradas = new Map();
  const porUrl = new Map();
  const porHuella = new Map();

  const aplicarFila = (fila) => {
    const previa = entradas.get(fila.id) ?? null;
    const sig = aplicar(previa, fila);
    entradas.set(fila.id, sig);
    if (sig.url_canonica) porUrl.set(sig.url_canonica, fila.id);
    if (sig.huella) porHuella.set(sig.huella, fila.id);
  };

  // Migracion del canal anterior: `vistos.jsonl` decia «visto», que en la semantica nueva
  // es `detectada` y NADA MAS. Lo que el canal anterior dio por cerrado al detectarlo
  // vuelve a ser trabajo pendiente, que es lo que siempre fue. Lo que si llego a pieza lo
  // cierra `conciliarConCorpus()`.
  for (const v of leerLog(rutaVistosLegado()).filas) {
    if (!v.url_canonica) continue;
    const id = claveDe(v);
    if (entradas.has(id)) continue;
    aplicarFila({
      id,
      evento: 'detectada',
      ts: v.visto_en ?? '1970-01-01T00:00Z',
      corrida: v.corrida ?? null,
      origen: 'vistos_legado',
      datos: { ...v, fecha_lectura: v.visto_en },
    });
  }

  const { filas, colaTruncada } = leerLog(rutaBitacora());
  for (const fila of filas) aplicarFila(fila);

  if (colaTruncada) {
    registrarFallo({
      etapa: 'estado',
      codigo: 'BITACORA_TRUNCADA',
      mensaje: 'la ultima linea de bitacora.jsonl esta incompleta; se descarto al plegar',
      consecuencia:
        'el ultimo evento no se aplico; la entrada conserva su estado anterior y vuelve a estar pendiente',
    });
  }

  return { entradas, porUrl, porHuella, colaTruncada };
}

function emitir(evento) {
  const fila = { ts: ahoraIso(), ...evento };
  anexar(rutaBitacora(), fila);
  return fila;
}

// =====================================================================================
//  API PUBLICA — la que consumen `redactar.mjs` y `ejecutar.mjs`
// =====================================================================================

/**
 * Registra que una entrada se detecto. **Idempotente**: si el hecho ya existe en el log
 * no se emite nada y no se mueve de estado, este donde este.
 *
 * El hecho se reconoce por su URL canonica y, en segundo lugar, por su huella (el mismo
 * articulo republicado en otra URL del mismo medio). Nunca por sus referencias.
 *
 * @param {object} entrada  item de `detectar()`: {fuente_id, medio, licencia, uso, titulo,
 *   url, url_canonica, dominio, fecha_publicacion, fecha_lectura, huella}
 * @param {{corrida?: string}} [opciones]
 * @returns {{id: string, estado: string, nuevo: boolean, entrada: object}}
 */
export function registrarDeteccion(entrada, { corrida = null } = {}) {
  const { entradas, porUrl, porHuella } = plegar();
  const id = porUrl.get(entrada.url_canonica)
    ?? (entrada.huella ? porHuella.get(entrada.huella) : undefined)
    ?? claveDe(entrada);

  const previa = entradas.get(id);
  if (previa) return { id, estado: previa.estado, nuevo: false, entrada: previa };

  const fila = emitir({ id, evento: 'detectada', corrida, datos: soloCamposPermitidos(entrada) });
  return { id, estado: 'detectada', nuevo: true, entrada: aplicar(null, fila) };
}

/**
 * El expediente para el redactor esta listo.
 * `detectada | fallida_reintentable -> pendiente_redaccion`.
 * @param {string} id
 * @param {{corrida?: string}} [opciones]
 * @returns {object} la entrada tras la transicion
 */
export function marcarExpedienteListo(id, { corrida = null } = {}) {
  return transicionar(id, { evento: 'expediente_listo', corrida });
}

/**
 * Trabajo que todavia necesita borrador. **Esta es la funcion que cierra el defecto**:
 * devuelve tambien lo que quedo a medias en corridas anteriores y lo que fallo y aun
 * conserva reintentos, no solo lo detectado hoy.
 *
 * Incluye: `detectada` (leida, sin expediente aun), `pendiente_redaccion`, y
 * `fallida_reintentable` cuya `etapa_fallida` sea `detectar` o `redactar`.
 * Excluye: `pendiente_verificacion`, `terminada`, `descartada`.
 *
 * @param {{limite?: number}} [opciones]
 * @returns {object[]} entradas, de la mas antigua a la mas reciente
 */
export function pendientesDeRedaccion({ limite = Infinity } = {}) {
  return seleccionar(
    (e) => e.estado === 'detectada'
      || e.estado === 'pendiente_redaccion'
      || (e.estado === 'fallida_reintentable' && ['detectar', 'redactar'].includes(e.etapa_fallida)),
    limite,
  );
}

/**
 * El redactor entrego borrador.
 * `pendiente_redaccion | fallida_reintentable -> pendiente_verificacion`.
 * @param {string} id
 * @param {{redaccion_id?: string, modelo?: string, corrida?: string}} [datos]
 *   `redaccion_id` es el nombre de la redaccion en `redacciones/`; `modelo` es el vinculo
 *   que §3 exige guardar. **Nunca el prompt ni el texto.**
 * @returns {object} la entrada tras la transicion
 */
export function marcarRedactada(id, { redaccion_id = null, modelo = null, corrida = null } = {}) {
  return transicionar(id, { evento: 'redactada', redaccion_id, modelo, corrida });
}

/**
 * Trabajo con borrador que espera verificacion, mas lo que fallo verificando y aun
 * conserva reintentos.
 * @param {{limite?: number}} [opciones]
 * @returns {object[]}
 */
export function pendientesDeVerificacion({ limite = Infinity } = {}) {
  return seleccionar(
    (e) => e.estado === 'pendiente_verificacion'
      || (e.estado === 'fallida_reintentable' && e.etapa_fallida === 'verificar'),
    limite,
  );
}

/**
 * La pieza paso §5.4 y entro al corpus.
 * `pendiente_verificacion | fallida_reintentable -> terminada`.
 *
 * QUIEN LLAMA A ESTO SE COMPROMETE A QUE LA PIEZA ESTA EN EL CORPUS **PERSISTIDO**, no a
 * que haya pasado la verificacion. `terminada` es TERMINAL: una entrada que llega aqui no
 * vuelve a la cola de pendientes ni la mira la deduplicacion. Llamarla con la pieza solo
 * verificada —sin escribir— cierra para siempre trabajo que nadie guardo, y en silencio.
 * `ejecutar.mjs` lo resuelve releyendo el corpus del disco antes de llamar; una entrada sin
 * pieza guardada se queda donde estaba y la corrida siguiente la recupera.
 *
 * @param {string} id
 * @param {{pieza_id?: string, corrida?: string}} [datos]
 * @returns {object}
 */
export function marcarVerificada(id, { pieza_id = null, corrida = null } = {}) {
  return transicionar(id, { evento: 'verificada', pieza_id, corrida });
}

/**
 * Un humano autorizo la publicacion. `terminada -> autorizada`, la unica transicion que
 * acompaña a una escritura en `content/noticias/` (§8.2).
 *
 * **Sin el nombre del humano no se emite, y esa negativa es el mecanismo entero.** Un
 * `autorizado_por: "agente"` no existe: si el canal pudiera emitir este evento solo, esto
 * seria autopublicacion con otro nombre (§1, §8.2). Los otros cuatro campos —cuando, sobre
 * que version exacta, que pendientes se aceptan y si se aceptan limites— se exigen por la
 * misma razon: cuatro datos que faltan convierten el registro en una firma en blanco
 * (§8.8).
 *
 * No valida el contenido de los campos contra el borrador —eso lo hace `autorizar.mjs`
 * antes de escribir nada—; exige que esten, que es lo que la maquina de estados puede
 * sostener sola.
 *
 * @param {string} id  entrada de la bitacora, no el id de la pieza
 * @param {{pieza_id: string, autorizado_por: string, autorizado_en: string,
 *   version_borrador: string, pendientes_aceptados: string[], acepta_limites: boolean,
 *   corrida?: string}} registro
 * @returns {object} la entrada tras la transicion
 */
export function marcarAutorizada(id, registro = {}) {
  const faltantes = ['pieza_id', 'autorizado_por', 'autorizado_en', 'version_borrador']
    .filter((c) => typeof registro[c] !== 'string' || registro[c].trim() === '');
  if (!Array.isArray(registro.pendientes_aceptados)) faltantes.push('pendientes_aceptados');
  if (typeof registro.acepta_limites !== 'boolean') faltantes.push('acepta_limites');
  if (faltantes.length) {
    throw new Error(
      `marcarAutorizada: falta ${faltantes.join(', ')}. Un registro incompleto no es un `
      + 'registro: es una firma en blanco (docs/plataforma/02-editorial.md §8.8)',
    );
  }
  return transicionar(id, {
    evento: 'autorizada',
    pieza_id: registro.pieza_id,
    autorizado_por: registro.autorizado_por,
    autorizado_en: registro.autorizado_en,
    version_borrador: registro.version_borrador,
    pendientes_aceptados: registro.pendientes_aceptados,
    acepta_limites: registro.acepta_limites,
    corrida: registro.corrida ?? null,
  });
}

/**
 * Una etapa fallo. La entrada queda **reintentable**, no perdida: la proxima corrida la
 * vuelve a tomar. Al llegar a `MAX_INTENTOS` cae a `descartada`, y el log dice por que.
 *
 * Escribe ademas la fila en `fallos.jsonl` con la etapa correcta, la entrada afectada, el
 * codigo y la consecuencia.
 *
 * @param {string} id
 * @param {'detectar'|'redactar'|'verificar'} etapa  donde fallo, no donde se detecto
 * @param {{codigo?: string|number, mensaje: string, consecuencia?: string, contexto?: object}|string} error
 * @param {{corrida?: string}} [opciones]
 * @returns {object} la entrada tras la transicion; `estado` sera `fallida_reintentable`,
 *   o `descartada` si con este intento se agotaron los reintentos
 */
export function marcarFallida(id, etapa, error, { corrida = null } = {}) {
  if (!ETAPAS.includes(etapa)) throw new Error(`marcarFallida: etapa desconocida ${etapa}`);
  const objeto = typeof error === 'object' && error !== null ? error : null;
  const mensaje = objeto ? objeto.mensaje : error;
  if (!mensaje) throw new Error('marcarFallida: el error necesita `mensaje`');

  const previa = estadoDe(id);
  if (!previa) throw new Error(`marcarFallida: no existe la entrada ${id}`);
  const intentosTras = previa.intentos + 1;
  const agotado = intentosTras >= MAX_INTENTOS;

  registrarFallo({
    etapa,
    entrada_id: id,
    codigo: objeto?.codigo ?? 'FALLO',
    mensaje,
    consecuencia: objeto?.consecuencia ?? (agotado
      ? `intento ${intentosTras}/${MAX_INTENTOS}: se agotan los reintentos y la entrada queda descartada`
      : `intento ${intentosTras}/${MAX_INTENTOS}: la entrada queda pendiente y la proxima corrida la reintenta`),
    contexto: objeto?.contexto ?? null,
    corrida,
  });

  return transicionar(id, { evento: 'fallo', etapa, mensaje, corrida });
}

/**
 * Cierre negativo explicito: duplicada, vetada por terminos, o fuera de alcance.
 * @param {string} id
 * @param {string} motivo  queda en el log; sin motivo no se descarta nada
 * @param {{corrida?: string}} [opciones]
 * @returns {object}
 */
export function marcarDescartada(id, motivo, { corrida = null } = {}) {
  if (!motivo) throw new Error('marcarDescartada: se exige un motivo');
  return transicionar(id, { evento: 'descartada', motivo, corrida });
}

/**
 * Unica salida de `descartada`. Explicita a proposito: reabrir algo que se cerro es una
 * decision, no un efecto secundario de volver a leer un feed.
 * @param {string} id
 * @param {{motivo?: string, corrida?: string}} [opciones]
 * @returns {object}
 */
export function reabrir(id, { motivo = 'reapertura manual', corrida = null } = {}) {
  return transicionar(id, { evento: 'reabierta', motivo, corrida });
}

/** @returns {object|null} la entrada, o null si el hecho no esta en el log */
export function estadoDe(id) {
  return plegar().entradas.get(id) ?? null;
}

/** @returns {object|null} la entrada cuyo hecho vive en esa URL canonica */
export function porUrlCanonica(url) {
  const { entradas, porUrl } = plegar();
  const id = porUrl.get(url);
  return id ? entradas.get(id) : null;
}

/**
 * La entrada cuya pieza tiene ese id. Es la puerta que `autorizar.mjs` necesita: el
 * comando recibe el id de la PIEZA —el kebab-case de §3— y la bitacora indexa por el id
 * del HECHO, que es otra cosa.
 *
 * Mira `pieza_id` y tambien `redaccion_id`, y no es laxitud: `pieza_id` solo se escribe al
 * verificar, asi que buscando solo por el una entrada a medio camino seria invisible y
 * `autorizar` diria «no existe» donde la verdad es «todavia no esta verificada». Decir el
 * estado real es justo lo que §8.4 paso 1 exige del mensaje.
 *
 * @param {string} id  id de la pieza (kebab-case de §3)
 * @returns {object|null}
 */
export function porIdDePieza(id) {
  const entradas = [...plegar().entradas.values()];
  return entradas.find((e) => e.pieza_id === id)
    ?? entradas.find((e) => e.redaccion_id === id)
    ?? null;
}

/** @returns {object|null} la entrada con esa huella (titulo + dominio del medio) */
export function porHuellaDeEntrada(huella) {
  const { entradas, porHuella } = plegar();
  const id = porHuella.get(huella);
  return id ? entradas.get(id) : null;
}

/** @returns {Record<string, number>} cuantas entradas hay en cada estado */
export function instantanea() {
  const conteo = Object.fromEntries(ESTADOS.map((e) => [e, 0]));
  for (const e of plegar().entradas.values()) conteo[e.estado] += 1;
  return conteo;
}

/** @returns {object[]} todas las entradas del log, en orden de deteccion */
export function todas() {
  return [...plegar().entradas.values()];
}

/**
 * Cierra como `terminada` toda entrada cuya huella ya tiene pieza en el corpus. Sirve para
 * dos cosas: absorber el `vistos.jsonl` del canal anterior sin reprocesar lo ya publicado,
 * y sostener la propiedad 4 aunque alguien borre la bitacora y el corpus sobreviva.
 *
 * @param {object[]} piezas  corpus actual (`piezas.json`)
 * @param {{corrida?: string}} [opciones]
 * @returns {string[]} ids conciliados
 */
export function conciliarConCorpus(piezas, { corrida = null } = {}) {
  const { entradas, porHuella } = plegar();
  const cerrados = [];
  for (const p of piezas ?? []) {
    if (!p?.huella) continue;
    const id = porHuella.get(p.huella);
    if (!id) continue;
    const e = entradas.get(id);
    // `autorizada` es terminal y esta AGUAS ABAJO de `terminada`: conciliar una ya
    // autorizada intentaria `autorizada --redactada--> (nada)` y lanzaria.
    if (!e || ['terminada', 'autorizada', 'descartada'].includes(e.estado)) continue;
    // Se llega a `terminada` por el camino legal de la tabla, no saltandoselo.
    if (e.estado === 'detectada') emitir({ id, evento: 'expediente_listo', corrida });
    if (e.estado !== 'pendiente_verificacion') {
      emitir({
        id,
        evento: 'redactada',
        redaccion_id: p.id,
        modelo: p.procedencia?.redactado?.modelo ?? null,
        corrida,
      });
    }
    emitir({ id, evento: 'verificada', pieza_id: p.id, corrida });
    cerrados.push(id);
  }
  return cerrados;
}

// --- Interno -------------------------------------------------------------------------

function transicionar(id, evento) {
  const previa = estadoDe(id);
  if (!previa) {
    throw new Error(`no existe la entrada ${id}: solo \`registrarDeteccion()\` crea entradas`);
  }
  const fila = { ts: ahoraIso(), id, ...evento };
  // Se valida ANTES de escribir: el log no guarda transiciones ilegales.
  const sig = aplicar(previa, fila);
  anexar(rutaBitacora(), fila);
  return sig;
}

function seleccionar(predicado, limite) {
  const salida = [];
  for (const e of plegar().entradas.values()) {
    if (!predicado(e)) continue;
    salida.push(e);
    if (salida.length >= limite) break;
  }
  return salida;
}
