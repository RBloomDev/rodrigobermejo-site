import { test } from "node:test";
import assert from "node:assert/strict";
import { pantalla } from "./actividad-fixture.ts";

test("AC-CRU-08: la pantalla distingue cobertura de periodos abiertos y cerrados", () => {
  // Dos cortes sintéticos del mismo mes: el 23 de septiembre y al cierre.
  // El lector respeta el estado publicado; no lo infiere de la fecha actual.
  function cobertura(periodoAbierto: boolean) {
    const { nodos } = pantalla({
      schema_version: "1.0.0",
      records: [{
        kind: "human_editor_activity", period: "2026-09", source: "wakatime",
        seconds: 3600, unit: "recorded_activity_seconds",
        coverage: {
          dias_con_dato: 23, dias_del_periodo: periodoAbierto ? 23 : 30,
          periodo_abierto: periodoAbierto, del_trabajo: "desconocida",
        },
      }],
      absences: [],
    });
    const parrafos = nodos.filter(n => n.tipo === "p" && n.texto.startsWith("Periodo: 2026-09."));
    assert.equal(parrafos.length, 1);
    return parrafos[0].texto;
  }

  const abierto = cobertura(true);
  const cerrado = cobertura(false);
  const prefijo = "Periodo: 2026-09. Tiempo registrado en editor: 3600 segundos de actividad registrada. Cobertura temporal: 23 de ";
  const sufijo = ". Cobertura del trabajo: desconocida.";

  assert.equal(abierto, prefijo + "23 días transcurridos: el periodo seguía en curso en la fecha de corte, así que los días que faltan por ocurrir no cuentan como cobertura perdida" + sufijo);
  assert.equal(cerrado, prefijo + "30 días del periodo, que ya estaba cerrado en la fecha de corte" + sufijo);
  assert.doesNotMatch(abierto, /del periodo, que ya estaba cerrado/);
  assert.doesNotMatch(cerrado, /días transcurridos|no cuentan como cobertura perdida/);
  assert.notEqual(abierto, cerrado);
});
