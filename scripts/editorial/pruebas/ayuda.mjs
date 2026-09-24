/**
 * Andamiaje de las pruebas del canal editorial.
 *
 * Dos reglas que este archivo hace cumplir por construccion:
 *
 *   1. **Sin red.** Ninguna prueba sale a internet. Las etapas que la usarian
 *      (`detectar`, `verificar`) se inyectan como dobles con fixtures locales. Lo que se
 *      prueba es la maquina de estados y el orquestador, no el RSS de nadie.
 *   2. **Sin tocar el estado real.** Cada prueba monta en `tmpdir` las **dos** variables
 *      obligatorias —`EDITORIAL_ESTADO_DIR` y `EDITORIAL_REDACCIONES_DIR`— y su propio
 *      `EDITORIAL_PIEZAS`. Igual que `PROOF_FEED_DIR` en el sitio: si la unica forma de
 *      probar algo fuera escribir en el estado de produccion, la prueba seria el
 *      mecanismo por el que ese estado se corrompe.
 *
 *      Las redacciones no tenian variable que apuntar hasta que `EDITORIAL_REDACCIONES_DIR`
 *      existio (`02-editorial.md` §8.3): no era un descuido de quien escribio las
 *      pruebas, era que la variable no existia.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dominioDe, huellaDe, normalizarUrl } from '../comun.mjs';
import {
  estadoDe,
  marcarExpedienteListo,
  marcarRedactada,
  marcarVerificada,
  registrarDeteccion,
  rutaBitacora,
} from '../estado.mjs';
import { versionDe } from '../autorizar.mjs';

export const DIR_EDITORIAL = dirname(dirname(fileURLToPath(import.meta.url)));

/** Monta un entorno aislado y lo deja activo para el resto de la prueba. */
export function nuevoEntorno(nombre) {
  const raiz = mkdtempSync(join(tmpdir(), `editorial-${nombre}-`));
  const estado = join(raiz, 'estado');
  const redacciones = join(raiz, 'redacciones');
  mkdirSync(estado, { recursive: true });
  mkdirSync(redacciones, { recursive: true });
  process.env.EDITORIAL_ESTADO_DIR = estado;
  process.env.EDITORIAL_REDACCIONES_DIR = redacciones;
  process.env.EDITORIAL_PIEZAS = join(raiz, 'piezas.json');
  return { raiz, estado, redacciones, piezas: process.env.EDITORIAL_PIEZAS };
}

/** Un item tal como lo entrega `detectar()`. Todos los campos, ninguno de mas. */
export function item({
  fuente_id = 'medio-uno',
  medio = 'Medio Uno',
  licencia = 'CC BY 4.0',
  uso = 'reproducible',
  titulo,
  url,
  fecha_publicacion = '2026-09-10',
  fecha_lectura = '2026-09-14T10:00Z',
}) {
  const url_canonica = normalizarUrl(url);
  return {
    fuente_id,
    medio,
    licencia,
    uso,
    titulo,
    url,
    url_canonica,
    dominio: dominioDe(url_canonica),
    fecha_publicacion,
    fecha_lectura,
    huella: huellaDe(titulo, url_canonica),
  };
}

/**
 * Dobles de las etapas que tocan red o disco ajeno. Reproducen el contrato que
 * `ejecutar.mjs` consume, y nada mas:
 *
 *   prepararExpediente(item)            -> expediente
 *   redactar([expediente])              -> {piezas, pendientes}
 *   verificarPieza(pieza)               -> {ok, fallos, avisos, detalle}
 *   sellarVerificacion(pieza, informe)  -> pieza
 *
 * @param {object} [opciones]
 * @param {Map<string, object>} [opciones.redacciones]  url_canonica detectada -> borrador
 * @param {Map<string, object>} [opciones.verificaciones]  pieza_id -> informe
 * @param {object[]|Error} [opciones.deteccion]  items del feed, o el fallo de la fuente
 */
export function etapasFalsas({
  redacciones = new Map(),
  verificaciones = new Map(),
  deteccion = null,
} = {}) {
  const llamadas = { detectar: 0, redactar: 0, verificar: 0 };

  return {
    llamadas,
    redacciones,
    verificaciones,

    detectar: async () => {
      llamadas.detectar += 1;
      if (deteccion && deteccion.fallo) {
        return {
          items: [],
          errores: [{
            etapa: 'detectar',
            codigo: deteccion.fallo.codigo,
            mensaje: deteccion.fallo.mensaje,
            consecuencia: 'sin items de esta fuente en esta corrida',
            contexto: { fuente_id: deteccion.fallo.fuente_id },
          }],
          fuentesLeidas: [],
        };
      }
      return { items: deteccion?.items ?? [], errores: [], fuentesLeidas: ['doble'] };
    },

    prepararExpediente: (it) => ({
      detectado_de: it.url_canonica,
      huella: it.huella,
      hecho_candidato: it.titulo,
      fuente_detectada: {
        titulo: it.titulo,
        medio: it.medio,
        url: it.url_canonica,
        fecha: it.fecha_publicacion,
        licencia: it.licencia,
        uso: it.uso,
      },
      reproducible: it.uso === 'reproducible',
      detectado_en: it.fecha_lectura,
    }),

    redactar: (expedientes) => {
      llamadas.redactar += 1;
      const piezas = [];
      const pendientes = [];
      for (const exp of expedientes) {
        const borrador = redacciones.get(exp.detectado_de);
        if (!borrador) {
          pendientes.push({ ...exp, motivo: 'sin redaccion: el expediente espera al redactor' });
          continue;
        }
        piezas.push({
          id: borrador.id,
          tipo: 'noticia',
          titulo: borrador.titulo ?? exp.hecho_candidato,
          estado: 'borrador',
          huella: exp.huella,
          fuente_primaria: borrador.fuentes[0],
          fuentes: borrador.fuentes,
          procedencia: {
            redactado: { por: 'ia', modelo: borrador.modelo ?? 'modelo-de-prueba' },
            verificado: { por: 'pendiente', detalle: 'sin verificar' },
            publicado: { por: 'pendiente', detalle: 'Requiere decision de Rodrigo.' },
          },
        });
      }
      return { piezas, pendientes };
    },

    verificarPieza: async (pieza) => {
      llamadas.verificar += 1;
      // El doble tiene que hablar el contrato NUEVO. Uno que siga devolviendo
      // `{ok:true}` deja las pruebas en verde mientras el codigo real se cae:
      // encoda un contrato que ya no existe, y entonces la suite protege la
      // version vieja en vez del sistema.
      return verificaciones.get(pieza.id) ?? {
        veredicto: 'verificada',
        fallos: [],
        avisos: [],
        pendientes: [],
        detalle: 'VEREDICTO verificada — doble de verificacion: sin red, sin comprobacion real',
      };
    },

    sellarVerificacion: (pieza, informe) => {
      pieza.procedencia.verificado = { por: 'pendiente', detalle: informe.detalle };
      return pieza;
    },
  };
}

/** Borrador minimo para el doble de `redactar`. */
export function borrador({ id, titulo, fuentes }) {
  return { id, titulo, modelo: 'modelo-de-prueba', fuentes };
}

/** Una fuente citada dentro de una pieza. Es una REFERENCIA, no una identidad. */
export function referencia({ titulo, medio, url, fecha = '2026-06-18', tipo = 'primaria' }) {
  return { titulo, medio, url: normalizarUrl(url), fecha, tipo };
}

// =====================================================================================
//  ANDAMIAJE DE `autorizar` (§8.4, §8.8)
// =====================================================================================

/**
 * Una COPIA AISLADA del canal bajo `tmpdir`, para poder ejecutar `autorizar` de verdad sin
 * que escriba en el `content/noticias/` del repositorio.
 *
 * **Por que una copia y no una variable de entorno**: §8.3 dice «Son dos, y solo dos». Una
 * tercera variable que reapuntara el corpus seria exactamente la segunda puerta al arbol
 * publico que §8.1 existe para impedir, y la habria abierto una prueba. El corpus se
 * resuelve desde la ubicacion del modulo, asi que copiar el modulo mueve el corpus con el:
 * el comando que corre es el mismo archivo, sin bandera de prueba y sin rama especial.
 *
 * `tmpdir` no es un arbol de git, asi que las dos variables obligatorias resuelven ahi.
 *
 * @returns {{raiz: string, cli: string, corpus: string}}
 */
export function nuevoProyecto(nombre) {
  const raiz = mkdtempSync(join(tmpdir(), `editorial-proyecto-${nombre}-`));
  const destino = join(raiz, 'scripts', 'editorial');
  mkdirSync(destino, { recursive: true });
  for (const archivo of readdirSync(DIR_EDITORIAL)) {
    if (archivo.endsWith('.mjs')) copyFileSync(join(DIR_EDITORIAL, archivo), join(destino, archivo));
  }
  return {
    raiz,
    cli: join(destino, 'autorizar.mjs'),
    corpus: join(raiz, 'content', 'noticias'),
  };
}

/**
 * Un borrador sintetico que compone contra §2 y §3. **Sintetico a proposito**: ninguna
 * pieza real se usa como fixture de una prueba que simule su autorizacion.
 */
export function borradorDePrueba({
  id = 'demo-de-autorizacion',
  huella = huellaDe('Demo de autorizacion', 'https://observatorio.tec.mx/demo'),
  veredicto = 'verificada',
  pendientes = [],
  cambios = {},
} = {}) {
  return {
    id,
    tipo: 'noticia',
    titulo: 'Demo de autorizacion',
    entradilla: 'Una frase con el dato duro del hecho sintetico.',
    estado: 'borrador',
    ocurrido_en: '2026-09-10',
    redactado_en: '2026-09-14T10:00Z',
    hecho: 'Un hecho sintetico, escrito para ejercitar el comando de autorizacion.',
    que_cambia: 'Para el lector cambia que existe un unico camino al corpus publicado.',
    mexico: { estado: 'no_verificado', texto: 'No se ha comprobado que aplique aqui.' },
    no_establece: ['No establece nada sobre piezas reales: es un borrador de prueba.'],
    fuente_primaria: {
      titulo: 'Documento primario sintetico',
      medio: 'Observatorio del Tec',
      url: 'https://observatorio.tec.mx/demo',
      fecha: '2026-09-09',
    },
    fuentes: [
      {
        titulo: 'Documento primario sintetico',
        medio: 'Observatorio del Tec',
        url: 'https://observatorio.tec.mx/demo',
        fecha: '2026-09-09',
        tipo: 'primaria',
      },
      {
        titulo: 'Corroboracion sintetica',
        medio: 'Crossref',
        url: 'https://api.crossref.org/works/demo',
        fecha: '2026-09-09',
        tipo: 'secundaria',
      },
    ],
    relacion_declarada: null,
    procedencia: {
      detectado: { por: 'agente', detalle: 'feed sintetico de la prueba' },
      redactado: { por: 'ia', modelo: 'modelo-de-prueba' },
      verificado: {
        por: 'pendiente',
        veredicto,
        detalle: `VEREDICTO ${veredicto} — doble de verificacion: sin red`,
        pendientes,
      },
      publicado: { por: 'pendiente', detalle: 'Requiere decision de Rodrigo.' },
    },
    huella,
    correcciones: [],
    ...cambios,
  };
}

/** Deja el borrador donde `autorizar` lo busca: `$EDITORIAL_REDACCIONES_DIR/<id>.json`. */
export function escribirBorrador(pieza, { indentacion = 2 } = {}) {
  const ruta = join(process.env.EDITORIAL_REDACCIONES_DIR, `${pieza.id}.json`);
  writeFileSync(ruta, `${JSON.stringify(pieza, null, indentacion)}\n`, 'utf8');
  return ruta;
}

/** Deja el registro de la decision humana bajo `$EDITORIAL_ESTADO_DIR`, como exige §8.8. */
export function escribirRegistro(registro, nombre = 'registro.json') {
  const ruta = join(process.env.EDITORIAL_ESTADO_DIR, nombre);
  writeFileSync(ruta, `${JSON.stringify(registro, null, 2)}\n`, 'utf8');
  return ruta;
}

// =====================================================================================
//  ESCENARIO COMPARTIDO DE `autorizar`
//
//  Vive aqui y no dentro de un archivo de prueba porque las invariantes del comando se
//  comprueban desde TRES archivos —`autorizar`, `corpus-solo-autorizadas` y
//  `corpus-sin-prompts`—, y cada uno se ejecuta tambien por separado. Tres copias del
//  mismo andamiaje divergen, y la que diverge es siempre la que dejo de mirar lo que
//  importaba.
// =====================================================================================

/** Las cuatro etapas de procedencia de §3. No son las `ETAPAS` de `estado.mjs`, que son las del canal. */
export const ETAPAS_PROCEDENCIA = ['detectado', 'redactado', 'verificado', 'publicado'];

/** El corpus REAL del repositorio. Se lee, jamas se escribe desde una prueba. */
export const CORPUS_REAL = join(DIR_EDITORIAL, '..', '..', 'content', 'noticias');

/**
 * Lleva una entrada hasta `terminada` por el camino legal de la maquina de estados.
 *
 * El titulo del hecho lleva el id: la huella de §5.2 es titulo + dominio, asi que dos
 * piezas con el mismo titulo en el mismo medio son **el mismo hecho** para la
 * deduplicacion —que es justo lo que tiene que pasar—, y algun escenario necesita dos.
 */
export function sembrarTerminada(pieza) {
  const detectado = item({
    titulo: `${pieza.titulo} · ${pieza.id}`,
    url: `https://medio-uno.mx/${pieza.id}`,
  });
  const { id } = registrarDeteccion(detectado);
  marcarExpedienteListo(id);
  marcarRedactada(id, { redaccion_id: pieza.id, modelo: 'modelo-de-prueba' });
  marcarVerificada(id, { pieza_id: pieza.id });
  return id;
}

/**
 * Monta el escenario completo: entorno privado en `tmpdir`, copia aislada del canal, y la
 * bitacora llevada hasta `terminada`.
 */
export function montarAutorizacion(nombre, pieza = borradorDePrueba()) {
  const entorno = nuevoEntorno(nombre);
  const proyecto = nuevoProyecto(nombre);
  const entradaId = sembrarTerminada(pieza);
  escribirBorrador(pieza);
  return { entorno, proyecto, entradaId, pieza };
}

/** Ejecuta el CLI real de la copia aislada. Sin bandera de prueba y sin rama especial. */
export function correrAutorizar(proyecto, argumentos) {
  return spawnSync(process.execPath, [proyecto.cli, ...argumentos], {
    encoding: 'utf8',
    env: process.env,
  });
}

/** Los eventos `autorizada` de la bitacora privada del escenario activo. */
export function eventosDeAutorizacion() {
  if (!existsSync(rutaBitacora())) return [];
  return readFileSync(rutaBitacora(), 'utf8')
    .split('\n').filter(Boolean).map((l) => JSON.parse(l))
    .filter((f) => f.evento === 'autorizada');
}

/** Un registro de decision humana bien formado, con los cinco campos de §8.8. */
export function registroDe(pieza, { pendientes = [], acepta_limites = false, cambios = {} } = {}) {
  return {
    autorizado_por: 'Rodrigo Bermejo',
    autorizado_en: '2026-09-24T12:00:00-06:00',
    version_borrador: versionDe(pieza),
    pendientes_aceptados: pendientes,
    acepta_limites,
    ...cambios,
  };
}

/** Una negativa significa las tres cosas a la vez, y se comprueban las tres. */
export function exigirNegativa(r, { proyecto, entradaId, pieza }, codigo) {
  assert.notEqual(r.status, 0, `tenia que negarse:\n${r.stdout}${r.stderr}`);
  assert.match(r.stderr, new RegExp(`SE NIEGA \\[${codigo}\\]`), r.stderr);
  assert.equal(existsSync(join(proyecto.corpus, `${pieza.id}.json`)), false, 'no se escribe corpus');
  assert.equal(eventosDeAutorizacion().length, 0, 'no se emite evento `autorizada`');
  assert.equal(estadoDe(entradaId).estado, 'terminada', 'la entrada no se mueve de `terminada`');
}
