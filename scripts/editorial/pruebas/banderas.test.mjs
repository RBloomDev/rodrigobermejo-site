/**
 * Las banderas de linea de comandos, y por que `--limite` tiene prueba propia.
 *
 * El defecto: `banderas.limite = Number(argv[++i]) || null`. Con `--limite 0`,
 * `Number("0") || null` da `null`, y aguas abajo `null` significa SIN LIMITE. Pedir
 * cero piezas invocaba al modelo una vez por pendiente --- 41 en la cola actual --- que
 * es exactamente lo contrario de lo que se pidio, y cuesta dinero.
 *
 * Importa mas ahora que antes: la configuracion de ejecucion programada
 * (`docs/plataforma/programacion/canal-editorial.yml`) usa `--limite` como su tope de
 * consumo por corrida. Un tope que significa lo contrario de lo que dice no es un tope.
 *
 * COMO SE PONEN ROJAS: devuelve `Number(crudo) || null` en `argumentos()`, o cambia el
 * `!= null` de `generar.mjs` por un truthy.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { argumentos } from '../comun.mjs';

test('--limite 0 significa CERO, no «sin limite»', () => {
  assert.equal(argumentos(['--limite', '0']).limite, 0);
});

test('--limite N normal', () => {
  assert.equal(argumentos(['--limite', '3']).limite, 3);
  assert.equal(argumentos(['--limite', '41']).limite, 41);
});

test('sin la bandera, el limite es null --- y eso SI es «sin limite»', () => {
  // La distincion es la que el defecto borraba: `null` (no se pidio limite) y `0`
  // (se pidio cero) son cosas distintas y ahora se pueden distinguir.
  assert.equal(argumentos([]).limite, null);
});

test('un valor que no es entero se rechaza en vez de convertirse en «sin limite»', () => {
  // Antes `--limite abc` daba NaN -> null -> Infinity: la corrida salia disparada por
  // una errata. Ahora falla fuerte y temprano, que es lo correcto para un tope.
  for (const malo of ['abc', '', '1.5', '-1']) {
    assert.throws(
      () => argumentos(['--limite', malo]),
      /--limite espera un entero/,
      `--limite ${JSON.stringify(malo)} deberia lanzar`,
    );
  }
});

test('las demas banderas siguen funcionando', () => {
  const b = argumentos(['--incluir', 'el-economista', '--fuente', 'arxiv-cs-cy', '--silencioso']);
  assert.deepEqual(b.incluir, ['el-economista']);
  assert.deepEqual(b.soloFuente, ['arxiv-cs-cy']);
  assert.equal(b.silencioso, true);
});
