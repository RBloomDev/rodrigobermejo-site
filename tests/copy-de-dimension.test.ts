import { test } from "node:test";
import assert from "node:assert/strict";

import { DIMENSION_COPY, DIMENSIONES_EN_ORDEN } from "../lib/proof/proyectos-filtros.ts";
import { leer } from "./navegacion-helpers.ts";

/**
 * El filtro de /proyectos usa los verbos del deck.
 * Se compara contra docs/ para no convertir el código en fuente de verdad.
 * Esta prueba no gobierna ClaimCard: docs/brand/03 §6 conserva el copy de
 * /evidencia; la tabla de §2 corresponde a la portada.
 */

/** Los verbos de la tabla `| **Lead** | **Dirijo** | …` del deck. */
function verbosDelDeck(): Record<string, string> {
  const deck = leer("docs/brand/03-copy-deck.md");
  const verbos: Record<string, string> = {};
  for (const m of deck.matchAll(/^\|\s*\*\*(Lead|Build|Teach)\*\*\s*\|\s*\*\*([^*|]+)\*\*\s*\|/gm)) {
    verbos[m[1]!.toLowerCase()] = m[2]!.trim();
  }
  return verbos;
}

test("el deck sigue declarando un verbo por dimensión", () => {
  // Control: si la tabla se reescribe con otra forma, el resto de la prueba
  // pasaría por vacío y no vigilaría nada.
  const verbos = verbosDelDeck();
  assert.deepEqual(
    Object.keys(verbos).sort(),
    ["build", "lead", "teach"],
    "docs/brand/03 § Las tres dimensiones tiene que declarar los tres ejes con su verbo",
  );
});

test("el filtro de /proyectos usa el verbo del deck, sin inventarse otro", () => {
  const verbos = verbosDelDeck();
  for (const d of DIMENSIONES_EN_ORDEN) {
    assert.equal(
      DIMENSION_COPY[d],
      verbos[d],
      `lib/proof/proyectos-filtros.ts llama «${DIMENSION_COPY[d]}» a lo que el deck llama ` +
        `«${verbos[d]}»: el deck es la autoridad sobre el copy`,
    );
  }
});
