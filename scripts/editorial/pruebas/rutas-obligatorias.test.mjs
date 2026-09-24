/**
 * Las dos variables del canal son OBLIGATORIAS y no tienen valor por defecto.
 *
 * `docs/plataforma/02-editorial.md` §8.3: «Si falta cualquiera de las dos, el canal
 * **aborta** al arrancar —antes de leer un feed, antes de abrir un archivo—, sale con
 * codigo distinto de 0 y **no escribe nada**. No hay modo degradado.»
 *
 * La prohibicion que esta prueba vigila, literal de esa seccion: «Un valor por defecto
 * dentro del repositorio. Es exactamente como esta regla se rompe sin que nadie lo note:
 * el canal corre, no falla, y el estado aparece en un `git status` que alguien commitea
 * sin leer.»
 *
 * Por eso no basta con comprobar el codigo de salida. Se comprueban TRES cosas, y la
 * tercera es la que atrapa el defecto real:
 *
 *   1. sale con codigo distinto de 0;
 *   2. el mensaje NOMBRA la variable que falta —un aborto mudo manda a leer el codigo—;
 *   3. **no se escribio un solo byte**: ni en el directorio que si estaba puesto, ni en
 *      las rutas historicas del repositorio, que es donde caia el default.
 *
 * COMO SE PONE ROJA: devolver el `|| DIR_ESTADO` a `dirEstado()` en `comun.mjs`. El
 * canal deja de abortar, escribe la bitacora dentro del repositorio y los tres asserts
 * fallan a la vez.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { DIR_EDITORIAL } from './ayuda.mjs';

const EJECUTAR = join(DIR_EDITORIAL, 'ejecutar.mjs');

/** Las dos rutas historicas dentro del repositorio: donde caia el default. */
const HISTORICAS = [join(DIR_EDITORIAL, 'estado'), join(DIR_EDITORIAL, 'redacciones')];

/**
 * Inventario de un directorio: nombre y tamaño de cada archivo, recursivo. `null` si el
 * directorio no existe —que es un estado legitimo una vez migrado el estado, y que hay
 * que distinguir de «existe y esta vacio»—.
 */
function inventario(dir) {
  if (!existsSync(dir)) return null;
  const salida = [];
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) salida.push(...(inventario(ruta) ?? []).map((f) => `${entrada.name}/${f}`));
    else salida.push(`${entrada.name}:${statSync(ruta).size}`);
  }
  return salida.sort();
}

/** Corre el canal con el entorno que se le da, sin heredar las variables del canal. */
function correrCanal({ estado, redacciones, piezas, entradas }) {
  const env = { ...process.env };
  delete env.EDITORIAL_ESTADO_DIR;
  delete env.EDITORIAL_REDACCIONES_DIR;
  if (estado) env.EDITORIAL_ESTADO_DIR = estado;
  if (redacciones) env.EDITORIAL_REDACCIONES_DIR = redacciones;
  env.EDITORIAL_PIEZAS = piezas;

  return spawnSync(process.execPath, [EJECUTAR, '--entradas', entradas, '--silencioso'], {
    env,
    encoding: 'utf8',
  });
}

/** Un entorno de prueba: dos directorios vacios en `tmpdir` y un corpus tambien vacio. */
function entornoVacio(nombre) {
  const raiz = mkdtempSync(join(tmpdir(), `editorial-${nombre}-`));
  const entradas = join(raiz, 'entradas.json');
  writeFileSync(entradas, '[]', 'utf8');
  return {
    raiz,
    estado: join(raiz, 'estado'),
    redacciones: join(raiz, 'redacciones'),
    piezas: join(raiz, 'piezas.json'),
    entradas,
  };
}

test('sin las dos variables el canal aborta, lo dice, y no escribe un solo byte', async (t) => {
  const casos = [
    { nombre: 'ninguna de las dos', pon: {}, esperado: [/EDITORIAL_ESTADO_DIR/] },
    { nombre: 'falta EDITORIAL_REDACCIONES_DIR', pon: { estado: true }, esperado: [/EDITORIAL_REDACCIONES_DIR/] },
    { nombre: 'falta EDITORIAL_ESTADO_DIR', pon: { redacciones: true }, esperado: [/EDITORIAL_ESTADO_DIR/] },
  ];

  for (const caso of casos) {
    await t.test(caso.nombre, () => {
      const e = entornoVacio('obligatorias');
      const antes = HISTORICAS.map(inventario);

      const r = correrCanal({
        estado: caso.pon.estado ? e.estado : undefined,
        redacciones: caso.pon.redacciones ? e.redacciones : undefined,
        piezas: e.piezas,
        entradas: e.entradas,
      });

      assert.notEqual(r.status, 0, 'el canal tiene que salir con codigo distinto de 0');
      for (const patron of caso.esperado) {
        assert.match(r.stderr, patron, 'el mensaje tiene que nombrar la variable que falta');
      }
      assert.match(r.stderr, /no se escribio nada/i, 'el mensaje tiene que decir que no escribio');

      // Ni un byte: ni en el directorio que SI estaba puesto...
      assert.equal(inventario(e.estado), null, 'no se crea el directorio de estado');
      assert.equal(inventario(e.redacciones), null, 'no se crea el directorio de redacciones');
      assert.equal(existsSync(e.piezas), false, 'no se escribe el corpus');
      // ...ni en las rutas historicas del repositorio, que es donde caia el default.
      assert.deepEqual(HISTORICAS.map(inventario), antes, 'las rutas historicas no se tocan');
    });
  }

  // Control: con las DOS puestas el canal arranca. Sin este caso, la prueba pasaria
  // igual si el canal abortara siempre por cualquier otro motivo, y entonces no
  // probaria que el aborto lo causa la variable ausente.
  await t.test('control: con las dos variables el canal arranca y no aborta', () => {
    const e = entornoVacio('control');
    const r = correrCanal({
      estado: e.estado,
      redacciones: e.redacciones,
      piezas: e.piezas,
      entradas: e.entradas,
    });
    assert.equal(r.status, 0, `el canal deberia correr; stderr: ${r.stderr}`);
    assert.doesNotMatch(r.stderr, /EDITORIAL_ESTADO_DIR/);
  });
});
