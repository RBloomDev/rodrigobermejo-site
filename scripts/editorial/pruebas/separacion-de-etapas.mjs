/**
 * LA COMPROBACION de que `generar` no sella, extraida de sus dos pruebas.
 *
 * Vive aqui —y no dentro de un `.test.mjs`— porque la corren DOS archivos distintos y tiene
 * que ser LA MISMA funcion en los dos:
 *
 *   - `tres-comandos.test.mjs` la corre con el `generar` real y exige que pase.
 *   - `tres-comandos-falsable.test.mjs` la corre con un `generar` mutado que ademas sella y
 *     exige que FALLE.
 *
 * Si cada archivo llevara su copia, el segundo podria estar poniendo roja una comprobacion
 * que no es la que el primero usa para declarar verde, y entonces no probaria nada del
 * primero. Es tambien el motivo de que no sea un `.test.mjs`: el glob de `npm test` lo
 * recogeria y correria los mismos casos dos veces.
 */

import assert from 'node:assert/strict';

import { borrador, borradorEnDisco, etapasFalsas, item, nuevoEntorno, referencia } from './ayuda.mjs';
import { porUrlCanonica } from '../estado.mjs';

/** Un caso completo: el item detectado y la redaccion que le corresponde. */
export function caso(id, titulo, url) {
  const noticia = item({ titulo, url });
  const redacciones = new Map([[noticia.url_canonica, borrador({
    id,
    titulo,
    fuentes: [
      referencia({ titulo: 'Documento primario', medio: 'Organismo', url: `https://organismo.example/${id}` }),
      referencia({ titulo, medio: 'Medio Uno', url: noticia.url_canonica, tipo: 'secundaria' }),
    ],
  })]]);
  return { noticia, redacciones, id };
}

/** El caso unico sobre el que miden las dos pruebas. */
export const CASO_SEPARACION = {
  id: 'marco-de-alfabetizacion-ia',
  titulo: 'Un organismo publica su marco de alfabetizacion en IA',
  url: 'https://medio-uno.mx/marco-alfabetizacion-ia',
};

/**
 * Los mensajes que la comprobacion produce cuando falla POR LA SEPARACION. La prueba
 * negativa los exige: un mutante que rompiera la comprobacion por cualquier otra razon —un
 * entorno mal montado, un fixture ausente— la pondria roja igual sin demostrar nada sobre
 * las etapas.
 */
export const FALLO_ESPERADO = /esperando verificacion|sello el borrador|solo se escribe al verificar/;

/**
 * Corre el `generar` que se le pase y exige que haya dejado la entrada ESPERANDO
 * verificacion, sin sello. Se mide por la TRANSICION en la bitacora y por el archivo en
 * disco, nunca por lo que el comando imprime: una pantalla se puede cambiar sin cambiar lo
 * que el canal hizo.
 *
 * Lanza —y por eso sirve como sonda de falsabilidad— si el `generar` bajo prueba ademas
 * sella, o sea, si sigue haciendo las dos etapas.
 *
 * @param {Function} correrGenerar  el `generar` bajo prueba
 * @param {string}   nombre         para aislar el entorno de cada corrida
 */
export async function exigirQueGenerarNoSelle(correrGenerar, nombre) {
  nuevoEntorno(`separacion-${nombre}`);
  const c = caso(CASO_SEPARACION.id, CASO_SEPARACION.titulo, CASO_SEPARACION.url);
  const etapas = etapasFalsas({ deteccion: { items: [c.noticia] }, redacciones: c.redacciones });

  await correrGenerar({ silencioso: true }, { etapas });

  // La TRANSICION, leida de la bitacora. No la salida por pantalla.
  const tras = porUrlCanonica(c.noticia.url_canonica);
  assert.equal(
    tras.estado, 'pendiente_verificacion',
    '`generar` tiene que dejar la entrada esperando verificacion, no cerrarla',
  );
  assert.equal(
    tras.pieza_id, null,
    '`pieza_id` solo se escribe al verificar: si `generar` lo puso, `generar` verifico',
  );

  // Y el borrador en disco no puede llevar sello: el sello es lo que escribe la OTRA etapa.
  const enDisco = borradorEnDisco(c.id);
  assert.notEqual(enDisco, null, '`generar` tiene que dejar el borrador en $EDITORIAL_REDACCIONES_DIR');
  assert.equal(
    enDisco.procedencia.verificado.veredicto, undefined,
    '`generar` sello el borrador: eso es la etapa de `verificar` (§8.1, regla 2)',
  );

  return { caso: c, etapas };
}
