import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";

// Casos sintéticos derivados exclusivamente de docs/05 § proceso.json.
const record = {
  kind: "human_editor_activity",
  period: "2026-09",
  source: "wakatime",
  seconds: 3600.5,
  unit: "recorded_activity_seconds",
  coverage: {
    dias_con_dato: 28,
    dias_del_periodo: 30,
    periodo_abierto: false,
    del_trabajo: "desconocida",
  },
};

test("proceso: forma cerrada, unidad y cobertura obligatorias", () => {
  const schema = JSON.parse(readFileSync("public/proof/schemas/proceso.schema.json", "utf8"));
  const validate = new Ajv2020({ strict: true, allErrors: true }).compile(schema);
  const feed = (r: unknown) => ({ schema_version: "1.0.0", records: [r], absences: [] });
  assert.ok(validate(feed(record)), JSON.stringify(validate.errors));
  assert.ok(validate({ schema_version: "1.0.0", records: [], absences: [] }));
  assert.ok(validate(feed({ ...record, seconds: 0, period: "2026-Q4", coverage: { ...record.coverage, dias_del_periodo: 92 } })));
  assert.ok(validate(feed({ ...record, seconds: 0, coverage: { ...record.coverage, dias_con_dato: 0 } })));
  // Periodo ABIERTO: el denominador son los dias transcurridos, y el registro lo declara.
  // El caso `23 de 23` es exactamente el que docs/05 §proceso.json separa del `23 de 30`.
  assert.ok(validate(feed({ ...record, coverage: { ...record.coverage, dias_con_dato: 23, dias_del_periodo: 23, periodo_abierto: true } })), JSON.stringify(validate.errors));

  for (const key of Object.keys(record)) {
    const incomplete: Record<string, unknown> = { ...record };
    delete incomplete[key];
    assert.equal(validate(feed(incomplete)), false, `falta ${key}`);
    assert.equal(validate(feed({ ...record, [key]: null })), false, `${key} null`);
  }
  for (const key of Object.keys(record.coverage)) {
    const coverage: Record<string, unknown> = { ...record.coverage };
    delete coverage[key];
    assert.equal(validate(feed({ ...record, coverage })), false, `falta coverage.${key}`);
    const invalidValues = key === "del_trabajo" ? ["", "  ", null, 0, "conocida"]
      : key === "periodo_abierto" ? ["", "false", "true", null, 0, 1]
      : ["", "28", null, -1, 1.5];
    for (const value of invalidValues) {
      assert.equal(validate(feed({ ...record, coverage: { ...record.coverage, [key]: value } })), false);
    }
  }
  assert.equal(validate(feed({ ...record, coverage: { ...record.coverage, dias_del_periodo: 0 } })), false);
  for (const patch of [
    { period: "2026-09-17" }, { period: "2026-00" }, { period: "2026-Q5" },
    { seconds: -1 }, { seconds: "3600" }, { unit: "hours" },
    { kind: "agent_execution" }, { source: " " }, { source: "editor_instrumentado" },
  ]) assert.equal(validate(feed({ ...record, ...patch })), false, JSON.stringify(patch));

  for (const key of ["extra", "claim_ids", "hours", "agent_sessions", "tool_calls", "score", "rank", "streak", "tokens_used", "prompts", "ai_percentage", "hours_saved"]) {
    assert.equal(validate({ ...feed(record), [key]: 1 }), false, `raíz.${key}`);
    assert.equal(validate(feed({ ...record, [key]: 1 })), false, `registro.${key}`);
    assert.equal(validate(feed({ ...record, coverage: { ...record.coverage, [key]: 1 } })), false, `coverage.${key}`);
  }
  const empty = { schema_version: "1.0.0", records: [], absences: [] };
  for (const key of Object.keys(empty)) {
    const incomplete: Record<string, unknown> = { ...empty };
    delete incomplete[key];
    assert.equal(validate(incomplete), false, `falta ${key}`);
  }
  assert.equal(validate({ ...empty, schema_version: "2.0.0" }), false);
});

test("proceso: ausencias con motivo obligatorio y vocabulario cerrado", () => {
  const schema = JSON.parse(readFileSync("public/proof/schemas/proceso.schema.json", "utf8"));
  const validate = new Ajv2020({ strict: true, allErrors: true }).compile(schema);
  const absence = { period: "2026-10", source: "wakatime", motivo_de_ausencia: "fuente_no_respondio" };
  const feed = (a: unknown) => ({ schema_version: "1.0.0", records: [], absences: [a] });
  for (const motivo_de_ausencia of ["sin_fuente_registrada", "fuera_del_periodo_medido", "fuente_no_respondio"]) {
    assert.ok(validate(feed({ ...absence, motivo_de_ausencia })), JSON.stringify(validate.errors));
  }
  for (const key of Object.keys(absence)) {
    const incomplete: Record<string, unknown> = { ...absence };
    delete incomplete[key];
    assert.equal(validate(feed(incomplete)), false, `falta ausencia.${key}`);
    assert.equal(validate(feed({ ...absence, [key]: null })), false, `ausencia.${key} null`);
  }
  for (const patch of [
    { source: "editor_instrumentado" }, { period: "2026-10-01" },
    { motivo_de_ausencia: "otro" }, { motivo_de_ausencia: 0 }, { motivo_de_ausencia: "-" },
  ]) assert.equal(validate(feed({ ...absence, ...patch })), false, JSON.stringify(patch));
  for (const key of ["seconds", "unit", "coverage", "claim_ids", "tokens_used", "prompts", "extra"]) {
    assert.equal(validate(feed({ ...absence, [key]: 0 })), false, `ausencia.${key}`);
  }
});
