import { test } from "node:test";
import assert from "node:assert/strict";
import { pantalla, fixture } from "./actividad-fixture.ts";

test("AC-ACT-04: tiempo agregado, cobertura adyacente y ningún proyecto de WakaTime", () => {
  const { nodos, texto } = pantalla(fixture);
  for (const fila of nodos.filter(n => n.props["data-periodo"] && /3600/.test(n.texto))) {
    assert.match(fila.texto, /Cobertura temporal: 20 de (28|30|31) días/);
    assert.match(fila.texto, /trabajo: desconocida/i);
    assert.doesNotMatch(fila.texto, /proyecto|repositorio/i);
  }
  assert.match(texto, /nombres de repositorios/);
  assert.match(texto, /no implican competencia, calidad ni seniority/i);
  assert.match(texto, /reuniones, diseño, lectura, docencia presencial/);
  assert.ok(nodos.some(n => n.props.href === "/evidencia"));
});
