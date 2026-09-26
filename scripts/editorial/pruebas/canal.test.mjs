/**
 * Las cinco propiedades que Rodrigo puso como entregable, mas la sexta que salio de un
 * defecto medido.
 *
 * Cada una tiene un bloque «COMO SE PONE ROJA» que dice exactamente que hay que romper en
 * la implementacion para verla fallar. Se comprobaron una por una: una prueba verde que no
 * puede ponerse roja no prueba nada.
 *
 * ================== SE EJERCITAN LOS DOS COMANDOS, EN SU ORDEN ==================
 *
 * Desde que el canal se partio (§8.1), una pasada completa es `generar()` y despues
 * `verificarPendientes()`. `pasada()` hace eso y devuelve los dos resultados, para que
 * cada assert pueda exigirle lo suyo al comando que corresponde. Que las dos etapas sean
 * dos invocaciones y sigan produciendo lo mismo es la prueba de que se repartieron sin
 * romperse; que NO hagan la del otro esta en `tres-comandos.test.mjs`.
 *
 * Sin red: las etapas que la usarian se inyectan como dobles (`ayuda.mjs`).
 * Sin tocar el estado real: cada prueba monta sus dos variables en `tmpdir`.
 */

import assert from 'node:assert/strict';
import { appendFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import {
  borrador, borradorEnDisco, borradoresEnDisco, etapasFalsas, item, nuevoEntorno, referencia,
  DIR_EDITORIAL,
} from './ayuda.mjs';
import { deduplicar } from '../deduplicar.mjs';
import { generar } from '../generar.mjs';
import { verificarPendientes } from '../verificar-canal.mjs';
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

/** Una pasada completa del canal: los dos comandos, con las mismas etapas dobles. */
async function pasada(etapas, banderas = {}) {
  const generado = await generar({ silencioso: true, ...banderas }, { etapas });
  const verificado = await verificarPendientes({ silencioso: true, ...banderas }, { etapas });
  return { generado, verificado };
}

// =====================================================================================
test('1. una entrada sin redaccion sigue disponible y se completa en una corrida posterior', async () => {
  nuevoEntorno('p1');

  const noticia = item({
    titulo: 'La SEP publica su marco de alfabetizacion en IA',
    url: 'https://medio-uno.mx/sep-marco-ia?utm_source=rss',
  });

  // --- Corrida 1: se detecta, NO hay redactor. ---
  const c1 = await pasada(etapasFalsas({ deteccion: { items: [noticia] } }));
  assert.equal(c1.generado.nuevos, 1);
  assert.deepEqual(borradoresEnDisco(), [], 'no debe escribirse ningun borrador sin redaccion');
  assert.equal(c1.generado.pendientes, 1);
  assert.equal(c1.generado.parcial, false, 'un expediente esperando redactor no es un fallo');

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

  const c2 = await pasada(etapasFalsas({ deteccion: { items: [noticia] }, redacciones }));
  assert.equal(c2.generado.repetidos, 0, 'no puede descartarse por «ya vista»: nunca llego a pieza');
  assert.equal(c2.generado.yaPendientes, 1, 'la bitacora la reconoce como trabajo sin terminar');
  assert.deepEqual(c2.generado.borradores.map((b) => b.pieza_id), ['sep-marco-ia']);
  assert.deepEqual(c2.verificado.selladas.map((s) => s.pieza_id), ['sep-marco-ia']);
  assert.equal(porUrlCanonica(noticia.url_canonica).estado, 'terminada');
  assert.deepEqual(borradoresEnDisco(), ['sep-marco-ia']);

  // COMO SE PONE ROJA: en `estado.mjs`, quitar `'pendiente_redaccion'` del predicado de
  // `pendientesDeRedaccion()`. Comprobado: la corrida 2 no encuentra la entrada, no
  // escribe borrador y el assert de `borradores` falla.
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

    const c1 = await pasada(etapasFalsas({
      deteccion: { fallo: { codigo: 403, mensaje: 'HTTP 403 Forbidden', fuente_id: 'medio-uno' } },
      redacciones,
    }));
    assert.equal(c1.generado.detectados, 0);
    assert.equal(c1.generado.parcial, true, 'una fuente caida es exito PARCIAL, no exito');
    assert.deepEqual(borradoresEnDisco(), [], 'una fuente caida no fabrica una noticia');

    const c2 = await pasada(etapasFalsas({ deteccion: { items: [noticia] }, redacciones }));
    assert.equal(c2.generado.parcial, false);
    assert.deepEqual(c2.verificado.selladas.map((s) => s.pieza_id), ['tutores-automaticos']);
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

    const c1 = await pasada(etapasFalsas({ deteccion: { items: [noticia] }, redacciones, verificaciones: falla }));
    assert.equal(c1.generado.parcial, false, 'generar no falla: el borrador se escribio bien');
    assert.equal(c1.verificado.parcial, true, 'el fallo es de verificacion, y sale por ese comando');
    assert.equal(
      borradorEnDisco('padron-conectividad').procedencia.verificado.detalle, 'sin verificar',
      'una pieza que no paso §5.4 no puede quedar sellada',
    );

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

    // --- La fuente se recupera. El reintento lo hace `verificar` SOLO: la entrada ya
    //     tiene borrador, asi que `generar` no la vuelve a mirar. ---
    const c2 = await pasada(etapasFalsas({ deteccion: { items: [noticia] }, redacciones }));
    assert.equal(c2.generado.repetidos, 0, 'una entrada reintentable no es una entrada descartada');
    assert.equal(c2.generado.borradores.length, 0, 'generar no vuelve a redactar lo que ya tiene borrador');
    assert.deepEqual(c2.verificado.selladas.map((s) => s.pieza_id), ['padron-conectividad']);
    assert.equal(porUrlCanonica(noticia.url_canonica).estado, 'terminada');
  });

  // COMO SE PONE ROJA: en `estado.mjs`, cambiar el evento `fallo` para que lleve a
  // `descartada` en lugar de `fallida_reintentable`. Comprobado: 2b falla en el assert
  // de `fallida_reintentable` y, al quitarlo, la corrida 2 descarta la entrada y deja
  // `selladas` vacio.
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

  const c1 = await pasada(etapasFalsas({ deteccion: { items: [noticia] }, redacciones }));
  assert.deepEqual(c1.verificado.selladas.map((s) => s.pieza_id), ['evaluacion-lectura']);
  const idEntrada = porUrlCanonica(noticia.url_canonica).id;
  assert.equal(estadoDe(idEntrada).estado, 'terminada');

  // Misma entrada, mismo borrador, tres corridas mas. Incluida una con la URL sucia de
  // parametros de campaña, que es como reaparece en la vida real.
  const sucia = item({
    titulo: noticia.titulo,
    url: 'https://www.medio-uno.mx/evaluacion-lectura/?utm_campaign=boletin#nota',
  });
  for (const entradas of [[noticia], [sucia], [noticia, sucia]]) {
    const c = await pasada(etapasFalsas({ deteccion: { items: entradas }, redacciones }));
    assert.equal(c.generado.nuevos, 0);
    assert.deepEqual(borradoresEnDisco(), ['evaluacion-lectura'], 'no aparecen borradores al reprocesar');
    assert.equal(c.generado.parcial, false, 'reprocesar algo terminado no es un fallo');
    assert.equal(c.verificado.selladas.length, 0, 'nada que volver a sellar');
  }

  assert.equal(estadoDe(idEntrada).estado, 'terminada');
  assert.equal(
    plegar().entradas.size, 1,
    'la URL sucia y la limpia son el mismo hecho: una sola entrada en la bitacora',
  );

  // COMO SE PONE ROJA: en `estado.mjs`, quitar de `aplicar()` la rama que ignora un
  // evento `detectada` sobre una entrada existente, y en `registrarDeteccion()` emitir
  // siempre. Comprobado: la entrada vuelve a `detectada`, se vuelve a redactar y el
  // assert `nuevos === 0` falla en la segunda corrida.
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

    const c1 = await pasada(etapasFalsas({ deteccion: { items: [noticiaUno] }, redacciones }));
    assert.deepEqual(c1.verificado.selladas.map((s) => s.pieza_id), ['ocde-marco-alfabetizacion-ia']);

    const c2 = await pasada(etapasFalsas({ deteccion: { items: [noticiaDos] }, redacciones }));
    assert.equal(c2.generado.repetidos, 0, 'compartir una fuente no convierte dos hechos en uno');
    assert.deepEqual(c2.verificado.selladas.map((s) => s.pieza_id), ['escuelas-mexicanas-marco-ia-2027']);

    assert.equal(borradoresEnDisco().length, 2);
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

// =====================================================================================
test('6. una pieza cuyo sello no quedo en disco NO se marca terminada, y se recupera', async (t) => {
  // El defecto original: `terminada` es TERMINAL y afirma un hecho sobre el disco. Cuando
  // ese hecho era «entro al corpus», una corrida sin corpus configurado lo declaraba igual
  // y cerraba para siempre trabajo que nadie guardo. Partido el canal, el hecho es otro
  // —«el borrador quedo SELLADO»— pero la regla es la misma y se comprueba igual: releyendo
  // el disco.
  nuevoEntorno('p6');

  const noticia = item({
    titulo: 'Un consejo publica su guia de evaluacion de tutores',
    url: 'https://medio-uno.mx/guia-evaluacion-tutores',
  });
  const redacciones = new Map([[noticia.url_canonica, borrador({
    id: 'guia-evaluacion-tutores',
    titulo: 'Un consejo publica su guia de evaluacion de tutores',
    fuentes: [
      referencia({ titulo: 'Guia', medio: 'Consejo', url: 'https://consejo.example/guia' }),
      referencia({
        titulo: 'Un consejo publica su guia de evaluacion de tutores',
        medio: 'Medio Uno',
        url: noticia.url_canonica,
        tipo: 'secundaria',
      }),
    ],
  })]]);

  await t.test('6a. si el sello no queda escrito, la entrada se queda PENDIENTE', async () => {
    const etapas = etapasFalsas({ deteccion: { items: [noticia] }, redacciones });
    // Un sellado que no persiste: devuelve la pieza SIN tocar `procedencia.verificado`.
    // Es el equivalente exacto de una escritura que no llego al disco, y lo que hay que
    // comprobar es que el comando lo detecta releyendo en vez de fiarse.
    const sinSellar = { ...etapas, sellarVerificacion: (pieza) => pieza };

    await generar({ silencioso: true }, { etapas });
    const r = await verificarPendientes({ silencioso: true }, { etapas: sinSellar });

    assert.equal(r.sinSellar.length, 1, 'el comando tiene que decir que verifico una pieza y no sello');
    assert.equal(r.sinSellar[0].pieza_id, 'guia-evaluacion-tutores');
    assert.equal(r.selladas.length, 0);
    assert.equal(
      borradorEnDisco('guia-evaluacion-tutores').procedencia.verificado.detalle, 'sin verificar',
      'el sello no llego al disco, que es la premisa del caso',
    );

    const tras1 = porUrlCanonica(noticia.url_canonica);
    assert.notEqual(
      tras1.estado, 'terminada',
      '`terminada` es TERMINAL y afirma que el borrador quedo sellado: sin sello en disco seria declarar hecho lo que no se hizo',
    );
    assert.equal(tras1.estado, 'pendiente_verificacion');
    assert.equal(tras1.pieza_id, null, 'no hay pieza_id que registrar: ningun sello quedo guardado');
  });

  await t.test('6b. con el sellado que si escribe, la corrida siguiente la recupera y la cierra', async () => {
    const etapas = etapasFalsas({ deteccion: { items: [noticia] }, redacciones });
    const r = await verificarPendientes({ silencioso: true }, { etapas });

    assert.equal(r.sinSellar.length, 0);
    assert.equal(r.selladas.length, 1, 'la entrada recuperada tiene que quedar sellada esta vez');
    assert.deepEqual(borradoresEnDisco(), ['guia-evaluacion-tutores'], 'y sin duplicar: un borrador, no dos');
    assert.notEqual(
      borradorEnDisco('guia-evaluacion-tutores').procedencia.verificado.detalle, 'sin verificar',
      'ahora el sello si esta en el archivo',
    );

    const tras2 = porUrlCanonica(noticia.url_canonica);
    assert.equal(tras2.estado, 'terminada', 'ahora si existe el sello en disco, y el estado lo puede afirmar');
    assert.equal(tras2.pieza_id, 'guia-evaluacion-tutores');
  });

  // COMO SE PONE ROJA: en `verificar-canal.mjs`, quitar la relectura y llamar a
  // `marcarVerificada()` siempre:
  //   escribirJson(ruta, sellada); marcarVerificada(entrada.id, {...});
  // Comprobado: 6a falla en la primera asercion —`r.sinSellar` queda vacio— y, con esa
  // linea quitada tambien, en `tras1.estado`, que pasa a ser `terminada` sobre un borrador
  // sin sellar. 6b queda entonces sin nada que recuperar: la entrada ya esta en un estado
  // TERMINAL y la corrida siguiente no la vuelve a mirar.
});
