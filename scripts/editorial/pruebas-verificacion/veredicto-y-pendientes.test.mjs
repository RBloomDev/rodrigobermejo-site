/**
 * Condicion 3: el veredicto tiene tres valores y los pendientes se enumeran.
 *
 * `parcial` no es un `OK` con asterisco ni un fallo suave: es «no hay contradicciones,
 * pero queda algo sin respaldo legible». La pieza se conserva como borrador y NO recibe
 * sello de verificacion completa. Nunca se emite OK habiendo pendientes.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { sellarVerificacion } from '../verificar.mjs';
import {
  CUERPO_QUE_RESPALDA, RESPUESTA, documento, fuente, pieza, verificar,
} from './ayuda.mjs';

const A = 'https://ejemplo.test/a';
const B = 'https://ejemplo.test/b';

/** Respalda «40 escuelas en 2026» y ademas contiene el 7, pero hablando de otra cosa. */
const CUERPO_CON_EL_7 = `${CUERPO_QUE_RESPALDA} El informe incluye 7 anexos tecnicos.`;

function piezaConAfirmacionSinRespaldo() {
  return pieza([fuente(A), fuente(B)], {
    que_cambia: 'Otras 7 entidades preparan un programa similar.',
  });
}

test('AFIRMACION SIN RESPALDO LEGIBLE: parcial, y la afirmacion aparece listada', async () => {
  const { informe } = await verificar(piezaConAfirmacionSinRespaldo(), {
    [A]: RESPUESTA.leible(documento({ publicado: '2026-09-11', cuerpo: CUERPO_CON_EL_7 })),
    [B]: RESPUESTA.leible(documento({ publicado: '2026-09-11', cuerpo: CUERPO_CON_EL_7 })),
  });

  assert.deepEqual(informe.fallos, [], 'sin contradicciones: no es no_verificada');
  assert.equal(informe.veredicto, 'parcial');
  assert.equal(informe.pendientes.length, 1);
  assert.equal(informe.pendientes[0].texto, 'Otras 7 entidades preparan un programa similar.');
  assert.match(informe.pendientes[0].motivo, /ninguna de las 2 fuentes legibles la respalda/);
  assert.match(informe.detalle, /VEREDICTO PARCIAL/);
  assert.match(informe.detalle, /PENDIENTES: «Otras 7 entidades preparan un programa similar\.»/);
  assert.doesNotMatch(informe.detalle, /\bOK\b/, 'jamas OK habiendo pendientes');

  // El control de cifras SI la da por presente: el 7 esta en el texto de la fuente.
  // Esa es justo la diferencia entre presencia de un digito y respaldo de una
  // afirmacion, y por eso el veredicto no puede colgarse del control de cifras.
  assert.deepEqual(informe.cifras_sin_respaldo, []);
  assert.ok(informe.cifras_comprobadas.includes('7'));
  assert.match(informe.detalle, /comprueba PRESENCIA de la cifra, no que la afirmacion sea cierta/);
});

test('CIFRA QUE NO EXISTE EN NINGUNA FUENTE LEGIBLE: no_verificada', async () => {
  const p = pieza([fuente(A), fuente(B)], {
    que_cambia: 'La inversion sumo 999 millones de pesos.',
  });
  const { informe } = await verificar(p, {
    [A]: RESPUESTA.leible(documento({ publicado: '2026-09-11', cuerpo: CUERPO_QUE_RESPALDA })),
    [B]: RESPUESTA.leible(documento({ publicado: '2026-09-11', cuerpo: CUERPO_QUE_RESPALDA })),
  });

  assert.equal(informe.veredicto, 'no_verificada');
  assert.deepEqual(informe.cifras_sin_respaldo, ['999']);
  assert.match(informe.fallos.join(' | '), /cifras del texto que no aparecen en ninguna fuente legible: 999/);
});

test('UNA FUENTE LEIDA CONTRADICE: no_verificada, con el pasaje', async () => {
  const { informe } = await verificar(pieza([fuente(A), fuente(B)]), {
    [A]: RESPUESTA.leible(documento({ publicado: '2026-09-11', cuerpo: CUERPO_QUE_RESPALDA })),
    [B]: RESPUESTA.leible(documento({
      publicado: '2026-09-11',
      cuerpo: 'El padron corrige la cifra: el programa alcanzo 12 escuelas en 2026.',
    })),
  });

  assert.equal(informe.veredicto, 'no_verificada');
  assert.equal(informe.afirmaciones[0].estado, 'contradicha');
  assert.deepEqual(informe.afirmaciones[0].contradicha_por, [B]);
  assert.match(informe.fallos.join(' | '), /afirmacion contradicha por una fuente leida/);
});

test('NINGUNA FUENTE SE PUDO LEER: no hay donde comprobar nada', async () => {
  const { informe } = await verificar(pieza([fuente(A), fuente(B)]), {
    [A]: RESPUESTA.prohibida(),
    [B]: RESPUESTA.agotada(),
  });

  assert.equal(informe.veredicto, 'no_verificada');
  assert.equal(informe.corroboracion.leidas, 0);
  assert.equal(informe.pendientes.length, 1);
  assert.match(informe.pendientes[0].motivo, /no se pudo leer ninguna fuente/);
  assert.match(informe.detalle, /corroboracion insuficiente: 0 de 2/);
});

test('sellarVerificacion escribe el veredicto y los pendientes, y nunca firma como humano', async () => {
  const p = piezaConAfirmacionSinRespaldo();
  const { informe } = await verificar(p, {
    [A]: RESPUESTA.leible(documento({ publicado: '2026-09-11', cuerpo: CUERPO_CON_EL_7 })),
    [B]: RESPUESTA.leible(documento({ publicado: '2026-09-11', cuerpo: CUERPO_CON_EL_7 })),
  });

  const sellada = sellarVerificacion(p, informe);
  assert.equal(sellada.procedencia.verificado.por, 'pendiente');
  assert.equal(sellada.procedencia.verificado.veredicto, 'parcial');
  assert.equal(sellada.procedencia.verificado.pendientes.length, 1);
  assert.match(
    sellada.procedencia.verificado.pendientes[0],
    /^Otras 7 entidades preparan un programa similar\. — ninguna de las 2 fuentes legibles/,
  );
  assert.match(sellada.procedencia.verificado.detalle, /VEREDICTO PARCIAL/);
});
