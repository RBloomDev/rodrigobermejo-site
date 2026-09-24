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

import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dominioDe, huellaDe, normalizarUrl } from '../comun.mjs';

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
