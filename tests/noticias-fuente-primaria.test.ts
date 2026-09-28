import { test } from "node:test";
import assert from "node:assert/strict";

import { piezaSchema } from "../app/noticias/esquema.ts";
import { vistaDePieza } from "../app/noticias/vista.ts";
import { PIEZA_VERIFICADA } from "./noticias-fixture.ts";

/**
 * `AC-NOT-07` — **exactamente una** fuente se presenta como la primaria, y es la que
 * `fuente_primaria` declara.
 *
 * ## Qué se rompía y por qué no lo veía ninguna prueba
 *
 * El rol se decidía con `f.tipo === "primaria" || f.url === urlPrimaria`. §3 admite `tipo`
 * en cada entrada de `fuentes[]` y **no acota cuántas pueden llevar `"primaria"`**, así que
 * ese disyunto permitía dos pantallas que la spec no sostiene:
 *
 * 1. Dos entradas rotuladas «Fuente primaria», mientras la prosa de la ficha afirma «La que
 *    sostiene el hecho es …» nombrando una sola.
 * 2. Una entrada con `tipo: "primaria"` y otra `url`: el ensamblado creía que la primaria
 *    real ya estaba en la lista y **no la añadía**, así que la fuente que sostiene el hecho
 *    desaparecía de las fuentes enumeradas.
 *
 * El fixture no lo detectaba porque declara una sola primaria, y ninguna capa aguas arriba
 * acota la cardinalidad: el esquema exige `min(2)` y el comando de autorización valida que
 * el valor de `tipo` esté en el vocabulario, nunca cuántas lo llevan.
 *
 * Estas pruebas fijan el árbitro: **`fuente_primaria.url`, y nada más**.
 */

/** La pieza del fixture con las `fuentes[]` que el caso necesita. */
function conFuentes(fuentes: readonly Record<string, unknown>[]) {
  return vistaDePieza(piezaSchema.parse({ ...PIEZA_VERIFICADA, fuentes }));
}

const PRIMARIA = PIEZA_VERIFICADA.fuentes[0]!;
const SECUNDARIA = PIEZA_VERIFICADA.fuentes[1]!;

test("AC-NOT-07: dos entradas con `tipo: primaria` no producen dos fuentes primarias", () => {
  const vista = conFuentes([PRIMARIA, { ...SECUNDARIA, tipo: "primaria" }]);

  const primarias = vista.fuentes.filter((f) => f.rol === "Fuente primaria");
  assert.equal(
    primarias.length,
    1,
    "la ficha afirma en prosa «La que sostiene el hecho es …», nombrando una. Etiquetar " +
      "dos contradice su propio texto y deja al lector sin saber cuál lo sostiene",
  );
  assert.equal(primarias[0]?.url, PIEZA_VERIFICADA.fuente_primaria.url);
  assert.equal(vista.fuentes[0]?.rol, "Fuente primaria", "y va primero");
  assert.equal(
    vista.fuentes[1]?.rol,
    "Fuente secundaria",
    "la que declara `tipo: primaria` sin ser la de `fuente_primaria` se lee como las demás",
  );
});

test("AC-NOT-07: un `tipo: primaria` con otra url no suplanta a la fuente primaria real", () => {
  // La primaria declarada NO está en `fuentes[]`, y una de las que sí están se declara
  // primaria. Antes, ese `tipo` bastaba para que la real nunca se añadiera a la lista.
  const vista = conFuentes([
    { ...SECUNDARIA, tipo: "primaria" },
    { ...SECUNDARIA, url: "https://ejemplo-tercero.test/nota", tipo: "secundaria" },
  ]);

  assert.equal(
    vista.fuentes.some((f) => f.url === PIEZA_VERIFICADA.fuente_primaria.url),
    true,
    "§1.4 exige renderizar `fuente_primaria` Y `fuentes[]`: una lista que se salta la que " +
      "sostiene el hecho no cumple, y aquí se saltaba en silencio",
  );
  assert.equal(vista.fuentes[0]?.rol, "Fuente primaria");
  assert.equal(vista.fuentes[0]?.url, PIEZA_VERIFICADA.fuente_primaria.url);
  assert.equal(vista.fuentes.filter((f) => f.rol === "Fuente primaria").length, 1);
  assert.equal(vista.fuentes.length, 3, "y no se pierde ninguna de las declaradas");
});

test("AC-NOT-07: la primaria se reconoce aunque la pieza no le ponga `tipo`", () => {
  // El caso simétrico: `tipo` es opcional en §3. Si el rol dependiera de él, una pieza sin
  // ese campo dejaría a la primaria rotulada como secundaria.
  const primariaSinTipo = {
    titulo: PRIMARIA.titulo,
    medio: PRIMARIA.medio,
    url: PRIMARIA.url,
    fecha: PRIMARIA.fecha,
  };
  const vista = conFuentes([{ ...SECUNDARIA, tipo: "secundaria" }, primariaSinTipo]);

  assert.equal(vista.fuentes[0]?.url, PIEZA_VERIFICADA.fuente_primaria.url);
  assert.equal(vista.fuentes[0]?.rol, "Fuente primaria");
  assert.equal(vista.fuentes.filter((f) => f.rol === "Fuente primaria").length, 1);
});

test("AC-NOT-07: el caso normal no cambia --- una primaria, y las demás corroboran", () => {
  const vista = vistaDePieza(piezaSchema.parse(PIEZA_VERIFICADA));
  assert.deepEqual(
    vista.fuentes.map((f) => f.rol),
    ["Fuente primaria", "Fuente secundaria"],
  );
  assert.equal(vista.fuentes.length, PIEZA_VERIFICADA.fuentes.length);
});
