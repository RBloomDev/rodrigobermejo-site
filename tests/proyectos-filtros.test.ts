import { test } from "node:test";
import assert from "node:assert/strict";

import { DIMENSIONS } from "../lib/proof/schema.ts";
import {
  DIMENSIONES_EN_ORDEN,
  FILTROS_VACIOS,
  filtrarProyectos,
} from "../lib/proof/proyectos-filtros.ts";
import { conFeedDeFixture, ids } from "./proyectos-fixture.ts";
import { leer } from "./navegacion-helpers.ts";

/**
 * `AC-PRY-01` — los tres filtros de `/proyectos` filtran de verdad.
 *
 * Las autorizaciones **D** y **E** de `decisions/0015` §4 se aterrizan en
 * `docs/plataforma/01-noticias-y-actividad.md` §4: por proyecto, por periodo y
 * por dimensión, **solo** en `/proyectos` y `/actividad`.
 *
 * La otra mitad de la autorización E —que ningún control muestre conteos por
 * opción— tiene archivo propio: `tests/proyectos-sin-conteos-por-opcion.test.ts`.
 * El feed de fixture que las dos comparten está en `tests/proyectos-fixture.ts`,
 * y se sirve por `PROOF_FEED_DIR` desde `tmpdir`: `public/proof/v1/**` no se
 * toca ni una vez.
 *
 * ## Lo que estas pruebas NO pueden ver
 *
 * El repo corre `node --test` sin dependencias, sin red y sin DOM, y
 * `react-dom/server` **no existe bajo `--conditions=react-server`** (medido: «no
 * está soportado en React Server Components»). Así que el clic no se simula.
 * Lo que se fija es lo que sí es comprobable sin navegador y sin lo que no hay:
 * la **lógica de filtrado real** sobre un feed real, y el **contrato estructural**
 * del control —`aria-pressed` atado al estado—. Igual que en
 * `tests/menu-movil.test.ts`, verde aquí significa «el cableado está declarado y
 * la lógica filtra», no «lo operé en un navegador».
 */

test("AC-PRY-01: el orden de las dimensiones es el del contrato, no el de la pantalla", () => {
  // `docs/plataforma/01` §4.2, corolario de §2.3: «las opciones van en el orden
  // del contrato (build, lead, teach), nunca por magnitud». El control no puede
  // importar el schema —arrastraría zod al bundle del cliente—, así que declara
  // su propio orden y esta prueba impide que los dos se separen.
  assert.deepEqual(DIMENSIONES_EN_ORDEN, [...DIMENSIONS]);
});

test("AC-PRY-01: la dimensión de un proyecto sale de los claims que lo citan", () => {
  conFeedDeFixture((proyectos) => {
    const porId = Object.fromEntries(proyectos.map((p) => [p.id, p]));
    assert.deepEqual(porId["alfa"]?.dimensiones, ["build"]);
    assert.deepEqual(porId["gama"]?.dimensiones, ["build", "lead"]);
    assert.deepEqual(porId["beta"]?.dimensiones, ["teach"]);
    // Un proyecto sin afirmación NO tiene dimensión inventada: el hueco es hueco.
    assert.deepEqual(porId["delta"]?.dimensiones, []);
  });
});

test("AC-PRY-01: filtrar por dimensión devuelve el subconjunto, en orden de Registry", () => {
  conFeedDeFixture((proyectos) => {
    assert.deepEqual(
      ids(filtrarProyectos(proyectos, { ...FILTROS_VACIOS, dimension: "build" })),
      ["alfa", "gama"],
    );
    assert.deepEqual(
      ids(filtrarProyectos(proyectos, { ...FILTROS_VACIOS, dimension: "teach" })),
      ["beta"],
    );
    assert.deepEqual(
      ids(filtrarProyectos(proyectos, { ...FILTROS_VACIOS, dimension: "lead" })),
      ["gama"],
    );
  });
});

test("AC-PRY-01: filtrar por proyecto y por periodo, y los dos a la vez con la dimensión", () => {
  conFeedDeFixture((proyectos) => {
    assert.deepEqual(
      ids(filtrarProyectos(proyectos, { ...FILTROS_VACIOS, proyecto: "gama" })),
      ["gama"],
    );
    // El periodo es el del INICIO DECLARADO del proyecto, no el de su actividad:
    // de actividad no hay artefacto publicado.
    assert.deepEqual(
      ids(filtrarProyectos(proyectos, { ...FILTROS_VACIOS, periodo: "2026" })),
      ["beta", "gama"],
    );
    assert.deepEqual(
      ids(filtrarProyectos(proyectos, { ...FILTROS_VACIOS, periodo: "2024" })),
      ["alfa"],
    );
    assert.deepEqual(
      ids(filtrarProyectos(proyectos, { dimension: "build", proyecto: "todos", periodo: "2026" })),
      ["gama"],
    );
  });
});

test("AC-PRY-01: una combinación sin resultados devuelve vacío, no el conjunto entero", () => {
  conFeedDeFixture((proyectos) => {
    // `docs/plataforma/01` §4.4.1: el estado vacío es honesto y dice que no hay
    // resultados PARA ESE FILTRO. Lo que no puede hacer es fingir que no filtró.
    assert.deepEqual(
      ids(filtrarProyectos(proyectos, { ...FILTROS_VACIOS, dimension: "teach", periodo: "2024" })),
      [],
    );
  });
});

test("AC-PRY-01: limpiar restaura el conjunto completo, en orden de Registry", () => {
  conFeedDeFixture((proyectos) => {
    const filtrado = filtrarProyectos(proyectos, {
      dimension: "teach",
      proyecto: "beta",
      periodo: "2026",
    });
    assert.deepEqual(ids(filtrado), ["beta"]);
    assert.deepEqual(ids(filtrarProyectos(proyectos, FILTROS_VACIOS)), [
      "alfa",
      "beta",
      "delta",
      "gama",
    ]);
  });
});

test("AC-PRY-01: aria-pressed refleja el estado del filtro, y no un literal", () => {
  // Precedente y límite, los dos de `tests/menu-movil.test.ts`: sin DOM esto fija
  // el contrato estructural. Si alguien desliga `aria-pressed` del estado, rojo.
  const fuente = leer("components/proof/ExploradorDeProyectos.tsx");

  assert.match(
    fuente,
    /^\s*["']use client["']/,
    "el control necesita estado en el cliente: un Server Component no tiene handlers",
  );

  const estado = /const\s+\[(\w+),\s*\w+\]\s*=\s*useState/.exec(fuente);
  assert.ok(estado, "los filtros necesitan estado; sin él ningún control cambia nada");
  const filtros = estado[1]!;

  assert.match(
    fuente,
    new RegExp(`aria-pressed=\\{${filtros}\\.dimension\\s*===`),
    `aria-pressed debe compararse contra ${filtros}.dimension: un literal mentiría al ` +
      `lector de pantalla sobre qué opción está aplicada`,
  );
});
