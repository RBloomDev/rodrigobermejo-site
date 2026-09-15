/**
 * Las cinco propiedades que Rodrigo puso como entregable.
 *
 * Cada una tiene un bloque «COMO SE PONE ROJA» que dice exactamente que hay que romper en
 * la implementacion para verla fallar. Se comprobaron una por una: una prueba verde que no
 * puede ponerse roja no prueba nada.
 *
 * Sin red: las etapas que la usarian se inyectan como dobles (`ayuda.mjs`).
 * Sin tocar el estado real: cada prueba monta su `EDITORIAL_ESTADO_DIR` en `tmpdir`.
 */

import assert from 'node:assert/strict';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import { borrador, etapasFalsas, item, nuevoEntorno, referencia, DIR_EDITORIAL } from './ayuda.mjs';
import { deduplicar } from '../deduplicar.mjs';
import { ejecutar } from '../ejecutar.mjs';
import {
  estadoDe,
  fallosRegistrados,
  marcarExpedienteListo,
  pendientesDeRedaccion,
  plegar,
  porUrlCanonica,
  registrarDeteccion,
  rutaBitacora,
} from '../estado.mjs';

const correr = (etapas, banderas = {}) => ejecutar({ silencioso: true, ...banderas }, { etapas });
const corpus = () => JSON.parse(readFileSync(process.env.EDITORIAL_PIEZAS, 'utf8'));

// =====================================================================================
test('1. una entrada sin redaccion sigue disponible y se completa en una corrida posterior', async () => {
  nuevoEntorno('p1');

  const noticia = item({
    titulo: 'La SEP publica su marco de alfabetizacion en IA',
    url: 'https://medio-uno.mx/sep-marco-ia?utm_source=rss',
  });

  // --- Corrida 1: se detecta, NO hay redactor. ---
  const r1 = await correr(etapasFalsas({ deteccion: { items: [noticia] } }));
  assert.equal(r1.nuevos, 1);
  assert.equal(r1.despues, 0, 'no debe entrar nada al corpus sin borrador');
  assert.equal(r1.pendientes, 1);
  assert.equal(r1.parcial, false, 'un expediente esperando redactor no es un fallo');

  const tras1 = porUrlCanonica(noticia.url_canonica);
  assert.equal(tras1.estado, 'pendiente_redaccion');
  assert.equal(pendientesDeRedaccion().length, 1, 'la entrada tiene que seguir en la cola');

  // --- Corrida 2: el redactor ya entrego. La entrada TIENE que seguir disponible. ---
  const redacciones = new Map([[noticia.url_canonica, borrador({
    id: 'sep-marco-ia',
    titulo: 'La SEP publica su marco de alfabetizacion en IA',
    fuentes: [
      referencia({ titulo: 'Marco SEP', medio: 'SEP', url: 'https://sep.gob.mx/marco-ia' }),
      referencia({ titulo: 'Cobertura', medio: 'Medio Uno', url: noticia.url_canonica, tipo: 'secundaria' }),
    ],
  })]]);

  const r2 = await correr(etapasFalsas({ deteccion: { items: [noticia] }, redacciones }));
  assert.equal(r2.repetidos, 0, 'no puede descartarse por «ya vista»: nunca llego a pieza');
  assert.equal(r2.yaPendientes, 1, 'la bitacora la reconoce como trabajo sin terminar');
  assert.deepEqual(r2.insertadas, ['sep-marco-ia']);
  assert.equal(porUrlCanonica(noticia.url_canonica).estado, 'terminada');
  assert.equal(corpus().length, 1);

  // COMO SE PONE ROJA: en `estado.mjs`, quitar `'pendiente_redaccion'` del predicado de
  // `pendientesDeRedaccion()`. Comprobado: la corrida 2 no encuentra la entrada, deja
  // el corpus en 0 y el assert de `insertadas` falla.
});

// =====================================================================================
test('2. una fuente que falla y luego responde deja continuar la entrada', async (t) => {
  await t.test('2a. falla el feed en la deteccion y se recupera en la corrida siguiente', async () => {
    nuevoEntorno('p2a');

    const noticia = item({
      titulo: 'Un laboratorio publica su evaluacion de tutores automaticos',
      url: 'https://medio-uno.mx/tutores-automaticos',
    });
    const redacciones = new Map([[noticia.url_canonica, borrador({
      id: 'tutores-automaticos',
      fuentes: [
        referencia({ titulo: 'Informe', medio: 'Laboratorio', url: 'https://lab.example/informe' }),
        referencia({ titulo: 'Cobertura', medio: 'Medio Uno', url: noticia.url_canonica, tipo: 'secundaria' }),
      ],
    })]]);

    const r1 = await correr(etapasFalsas({
      deteccion: { fallo: { codigo: 403, mensaje: 'HTTP 403 Forbidden', fuente_id: 'medio-uno' } },
      redacciones,
    }));
    assert.equal(r1.detectados, 0);
    assert.equal(r1.parcial, true, 'una fuente caida es exito PARCIAL, no exito');
    assert.equal(r1.despues, 0, 'una fuente caida no fabrica una noticia');

    const r2 = await correr(etapasFalsas({ deteccion: { items: [noticia] }, redacciones }));
    assert.equal(r2.parcial, false);
    assert.deepEqual(r2.insertadas, ['tutores-automaticos']);
    assert.equal(porUrlCanonica(noticia.url_canonica).estado, 'terminada');
  });

  await t.test('2b. falla la verificacion, la entrada queda reintentable y el reintento la cierra', async () => {
    nuevoEntorno('p2b');

    const noticia = item({
      titulo: 'Se publica el padron de escuelas con conectividad medida',
      url: 'https://medio-uno.mx/padron-conectividad',
    });
    const redacciones = new Map([[noticia.url_canonica, borrador({
      id: 'padron-conectividad',
      fuentes: [
        referencia({ titulo: 'Padron', medio: 'Oficial', url: 'https://oficial.example/padron' }),
        referencia({ titulo: 'Cobertura', medio: 'Medio Uno', url: noticia.url_canonica, tipo: 'secundaria' }),
      ],
    })]]);

    // Contrato nuevo: tres valores, no un booleano. Un TIMEOUT por si solo ya
    // no tumba una pieza --- deja una fuente `no_consultada` y la lleva a
    // `parcial` ---, asi que para que esta prueba siga probando lo que dice
    // probar hace falta un fallo de verdad: una fuente que NO EXISTE.
    const falla = new Map([['padron-conectividad', {
      veredicto: 'no_verificada',
      fallos: ['fuente no existe: https://oficial.example/padron [404] Not Found'],
      avisos: [],
      pendientes: [],
      detalle: 'VEREDICTO no_verificada — una fuente citada no existe',
    }]]);

    const r1 = await correr(etapasFalsas({ deteccion: { items: [noticia] }, redacciones, verificaciones: falla }));
    assert.equal(r1.parcial, true);
    assert.equal(r1.despues, 0);

    const tras1 = porUrlCanonica(noticia.url_canonica);
    assert.equal(tras1.estado, 'fallida_reintentable', 'un fallo de verificacion no descarta la entrada');
    assert.equal(tras1.etapa_fallida, 'verificar');
    assert.equal(tras1.intentos, 1);

    // El fallo se registro en SU etapa, con entrada, codigo y consecuencia.
    const fallo = fallosRegistrados().at(-1);
    assert.equal(fallo.etapa, 'verificar', 'un fallo de verificacion no es un fallo de deteccion');
    assert.equal(fallo.entrada_id, tras1.id);
    assert.equal(fallo.codigo, 'VERIFICACION');
    assert.match(fallo.consecuencia, /reintentable|reintenta/);

    // --- La fuente se recupera. ---
    const r2 = await correr(etapasFalsas({ deteccion: { items: [noticia] }, redacciones }));
    assert.equal(r2.repetidos, 0, 'una entrada reintentable no es una entrada descartada');
    assert.deepEqual(r2.insertadas, ['padron-conectividad']);
    assert.equal(porUrlCanonica(noticia.url_canonica).estado, 'terminada');
  });

  // COMO SE PONE ROJA: en `estado.mjs`, cambiar el evento `fallo` para que lleve a
  // `descartada` en lugar de `fallida_reintentable`. Comprobado: 2b falla en el assert
  // de `fallida_reintentable` y, al quitarlo, la corrida 2 descarta la entrada y deja
  // `insertadas` vacio.
});

// =====================================================================================
test('3. reiniciar el proceso conserva el trabajo pendiente', async (t) => {
  await t.test('3a. un proceso muerto a media corrida deja los pendientes en la bitacora', () => {
    const entorno = nuevoEntorno('p3a');

    const guion = join(entorno.raiz, 'muere-a-medias.mjs');
    const moduloEstado = pathToFileURL(join(DIR_EDITORIAL, 'estado.mjs')).href;
    writeFileSync(guion, `
import { marcarExpedienteListo, registrarDeteccion } from ${JSON.stringify(moduloEstado)};
const base = {
  fuente_id: 'medio-uno', medio: 'Medio Uno', licencia: 'CC BY 4.0', uso: 'reproducible',
  fecha_publicacion: '2026-09-10', fecha_lectura: '2026-09-14T10:00Z',
};
for (const n of [1, 2, 3]) {
  const url = 'https://medio-uno.mx/hecho-' + n;
  const r = registrarDeteccion({ ...base, titulo: 'Hecho ' + n, url, url_canonica: url,
    dominio: 'medio-uno.mx', huella: 'sha256:' + String(n).repeat(64) });
  if (n === 1) marcarExpedienteListo(r.id);
}
// Muere justo aqui, con tres hechos en la bitacora y ninguno terminado.
process.kill(process.pid, 'SIGKILL');
`, 'utf8');

    const hijo = spawnSync(process.execPath, [guion], {
      env: { ...process.env, EDITORIAL_ESTADO_DIR: entorno.estado },
      encoding: 'utf8',
    });
    assert.notEqual(hijo.status, 0, 'el hijo tiene que morir, no terminar bien');

    const pendientes = pendientesDeRedaccion();
    assert.equal(pendientes.length, 3, 'los tres hechos siguen pendientes tras la muerte del proceso');
    assert.equal(pendientes.filter((e) => e.estado === 'pendiente_redaccion').length, 1);
    assert.equal(pendientes.filter((e) => e.estado === 'detectada').length, 2);
    for (const e of pendientes) {
      assert.notEqual(e.estado, 'terminada', 'nada puede darse por hecho: nadie lo termino');
    }
  });

  await t.test('3b. una ultima linea truncada no pierde la entrada, y se registra', () => {
    nuevoEntorno('p3b');

    const noticia = item({ titulo: 'Hecho a medio escribir', url: 'https://medio-uno.mx/a-medias' });
    const { id } = registrarDeteccion(noticia);
    marcarExpedienteListo(id);

    // Un proceso muerto a mitad de un `appendFileSync` deja exactamente esto.
    appendFileSync(rutaBitacora(), '{"ts":"2026-09-14T10:0', 'utf8');

    const { entradas, colaTruncada } = plegar();
    assert.equal(colaTruncada, true);
    assert.equal(entradas.get(id).estado, 'pendiente_redaccion', 'la entrada conserva su ultimo estado valido');
    assert.equal(pendientesDeRedaccion().length, 1);

    const fallo = fallosRegistrados().at(-1);
    assert.equal(fallo.etapa, 'estado');
    assert.equal(fallo.codigo, 'BITACORA_TRUNCADA');
  });

  // COMO SE PONE ROJA: en `estado.mjs`, hacer que `registrarDeteccion()` emita ademas
  // `verificada` (es decir, dar por terminado lo que solo se detecto — el defecto del
  // canal anterior). Comprobado: 3a falla porque `pendientesDeRedaccion()` devuelve 0.
  // Para 3b, quitar la tolerancia a la cola truncada en `leerLog()`: `plegar()` lanza.
});

// =====================================================================================
test('4. reprocesar una pieza terminada no la duplica', async () => {
  nuevoEntorno('p4');

  const noticia = item({
    titulo: 'Publican la evaluacion de una plataforma de lectura',
    url: 'https://medio-uno.mx/evaluacion-lectura',
  });
  const redacciones = new Map([[noticia.url_canonica, borrador({
    id: 'evaluacion-lectura',
    fuentes: [
      referencia({ titulo: 'Estudio', medio: 'Universidad', url: 'https://uni.example/estudio' }),
      referencia({ titulo: 'Cobertura', medio: 'Medio Uno', url: noticia.url_canonica, tipo: 'secundaria' }),
    ],
  })]]);

  const r1 = await correr(etapasFalsas({ deteccion: { items: [noticia] }, redacciones }));
  assert.deepEqual(r1.insertadas, ['evaluacion-lectura']);
  const idEntrada = porUrlCanonica(noticia.url_canonica).id;
  assert.equal(estadoDe(idEntrada).estado, 'terminada');

  // Misma entrada, mismo borrador, tres corridas mas. Incluida una con la URL sucia de
  // parametros de campaña, que es como reaparece en la vida real.
  const sucia = item({
    titulo: noticia.titulo,
    url: 'https://www.medio-uno.mx/evaluacion-lectura/?utm_campaign=boletin#nota',
  });
  for (const entradas of [[noticia], [sucia], [noticia, sucia]]) {
    const r = await correr(etapasFalsas({ deteccion: { items: entradas }, redacciones }));
    assert.equal(r.nuevos, 0);
    assert.equal(r.despues, 1, 'el corpus no crece al reprocesar');
    assert.equal(r.parcial, false, 'reprocesar algo terminado no es un fallo');
  }

  assert.equal(corpus().length, 1);
  assert.equal(corpus().filter((p) => p.id === 'evaluacion-lectura').length, 1);
  assert.equal(estadoDe(idEntrada).estado, 'terminada');
  assert.equal(
    plegar().entradas.size, 1,
    'la URL sucia y la limpia son el mismo hecho: una sola entrada en la bitacora',
  );

  // COMO SE PONE ROJA: en `estado.mjs`, quitar de `aplicar()` la rama que ignora un
  // evento `detectada` sobre una entrada existente, y en `registrarDeteccion()` emitir
  // siempre. Comprobado: la entrada vuelve a `detectada`, se vuelve a redactar y el
  // assert `despues === 1` falla en la segunda corrida.
});

// =====================================================================================
test('5. dos noticias distintas que citan un mismo documento no se descartan por compartir esa referencia', async (t) => {
  // El documento compartido. Es una REFERENCIA de las dos piezas, no la identidad de
  // ninguna: la identidad de una pieza es el HECHO que cuenta.
  const documento = referencia({
    titulo: 'Empowering Learners for the Age of AI',
    medio: 'AILit Framework (OCDE y Comision Europea)',
    url: 'https://ailiteracyframework.org/blog/empowering-learners-for-the-age-of-ai/',
  });

  const noticiaUno = item({
    fuente_id: 'medio-uno',
    medio: 'Medio Uno',
    titulo: 'La OCDE cierra un marco comun de alfabetizacion en IA',
    url: 'https://medio-uno.mx/ocde-marco-alfabetizacion-ia',
  });
  const noticiaDos = item({
    fuente_id: 'medio-dos',
    medio: 'Medio Dos',
    titulo: 'Escuelas mexicanas probaran el marco europeo de IA en 2027',
    url: 'https://medio-dos.mx/escuelas-mexicanas-marco-ia-2027',
  });

  await t.test('5a. la segunda noticia llega al corpus aunque la primera ya cite el documento', async () => {
    nuevoEntorno('p5a');

    const redacciones = new Map([
      [noticiaUno.url_canonica, borrador({
        id: 'ocde-marco-alfabetizacion-ia',
        fuentes: [documento, referencia({ titulo: noticiaUno.titulo, medio: 'Medio Uno', url: noticiaUno.url_canonica, tipo: 'secundaria' })],
      })],
      [noticiaDos.url_canonica, borrador({
        id: 'escuelas-mexicanas-marco-ia-2027',
        // MISMO documento como fuente primaria. Es el punto entero de la prueba.
        fuentes: [documento, referencia({ titulo: noticiaDos.titulo, medio: 'Medio Dos', url: noticiaDos.url_canonica, tipo: 'secundaria' })],
      })],
    ]);

    const r1 = await correr(etapasFalsas({ deteccion: { items: [noticiaUno] }, redacciones }));
    assert.deepEqual(r1.insertadas, ['ocde-marco-alfabetizacion-ia']);

    const r2 = await correr(etapasFalsas({ deteccion: { items: [noticiaDos] }, redacciones }));
    assert.equal(r2.repetidos, 0, 'compartir una fuente no convierte dos hechos en uno');
    assert.deepEqual(r2.insertadas, ['escuelas-mexicanas-marco-ia-2027']);

    assert.equal(corpus().length, 2);
    assert.equal(porUrlCanonica(noticiaUno.url_canonica).estado, 'terminada');
    assert.equal(porUrlCanonica(noticiaDos.url_canonica).estado, 'terminada');
  });

  await t.test('5b. las referencias de una pieza del corpus NO entran al indice de identidad', () => {
    nuevoEntorno('p5b');

    // Pieza ya publicada que cita el documento compartido Y la cobertura de otro medio.
    const piezaPublicada = {
      id: 'ocde-marco-alfabetizacion-ia',
      huella: noticiaUno.huella,
      fuente_primaria: documento,
      fuentes: [
        documento,
        referencia({ titulo: noticiaDos.titulo, medio: 'Medio Dos', url: noticiaDos.url_canonica, tipo: 'secundaria' }),
        referencia({ titulo: noticiaUno.titulo, medio: 'Medio Uno', url: noticiaUno.url_canonica, tipo: 'secundaria' }),
      ],
    };

    // Lo que llega hoy del feed: la otra noticia, y el documento mismo desde su feed.
    const documentoComoHecho = item({
      fuente_id: 'ailit',
      medio: 'AILit Framework',
      titulo: documento.titulo,
      url: documento.url,
    });

    const { nuevos, repetidos } = deduplicar([noticiaDos, documentoComoHecho], {
      piezas: [piezaPublicada],
    });

    assert.equal(
      nuevos.length, 2,
      'ni la noticia citada ni el documento citado pueden borrarse por aparecer en `fuentes[]` de otra pieza',
    );
    assert.deepEqual(nuevos.map((n) => n.url_canonica).sort(), [
      documentoComoHecho.url_canonica, noticiaDos.url_canonica,
    ].sort());
    assert.equal(repetidos.length, 0);

    // Lo que SI debe descartarse: el hecho cuya propia huella ya tiene pieza.
    const otra = deduplicar([noticiaUno], { piezas: [piezaPublicada] });
    assert.equal(otra.nuevos.length, 0);
    assert.equal(otra.repetidos[0].motivo, 'nivel_2_huella_ya_tiene_pieza_en_el_corpus');
  });

  // COMO SE PONE ROJA: en `deduplicar.mjs`, volver a meter las referencias al indice,
  // que es lo que hacia la version anterior:
  //   for (const f of [p.fuente_primaria, ...(p.fuentes ?? [])]) urlsVistas.add(f.url)
  // Comprobado: 5b falla con `nuevos.length` 0 en vez de 2 — las dos entradas se
  // descartan en silencio por compartir una referencia con una pieza publicada.
});
