import { test } from "node:test";
import assert from "node:assert/strict";

import { DIMENSION_COPY, DIMENSIONES_EN_ORDEN } from "../lib/proof/proyectos-filtros.ts";
import { leer } from "./navegacion-helpers.ts";

/**
 * Un campo del contrato se llama igual en todas las pantallas.
 *
 * ## El defecto que fija
 *
 * `components/proof/ClaimCard.tsx` rotulaba la dimensión «Construir / Decidir /
 * Enseñar» mientras `/proyectos` rotulaba su filtro «Construyo / Dirijo / Formo»
 * y la portada rotulaba sus tres ejes igual que el filtro. Un lector que saltara
 * de `/evidencia` a `/proyectos` veía **dos vocabularios para el mismo campo**,
 * y ninguna de las dos pantallas decía que hablaba del otro.
 *
 * ## Por qué se mide contra el deck y no contra otra constante del código
 *
 * `docs/` es autoridad sobre el código, nunca al revés (`CLAUDE.md`). Comparar
 * dos constantes de TypeScript entre sí las dejaría alineadas **y las dos
 * equivocadas** el día que el deck cambie un verbo. Así que la tabla de
 * `docs/brand/03-copy-deck.md` § *Las tres dimensiones* es el lado que manda, y
 * las dos constantes se comprueban contra ella.
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

test("la tarjeta de /evidencia rotula la dimensión con el mismo verbo que el filtro", () => {
  // Sin DOM, lo comprobable es el mapa que la tarjeta declara. Si alguien vuelve
  // a poner «Construir» aquí, esta se pone roja aunque el filtro siga bien.
  const fuente = leer("components/proof/ClaimCard.tsx");
  const mapa = /const DIMENSION: Record<[^>]+> = \{([\s\S]*?)\};/.exec(fuente);
  assert.ok(mapa, "ClaimCard tiene que declarar su copy en un mapa por dimensión");

  const verbos = verbosDelDeck();
  for (const d of DIMENSIONES_EN_ORDEN) {
    const entrada = new RegExp(`${d}:\\s*"([^"]+)"`).exec(mapa[1]!);
    assert.ok(entrada, `ClaimCard no rotula la dimensión «${d}»`);
    assert.equal(
      entrada[1],
      verbos[d],
      `ClaimCard llama «${entrada[1]}» a lo que el deck y el filtro de /proyectos llaman ` +
        `«${verbos[d]}»: el mismo campo del contrato con dos nombres en dos pantallas contiguas`,
    );
  }
});
