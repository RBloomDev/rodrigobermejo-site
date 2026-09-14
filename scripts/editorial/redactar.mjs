/**
 * Etapa 3 — Redactar (`docs/plataforma/02-editorial.md` §5.3).
 *
 * ======================= LA FRONTERA, Y DONDE ESTA EXACTAMENTE =======================
 *
 * **Este modulo no llama a ningun modelo.** No hay cliente HTTP a una API de inferencia,
 * no hay clave, no hay prompt. Lo que hace es preparar el EXPEDIENTE de la pieza —el
 * hecho candidato, las fuentes, las fechas, la huella— y dejarlo listo.
 *
 * La redaccion del texto la hace el agente (un modelo, con nombre, registrado en
 * `procedencia.redactado.modelo`) leyendo ese expediente, y deja su resultado como un
 * archivo en `redacciones/<id>.json`. Este modulo lo recoge y lo compone contra el
 * esquema de §3.
 *
 * Por que la frontera esta aqui y no dentro del script:
 *
 *   1. §5.3 exige que toda cifra y toda fecha del texto exista en alguna de las
 *      `fuentes[]`. Eso se verifica contra el expediente (§5.4, `verificar.mjs`), y solo
 *      es verificable si el expediente es un artefacto y no un estado efimero dentro de
 *      una llamada.
 *   2. `AGENTS.md:60` y §3 prohiben guardar prompts, transcripciones y contenido
 *      intermedio. Un script que llamara al modelo tendria que construir un prompt; el
 *      camino corto para depurarlo es guardarlo, y ahi es exactamente por donde esa regla
 *      se rompe. Aqui no hay prompt que guardar.
 *   3. Se guarda el VINCULO, no el proceso: que modelo redacto (`procedencia.redactado`).
 *
 * Lo que este modulo SI hace cumplir, de forma dura, antes de que nada llegue al corpus:
 *   - minimo dos fuentes (§3);
 *   - `no_establece` no vacio (§3);
 *   - `estado` solo puede ser `borrador` (§3);
 *   - `tipo: "opinion"` se RECHAZA: un agente no redacta opinion en nombre de Rodrigo (§4);
 *   - `procedencia.publicado` es siempre `pendiente` (§3).
 * ====================================================================================
 */

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DIR_REDACCIONES, esCli, leerJson, normalizarUrl } from './comun.mjs';

const TIPOS_PERMITIDOS = new Set(['noticia', 'analisis']);
const ESTADOS_MEXICO = new Set([
  'aplica_con_datos_locales', 'aplica_sin_datos_locales', 'no_aplica', 'no_verificado',
]);

/**
 * El expediente: todo lo que el redactor puede usar, y nada mas. Si un dato no esta aqui,
 * no puede aparecer en la pieza.
 */
export function prepararExpediente(item) {
  return {
    detectado_de: item.url_canonica,
    huella: item.huella,
    hecho_candidato: item.titulo,
    fuente_detectada: {
      titulo: item.titulo,
      medio: item.medio,
      url: item.url_canonica,
      fecha: item.fecha_publicacion,
      licencia: item.licencia,
      uso: item.uso,
    },
    // Recordatorio operativo, no decorativo: si `uso` es `solo_detectar`, el cuerpo de
    // esta fuente no existe en ninguna parte del sistema y no puede citarse.
    reproducible: item.uso === 'reproducible',
    detectado_en: item.fecha_lectura,
  };
}

export function cargarRedacciones() {
  if (!existsSync(DIR_REDACCIONES)) return [];
  return readdirSync(DIR_REDACCIONES)
    .filter((n) => n.endsWith('.json'))
    .map((n) => ({ archivo: n, ...leerJson(join(DIR_REDACCIONES, n), null) }));
}

/**
 * Empareja expedientes con la redaccion que el agente escribio para ellos.
 * Un expediente sin redaccion NO produce pieza: queda pendiente. Es lo correcto —
 * el canal prefiere no publicar a publicar un esqueleto (§1, «un `[COMPANY RESPONSE
 * PLACEHOLDER]` servido en produccion»).
 */
export function redactar(expedientes, { redacciones = cargarRedacciones() } = {}) {
  const porUrl = new Map(
    redacciones.filter(Boolean).map((r) => [normalizarUrl(r.detectado_de), r]),
  );
  const piezas = [];
  const pendientes = [];

  for (const exp of expedientes) {
    const redaccion = porUrl.get(exp.detectado_de);
    if (!redaccion) {
      pendientes.push({ ...exp, motivo: 'sin redaccion: el expediente espera al redactor' });
      continue;
    }
    piezas.push(componerPieza(exp, redaccion));
  }

  return { piezas, pendientes };
}

export function componerPieza(expediente, redaccion) {
  const fuentes = [
    { ...expediente.fuente_detectada, tipo: redaccion.tipo_fuente_detectada ?? 'secundaria' },
    ...(redaccion.fuentes ?? []),
  ].map((f) => ({
    titulo: f.titulo, medio: f.medio, url: normalizarUrl(f.url), fecha: f.fecha, tipo: f.tipo,
  }));

  const primaria = fuentes.find((f) => f.url === normalizarUrl(redaccion.fuente_primaria_url));

  const pieza = {
    id: redaccion.id,
    tipo: redaccion.tipo,
    titulo: redaccion.titulo,
    entradilla: redaccion.entradilla,
    estado: 'borrador',
    ocurrido_en: redaccion.ocurrido_en,
    redactado_en: redaccion.redactado_en,
    hecho: redaccion.hecho,
    que_cambia: redaccion.que_cambia,
    mexico: redaccion.mexico,
    no_establece: redaccion.no_establece ?? [],
    fuente_primaria: primaria
      ? { titulo: primaria.titulo, medio: primaria.medio, url: primaria.url, fecha: primaria.fecha }
      : null,
    fuentes,
    relacion_declarada: redaccion.relacion_declarada ?? null,
    procedencia: {
      detectado: {
        por: 'agente',
        detalle: `${expediente.fuente_detectada.medio} · feed leido el ${expediente.detectado_en}`,
      },
      redactado: { por: 'ia', modelo: redaccion.modelo },
      verificado: { por: 'pendiente', detalle: 'sin verificar' },
      // §3: no hay autopublicacion, ni la habra sin decision de Rodrigo.
      publicado: { por: 'pendiente', detalle: 'Requiere decision de Rodrigo. Nada de esta entrega se publica.' },
    },
    huella: expediente.huella,
    correcciones: [],
  };

  const fallos = validarEsquema(pieza);
  if (fallos.length) {
    const e = new Error(`La pieza «${pieza.id}» no cumple el esquema de §3:\n- ${fallos.join('\n- ')}`);
    e.fallos = fallos;
    throw e;
  }
  return pieza;
}

/** §3, «Reglas del esquema, y son duras». Se aplican aqui, no en revision. */
export function validarEsquema(p) {
  const fallos = [];
  if (!p.id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id)) fallos.push('`id` ausente o no es kebab-case');
  if (p.tipo === 'opinion') {
    fallos.push('`tipo: "opinion"` rechazado: un agente no redacta opinion en nombre de Rodrigo (§4)');
  } else if (!TIPOS_PERMITIDOS.has(p.tipo)) {
    fallos.push(`\`tipo\` invalido: ${p.tipo}`);
  }
  if (p.estado !== 'borrador') fallos.push('`estado` solo puede ser "borrador" en esta entrega');
  for (const campo of ['titulo', 'entradilla', 'hecho', 'que_cambia']) {
    if (!p[campo] || !String(p[campo]).trim()) fallos.push(`\`${campo}\` vacio`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.ocurrido_en ?? '')) fallos.push('`ocurrido_en` no es YYYY-MM-DD');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/.test(p.redactado_en ?? '')) {
    fallos.push('`redactado_en` no es YYYY-MM-DDTHH:MMZ');
  }
  if (!p.mexico || !ESTADOS_MEXICO.has(p.mexico.estado)) fallos.push('`mexico.estado` invalido');
  if (!p.mexico?.texto?.trim()) fallos.push('`mexico.texto` vacio');
  if (!Array.isArray(p.no_establece) || p.no_establece.length < 1) {
    fallos.push('`no_establece` vacio: si no se sabe que NO prueba, la pieza no esta lista (§3)');
  }
  if (!Array.isArray(p.fuentes) || p.fuentes.length < 2) {
    fallos.push('menos de dos fuentes: con una sola, la pieza no se redacta (§3)');
  }
  if (!p.fuente_primaria?.url) fallos.push('`fuente_primaria` no resuelve a ninguna de las `fuentes[]`');
  for (const f of p.fuentes ?? []) {
    if (!f.titulo || !f.medio || !f.url || !f.fecha) fallos.push(`fuente incompleta: ${f.url ?? '(sin url)'}`);
    if (!['primaria', 'secundaria'].includes(f.tipo)) fallos.push(`fuente sin tipo valido: ${f.url}`);
  }
  if (p.procedencia?.redactado?.por !== 'ia' || !p.procedencia?.redactado?.modelo) {
    fallos.push('`procedencia.redactado.modelo` ausente: se guarda el vinculo, que modelo redacto (§3)');
  }
  if (p.procedencia?.publicado?.por !== 'pendiente') {
    fallos.push('`procedencia.publicado` debe ser `pendiente` en todo el corpus de esta entrega (§3)');
  }
  // La huella viene del expediente (del item detectado), no se recalcula sobre el texto
  // redactado: si se recalculara sobre el titulo que escribio el modelo, cambiar una
  // palabra del titulo bastaria para que la pieza dejara de reconocerse como duplicada.
  if (!/^sha256:[0-9a-f]{64}$/.test(p.huella ?? '')) fallos.push('`huella` ausente o mal formada');
  return fallos;
}

if (esCli(import.meta.url)) {
  console.log('redactar.mjs no se ejecuta solo: es una etapa de ejecutar.mjs.');
  console.log(`Redacciones disponibles: ${cargarRedacciones().map((r) => r.id).join(', ') || '(ninguna)'}`);
}
