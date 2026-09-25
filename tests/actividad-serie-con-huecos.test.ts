import { test } from "node:test";
import assert from "node:assert/strict";
import { pantalla, fixture, periodos } from "./actividad-fixture.ts";

test("AC-ACT-02: trece periodos completos, nueve registros y cuatro huecos incluso en extremos", () => {
  const { nodos } = pantalla(fixture);
  const filas = nodos.filter(n => n.props["data-periodo"]);
  assert.deepEqual(filas.map(n => n.props["data-periodo"]), periodos);
  assert.equal(filas.filter(n => /Sin dato/.test(n.texto)).length, 4);
  assert.equal(filas.filter(n => /3600 segundos/.test(n.texto)).length, 9);
  for (const fila of filas.filter(n => /Sin dato/.test(n.texto))) {
    assert.match(fila.texto, /fuente no respondió/i);
    assert.doesNotMatch(fila.texto, /\b0\b|[—–]/);
  }
});

