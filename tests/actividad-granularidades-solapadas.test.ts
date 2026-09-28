import { test } from "node:test";
import assert from "node:assert/strict";
import { periodosSolapados } from "../lib/proof/actividad.ts";

/**
 * Un mes y su trimestre son los MISMOS segundos, presentados dos veces.
 *
 * `leerActividad` rechazaba periodos repetidos comparando CADENAS, y repetir una cadena no
 * es la unica forma de contar dos veces lo mismo. `docs/05` §proceso.json:370 admite mes
 * `AAAA-MM` y trimestre `AAAA-Qn`, asi que un artefacto podia declarar `2026-01` y
 * `2026-Q1` sin repetir nada --- y la pantalla los volcaba en un unico `<ul>` continuo.
 * Quien lo lea de un vistazo suma mal, y nada se lo advierte.
 *
 * Levantado por el Reviewer de T-S4 y dejado abierto al cerrar por ser P3: el defecto esta
 * LATENTE, no activo, porque hoy el artefacto no declara las dos granularidades. Latente no
 * es inofensivo --- es el que nadie va a ver venir.
 *
 * No se prohibe mezclar granularidades: el contrato las permite y `docs/` es autoridad
 * sobre el codigo. Se prohibe el SOLAPE, que es lo que hace falsa la suma.
 */

test("un mes dentro de un trimestre declarado se detecta, y se nombran los dos", () => {
  assert.deepEqual(periodosSolapados(["2026-01", "2026-Q1"]), ["2026-01", "2026-Q1"]);
  assert.deepEqual(periodosSolapados(["2026-Q1", "2026-03"]), ["2026-03", "2026-Q1"]);
  assert.deepEqual(periodosSolapados(["2026-12", "2026-Q4"]), ["2026-12", "2026-Q4"]);
});

test("mes y trimestre que NO se solapan conviven: el contrato los permite", () => {
  // La otra direccion. Sin esto, una comprobacion que rechazara toda mezcla tambien pasaria
  // la prueba de arriba, y contradiria docs/05 --- que es autoridad sobre este archivo.
  assert.equal(periodosSolapados(["2026-01", "2026-Q2"]), null);
  assert.equal(periodosSolapados(["2026-01", "2025-Q1"]), null, "mismo trimestre, distinto ano");
  assert.equal(periodosSolapados(["2026-01", "2026-02", "2026-03"]), null, "solo meses");
  assert.equal(periodosSolapados(["2026-Q1", "2026-Q2"]), null, "solo trimestres");
  assert.equal(periodosSolapados([]), null);
});

test("los tres meses de un trimestre se detectan, no solo el primero", () => {
  // El error de bordes que este tipo de comprobacion suele traer: mirar solo `MM % 3 === 1`.
  for (const mes of ["2026-04", "2026-05", "2026-06"]) {
    assert.deepEqual(periodosSolapados([mes, "2026-Q2"]), [mes, "2026-Q2"], `${mes} cae en Q2`);
  }
});
