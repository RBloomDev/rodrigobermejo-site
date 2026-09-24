#!/usr/bin/env node
/**
 * `autorizar` — la tercera etapa del canal, y la UNICA que escribe en el arbol publico.
 *
 * Autoridad: `docs/plataforma/02-editorial.md` §8.1, §8.2, §8.4 y §8.8. Si este archivo y
 * esa spec dicen cosas distintas, este archivo esta mal (`CLAUDE.md`).
 *
 * ============================ QUE HACE, Y QUE NO HACE ============================
 *
 * Registra una decision humana que ya se tomo. **No la toma, no la infiere y no la puede
 * fabricar**: el nombre de quien autoriza, la fecha, la version exacta del borrador y los
 * pendientes aceptados entran por un archivo de registro que aporta el humano. Sin esos
 * cuatro datos no hay registro; hay una firma en blanco (§8.8).
 *
 * No redacta, no reverifica, no corrige y no consulta la red. No lee ni escribe
 * `public/proof/**`: el editorial ENLAZA a evidencia y jamas se deriva de ella ni la
 * alimenta (`docs/03-privacy-and-publication-policy.md` §4, tabla «Fronteras que nunca se
 * cruzan»; §8.7). No mergea, no empuja y no despliega: el archivo queda en el arbol de
 * trabajo y el commit lo decide un humano (§8.4 paso 6).
 *
 * **No existe modo automatico ni bandera de aceptacion implicita.** Un `--si` que rellenara
 * el registro por su cuenta volveria a juntar lo que §8.1 separa, y seria autopublicacion
 * con otro nombre.
 *
 * ================================= COMO SE INVOCA =================================
 *
 *   node scripts/editorial/autorizar.mjs <id> --registro <archivo.json>
 *   node scripts/editorial/autorizar.mjs <id> --version   # imprime el sha256 canonico
 *
 * `--version` no escribe nada: existe para que quien va a firmar pueda poner en el registro
 * la version EXACTA que leyo, en vez de copiar un hash de otro sitio.
 *
 * Variables de entorno, las dos obligatorias y sin valor por defecto (§8.3):
 *   EDITORIAL_ESTADO_DIR       bitacora; tambien es donde vive el archivo de registro
 *   EDITORIAL_REDACCIONES_DIR  borradores: se lee `<id>.json`
 *
 * Salida: 0 si autorizo (o si ya estaba autorizada: §8.2 exige idempotencia), 1 si se
 * nego. **Toda negativa es sin escribir corpus y sin emitir evento**, y lo dice.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

import {
  ConfiguracionAusente,
  DIR_EDITORIAL,
  DirectorioVersionado,
  dirEstado,
  dirRedacciones,
  esCli,
  exigirDirectoriosPrivados,
} from './comun.mjs';
import { CATALOGO } from './fuentes.mjs';
import { marcarAutorizada, porIdDePieza } from './estado.mjs';

/**
 * Una negativa del comando. **Siempre significa lo mismo: no se escribio corpus y no se
 * emitio evento.** Lleva codigo para que la prueba pueda exigir el motivo concreto en vez
 * de conformarse con «fallo».
 */
export class Negativa extends Error {
  constructor(codigo, mensaje, detalles = []) {
    super(detalles.length ? `${mensaje}\n  - ${detalles.join('\n  - ')}` : mensaje);
    this.name = 'Negativa';
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

/**
 * El corpus publicado. Se deriva de la ubicacion de este modulo, no de una variable de
 * entorno, y es a proposito: §8.3 dice «Son dos, y solo dos». Una tercera variable de
 * corpus seria la puerta por la que alguien apunta la publicacion a otro sitio.
 */
export function dirCorpusPublico() {
  return join(DIR_EDITORIAL, '..', '..', 'content', 'noticias');
}

// =====================================================================================
//  LECTURA ESTRICTA Y VERSION CANONICA (§8.8)
// =====================================================================================

/**
 * JSON sin claves duplicadas. `JSON.parse` acepta `{"a":1,"a":2}` y se queda con la
 * ultima: dos documentos que un humano lee distinto y la maquina hashea igual. Una firma
 * sobre una version ambigua no identifica nada, asi que aqui se rechaza.
 */
export function parsearJsonEstricto(texto, origen = 'json') {
  let i = 0;
  const err = (m) => { throw new Negativa('JSON_INVALIDO', `${origen}: ${m} (posicion ${i})`); };
  const blancos = () => { while (i < texto.length && ' \t\n\r'.includes(texto[i])) i += 1; };

  const cadena = () => {
    const inicio = i;
    i += 1;
    while (i < texto.length) {
      if (texto[i] === '\\') { i += 2; continue; }
      if (texto[i] === '"') { i += 1; return JSON.parse(texto.slice(inicio, i)); }
      i += 1;
    }
    return err('cadena sin cerrar');
  };

  const literal = () => {
    const m = /^(true|false|null|-?\d+(\.\d+)?([eE][+-]?\d+)?)/.exec(texto.slice(i));
    if (!m) return err('valor no reconocido');
    i += m[0].length;
    return JSON.parse(m[0]);
  };

  const arreglo = () => {
    i += 1;
    const salida = [];
    blancos();
    if (texto[i] === ']') { i += 1; return salida; }
    for (;;) {
      salida.push(valor());
      blancos();
      if (texto[i] === ',') { i += 1; continue; }
      if (texto[i] === ']') { i += 1; return salida; }
      return err('se esperaba "," o "]"');
    }
  };

  const objeto = () => {
    i += 1;
    const salida = {};
    const vistas = new Set();
    blancos();
    if (texto[i] === '}') { i += 1; return salida; }
    for (;;) {
      blancos();
      if (texto[i] !== '"') return err('se esperaba una clave entre comillas');
      const clave = cadena();
      if (vistas.has(clave)) {
        throw new Negativa(
          'CLAVE_DUPLICADA',
          `${origen}: la clave ${JSON.stringify(clave)} aparece dos veces en el mismo objeto. `
          + 'Un documento con claves duplicadas se lee de dos formas y se hashea de una: la '
          + 'version que se firma dejaria de estar definida (§8.8).',
        );
      }
      vistas.add(clave);
      blancos();
      if (texto[i] !== ':') return err('se esperaba ":"');
      i += 1;
      salida[clave] = valor();
      blancos();
      if (texto[i] === ',') { i += 1; continue; }
      if (texto[i] === '}') { i += 1; return salida; }
      return err('se esperaba "," o "}"');
    }
  };

  const valor = () => {
    blancos();
    if (i >= texto.length) return err('documento vacio');
    if (texto[i] === '{') return objeto();
    if (texto[i] === '[') return arreglo();
    if (texto[i] === '"') return cadena();
    return literal();
  };

  const raiz = valor();
  blancos();
  if (i < texto.length) err('sobra texto despues del valor');
  return raiz;
}

/**
 * Forma canonica: claves ordenadas por unidades UTF-16, orden de arreglos conservado,
 * primitivas con las reglas de `JSON.stringify`, sin espacios. Cambiar indentacion u orden
 * de claves NO cambia el contenido canonico; cambiar una coma dentro de un texto SI.
 */
export function canonico(valor) {
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(',')}]`;
  if (valor !== null && typeof valor === 'object') {
    const claves = Object.keys(valor).sort();
    return `{${claves.map((k) => `${JSON.stringify(k)}:${canonico(valor[k])}`).join(',')}}`;
  }
  return JSON.stringify(valor);
}

/**
 * La identidad de una version del borrador. **No es `huella`** —esa identifica el HECHO
 * (§5.2) y no cambia al editar el texto—, no es el nombre del archivo y no es la fecha: un
 * nombre se reusa y una fecha no distingue dos ediciones del mismo dia.
 */
export function versionDe(objeto) {
  return `sha256:${createHash('sha256').update(canonico(objeto), 'utf8').digest('hex')}`;
}

// =====================================================================================
//  DETECTOR DE CONTENIDO PROHIBIDO (§3, AC-AUT-03)
// =====================================================================================

/**
 * Marcadores que delatan un prompt, una transcripcion o una respuesta cruda **por su
 * contenido**, no por el nombre del campo que los lleva ni por la confianza en el origen.
 */
const MARCADORES = [
  '[inst]', '<<sys>>', '<|im_start|>', '<|start_header_id|>', '<|eot_id|>',
  'system prompt:', 'prompt del sistema:', 'instrucciones del sistema:',
  'transcripcion:', 'transcripción:', 'raw response:', 'respuesta cruda:',
];

const TURNO = /^\s*(system|user|assistant|usuario|asistente)\s*:/;

/**
 * Recorre TODAS las cadenas del objeto —incluidas las anidadas dentro de campos
 * permitidos— y devuelve lo que encuentre. Normaliza con NFKC y compara sin distinguir
 * mayusculas **solo para detectar**: el contenido no se modifica.
 *
 * LIMITE, dicho aqui para que su verde no se lea como una garantia semantica: ningun
 * detector de patrones demuestra que prosa arbitraria no provenga de una respuesta cruda
 * sin marcadores. La prohibicion de §3 es total; esto es una mitigacion acotada, y la
 * marca humana de §8.8 no la exceptua.
 *
 * @returns {string[]} hallazgos con su ruta dentro del objeto; vacio si no hay ninguno
 */
export function buscarContenidoProhibido(objeto) {
  const hallazgos = [];

  const revisar = (texto, ruta) => {
    const n = texto.normalize('NFKC').toLowerCase();
    for (const marcador of MARCADORES) {
      if (n.includes(marcador)) {
        hallazgos.push(`${ruta}: contiene el marcador ${JSON.stringify(marcador)}`);
      }
    }
    const turnos = n.split('\n').filter((l) => TURNO.test(l));
    if (turnos.length >= 2) {
      hallazgos.push(`${ruta}: ${turnos.length} lineas con encabezado de turno (system:, user:, assistant:…)`);
    }
    const tiene = (s) => n.includes(s);
    if ((tiene('"messages"') && tiene('"role"') && tiene('"content"'))
      || (tiene('"choices"') && tiene('"message"') && tiene('"content"'))) {
      hallazgos.push(`${ruta}: envoltorio de respuesta de modelo serializado dentro de una cadena`);
    }
  };

  const caminar = (valor, ruta) => {
    if (typeof valor === 'string') return revisar(valor, ruta);
    if (Array.isArray(valor)) return valor.forEach((v, k) => caminar(v, `${ruta}[${k}]`));
    if (valor !== null && typeof valor === 'object') {
      for (const [k, v] of Object.entries(valor)) caminar(v, ruta ? `${ruta}.${k}` : k);
    }
    return undefined;
  };

  caminar(objeto, '');
  return hallazgos;
}

// =====================================================================================
//  ESQUEMA DE §3 Y TERMINOS DE §6
// =====================================================================================

const CLAVES_PIEZA = [
  'id', 'tipo', 'titulo', 'entradilla', 'estado', 'ocurrido_en', 'redactado_en', 'hecho',
  'que_cambia', 'mexico', 'no_establece', 'fuente_primaria', 'fuentes',
  'relacion_declarada', 'procedencia', 'huella', 'correcciones',
];
const OBLIGATORIAS = CLAVES_PIEZA.filter((c) => !['relacion_declarada', 'correcciones'].includes(c));
const TIPOS = ['noticia', 'analisis', 'opinion'];
const ESTADOS_MEXICO = [
  'aplica_con_datos_locales', 'aplica_sin_datos_locales', 'no_aplica', 'no_verificado',
];
const CLAVES_FUENTE = ['titulo', 'medio', 'url', 'fecha', 'tipo'];
const ETAPAS_PROCEDENCIA = ['detectado', 'redactado', 'verificado', 'publicado'];
const CLAVES_ETAPA = ['por', 'detalle', 'modelo', 'veredicto', 'pendientes'];

/**
 * Los tres veredictos de §5.4, y el unico insumo del comando que decide si la marca humana
 * es obligatoria. **Enumerado aqui igual que todo lo demas**: en un comando cuya tesis es
 * «lo que no esta enumerado se rechaza, no se ignora», dejar pasar cualquier cadena no
 * vacia era aceptar por confianza justo el campo que no se puede aceptar por confianza. Un
 * `"Parcial"` con mayuscula o un `"parcial "` con espacio caia en la rama «sin limites» y
 * publicaba una pieza con limites sin que nadie los aceptara.
 *
 * **Copia deliberada de `verificar.mjs:104` (`VEREDICTOS_PIEZA`), no un import.** Importar
 * ese modulo aqui arrastraria el motor de verificacion entero —mil lineas y un modulo con
 * rama de CLI en el cuerpo— a la unica puerta del arbol publico, solo para leer un arreglo
 * de tres cadenas. Lo que hay que impedir no es la copia sino la divergencia, y eso lo
 * comprueba una prueba que importa las dos listas y exige que sean la misma.
 */
export const VEREDICTOS = ['verificada', 'parcial', 'no_verificada'];

const ID_VALIDO = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const cadenaLlena = (v) => typeof v === 'string' && v.trim() !== '';

/**
 * Esquema CERRADO de §3: lo que no esta enumerado se rechaza, no se ignora. Es la mitad
 * estructural de la prohibicion de §3 —un campo `prompt` no llega a existir— y la unica
 * forma de que «sin envoltorio y sin campos añadidos» (§8.4 paso 4) sea comprobable.
 *
 * @returns {string[]} fallos; vacio si la pieza compone
 */
export function validarEsquema(pieza) {
  const fallos = [];
  if (pieza === null || typeof pieza !== 'object' || Array.isArray(pieza)) {
    return ['el borrador no es un objeto JSON'];
  }

  for (const clave of Object.keys(pieza)) {
    if (!CLAVES_PIEZA.includes(clave)) fallos.push(`campo no permitido por §3: \`${clave}\``);
  }
  for (const clave of OBLIGATORIAS) {
    if (pieza[clave] === undefined) fallos.push(`falta el campo obligatorio \`${clave}\``);
  }

  if (!ID_VALIDO.test(String(pieza.id ?? ''))) {
    fallos.push('`id` no es kebab-case estable (§3); tambien es el nombre del archivo publicado');
  }
  if (!TIPOS.includes(pieza.tipo)) fallos.push(`\`tipo\` invalido: ${JSON.stringify(pieza.tipo)} (§1: se renderiza siempre)`);
  for (const c of ['titulo', 'entradilla', 'hecho', 'que_cambia']) {
    if (!cadenaLlena(pieza[c])) fallos.push(`\`${c}\` vacio (§2: las cinco preguntas son campos)`);
  }
  if (pieza.estado !== 'borrador') {
    fallos.push(`\`estado\` tiene que ser "borrador" al autorizar, y es ${JSON.stringify(pieza.estado)}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(pieza.ocurrido_en ?? ''))) fallos.push('`ocurrido_en` no es YYYY-MM-DD');
  if (!cadenaLlena(pieza.redactado_en)) fallos.push('`redactado_en` vacio');
  if (!/^sha256:[0-9a-f]{64}$/.test(String(pieza.huella ?? ''))) fallos.push('`huella` no es `sha256:<64 hex>` (§5.2)');

  const mx = pieza.mexico;
  if (mx === null || typeof mx !== 'object' || Array.isArray(mx)) fallos.push('`mexico` ausente o no es objeto');
  else {
    for (const k of Object.keys(mx)) if (!['estado', 'texto'].includes(k)) fallos.push(`\`mexico.${k}\` no permitido`);
    if (!ESTADOS_MEXICO.includes(mx.estado)) fallos.push(`\`mexico.estado\` invalido: ${JSON.stringify(mx.estado)}`);
    if (!cadenaLlena(mx.texto)) fallos.push('`mexico.texto` vacio: «no se sabe» tambien se escribe (§2)');
  }

  if (!Array.isArray(pieza.no_establece) || pieza.no_establece.length < 1
    || !pieza.no_establece.every(cadenaLlena)) {
    fallos.push('`no_establece` necesita al menos una entrada no vacia (§3: si no se sabe que no prueba, la pieza no esta lista)');
  }

  const validarFuente = (f, ruta, exigirTipo) => {
    if (f === null || typeof f !== 'object' || Array.isArray(f)) { fallos.push(`${ruta} no es objeto`); return; }
    for (const k of Object.keys(f)) if (!CLAVES_FUENTE.includes(k)) fallos.push(`${ruta}.${k} no permitido por §3`);
    for (const k of ['titulo', 'medio', 'url', 'fecha']) if (!cadenaLlena(f[k])) fallos.push(`${ruta}.${k} vacio`);
    if (exigirTipo && !['primaria', 'secundaria'].includes(f.tipo)) fallos.push(`${ruta}.tipo invalido`);
  };
  validarFuente(pieza.fuente_primaria, '`fuente_primaria`', false);
  if (!Array.isArray(pieza.fuentes) || pieza.fuentes.length < 2) {
    fallos.push('`fuentes` necesita minimo 2 (§2: con una sola, la pieza no se redacta)');
  } else pieza.fuentes.forEach((f, n) => validarFuente(f, `\`fuentes[${n}]\``, true));

  const pr = pieza.procedencia;
  if (pr === null || typeof pr !== 'object' || Array.isArray(pr)) fallos.push('`procedencia` ausente o no es objeto');
  else {
    for (const k of Object.keys(pr)) {
      if (!ETAPAS_PROCEDENCIA.includes(k)) fallos.push(`\`procedencia.${k}\` no es una de las cuatro etapas`);
    }
    for (const etapa of ETAPAS_PROCEDENCIA) {
      const e = pr[etapa];
      if (e === null || typeof e !== 'object' || Array.isArray(e)) {
        fallos.push(`\`procedencia.${etapa}\` ausente: las cuatro etapas son obligatorias (§1, §3)`);
        continue;
      }
      for (const k of Object.keys(e)) {
        if (!CLAVES_ETAPA.includes(k)) fallos.push(`\`procedencia.${etapa}.${k}\` no permitido`);
      }
      if (!cadenaLlena(e.por)) fallos.push(`\`procedencia.${etapa}.por\` vacio`);
      // `veredicto` es enumerado donde aparezca, no solo en `verificado`: un veredicto
      // colgado de otra etapa tampoco es un valor libre (§5.4).
      if (e.veredicto !== undefined && !VEREDICTOS.includes(e.veredicto)) {
        fallos.push(`\`procedencia.${etapa}.veredicto\` invalido: ${JSON.stringify(e.veredicto)} (§5.4: ${VEREDICTOS.join(', ')})`);
      }
    }
  }

  if (pieza.correcciones !== undefined && !Array.isArray(pieza.correcciones)) {
    fallos.push('`correcciones` tiene que ser un arreglo');
  }
  if (pieza.relacion_declarada !== undefined && pieza.relacion_declarada !== null
    && !cadenaLlena(pieza.relacion_declarada)) {
    fallos.push('`relacion_declarada` es una cadena o `null` (§4)');
  }
  return fallos;
}

/**
 * §6, comprobado otra vez aqui aunque ya se comprobara al redactar (§8.4 paso 3): una
 * fuente de solo-detectar **no se reproduce**.
 *
 * QUE COMPRUEBA, con precision: que la cita de una fuente `solo_detectar` del catalogo no
 * lleva mas que lo que §5.1 autoriza —titulo, URL, medio, fecha, tipo—. Ni un campo de
 * cuerpo, extracto o texto, se llame como se llame.
 *
 * QUE NO COMPRUEBA, y conviene decirlo en vez de que su verde se lea de mas: que la prosa
 * de la pieza no sea una parafrasis pegada del articulo. Eso no se decide leyendo el
 * registro, y el registro es lo unico que este comando tiene delante.
 */
export function comprobarTerminosDeFuentes(pieza) {
  const soloDetectar = new Set(
    CATALOGO.filter((f) => f.uso === 'solo_detectar').map((f) => dominioDeUrl(f.url)).filter(Boolean),
  );
  const fallos = [];
  const citas = [
    ['`fuente_primaria`', pieza?.fuente_primaria],
    ...(Array.isArray(pieza?.fuentes) ? pieza.fuentes.map((f, n) => [`\`fuentes[${n}]\``, f]) : []),
  ];
  for (const [ruta, cita] of citas) {
    if (cita === null || typeof cita !== 'object') continue;
    const dominio = dominioDeUrl(cita.url);
    if (!dominio || !soloDetectar.has(dominio)) continue;
    const sobrantes = Object.keys(cita).filter((k) => !CLAVES_FUENTE.includes(k));
    if (sobrantes.length) {
      fallos.push(
        `${ruta} (${dominio}) es una fuente de SOLO DETECTAR de §6 y lleva ${sobrantes.join(', ')}: `
        + 'de esas fuentes se guardan titulo, URL, medio y fecha, nunca el cuerpo (§5.1, §6)',
      );
    }
  }
  return fallos;
}

function dominioDeUrl(url) {
  try {
    return new URL(String(url)).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

// =====================================================================================
//  EL REGISTRO DE LA DECISION HUMANA (§8.8)
// =====================================================================================

const CLAVES_REGISTRO = [
  'autorizado_por', 'autorizado_en', 'version_borrador', 'pendientes_aceptados', 'acepta_limites',
];
const ISO_CON_ZONA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const IDENTIDAD_DE_AGENTE = /^(agente|agent|ia|ai|bot|sistema|system|claude|codex|gpt)\b/i;

/** @returns {string[]} fallos del registro; vacio si esta completo y bien formado */
export function validarRegistro(registro) {
  const fallos = [];
  if (registro === null || typeof registro !== 'object' || Array.isArray(registro)) {
    return ['el registro no es un objeto JSON'];
  }
  for (const k of Object.keys(registro)) {
    if (!CLAVES_REGISTRO.includes(k)) fallos.push(`campo no permitido en el registro: \`${k}\``);
  }
  if (!cadenaLlena(registro.autorizado_por)) {
    fallos.push('`autorizado_por` vacio: sin el nombre del humano no hay decision que registrar (§8.2)');
  } else if (IDENTIDAD_DE_AGENTE.test(registro.autorizado_por.trim())) {
    fallos.push(
      `\`autorizado_por\` parece una identidad de agente (${JSON.stringify(registro.autorizado_por)}): `
      + 'un `autorizado_por: "agente"` no existe, seria autopublicacion con otro nombre (§8.2)',
    );
  }
  if (!ISO_CON_ZONA.test(String(registro.autorizado_en ?? ''))) {
    fallos.push('`autorizado_en` tiene que ser ISO 8601 con zona horaria explicita');
  }
  if (!/^sha256:[0-9a-f]{64}$/.test(String(registro.version_borrador ?? ''))) {
    fallos.push('`version_borrador` tiene que ser `sha256:<64 hex>` del JSON canonico del borrador');
  }
  if (!Array.isArray(registro.pendientes_aceptados)) {
    fallos.push('`pendientes_aceptados` es obligatorio, incluso vacio: su ausencia no es «ninguno», es «no se dijo»');
  } else {
    if (!registro.pendientes_aceptados.every(cadenaLlena)) {
      fallos.push('`pendientes_aceptados` solo admite cadenas no vacias');
    }
    if (new Set(registro.pendientes_aceptados).size !== registro.pendientes_aceptados.length) {
      fallos.push('`pendientes_aceptados` tiene duplicados: un conjunto con repeticiones no compara');
    }
  }
  if (typeof registro.acepta_limites !== 'boolean') fallos.push('`acepta_limites` tiene que ser booleano');
  return fallos;
}

/**
 * Los pendientes del sello y los aceptados tienen que ser **el mismo conjunto**. Las dos
 * direcciones fallan, y la segunda es la que se olvida: si desaparecio un pendiente, el
 * humano acepto un estado concreto y no uno mejor, asi que su aceptacion tampoco cubre
 * esta version (§8.8).
 */
export function compararPendientes(delSello, aceptados) {
  const a = new Set(delSello);
  const b = new Set(aceptados);
  return {
    nuevos: [...a].filter((p) => !b.has(p)),
    desaparecidos: [...b].filter((p) => !a.has(p)),
  };
}

// =====================================================================================
//  EL COMANDO
// =====================================================================================

/**
 * @param {{id: string, registro: string, corrida?: string}} opciones
 *   `registro` es la ruta del archivo de registro, que vive bajo `$EDITORIAL_ESTADO_DIR`.
 * @returns {{id: string, archivo: string, idempotente: boolean, evento: object|null}}
 * @throws {Negativa} sin escribir corpus y sin emitir evento
 */
export function autorizar({ id, registro: rutaRegistro, corrida = null }) {
  // PRIMERA LINEA, antes de abrir ningun archivo (§8.3).
  exigirDirectoriosPrivados();

  if (!ID_VALIDO.test(String(id ?? ''))) {
    throw new Negativa('ID_INVALIDO',
      `el id ${JSON.stringify(id)} no es kebab-case estable; tambien es el nombre del archivo publicado`);
  }

  // 1. §8.4 paso 1 — exige un borrador en `terminada`. Se mira la bitacora ANTES de abrir
  //    el borrador: una pieza ya autorizada es idempotente aunque su borrador privado ya
  //    no este en disco, que es el caso normal meses despues de publicarla.
  const entrada = porIdDePieza(id);
  if (!entrada) {
    throw new Negativa('SIN_ENTRADA',
      `no hay entrada en la bitacora con pieza_id "${id}". Autorizar no crea estado: la pieza `
      + 'tiene que haberse generado y verificado antes (§8.1).');
  }
  if (entrada.estado === 'autorizada') {
    // §8.2: idempotente. Ni evento ni reescritura del archivo.
    return { id, archivo: join(dirCorpusPublico(), `${id}.json`), idempotente: true, evento: null };
  }
  if (entrada.estado !== 'terminada') {
    throw new Negativa('ESTADO_INCORRECTO',
      `la entrada ${entrada.id} esta en "${entrada.estado}" y autorizar exige "terminada". `
      + 'Autorizar NO redacta ni reverifica: lo que hay que hacer tiene su propio comando (§8.1).');
  }

  const borrador = leerBorrador(id);

  // 2. §8.4 paso 2 — exige el humano que autoriza, con los cuatro datos de §8.8.
  const registro = leerRegistro(rutaRegistro);
  const fallosRegistro = validarRegistro(registro);
  if (fallosRegistro.length) {
    throw new Negativa('REGISTRO_INCOMPLETO',
      'el registro de la decision humana no esta completo, y un registro incompleto es una firma en blanco (§8.8):',
      fallosRegistro);
  }

  // 3. La version exacta. Si el borrador cambio una coma, la aceptacion es de otra version.
  const version = versionDe(borrador);
  if (version !== registro.version_borrador) {
    throw new Negativa('VERSION_DISTINTA',
      'la aceptacion corresponde a otra version del borrador y NO se reutiliza (§8.8):', [
        `registro:  ${registro.version_borrador}`,
        `borrador:  ${version}`,
        'vuelve a revisar el borrador de hoy y firma su version, o recupera la que se acepto.',
      ]);
  }

  // 4. El sello de verificacion, y los pendientes como conjunto exacto.
  const sello = borrador?.procedencia?.verificado;
  if (sello === null || typeof sello !== 'object' || Array.isArray(sello)) {
    throw new Negativa('SIN_SELLO', 'el borrador no lleva `procedencia.verificado`: no esta verificado (§5.4)');
  }
  // El veredicto se enumera ANTES de decidir nada con el. Es el insumo del paso 5, y un
  // valor fuera de la enumeracion caeria en la rama «sin limites» por omision.
  if (!VEREDICTOS.includes(sello.veredicto)) {
    throw new Negativa('VEREDICTO_DESCONOCIDO',
      `\`procedencia.verificado.veredicto\` es ${JSON.stringify(sello.veredicto ?? null)}, que no es `
      + `uno de los tres de §5.4 (${VEREDICTOS.join(', ')}). No se interpreta ni se normaliza: `
      + 'este es el campo que decide si la marca humana es obligatoria, y aceptarlo por '
      + 'parecido publicaria una pieza con limites sin que nadie los aceptara (§8.8).');
  }
  if (sello.veredicto === 'no_verificada') {
    throw new Negativa('SIN_VERIFICAR',
      `veredicto ${JSON.stringify(sello.veredicto ?? null)}: una pieza sin verificacion utilizable no es autorizable. `
      + 'La ausencia de verificacion no es una verificacion parcial aceptable (§8.8).');
  }
  const pendientes = sello.pendientes ?? [];
  if (!Array.isArray(pendientes) || !pendientes.every(cadenaLlena)
    || new Set(pendientes).size !== pendientes.length) {
    throw new Negativa('PENDIENTES_MALFORMADOS',
      '`procedencia.verificado.pendientes` tiene que ser un arreglo de cadenas no vacias y sin duplicados');
  }

  const { nuevos, desaparecidos } = compararPendientes(pendientes, registro.pendientes_aceptados);
  if (nuevos.length || desaparecidos.length) {
    throw new Negativa('PENDIENTES_DISTINTOS',
      'los pendientes del borrador no son los que se aceptaron, asi que la autorizacion no cubre esta version (§8.8):',
      [
        ...nuevos.map((p) => `apareció y nadie lo acepto: ${p}`),
        ...desaparecidos.map((p) => `se acepto y ya no esta: ${p}`),
      ]);
  }

  // 5. La equivalencia EXACTA de `acepta_limites`. Las dos direcciones.
  //
  // «Debe ser true si hay limites» dejaria legal un `true` sobre una pieza sin limites, y
  // un campo que siempre se puede poner en true se acaba poniendo en true siempre:
  // entonces ya no distingue nada. Por eso es SI Y SOLO SI.
  const hayLimites = sello.veredicto === 'parcial' || pendientes.length > 0;
  if (registro.acepta_limites !== hayLimites) {
    throw new Negativa('ACEPTA_LIMITES_INCOHERENTE', hayLimites
      ? 'la pieza tiene limites —veredicto `parcial` o pendientes enumerados— y el registro no los acepta: '
        + '`acepta_limites` tiene que ser true, con los pendientes enumerados (§8.8).'
      : 'la pieza NO tiene limites —veredicto sin pendientes— y el registro declara `acepta_limites: true`. '
        + 'Un true sobre una pieza sin limites se rechaza igual que un false sobre una que si los tiene: '
        + 'un campo que siempre se puede poner en true deja de distinguir nada (§8.8).');
  }

  // 6. §8.4 paso 3 — el esquema cerrado de §3, las cinco preguntas de §2 y los terminos de §6.
  const fallosEsquema = [...validarEsquema(borrador), ...comprobarTerminosDeFuentes(borrador)];
  if (fallosEsquema.length) {
    throw new Negativa('ESQUEMA', 'el borrador no compone contra §2, §3 y §6:', fallosEsquema);
  }

  // 7. La pieza publicada, construida campo a campo sobre el borrador ya validado.
  const publicada = {
    ...borrador,
    estado: 'autorizada',
    procedencia: {
      ...borrador.procedencia,
      // La atribucion real se conserva: aceptar pendientes no convierte una comprobacion
      // automatica en una verificacion humana, asi que `verificado` NO se toca.
      publicado: {
        por: 'humano',
        detalle: `Autorizada por ${registro.autorizado_por.trim()} el ${registro.autorizado_en}.`,
      },
    },
  };

  // 8. Contenido prohibido, sobre el objeto FINAL y justo antes de escribir. Se prohibe
  //    por contenido, no por confianza en el origen (§3, AC-AUT-03).
  const prohibido = buscarContenidoProhibido(publicada);
  if (prohibido.length) {
    throw new Negativa('CONTENIDO_PROHIBIDO',
      'la pieza contiene prompt, transcripcion o respuesta cruda de un modelo, y eso no se publica nunca (§3):',
      prohibido);
  }

  // 9. §8.4 paso 4 — UN archivo en `content/noticias/`, con el esquema de §3 y nada mas.
  const archivo = join(dirCorpusPublico(), `${id}.json`);
  mkdirSync(dirCorpusPublico(), { recursive: true });
  writeFileSync(archivo, `${JSON.stringify(publicada, null, 2)}\n`, 'utf8');

  // 10. §8.4 paso 5 — el evento, en la bitacora que vive fuera del repositorio.
  const evento = marcarAutorizada(entrada.id, {
    pieza_id: id,
    autorizado_por: registro.autorizado_por.trim(),
    autorizado_en: registro.autorizado_en,
    version_borrador: registro.version_borrador,
    pendientes_aceptados: registro.pendientes_aceptados,
    acepta_limites: registro.acepta_limites,
    corrida,
  });

  // 11. Nada mas. No mergea, no empuja, no despliega (§8.4 paso 6).
  return { id, archivo, idempotente: false, evento, version };
}

/**
 * El borrador vive en `$EDITORIAL_REDACCIONES_DIR/<id>.json`, fuera de todo arbol de git.
 *
 * El id se valida AQUI y no solo en `autorizar()`: `--version` tambien llega por esta
 * puerta, y un id con `../` compondria una ruta fuera del directorio de redacciones. Que
 * esa via sea de solo lectura no la hace inofensiva.
 */
export function leerBorrador(id) {
  if (!ID_VALIDO.test(String(id ?? ''))) {
    throw new Negativa('ID_INVALIDO',
      `el id ${JSON.stringify(id)} no es kebab-case estable (§3); tambien es el nombre del archivo`);
  }
  const ruta = join(dirRedacciones(), `${id}.json`);
  if (!existsSync(ruta)) {
    throw new Negativa('SIN_BORRADOR',
      `no existe el borrador ${ruta}. Autorizar no redacta: si falta, se genera (§8.1).`);
  }
  return parsearJsonEstricto(readFileSync(ruta, 'utf8'), `borrador ${id}`);
}

/**
 * El registro lo aporta el humano y vive bajo `$EDITORIAL_ESTADO_DIR` (§8.8): fuera de
 * todo arbol de git, que es donde vive el estado. Un registro dentro del repositorio seria
 * una firma commiteada en un repositorio PUBLICO.
 */
function leerRegistro(rutaRegistro) {
  if (!cadenaLlena(rutaRegistro)) {
    throw new Negativa('SIN_REGISTRO',
      'falta `--registro <archivo.json>`: la decision humana entra por un archivo, y no hay '
      + 'bandera que la sustituya ni modo automatico que la infiera (§8.8).');
  }
  const ruta = resolve(rutaRegistro);
  const raiz = dirEstado();
  if (ruta !== raiz && !ruta.startsWith(raiz + sep)) {
    throw new Negativa('REGISTRO_FUERA_DE_SITIO',
      `el registro tiene que vivir bajo $EDITORIAL_ESTADO_DIR (${raiz}), y esta en ${ruta}. `
      + 'Ahi es donde vive el estado del canal, fuera de todo arbol de git (§8.3, §8.8).');
  }
  if (!existsSync(ruta)) throw new Negativa('SIN_REGISTRO', `no existe el registro ${ruta}`);
  return parsearJsonEstricto(readFileSync(ruta, 'utf8'), 'registro');
}

// --- CLI ---------------------------------------------------------------------------

if (esCli(import.meta.url)) {
  try {
    exigirDirectoriosPrivados();
  } catch (e) {
    if (!(e instanceof ConfiguracionAusente) && !(e instanceof DirectorioVersionado)) throw e;
    console.error(`autorizar: ABORTA — ${e.message}`);
    process.exit(1);
  }

  const argv = process.argv.slice(2);
  const iRegistro = argv.indexOf('--registro');
  const rutaRegistro = iRegistro >= 0 ? argv[iRegistro + 1] : null;
  // El VALOR de `--registro` no es candidato a id. Sin esto, `autorizar --registro r.json
  // mi-pieza` tomaba `r.json` como id: falla cerrado —no pasa ID_VALIDO—, pero la negativa
  // culpa al id y quien la lee busca el bug donde no esta. El orden de las banderas no
  // decide que se autoriza.
  const iValor = iRegistro >= 0 ? iRegistro + 1 : -1;
  const id = argv.filter((a, n) => !a.startsWith('--') && n !== iValor)[0] ?? '';

  try {
    if (argv.includes('--version')) {
      // Solo lectura: imprime la version canonica para que el registro pueda nombrar la
      // que se leyo. No escribe corpus, no emite evento, no autoriza nada.
      console.log(versionDe(leerBorrador(id)));
      process.exit(0);
    }
    const r = autorizar({ id, registro: rutaRegistro });
    if (r.idempotente) {
      console.log(`autorizar: ${id} ya estaba autorizada. Ni evento ni reescritura (§8.2).`);
    } else {
      console.log(`autorizar: ${id} -> ${r.archivo}`);
      console.log(`  version:   ${r.version}`);
      console.log(`  autorizo:  ${r.evento.autorizado_por} · ${r.evento.autorizado_en}`);
      console.log(`  pendientes aceptados: ${r.evento.pendientes_aceptados.length}`);
      console.log('  el archivo queda en el arbol de trabajo; el commit lo decide un humano (§8.4).');
    }
    process.exit(0);
  } catch (e) {
    if (!(e instanceof Negativa)) throw e;
    console.error(`autorizar: SE NIEGA [${e.codigo}] — ${e.message}`);
    console.error('  No se escribio corpus y no se emitio evento.');
    process.exit(1);
  }
}
