/**
 * Condicion 4: las fechas se extraen CON SU ROL, o no se usan.
 *
 * «Encontrar alguna fecha en una pagina no basta para confirmar la fecha declarada.»
 * Una fecha suelta puede ser un pie de foto, una cita, el año del copyright o la fecha
 * de la nota relacionada de la barra lateral. Solo la fecha de PUBLICACION confirma.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fechasConRol, primeraFechaIso } from '../verificar.mjs';
import {
  CUERPO_QUE_RESPALDA, RESPUESTA, documento, fuente, pieza, verificar,
} from './ayuda.mjs';

const OTRA = 'https://ejemplo.test/otra';
const OTRA_OK = RESPUESTA.leible(documento({ publicado: '2026-09-11', cuerpo: CUERPO_QUE_RESPALDA }));

test('FECHA SUELTA QUE COINCIDE POR CASUALIDAD: no_confirmada, jamas coincide', async () => {
  const url = 'https://ejemplo.test/sin-rol';
  const { informe } = await verificar(
    pieza([fuente(url, '2026-09-11'), fuente(OTRA, '2026-09-11')]),
    {
      // Sin ninguna meta de publicacion: la fecha esta en el cuerpo, donde no significa nada.
      [url]: RESPUESTA.leible(documento({ sueltas: ['2026-09-11'], cuerpo: CUERPO_QUE_RESPALDA })),
      [OTRA]: OTRA_OK,
    },
  );

  const f = informe.fuentes[0];
  assert.equal(f.fecha, 'no_confirmada');
  assert.notEqual(f.fecha, 'coincide', 'coincidir con una fecha suelta no es confirmar');
  assert.deepEqual(f.publicacion, []);
  assert.equal(f.fechas_sin_rol, 1);
  assert.match(
    informe.avisos.join(' | '),
    /Una de esas fechas sueltas coincide con la declarada: coincidencia, no confirmacion/,
  );
  assert.deepEqual(informe.fallos, [], 'no poder confirmar no es contradecir');
});

test('article:published_time QUE CONTRADICE la fecha declarada: no_verificada', async () => {
  const url = 'https://ejemplo.test/otra-fecha';
  const { informe } = await verificar(
    pieza([fuente(url, '2026-09-11'), fuente(OTRA, '2026-09-11')]),
    {
      [url]: RESPUESTA.leible(documento({ publicado: '2026-08-01', cuerpo: CUERPO_QUE_RESPALDA })),
      [OTRA]: OTRA_OK,
    },
  );

  assert.equal(informe.fuentes[0].fecha, 'discrepancia');
  assert.equal(informe.veredicto, 'no_verificada');
  assert.match(
    informe.fallos.join(' | '),
    /fecha declarada 2026-09-11 no es la fecha de publicacion de .*: el documento se publico 2026-08-01/,
  );
});

test('PUBLICACION Y MODIFICACION DISTINTAS: el informe lo dice', async () => {
  const url = 'https://ejemplo.test/retocada';
  const { informe } = await verificar(
    pieza([fuente(url, '2026-09-11'), fuente(OTRA, '2026-09-11')]),
    {
      [url]: RESPUESTA.leible(documento({
        publicado: '2026-09-11', modificado: '2026-09-20', cuerpo: CUERPO_QUE_RESPALDA,
      })),
      [OTRA]: OTRA_OK,
    },
  );

  assert.equal(informe.fuentes[0].fecha, 'coincide');
  assert.deepEqual(informe.fuentes[0].modificacion, ['2026-09-20']);
  assert.match(
    informe.avisos.join(' | '),
    /se publico 2026-09-11 y se modifico 2026-09-20: la pieza puede estar citando un texto que cambio despues/,
  );
});

test('LA FECHA DECLARADA ES LA DE MODIFICACION: tampoco confirma', async () => {
  const url = 'https://ejemplo.test/solo-modificada';
  const { informe } = await verificar(
    pieza([fuente(url, '2026-09-20'), fuente(OTRA, '2026-09-11')]),
    {
      [url]: RESPUESTA.leible(
        '<html><head><meta property="article:modified_time" content="2026-09-20T10:00:00Z">'
        + `</head><body><p>${CUERPO_QUE_RESPALDA}</p></body></html>`,
      ),
      [OTRA]: OTRA_OK,
    },
  );

  assert.equal(informe.fuentes[0].fecha, 'no_confirmada');
  assert.match(
    informe.avisos.join(' | '),
    /es la de MODIFICACION del documento, no la de publicacion/,
  );
});

test('LA OMISION SIGUE SIENDO OMISION: `fecha: null` no es una contradiccion', async () => {
  const url = 'https://ejemplo.test/sin-declarar';
  const { informe } = await verificar(
    pieza([fuente(url, null), fuente(OTRA, '2026-09-11')]),
    {
      [url]: RESPUESTA.leible(documento({ publicado: '2026-08-01', cuerpo: CUERPO_QUE_RESPALDA })),
      [OTRA]: OTRA_OK,
    },
  );

  assert.equal(informe.fuentes[0].fecha, 'omitida_por_la_pieza');
  assert.deepEqual(informe.fallos, []);
  assert.match(informe.avisos.join(' | '), /la pieza no declaro fecha para .*el documento declara publicacion 2026-08-01/);
});

test('LA FECHA DEL ACONTECIMIENTO NO SALE DEL HTML y el informe no finge que si', async () => {
  const a = 'https://ejemplo.test/a';
  const { informe } = await verificar(
    pieza([fuente(a), fuente(OTRA)]),
    {
      [a]: RESPUESTA.leible(documento({ publicado: '2026-09-11', cuerpo: CUERPO_QUE_RESPALDA })),
      [OTRA]: OTRA_OK,
    },
  );
  assert.deepEqual(informe.fecha_acontecimiento, {
    valor: '2026-09-10',
    estado: 'no_confirmable_con_la_pagina',
    nota: 'la fecha del acontecimiento la declara la pieza; no sale del HTML de las fuentes '
      + 'y no se confirma con ellas',
  });
});

// --- La extraccion en si, sin pieza ni red ---------------------------------------

test('fechasConRol reconoce los cuatro sitios donde el rol es explicito', () => {
  const html = `<html><head>
    <meta property="og:published_time" content="2026-01-02T00:00:00Z">
    <meta name="dateModified" content="2026-03-04">
    <script type="application/ld+json">{"datePublished":"2026-01-02T08:00:00Z","dateModified":"2026-03-04T08:00:00Z","dateCreated":"2025-12-31"}</script>
    </head><body>
    <time datetime="2026-01-02" pubdate>2 de enero de 2026</time>
    <p>Relacionada: la nota del 2025-11-11 lo anticipaba.</p>
    </body></html>`;
  const r = fechasConRol(html);
  assert.deepEqual(r.publicacion, ['2026-01-02']);
  assert.deepEqual(r.modificacion, ['2026-03-04']);
  assert.ok(r.sin_rol.includes('2025-11-11'), 'la nota relacionada queda SIN rol');
  assert.ok(r.sin_rol.includes('2025-12-31'), 'dateCreated no es fecha de publicacion');
});

test('fechasConRol ignora un <time> sin rol y una fecha en texto plano', () => {
  const html = '<html><body><time datetime="2026-05-05">5 de mayo</time>'
    + '<p>Consultado el 2026-06-06.</p></body></html>';
  const r = fechasConRol(html);
  assert.deepEqual(r.publicacion, []);
  assert.deepEqual(r.modificacion, []);
  assert.deepEqual(r.sin_rol, ['2026-05-05', '2026-06-06']);
});

test('primeraFechaIso lee ISO con hora, «Month D, YYYY» y «D de mes de YYYY»', () => {
  assert.equal(primeraFechaIso('2026-09-11T09:00:00Z'), '2026-09-11');
  assert.equal(primeraFechaIso('September 11, 2026'), '2026-09-11');
  assert.equal(primeraFechaIso('11 de septiembre de 2026'), '2026-09-11');
  assert.equal(primeraFechaIso('ayer por la tarde'), null);
  assert.equal(primeraFechaIso(null), null);
});
