/**
 * Etapa 3 — Redactar (`docs/plataforma/02-editorial.md` §5.3).
 *
 * ======================= LA FRONTERA, Y DONDE ESTA EXACTAMENTE =======================
 *
 * ACTUALIZADO 2026-09-14. La version anterior de este bloque decia «este modulo no llama
 * a ningun modelo», y esa frontera **se movio a peticion de Rodrigo**: el tramite de
 * copiar el expediente a un agente y el resultado de vuelta no era un canal, era un paso
 * manual disfrazado de automatizacion.
 *
 * Ahora el modulo SI puede invocar al redactor, pero **no sabe como**: recibe la funcion
 * `invocar` por inyeccion. La via real vive en `invocar-redactor.mjs`, y por defecto no
 * hay ninguna. Esa separacion es deliberada y hace tres cosas:
 *
 *   1. Las pruebas corren **sin red y sin modelo**. El comportamiento sin inferencia es
 *      el de siempre: el expediente queda pendiente, no se inventa nada.
 *   2. El expediente sigue siendo un ARTEFACTO, no un estado efimero dentro de una
 *      llamada. §5.3 exige que toda cifra y toda fecha del texto exista en alguna de las
 *      `fuentes[]`, y eso solo se puede verificar despues (§5.4) si el expediente existe
 *      en disco.
 *   3. **Nada del intercambio sobrevive.** `AGENTS.md:60` y §3 prohiben guardar prompts,
 *      transcripciones y contenido intermedio. Ahora hay prompt --- se construye en
 *      `invocar-redactor.mjs` y muere ahi. De vuelta solo viene el borrador estructurado
 *      y la procedencia: que modelo redacto y cuando. El vinculo, no el proceso.
 *
 * Y lo que no cambia: **un fallo del redactor no produce pieza**. La entrada queda
 * pendiente y reintentable, y el fallo se registra en su etapa.
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

/**
 * Identificador estable de una pieza: legible por humanos, derivado del titulo,
 * con un sufijo de la huella para que dos piezas de titulo parecido no colisionen.
 * Estable entre corridas porque la huella lo es.
 */
function idDesdeTitulo(titulo, huella) {
  const base = String(titulo ?? 'sin-titulo')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56)
    // El corte a 56 puede dejar un guion al final, y entonces el id no es
    // kebab-case valido. Se limpia DESPUES de cortar, no antes.
    .replace(/-+$/, '');
  const sufijo = String(huella ?? '').replace(/^sha256:/, '').slice(0, 6);
  return sufijo ? `${base}-${sufijo}` : base;
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
export function redactar(expedientes, {
  redacciones = cargarRedacciones(),
  // `invocar` inyecta la via de inferencia. Por defecto no hay ninguna: asi las
  // pruebas corren sin red y sin modelo, y el comportamiento sin inferencia
  // -dejar el expediente pendiente- es el mismo que habia antes.
  invocar = null,
  alFallar = null,
} = {}) {
  const porUrl = new Map(
    redacciones.filter(Boolean).map((r) => [normalizarUrl(r.detectado_de), r]),
  );
  const piezas = [];
  const pendientes = [];

  for (const exp of expedientes) {
    let redaccion = porUrl.get(exp.detectado_de);

    // Si no hay una redaccion preparada y hay via de inferencia, se pide ahora.
    // Este es el paso que antes hacia una persona copiando el expediente a un
    // agente y el resultado de vuelta.
    // Una entrada de fuente `solo_detectar`, sin ninguna fuente corroborante
    // reproducible, NO puede sostener una pieza: de ella solo existen titulo,
    // medio y fecha. Invocar al modelo para que descubra eso cada vez cuesta
    // dinero y tiempo, y consume reintentos hasta descartar la entrada por un
    // motivo equivocado --- «fallo al redactar» cuando lo cierto es «falta
    // material». Se detecta antes de llamar a nadie.
    const hayMaterial = exp.reproducible
      || (exp.fuentes ?? []).some((f) => f.reproducible);
    if (!redaccion && typeof invocar === 'function' && !hayMaterial) {
      pendientes.push({
        ...exp,
        motivo: 'material insuficiente: la fuente no permite reproducir su texto y no hay '
          + 'ninguna fuente corroborante que si lo permita. Esperando corroboracion.',
      });
      continue;
    }

    if (!redaccion && typeof invocar === 'function') {
      try {
        const delModelo = invocar(exp);
        // El modelo aporta SOLO el contenido editorial. Los campos
        // estructurales --- identificador, fechas, URL de la fuente --- los pone
        // el canal desde el expediente, y eso no es burocracia: si el modelo
        // pudiera escribirlos, podria inventar una URL de fuente o fechar un
        // hecho a conveniencia, que son justo las dos cosas que `verificar.mjs`
        // existe para detectar. Aqui ni siquiera tiene la oportunidad.
        redaccion = {
          ...delModelo,
          detectado_de: exp.detectado_de,
          id: idDesdeTitulo(delModelo.titulo, exp.huella),
          ocurrido_en: exp.fuente_detectada?.fecha ?? exp.detectado_en,
          redactado_en: new Date().toISOString().slice(0, 16) + 'Z',
          fuente_primaria_url: exp.fuente_detectada?.url,
          tipo_fuente_detectada: 'primaria',
          modelo: delModelo.procedencia_redaccion?.modelo ?? 'desconocido',
          // Las corroborantes las EXTRAE el modelo del texto de la fuente, no
          // de su memoria. Se filtran aqui a URLs http(s) bien formadas, y
          // `verificar.mjs` comprueba despues que resuelven de verdad: una URL
          // plausible pero inventada es el fallo mas peligroso de esta etapa,
          // porque parece verificable hasta que alguien la abre.
          fuentes: (delModelo.fuentes_corroborantes ?? [])
            .filter((f) => {
              if (!f?.url) return false;
              try {
                const u = new URL(f.url);
                return u.protocol === 'https:' || u.protocol === 'http:';
              } catch { return false; }
            })
            .map((f) => ({
              titulo: f.titulo,
              // El medio se deriva del dominio cuando el modelo no lo da. Es
              // mecanico, no inventado: sale de la propia URL.
              medio: f.medio || (() => {
                try { return new URL(f.url).hostname.replace(/^www\./, ''); }
                catch { return null; }
              })(),
              url: f.url,
              fecha: f.fecha ?? null,
              tipo: 'primaria',
            })),
        };
      } catch (e) {
        // Un fallo del redactor NO produce pieza y NO descarta la entrada:
        // queda pendiente y reintentable. Se registra en su etapa.
        if (alFallar) alFallar(exp, e);
        pendientes.push({
          ...exp,
          motivo: `el redactor fallo (${e.codigo ?? 'sin codigo'}): ${e.message}`,
        });
        continue;
      }
    }

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
    // `fecha` puede ser null y NO es un defecto: una cita bibliografica extraida
    // de un articulo muchas veces no lleva fecha visible. Exigirla empuja al
    // redactor a inventarla, y una fecha fabricada es peor que una ausente ---
    // ademas de romper la distincion entre fecha del acontecimiento, de la
    // fuente y de deteccion. Lo que si es obligatorio: titulo, medio y URL.
    // Debe ser `null` explicito, no ausente: declarar que no se sabe es un acto,
    // olvidarlo es un descuido.
    if (!f.titulo || !f.medio || !f.url) fallos.push(`fuente incompleta: ${f.url ?? '(sin url)'}`);
    if (f.fecha === undefined) fallos.push(`fuente sin declarar fecha (usa null si se desconoce): ${f.url}`);
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
