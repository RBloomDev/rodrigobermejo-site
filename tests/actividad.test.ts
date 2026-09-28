import { test } from "node:test";
import assert from "node:assert/strict";
import { pantalla, fixture } from "./actividad-fixture.ts";

test("actividad publicada: conserva claim_ids, huecos intermedios y separación de proceso", () => {
  const bucket = { claim_ids: ["construyo"], counts: { commits: 5, pull_requests: 2, reviews: 0, releases: 0, deployments: 1 }, visibility_scope: "public" };
  const { nodos } = pantalla(fixture, { schema_version: "1.0.0", buckets: [{ ...bucket, period: "2026-01" }, { ...bucket, period: "2026-03" }] });
  const actividad = nodos.find(n => n.props.id === "actividad-feed")!;
  const editor = nodos.find(n => n.props.id === "editor")!;
  assert.match(actividad.texto, /claim_ids: construyo/);
  assert.match(actividad.texto, /2026-02Sin dato publicado/);
  assert.doesNotMatch(actividad.texto, /3600|segundos de actividad/);
  assert.doesNotMatch(editor.texto, /claim_ids|Afirmo algo/);
});

test("un artefacto mal formado no se disfraza de ausencia ni expone proyectos de WakaTime", () => {
  assert.throws(() => pantalla({ ...fixture, records: [{ ...fixture.records[0], project: "repositorio-sintetico-no-publicable" }] }), /no cumple docs\/05/);
  assert.throws(() => pantalla({ ...fixture, records: [{ ...fixture.records[0], seconds: null }] }), /no cumple docs\/05/);
  assert.throws(() => pantalla(undefined, { schema_version: "1.0.0", buckets: [{ period: "2026-01", claim_ids: [] }] }), /no cumple docs\/05/);
});

