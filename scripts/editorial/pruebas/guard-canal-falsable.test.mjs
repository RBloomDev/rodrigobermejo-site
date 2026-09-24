/**
 * Prueba NEGATIVA de `guard:canal`: con la deduplicacion desactivada a proposito, el
 * guard tiene que ponerse ROJO.
 *
 * «Un gate debe demostrar que puede fallar. Verde no prueba nada por si solo: rompe el
 * gate a proposito una vez, comprueba que falla, y restaura. Un gate que nunca ha
 * fallado puede estar desconectado» (`AGENTS.md`, principio de verificacion, punto 4).
 *
 * El guard se corre DOS veces: con la deduplicacion puesta y sin ella. El par importa
 * —solo el caso verde prueba que el rojo lo causa lo que se rompio y no el andamiaje—.
 *
 * Sin red y sin inferencia: `check-canal-editorial.mjs` usa un redactor falso y entradas
 * locales, asi que esta prueba es determinista y no cuesta un token.
 *
 * El caso rojo del otro guard vive aparte, en `guard-estado.test.mjs`: un archivo por
 * criterio de aceptacion, para que cada uno se pueda correr solo.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { DIR_EDITORIAL } from './ayuda.mjs';

const DIR_SCRIPTS = dirname(DIR_EDITORIAL);
const GUARD_CANAL = join(DIR_SCRIPTS, 'check-canal-editorial.mjs');

const correr = (guion, args = [], opciones = {}) =>
  spawnSync(process.execPath, [guion, ...args], { encoding: 'utf8', ...opciones });

// =====================================================================================
test('guard:canal se pone ROJO con la deduplicacion desactivada, y verde con ella', () => {
  const verde = correr(GUARD_CANAL, [], { timeout: 120_000 });
  assert.equal(verde.status, 0, `el guard deberia pasar; stderr: ${verde.stderr}`);
  assert.match(verde.stdout, /0 nuevos/);

  const rojo = correr(GUARD_CANAL, ['--sin-deduplicacion'], { timeout: 120_000 });
  assert.equal(rojo.status, 1, 'sin deduplicacion el guard TIENE que ponerse rojo');
  assert.match(rojo.stderr, /0 nuevos, dio 1/, 'y tiene que decir exactamente que propiedad se rompio');

  // COMO SE PONE ROJA ESTA PRUEBA: en `check-canal-editorial.mjs`, hacer que
  // `etapas()` ignore la bandera y devuelva siempre la deduplicacion real. Comprobado:
  // el caso rojo sale 0 y el assert de `status === 1` falla, que es el sintoma exacto de
  // un guard desconectado.
});
