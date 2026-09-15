/**
 * Condicion 1 y condicion 2: que sabemos de cada fuente, y de donde salio su URL.
 *
 * El defecto que estas pruebas cierran: once fuentes citadas, una sola leida, y el
 * verificador decia OK. Un 403 no es una corroboracion silenciosa; una URL que el
 * redactor copio del texto de otro articulo no es una fuente leida de primera mano.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CUERPO_AJENO, CUERPO_QUE_RESPALDA, RESPUESTA, documento, fuente, pieza, verificar,
} from './ayuda.mjs';

test('ONCE FUENTES Y UNA LEIDA: no se verifica, y el informe dice cuantas se leyeron', async () => {
  const urls = Array.from({ length: 11 }, (_, i) => `https://ejemplo.test/fuente-${i + 1}`);
  const respuestas = {
    [urls[0]]: RESPUESTA.leible(documento({ publicado: '2026-09-11', cuerpo: CUERPO_QUE_RESPALDA })),
  };
  respuestas[urls[1]] = RESPUESTA.prohibida();
  respuestas[urls[2]] = RESPUESTA.saturada();
  respuestas[urls[3]] = RESPUESTA.caida();
  respuestas[urls[4]] = RESPUESTA.agotada();
  for (const u of urls.slice(5)) respuestas[u] = RESPUESTA.prohibida();

  const { informe } = await verificar(pieza(urls.map((u) => fuente(u))), respuestas);

  assert.notEqual(informe.veredicto, 'verificada', 'una de once leidas no puede dar verificada');
  assert.equal(informe.veredicto, 'no_verificada', 'no se alcanza la corroboracion minima de §3');
  assert.deepEqual(
    {
      citadas: informe.corroboracion.citadas,
      leidas: informe.corroboracion.leidas,
      no_consultadas: informe.corroboracion.no_consultadas,
      corroborantes: informe.corroboracion.corroborantes,
      cumple_minimo: informe.corroboracion.cumple_minimo,
    },
    { citadas: 11, leidas: 1, no_consultadas: 10, corroborantes: 1, cumple_minimo: false },
  );
  assert.match(informe.detalle, /11 citadas — 1 leidas/, 'el informe dice cuantas se leyeron');
  assert.match(informe.fallos.join(' | '), /corroboracion insuficiente: 1 de 2/);
  assert.equal(informe.fuentes.filter((f) => f.estado === 'no_consultada').length, 10);
});

test('403: la fuente queda NO CONSULTADA, no corrobora, y no vale como ausencia de contradiccion', async () => {
  // Dos fuentes leidas ya cumplen el minimo de §3 y respaldan la afirmacion: lo unico
  // que impide el sello completo es la tercera, que nadie pudo abrir. Ese es el punto.
  const a = 'https://ejemplo.test/a';
  const b = 'https://ejemplo.test/b';
  const c = 'https://ejemplo.test/c';
  const { informe, registros } = await verificar(
    pieza([fuente(a), fuente(b), fuente(c)]),
    {
      [a]: RESPUESTA.leible(documento({ publicado: '2026-09-11', cuerpo: CUERPO_QUE_RESPALDA })),
      [b]: RESPUESTA.leible(documento({ publicado: '2026-09-11', cuerpo: CUERPO_QUE_RESPALDA })),
      [c]: RESPUESTA.prohibida(),
    },
  );

  const bloqueada = informe.fuentes.find((f) => f.url === c);
  assert.equal(bloqueada.estado, 'no_consultada');
  assert.equal(bloqueada.http, 403);
  assert.equal(bloqueada.corrobora, false, 'un 403 no corrobora');
  assert.equal(informe.corroboracion.corroborantes, 2);
  assert.equal(informe.corroboracion.cumple_minimo, true);
  assert.deepEqual(informe.fallos, [], 'un 403 no es un fallo de la pieza');

  // La regla de la condicion 1: tampoco cuenta como ausencia de contradicciones.
  assert.equal(informe.veredicto, 'parcial', 'con una fuente sin leer no hay sello completo');
  assert.match(informe.detalle, /1 fuentes sin consultar: de ellas no se puede afirmar que no contradigan/);
  assert.match(informe.avisos.join(' | '), /NO CONSULTADA/);
  assert.equal(registros.length, 1, 'el 403 se registra en errores.jsonl con su consecuencia');
  assert.match(registros[0].consecuencia, /no corrobora, no descarta contradicciones/);
});

test('404: la fuente NO EXISTE y eso si tumba la verificacion', async () => {
  const a = 'https://ejemplo.test/a';
  const b = 'https://ejemplo.test/b';
  const c = 'https://ejemplo.test/fantasma';
  const { informe } = await verificar(
    pieza([fuente(a), fuente(b), fuente(c)]),
    {
      [a]: RESPUESTA.leible(documento({ publicado: '2026-09-11', cuerpo: CUERPO_QUE_RESPALDA })),
      [b]: RESPUESTA.leible(documento({ publicado: '2026-09-11', cuerpo: CUERPO_QUE_RESPALDA })),
      [c]: RESPUESTA.inexistente(),
    },
  );

  const fantasma = informe.fuentes.find((f) => f.url === c);
  assert.equal(fantasma.estado, 'no_existe');
  assert.equal(informe.veredicto, 'no_verificada');
  assert.match(informe.fallos.join(' | '), /fuente no existe: https:\/\/ejemplo\.test\/fantasma \[404\]/);
});

test('410: igual que 404 — el documento se fue, no es que no pudieramos verlo', async () => {
  const a = 'https://ejemplo.test/a';
  const b = 'https://ejemplo.test/b';
  const { informe } = await verificar(
    pieza([fuente(a), fuente(b)]),
    {
      [a]: RESPUESTA.leible(documento({ publicado: '2026-09-11', cuerpo: CUERPO_QUE_RESPALDA })),
      [b]: RESPUESTA.ida(),
    },
  );
  assert.equal(informe.fuentes[1].estado, 'no_existe');
  assert.equal(informe.veredicto, 'no_verificada');
});

test('200 sin cuerpo no es «leida»: resolvio, pero no se obtuvo texto', async () => {
  const a = 'https://ejemplo.test/a';
  const b = 'https://ejemplo.test/b';
  const { informe } = await verificar(
    pieza([fuente(a), fuente(b)]),
    {
      [a]: RESPUESTA.leible(documento({ publicado: '2026-09-11', cuerpo: CUERPO_QUE_RESPALDA })),
      [b]: RESPUESTA.vacia(),
    },
  );
  assert.equal(informe.fuentes[1].estado, 'no_consultada');
  assert.equal(informe.fuentes[1].corrobora, false);
});

test('DOS FUENTES LEIDAS Y COHERENTES: veredicto verificada', async () => {
  const a = 'https://ejemplo.test/a';
  const b = 'https://ejemplo.test/b';
  const { informe } = await verificar(
    pieza([fuente(a), fuente(b)]),
    {
      [a]: RESPUESTA.leible(documento({ publicado: '2026-09-11', cuerpo: CUERPO_QUE_RESPALDA })),
      [b]: RESPUESTA.leible(documento({
        publicado: '2026-09-11',
        cuerpo: 'Un segundo medio confirma que el programa alcanzo 40 escuelas en 2026.',
      })),
    },
  );

  assert.deepEqual(informe.fallos, []);
  assert.deepEqual(informe.pendientes, []);
  assert.equal(informe.veredicto, 'verificada');
  assert.equal(informe.corroboracion.corroborantes, 2);
  assert.deepEqual(informe.fuentes.map((f) => f.fecha), ['coincide', 'coincide']);
  assert.deepEqual(informe.afirmaciones.map((j) => j.estado), ['respaldada']);
});

test('REFERENCIA EXTRAIDA leida que no menciona la afirmacion: NO corrobora', async () => {
  const a = 'https://ejemplo.test/a';
  const b = 'https://ejemplo.test/citada-por-el-articulo';
  const { informe } = await verificar(
    pieza([fuente(a), fuente(b)]),
    {
      [a]: RESPUESTA.leible(documento({ publicado: '2026-09-11', cuerpo: CUERPO_QUE_RESPALDA })),
      [b]: RESPUESTA.leible(documento({ publicado: '2026-09-11', cuerpo: CUERPO_AJENO })),
    },
  );

  const citada = informe.fuentes[1];
  assert.equal(citada.origen, 'referencia_extraida', 'no la leimos del feed: la cito otro texto');
  assert.equal(citada.estado, 'leida', 'se leyo perfectamente...');
  assert.deepEqual(citada.respalda, [], '...y aun asi no respalda ninguna afirmacion');
  assert.equal(citada.corrobora, false, 'leerla no basta: tiene que respaldar algo');
  assert.equal(informe.corroboracion.corroborantes, 1);
  assert.equal(informe.veredicto, 'no_verificada');
  assert.match(informe.fallos.join(' | '), /corroboracion insuficiente: 1 de 2/);
});

test('ORIGEN: la entrada del feed es `detectada`; lo que el modelo extrajo, `referencia_extraida`', async () => {
  const a = 'https://ejemplo.test/a';
  const b = 'https://ejemplo.test/b';
  const { informe } = await verificar(
    pieza([fuente(a), fuente(b)]),
    {
      [a]: RESPUESTA.leible(documento({ publicado: '2026-09-11', cuerpo: CUERPO_QUE_RESPALDA })),
      [b]: RESPUESTA.leible(documento({ publicado: '2026-09-11', cuerpo: CUERPO_QUE_RESPALDA })),
    },
  );
  assert.deepEqual(informe.fuentes.map((f) => f.origen), ['detectada', 'referencia_extraida']);
  assert.equal(informe.corroboracion.referencias_extraidas, 1);
});

test('REFERENCIA EXTRAIDA + NO CONSULTADA: el informe dice que es doblemente debil', async () => {
  const a = 'https://ejemplo.test/a';
  const b = 'https://ejemplo.test/b';
  const { informe } = await verificar(
    pieza([fuente(a), fuente(b)]),
    {
      [a]: RESPUESTA.leible(documento({ publicado: '2026-09-11', cuerpo: CUERPO_QUE_RESPALDA })),
      [b]: RESPUESTA.agotada(),
    },
  );
  assert.match(informe.avisos.join(' | '), /doblemente debil/);
  assert.match(informe.avisos.join(' | '), /ni sabemos que dice, ni que exista/i);
});

test('EL INFORME YA NO TRAE `ok`: tres valores no caben en un booleano', async () => {
  const a = 'https://ejemplo.test/a';
  const b = 'https://ejemplo.test/b';
  const { informe } = await verificar(
    pieza([fuente(a), fuente(b)]),
    {
      [a]: RESPUESTA.leible(documento({ publicado: '2026-09-11', cuerpo: CUERPO_QUE_RESPALDA })),
      [b]: RESPUESTA.leible(documento({ publicado: '2026-09-11', cuerpo: CUERPO_QUE_RESPALDA })),
    },
  );
  assert.equal('ok' in informe, false);
  assert.ok(['verificada', 'parcial', 'no_verificada'].includes(informe.veredicto));
  assert.doesNotMatch(informe.detalle, /^OK/);
});
