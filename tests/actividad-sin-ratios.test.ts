import { test } from "node:test";
import assert from "node:assert/strict";
import { pantalla, fixture } from "./actividad-fixture.ts";

test("AC-ACT-03: árbol renderizado sin ratios, porcentajes ni ahorro atribuido a IA", () => {
  const actividad = { schema_version: "1.0.0", buckets: [{
    period: "2026-01", claim_ids: ["construyo"], visibility_scope: "public",
    counts: { commits: 5, pull_requests: 2, reviews: 0, releases: 0, deployments: 1 },
  }] };
  for (const [datos, feed] of [[undefined, undefined], [fixture, undefined], [fixture, actividad]]) {
    const { texto, nodos } = pantalla(datos, feed);
    if (feed) assert.match(nodos.find(n => n.props.id === "actividad-feed")!.texto, /Commits: 5/);
    assert.doesNotMatch(texto, /%|horas ahorradas|trabajo (?:hecho|asistido) por IA|horas por|ratio|\d\s*\/\s*\d/i);
    assert.ok(!nodos.some(n => ["progress", "meter"].includes(n.tipo)));
  }
});

