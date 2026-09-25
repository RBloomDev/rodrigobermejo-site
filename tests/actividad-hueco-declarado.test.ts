import { test } from "node:test";
import assert from "node:assert/strict";
import { pantalla } from "./actividad-fixture.ts";

test("AC-ACT-01: sin ambos archivos, huecos declarados con motivo y sin valores", () => {
  const { texto, nodos } = pantalla();
  assert.match(texto, /estado correcto del sistema/i);
  for (const id of ["editor", "agentes", "actividad-feed"]) {
    const bloque = nodos.find(n => n.props.id === id)!;
    assert.ok(bloque, id);
    assert.match(bloque.texto, /sin dato/i);
    assert.doesNotMatch(bloque.texto, /\b0\b|[—–]/);
  }
  assert.match(texto, /no hay.*proceso/i);
  assert.match(texto, /no hay.*actividad publicado/i);
});

