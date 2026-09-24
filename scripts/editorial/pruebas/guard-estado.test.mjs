/**
 * Prueba NEGATIVA de `guard:estado-editorial`.
 *
 * «Un gate debe demostrar que puede fallar. Verde no prueba nada por si solo: rompe el
 * gate a proposito una vez, comprueba que falla, y restaura. Un gate que nunca ha
 * fallado puede estar desconectado» (`AGENTS.md`, principio de verificacion, punto 4).
 *
 * El guard se corre DOS veces: con un archivo de estado rastreado y sin el. El par
 * importa —solo el caso verde prueba que el rojo lo causa lo que se rompio y no el
 * andamiaje—.
 *
 * Sin red: `git init` en `tmpdir` y un script local. El guard no sale a internet ni
 * invoca inferencia.
 *
 * El caso rojo del otro guard vive aparte, en `guard-canal-falsable.test.mjs`: un
 * archivo por criterio de aceptacion, para que cada uno se pueda correr solo.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { DIR_EDITORIAL } from './ayuda.mjs';

const DIR_SCRIPTS = dirname(DIR_EDITORIAL);
const GUARD_ESTADO = join(DIR_SCRIPTS, 'check-estado-editorial.mjs');

const correr = (guion, args = [], opciones = {}) =>
  spawnSync(process.execPath, [guion, ...args], { encoding: 'utf8', ...opciones });

const git = (cwd, ...args) => spawnSync('git', args, { cwd, encoding: 'utf8' });

/**
 * El entorno del guard con `EDITORIAL_ESTADO_DIR` fijado por el caso, nunca heredado.
 * Heredarlo acoplaria la prueba al `.env` de quien la corre: `CLAUDE.md` pide definir esa
 * variable para desarrollar el canal, asi que en la maquina de Rodrigo apunta a un
 * directorio con `bitacora.jsonl` — y ese valor cambia la rama que toma el guard.
 */
function entorno(estadoDir) {
  const env = { ...process.env };
  if (estadoDir === undefined) delete env.EDITORIAL_ESTADO_DIR;
  else env.EDITORIAL_ESTADO_DIR = estadoDir;
  return env;
}

// =====================================================================================
test('guard:estado-editorial sale 1 con un archivo de estado rastreado, y 0 sin el', () => {
  // Un arbol de git propio en `tmpdir`: montar el caso rojo sobre el repositorio real
  // exigiria rastrear estado en el repositorio publico, que es justo lo que se prohibe.
  const raiz = mkdtempSync(join(tmpdir(), 'guard-estado-'));
  assert.equal(git(raiz, '-c', 'init.defaultBranch=main', 'init', '-q').status, 0, 'git init tiene que funcionar');

  const dirEstado = join(raiz, 'scripts', 'editorial', 'estado');
  mkdirSync(dirEstado, { recursive: true });
  const bitacora = join(dirEstado, 'bitacora.jsonl');
  writeFileSync(bitacora, '{"ts":"2026-09-14T16:52:07Z","id":"hecho:0","evento":"detectada"}\n', 'utf8');

  // --- ROJO: el archivo esta rastreado. ---
  assert.equal(git(raiz, 'add', '--', 'scripts/editorial/estado/bitacora.jsonl').status, 0);
  const rojo = correr(GUARD_ESTADO, ['--raiz', raiz], { env: entorno(undefined) });
  assert.equal(rojo.status, 1, 'con estado rastreado el guard tiene que salir 1');
  assert.match(rojo.stderr, /scripts\/editorial\/estado\/bitacora\.jsonl/);

  // --- VERDE: se desrastrea, y el archivo SIGUE EN DISCO. ---
  assert.equal(git(raiz, 'rm', '--cached', '-q', '--', 'scripts/editorial/estado/bitacora.jsonl').status, 0);
  const verde = correr(GUARD_ESTADO, ['--raiz', raiz], { env: entorno(undefined) });
  assert.equal(verde.status, 0, `sin estado rastreado el guard tiene que salir 0; stderr: ${verde.stderr}`);
  assert.match(verde.stdout, /OK:/);

  // Desrastrear no es borrar: el contenido tiene que seguir ahi.
  assert.equal(git(raiz, 'ls-files', '--', 'scripts/editorial/estado').stdout.trim(), '');
  assert.match(
    spawnSync(process.execPath, ['-e', `process.stdout.write(require('fs').readFileSync(${JSON.stringify(bitacora)}, 'utf8'))`], { encoding: 'utf8' }).stdout,
    /hecho:0/,
    'el archivo desrastreado conserva su contenido en disco',
  );

  // COMO SE PONE ROJA ESTA PRUEBA: en `check-estado-editorial.mjs`, quitar
  // `scripts/editorial/estado` de RUTAS_VIGILADAS. Comprobado: el caso rojo sale 0 y el
  // assert de `status === 1` falla.
});

// =====================================================================================
/**
 * §8.6 punto 4, primera sub-comprobacion: las rutas historicas no existen EN DISCO.
 *
 * Lo que esta prueba defiende no es solo que la comprobacion exista, sino su CONDICION —
 * que es lo unico que la hace compatible con AC-EDI-07—. Tres estados, en el orden real:
 *
 *   1. desrastreado pero sin migrar  -> la ruta historica esta en disco y eso es CORRECTO;
 *                                       el guard informa NO MEDIDA y sale 0;
 *   2. migrado a medias              -> hay bitacora privada Y copia historica: ROJO;
 *   3. migrado del todo              -> solo la privada: verde, y esta vez medido.
 *
 * Sin el estado 1 la prueba no distinguiria «pasa porque mide bien» de «pasa porque no
 * mide»; sin el 2 no habria demostracion de que puede fallar.
 */
test('la ausencia en disco se exige solo DESPUES de migrar, y entonces se exige de verdad', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'guard-estado-disco-'));
  assert.equal(git(raiz, '-c', 'init.defaultBranch=main', 'init', '-q').status, 0);

  // La ruta historica, en disco y SIN rastrear: exactamente como queda tras `git rm --cached`.
  const historica = join(raiz, 'scripts', 'editorial', 'estado');
  mkdirSync(historica, { recursive: true });
  writeFileSync(join(historica, 'bitacora.jsonl'), '{"id":"hecho:0"}\n', 'utf8');

  const privado = mkdtempSync(join(tmpdir(), 'estado-privado-'));

  // --- 1. SIN MIGRAR: el directorio privado existe pero no tiene bitacora. ---
  const sinMigrar = correr(GUARD_ESTADO, ['--raiz', raiz], { env: entorno(privado) });
  assert.equal(sinMigrar.status, 0, `sin senal de migracion el guard no puede exigir la ausencia; stderr: ${sinMigrar.stderr}`);
  assert.match(sinMigrar.stdout, /NO MEDIDA/);

  // --- 2. ROJO: migrado a medias. La bitacora esta en el privado Y sigue la copia historica. ---
  writeFileSync(join(privado, 'bitacora.jsonl'), '{"id":"hecho:0"}\n', 'utf8');
  const aMedias = correr(GUARD_ESTADO, ['--raiz', raiz], { env: entorno(privado) });
  assert.equal(aMedias.status, 1, 'con la migracion corrida y la ruta historica en disco el guard tiene que salir 1');
  assert.match(aMedias.stderr, /sigue existiendo en disco/);

  // --- 3. VERDE: se completa la migracion. ---
  rmSync(historica, { recursive: true });
  const migrado = correr(GUARD_ESTADO, ['--raiz', raiz], { env: entorno(privado) });
  assert.equal(migrado.status, 0, `tras completar la migracion el guard tiene que salir 0; stderr: ${migrado.stderr}`);
  assert.match(migrado.stdout, /la migracion ya corrio/);

  // COMO SE PONE ROJA ESTA PRUEBA: en `check-estado-editorial.mjs`, sustituir el filtro
  // `RUTAS_VIGILADAS.filter((ruta) => existsSync(join(raiz, ruta)))` por `[]`. Comprobado
  // el 2026-09-23: el caso 2 pasa a salir 0 y cae el assert «con la migracion corrida y la
  // ruta historica en disco el guard tiene que salir 1». El primer test del archivo sigue
  // verde, que es lo que demuestra que la rota es esta comprobacion y no el andamiaje.
});
