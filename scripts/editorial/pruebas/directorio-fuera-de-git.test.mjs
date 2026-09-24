/**
 * Una ruta dentro de un arbol de trabajo de git NO es un directorio privado valido.
 *
 * `docs/plataforma/02-editorial.md` §8.3, tercera prohibicion, literal: «Aceptar una ruta
 * que resuelva dentro de un arbol de trabajo de git, sea este repositorio u otro. Un
 * directorio privado dentro de un repo privado tampoco vale: la regla es que el estado no
 * esta versionado, no que el repositorio sea discreto.» Y §8.6 punto 3 la pide como
 * comprobacion del gate: el canal falla «si la ruta resuelta de cualquiera de las dos cae
 * dentro de un arbol de trabajo de git».
 *
 * POR QUE NO BASTA CON EXIGIR QUE LA VARIABLE EXISTA. Quitar el `|| DIR_ESTADO` cierra el
 * default silencioso, pero deja abierta la misma puerta con la variable puesta:
 * `EDITORIAL_ESTADO_DIR=./scripts/editorial/estado` pasaria, el canal volveria a escribir
 * dentro del repositorio publico, y esta vez el `.gitignore` nuevo lo taparia del
 * `git status`. Seria el mismo defecto con mejor camuflaje.
 *
 * DOS MEDIOS DISTINTOS, a proposito:
 *
 *   1. EN PROCESO — `dirEstado()` y `dirRedacciones()` lanzan ante una ruta de ESTE
 *      repositorio. No spawnea nada, asi que no puede escribir ni aunque la comprobacion
 *      no existiera: es la unica forma segura de apuntar al arbol real en una prueba.
 *   2. EL CANAL COMPLETO — sobre un arbol de git montado en `tmpdir` («u otro»
 *      repositorio, que es la mitad que una prueba contra este repo no cubre): aborta con
 *      codigo distinto de 0, nombra la variable y la ruta, y no deja un solo byte dentro
 *      de ese arbol.
 *
 * El control del caso 2 es lo que le da filo: el MISMO directorio, sin `git init`, tiene
 * que dejar correr el canal. Sin ese par, la prueba pasaria igual si el canal abortara
 * siempre por cualquier otro motivo, y no probaria que lo causa el `.git`.
 *
 * COMO SE PONE ROJA: en `comun.mjs`, quitar la llamada a `exigirFueraDeGit()` dentro de
 * `exigirDirectorio()`. Los dos casos rojos pasan a no lanzar y los asserts caen.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { DIR_EDITORIAL } from './ayuda.mjs';
import { dirEstado, dirRedacciones } from '../comun.mjs';

const EJECUTAR = join(DIR_EDITORIAL, 'ejecutar.mjs');

/** Corre un cuerpo con el entorno dado y restaura despues, pase lo que pase. */
function conEntorno({ estado, redacciones }, cuerpo) {
  const previo = {
    estado: process.env.EDITORIAL_ESTADO_DIR,
    redacciones: process.env.EDITORIAL_REDACCIONES_DIR,
  };
  if (estado === undefined) delete process.env.EDITORIAL_ESTADO_DIR;
  else process.env.EDITORIAL_ESTADO_DIR = estado;
  if (redacciones === undefined) delete process.env.EDITORIAL_REDACCIONES_DIR;
  else process.env.EDITORIAL_REDACCIONES_DIR = redacciones;
  try {
    cuerpo();
  } finally {
    if (previo.estado === undefined) delete process.env.EDITORIAL_ESTADO_DIR;
    else process.env.EDITORIAL_ESTADO_DIR = previo.estado;
    if (previo.redacciones === undefined) delete process.env.EDITORIAL_REDACCIONES_DIR;
    else process.env.EDITORIAL_REDACCIONES_DIR = previo.redacciones;
  }
}

// =====================================================================================
test('una ruta de ESTE repositorio no vale como directorio privado', async (t) => {
  // Las dos rutas historicas, mas una que no existe en disco: que la comprobacion no
  // dependa de que el directorio ya este creado. El canal crea el suyo al arrancar, asi
  // que mirar solo lo existente dejaria pasar el caso que importa.
  const casos = [
    { nombre: 'la ruta historica del estado', ruta: join(DIR_EDITORIAL, 'estado') },
    { nombre: 'la ruta historica de las redacciones', ruta: join(DIR_EDITORIAL, 'redacciones') },
    { nombre: 'una ruta del repo que todavia no existe', ruta: join(DIR_EDITORIAL, 'estado-inventado') },
    { nombre: 'una ruta relativa al repo', ruta: './scripts/editorial/estado' },
  ];

  for (const caso of casos) {
    await t.test(`${caso.nombre}: EDITORIAL_ESTADO_DIR aborta`, () => {
      conEntorno({ estado: caso.ruta, redacciones: tmpdir() }, () => {
        assert.throws(
          () => dirEstado(),
          (e) => {
            assert.equal(e.codigo, 'DIRECTORIO_VERSIONADO', 'el codigo de error tiene que distinguirlo de una variable ausente');
            assert.match(e.message, /EDITORIAL_ESTADO_DIR/, 'el mensaje tiene que nombrar la variable');
            assert.match(e.message, /arbol de trabajo de git/i, 'y tiene que decir por que se rechaza');
            assert.match(e.message, /no se escribio nada/i);
            return true;
          },
        );
      });
    });

    await t.test(`${caso.nombre}: EDITORIAL_REDACCIONES_DIR aborta`, () => {
      conEntorno({ estado: tmpdir(), redacciones: caso.ruta }, () => {
        assert.throws(() => dirRedacciones(), (e) => {
          assert.equal(e.codigo, 'DIRECTORIO_VERSIONADO');
          assert.match(e.message, /EDITORIAL_REDACCIONES_DIR/);
          return true;
        });
      });
    });
  }

  // Control: una ruta de `tmpdir`, fuera de todo arbol de git, si resuelve. Sin este
  // caso la prueba pasaria igual si las dos funciones lanzaran siempre.
  await t.test('control: una ruta fuera de git resuelve sin lanzar', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'editorial-fuera-'));
    conEntorno({ estado: raiz, redacciones: raiz }, () => {
      assert.equal(dirEstado(), raiz);
      assert.equal(dirRedacciones(), raiz);
    });
  });
});

// =====================================================================================
test('el canal aborta ante un arbol de git AJENO, y no deja un byte dentro', () => {
  // «Sea este repositorio u otro»: un repo privado ajeno tampoco vale. Montarlo en
  // `tmpdir` es la unica forma de probar esa mitad sin escribir en el arbol real.
  const raiz = mkdtempSync(join(tmpdir(), 'editorial-repo-ajeno-'));
  const privado = join(raiz, 'privado');
  mkdirSync(privado, { recursive: true });
  const entradas = join(raiz, 'entradas.json');
  writeFileSync(entradas, '[]', 'utf8');

  const env = { ...process.env };
  env.EDITORIAL_ESTADO_DIR = join(privado, 'estado');
  env.EDITORIAL_REDACCIONES_DIR = join(privado, 'redacciones');
  env.EDITORIAL_PIEZAS = join(raiz, 'piezas.json');
  const correr = () =>
    spawnSync(process.execPath, [EJECUTAR, '--entradas', entradas, '--silencioso'], {
      env,
      encoding: 'utf8',
    });

  // --- CONTROL primero: sin `.git`, el mismo directorio deja correr el canal. ---
  const verde = correr();
  assert.equal(verde.status, 0, `sin .git el canal deberia correr; stderr: ${verde.stderr}`);

  // --- ROJO: se convierte el ancestro en un arbol de trabajo de git. ---
  assert.equal(
    spawnSync('git', ['-c', 'init.defaultBranch=main', 'init', '-q'], { cwd: raiz, encoding: 'utf8' }).status,
    0,
    'git init tiene que funcionar',
  );
  const antes = readdirSync(privado).sort();

  const rojo = correr();
  assert.notEqual(rojo.status, 0, 'dentro de un arbol de git el canal tiene que abortar');
  assert.match(rojo.stderr, /EDITORIAL_ESTADO_DIR/, 'tiene que nombrar la variable');
  assert.match(rojo.stderr, /arbol de trabajo de git/i, 'y el motivo');
  assert.match(rojo.stderr, /no se escribio nada/i);

  // Ni un byte nuevo dentro del arbol ajeno. El control de arriba ya creo lo suyo, asi
  // que lo que se compara es que la corrida ABORTADA no anadio nada.
  assert.deepEqual(readdirSync(privado).sort(), antes, 'la corrida abortada no escribe dentro del arbol de git');
  assert.equal(existsSync(join(raiz, '.git', 'estado')), false);
});
