/**
 * El canal son TRES invocaciones, no dos ni una (`docs/plataforma/02-editorial.md` §8.1).
 *
 * Lo que esta prueba mide, y en este orden:
 *
 *   1. `generar` deja la entrada en `pendiente_verificacion` y NO la sella; `verificar`
 *      despues la lleva a `terminada`. Se comprueba por su TRANSICION en la bitacora y por
 *      el archivo en disco, nunca por lo que el comando imprime.
 *   2. El corpus intermedio se retiro: ni su variable de entorno ni la funcion que la
 *      resolvia sobreviven en ningun sitio, y el rastreador trae su propio caso negativo.
 *      Los dos nombres se componen en `RETIRADOS` para que este archivo no sea su propio
 *      hallazgo.
 *   3. Son tres entradas de verdad y no tres banderas: el grafo de importaciones de cada
 *      comando no alcanza las etapas del otro.
 *   4. `EDITORIAL_MAX_LLAMADAS` ATA: superar el tope aborta la corrida, y no superarlo no.
 *
 * **La prueba negativa de (1) no esta aqui**, y esa separacion es deliberada: vive en
 * `tres-comandos-falsable.test.mjs`, que corre LA MISMA comprobacion —importada de
 * `separacion-de-etapas.mjs`— contra un `generar` mutado que ademas sella, y exige que se
 * ponga roja. Un gate que no puede fallar no prueba que se partio nada.
 *
 * Sin red y sin inferencia: todas las etapas se inyectan como dobles (`ayuda.mjs`).
 */

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import test from 'node:test';

import { etapasFalsas, borradorEnDisco, item, nuevoEntorno, DIR_EDITORIAL } from './ayuda.mjs';
import { exigirQueGenerarNoSelle } from './separacion-de-etapas.mjs';
import { generar, contadorDeLlamadas, topeDeLlamadas, TopeDeLlamadas } from '../generar.mjs';
import { verificarPendientes } from '../verificar-canal.mjs';
import { porUrlCanonica } from '../estado.mjs';

const RAIZ_REPO = join(DIR_EDITORIAL, '..', '..');

// =====================================================================================
//  1 — la separacion, medida por la transicion
// =====================================================================================

test('1. `generar` deja la entrada en pendiente_verificacion; `verificar` la lleva a terminada', async () => {
  const { caso: c, etapas } = await exigirQueGenerarNoSelle(generar, 'real');

  const r = await verificarPendientes({ silencioso: true }, { etapas });

  const tras = porUrlCanonica(c.noticia.url_canonica);
  assert.equal(tras.estado, 'terminada', '`verificar` es quien cierra la entrada');
  assert.equal(tras.pieza_id, c.id);
  assert.deepEqual(r.selladas.map((s) => s.pieza_id), [c.id]);

  // El sello quedo sobre EL MISMO borrador privado, no sobre una copia ni sobre un corpus
  // aparte (§8.1, fila «Verificar»: «sobre ese mismo borrador privado»).
  const enDisco = borradorEnDisco(c.id);
  assert.equal(enDisco.procedencia.verificado.veredicto, 'verificada');
  assert.equal(enDisco.estado, 'borrador', 'verificar no publica: el estado del registro no cambia (§8.1, regla 2)');
});

// =====================================================================================
//  2 — el corpus intermedio y su variable no sobreviven en ningun sitio
// =====================================================================================

/**
 * Los nombres retirados: la variable del corpus intermedio y la funcion que la resolvia.
 *
 * **Se componen en tiempo de ejecucion a proposito.** Escritos literales, este archivo
 * seria su propio hallazgo y el rastreador saldria rojo por existir —el fallo mas tonto de
 * un rastreador—. `RUTA_FIXTURE_PROTOTIPO` NO esta aqui: es otra cosa (el fixture trackeado
 * del prototipo, §8.3) y el caso negativo de abajo comprueba que no se confunden.
 */
const RETIRADOS = [['EDITORIAL', 'PIEZAS'].join('_'), ['ruta', 'Piezas'].join('')];

const EXTENSIONES = ['.mjs', '.md', '.yml', '.yaml', '.json', '.ts', '.tsx'];

/** Recorre un arbol y devuelve las rutas de archivo con extension de texto. */
function archivosDe(dir, salida = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === '.next') continue;
    const ruta = join(dir, e.name);
    if (e.isDirectory()) archivosDe(ruta, salida);
    else if (EXTENSIONES.some((x) => e.name.endsWith(x))) salida.push(ruta);
  }
  return salida;
}

/** @returns {string[]} «archivo:linea: texto» por cada aparicion de un nombre retirado */
function rastrear(rutas) {
  const hallazgos = [];
  for (const ruta of rutas) {
    const lineas = readFileSync(ruta, 'utf8').split('\n');
    lineas.forEach((linea, n) => {
      for (const nombre of RETIRADOS) {
        if (new RegExp(`\\b${nombre}\\b`).test(linea)) {
          hallazgos.push(`${relative(RAIZ_REPO, ruta)}:${n + 1}: ${linea.trim()}`);
        }
      }
    });
  }
  return hallazgos;
}

test('2. los nombres del corpus intermedio no sobreviven en scripts/, package.json ni la documentacion', async (t) => {
  await t.test('el arbol esta limpio', () => {
    const rutas = [
      ...archivosDe(join(RAIZ_REPO, 'scripts')),
      join(RAIZ_REPO, 'package.json'),
      // `docs/plataforma/registros/` queda fuera a proposito: son bitacoras fechadas de
      // corridas que ocurrieron de verdad, y reescribir lo que se corrio ese dia seria
      // falsificar el registro. La prohibicion es sobre el mecanismo VIGENTE.
      ...archivosDe(join(RAIZ_REPO, 'docs')).filter((r) => !r.includes(`${join('docs', 'plataforma', 'registros')}`)),
    ];
    const hallazgos = rastrear(rutas);
    assert.deepEqual(
      hallazgos, [],
      'el corpus intermedio se retiro con su variable (§8.6, fila 2):\n' + hallazgos.join('\n'),
    );
  });

  await t.test('CASO NEGATIVO: reintroducir el nombre pone roja la comprobacion', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'editorial-retirados-'));
    const sucio = join(raiz, 'reincidente.mjs');
    writeFileSync(sucio, `export const ruta = process.env.${RETIRADOS[0]};\n`, 'utf8');
    const hallazgos = rastrear([sucio]);
    assert.equal(hallazgos.length, 1, 'el rastreador tiene que ver el nombre reintroducido');
    assert.ok(hallazgos[0].includes(RETIRADOS[0]));

    // Y la otra mitad: un archivo con `RUTA_FIXTURE_PROTOTIPO` NO es un hallazgo. Sin este
    // control, el rastreador podria estar atrapando cualquier cosa parecida.
    const limpio = join(raiz, 'inocente.mjs');
    writeFileSync(limpio, 'import { RUTA_FIXTURE_PROTOTIPO } from "./comun.mjs";\n', 'utf8');
    assert.deepEqual(rastrear([limpio]), []);
  });
});

// =====================================================================================
//  3 — tres entradas de verdad: el grafo de importaciones lo demuestra
// =====================================================================================

/** Los modulos locales que importa un archivo, estaticos y dinamicos. */
function importaDe(ruta) {
  const fuente = readFileSync(ruta, 'utf8');
  const nombres = new Set();
  for (const m of fuente.matchAll(/from\s+'(\.\/[^']+)'/g)) nombres.add(m[1]);
  for (const m of fuente.matchAll(/import\('(\.\/[^']+)'\)/g)) nombres.add(m[1]);
  return [...nombres];
}

/** Cierre transitivo de las importaciones locales de un modulo del canal. */
function cierreDeImportaciones(entrada, vistos = new Set()) {
  if (vistos.has(entrada)) return vistos;
  vistos.add(entrada);
  const ruta = join(DIR_EDITORIAL, entrada);
  if (!existsSync(ruta)) return vistos;
  for (const dep of importaDe(ruta)) cierreDeImportaciones(dep.replace(/^\.\//, ''), vistos);
  return vistos;
}

test('3. los comandos son entradas separadas, no banderas del mismo', async (t) => {
  await t.test('`generar` no alcanza el motor de verificacion', () => {
    const cierre = cierreDeImportaciones('generar.mjs');
    assert.ok(cierre.has('redactar.mjs'), 'control: `generar` si tiene que alcanzar la redaccion');
    assert.equal(
      cierre.has('verificar.mjs'), false,
      '`generar` alcanza `verificar.mjs`: si el codigo de la otra etapa esta a mano, la '
      + 'separacion es una bandera y no una particion (§8.1)',
    );
  });

  await t.test('`verificar` no alcanza la deteccion, la deduplicacion ni la redaccion', () => {
    const cierre = cierreDeImportaciones('verificar-canal.mjs');
    assert.ok(cierre.has('verificar.mjs'), 'control: `verificar` si tiene que alcanzar su motor');
    for (const prohibido of ['detectar.mjs', 'deduplicar.mjs', 'redactar.mjs', 'generar.mjs']) {
      assert.equal(
        cierre.has(prohibido), false,
        `\`verificar\` alcanza ${prohibido}: verificar NO redacta (§8.1, regla 2)`,
      );
    }
  });

  await t.test('ninguno de los dos nombra el corpus publicado', () => {
    for (const archivo of ['generar.mjs', 'verificar-canal.mjs']) {
      const fuente = readFileSync(join(DIR_EDITORIAL, archivo), 'utf8');
      assert.ok(
        !/content['"/\\][^\n]*noticias/.test(fuente),
        `${archivo} nombra el corpus publicado: la unica ruta a content/noticias/ es autorizar (§8.1)`,
      );
    }
  });

  await t.test('no hay una tercera variable de entorno del canal', () => {
    const permitidas = new Set([
      'EDITORIAL_ESTADO_DIR', 'EDITORIAL_REDACCIONES_DIR', 'EDITORIAL_MAX_LLAMADAS',
    ]);
    for (const archivo of ['generar.mjs', 'verificar-canal.mjs']) {
      const fuente = readFileSync(join(DIR_EDITORIAL, archivo), 'utf8');
      for (const m of fuente.matchAll(/\bEDITORIAL_[A-Z_]+\b/g)) {
        assert.ok(
          permitidas.has(m[0]),
          `${archivo} nombra ${m[0]}: §8.3 dice «Son dos, y solo dos» mas el tope de consumo`,
        );
      }
    }
  });

  await t.test('los tres comandos existen como archivos invocables', () => {
    for (const cli of ['generar.mjs', 'verificar-canal.mjs', 'autorizar.mjs']) {
      const ruta = join(DIR_EDITORIAL, cli);
      assert.ok(statSync(ruta).isFile(), `falta el ejecutable ${cli}`);
      assert.match(
        readFileSync(ruta, 'utf8'),
        /esCli\(import\.meta\.url\)/,
        `${cli} no tiene rama de CLI: entonces no es una invocacion`,
      );
    }
  });
});

// =====================================================================================
//  4 — EDITORIAL_MAX_LLAMADAS ata: superar el tope aborta, y no superarlo no
// =====================================================================================

/** Tres entradas que necesitan al redactor: no hay redaccion preparada para ninguna. */
function tresPendientes() {
  return [1, 2, 3].map((n) => item({
    titulo: `Hecho numero ${n} que espera redactor`,
    url: `https://medio-uno.mx/hecho-${n}`,
  }));
}

/**
 * Corre `generar` con una via de inferencia falsa que cuenta sus llamadas y siempre
 * entrega un borrador. Sin red y sin modelo.
 *
 * El tope entra por `inyeccion.entorno`, no mutando `process.env`: el entorno del proceso
 * es global y lo comparten las pruebas que corren despues en este mismo archivo, asi que
 * fijarlo ahi es dejar puesto un tope que nadie pidio. Es la misma lectura que hace el CLI
 * —`topeDeLlamadas()` cae en `process.env` cuando no le inyectan nada—, solo que sin el
 * efecto colateral.
 */
async function correrConRedactor(tope, items) {
  const entorno = tope === null ? {} : { EDITORIAL_MAX_LLAMADAS: String(tope) };

  let llamadas = 0;
  const invocarRedactor = async (expediente) => {
    llamadas += 1;
    return {
      titulo: expediente.hecho_candidato,
      tipo: 'noticia',
      entradilla: 'Entradilla sintetica.',
      hecho: 'Hecho sintetico.',
      que_cambia: 'Cambia que la prueba puede contar llamadas.',
      mexico: { estado: 'no_verificado', texto: 'Sin comprobar.' },
      no_establece: ['No establece nada: es un doble.'],
      procedencia_redaccion: { modelo: 'modelo-de-prueba' },
      fuentes_corroborantes: [
        { titulo: 'Corroborante', medio: 'Organismo', url: 'https://organismo.example/doc', fecha: '2026-09-10' },
      ],
    };
  };

  const etapas = etapasFalsas({ deteccion: { items } });
  // Se usa la REDACCION real —`prepararExpediente` y `redactar` de `redactar.mjs`— para que
  // la llamada al redactor pase por donde pasa de verdad; lo unico falso es la deteccion y
  // la via de inferencia. Un doble de `redactar` nunca invocaria a nadie y el tope no
  // tendria nada que contar.
  const r = await generar(
    { silencioso: true },
    { etapas: { detectar: etapas.detectar }, invocarRedactor, entorno },
  );
  return { resultado: r, llamadas };
}

test('4. el tope de llamadas al redactor ATA', async (t) => {
  await t.test('superar el tope ABORTA la corrida, y lo que no se intento sigue pendiente', async () => {
    nuevoEntorno('tope-superado');
    const { resultado, llamadas } = await correrConRedactor(2, tresPendientes());

    assert.equal(llamadas, 2, 'el redactor no puede llamarse mas veces que el tope');
    assert.equal(resultado.llamadas, 2, 'la corrida tiene que contar sus llamadas');
    assert.equal(resultado.topeAlcanzado, true, 'la corrida tiene que decir que se detuvo en el tope');
    assert.equal(resultado.parcial, true, 'detenerse en el tope no es un exito limpio: sale 2');
    assert.equal(resultado.borradores.length, 2, 'se produce lo que cabia dentro del tope');

    // Y lo que quedo fuera NO se pierde ni se marca fallido: sigue en la cola.
    const pendientes = [1, 2, 3]
      .map((n) => porUrlCanonica(`https://medio-uno.mx/hecho-${n}`))
      .filter((e) => e && e.estado !== 'pendiente_verificacion');
    assert.equal(pendientes.length, 1, 'la entrada que no se intento tiene que seguir pendiente');
    assert.equal(pendientes[0].intentos, 0, 'el tope no es un fallo de la entrada: no le sube intentos');
  });

  await t.test('NO superar el tope no aborta nada', async () => {
    nuevoEntorno('tope-holgado');
    const { resultado, llamadas } = await correrConRedactor(5, tresPendientes());

    assert.equal(llamadas, 3, 'las tres entradas se intentan');
    assert.equal(resultado.topeAlcanzado, false, 'con margen de sobra no puede haber aborto');
    assert.equal(resultado.parcial, false);
    assert.equal(resultado.borradores.length, 3);
  });

  await t.test('un tope de 0 no deja invocar al redactor ni una vez', async () => {
    nuevoEntorno('tope-cero');
    const { resultado, llamadas } = await correrConRedactor(0, tresPendientes());

    assert.equal(llamadas, 0, 'cero es cero, no «sin tope»');
    assert.equal(resultado.topeAlcanzado, true);
    assert.equal(resultado.borradores.length, 0);
  });

  await t.test('sin la variable no hay tope, y eso no es una tercera variable obligatoria', async () => {
    nuevoEntorno('tope-ausente');
    const { resultado, llamadas } = await correrConRedactor(null, tresPendientes());

    assert.equal(llamadas, 3);
    assert.equal(resultado.tope, null);
    assert.equal(resultado.topeAlcanzado, false);
  });

  await t.test('un tope mal escrito se rechaza en vez de significar «sin tope»', () => {
    for (const malo of ['abc', '1.5', '-1', 'cuarenta']) {
      assert.throws(
        () => topeDeLlamadas({ EDITORIAL_MAX_LLAMADAS: malo }),
        /EDITORIAL_MAX_LLAMADAS espera un entero/,
        `${JSON.stringify(malo)} deberia lanzar`,
      );
    }
    assert.equal(topeDeLlamadas({}), null);
    assert.equal(topeDeLlamadas({ EDITORIAL_MAX_LLAMADAS: '40' }), 40);
    assert.equal(topeDeLlamadas({ EDITORIAL_MAX_LLAMADAS: '0' }), 0);
  });

  await t.test('el contador no puede exceder el tope aunque lo llamen de mas', async () => {
    const c = contadorDeLlamadas(async () => 'borrador', 1);
    assert.equal(await c.invocar({}), 'borrador');
    await assert.rejects(() => c.invocar({}), TopeDeLlamadas);
    assert.equal(c.cuantas(), 1);
    assert.equal(c.alcanzado(), true);
  });

  // COMO SE PONE ROJA: en `generar.mjs`, devolver `invocar` sin envolver —o sea, pasar
  // `inyeccion.invocarRedactor` directo a `redactar()`—. Comprobado: el primer caso hace
  // 3 llamadas con tope 2 y el assert de `llamadas === 2` falla, que es exactamente el
  // estado en el que estaba el canal cuando el tope solo existia en el YAML.
});
