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
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { DIR_EDITORIAL } from './ayuda.mjs';

const DIR_SCRIPTS = dirname(DIR_EDITORIAL);
const GUARD_ESTADO = join(DIR_SCRIPTS, 'check-estado-editorial.mjs');

const correr = (guion, args = [], opciones = {}) =>
  spawnSync(process.execPath, [guion, ...args], { encoding: 'utf8', ...opciones });

const git = (cwd, ...args) => spawnSync('git', args, { cwd, encoding: 'utf8' });

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
  const rojo = correr(GUARD_ESTADO, ['--raiz', raiz]);
  assert.equal(rojo.status, 1, 'con estado rastreado el guard tiene que salir 1');
  assert.match(rojo.stderr, /scripts\/editorial\/estado\/bitacora\.jsonl/);

  // --- VERDE: se desrastrea, y el archivo SIGUE EN DISCO. ---
  assert.equal(git(raiz, 'rm', '--cached', '-q', '--', 'scripts/editorial/estado/bitacora.jsonl').status, 0);
  const verde = correr(GUARD_ESTADO, ['--raiz', raiz]);
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
