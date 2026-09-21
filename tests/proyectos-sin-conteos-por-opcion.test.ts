import { test } from "node:test";
import assert from "node:assert/strict";

import {
  FILTROS_VACIOS,
  filtrarProyectos,
  opcionesDeDimension,
  opcionesDePeriodo,
  opcionesDeProyecto,
} from "../lib/proof/proyectos-filtros.ts";
import { conFeedDeFixture } from "./proyectos-fixture.ts";
import { leer } from "./navegacion-helpers.ts";

/**
 * `AC-PRY-02` — **ningún control de filtro muestra un conteo por opción.**
 * El control dice «Formo», nunca «Formo (2)».
 *
 * Es la autorización **E** de `decisions/0015` §4, y la razón de la regla está en
 * §4-bis: un conteo por opción pone las tres dimensiones una al lado de otra con
 * su número, y un número al lado de otro las ordena. Eso es el eje de comparación
 * que toda la superficie evita, colado por la puerta de un control de filtro.
 *
 * ## Las tres pruebas son tres puertas distintas
 *
 * 1. **Los datos.** Ninguna etiqueta contiene el número que esa opción produce.
 *    Se comprueba contra el conteo REAL, que es lo único que un conteo por opción
 *    podría decir.
 * 2. **El marcado.** Si alguien añade `({n})` en el JSX, los datos siguen limpios
 *    y solo esta se pone roja.
 * 3. **El estado inicial.** Sin filtro por defecto: un filtro preseleccionado es
 *    una vista editorializada que el lector no eligió (`docs/plataforma/01`
 *    §4.4.4).
 *
 * El feed de fixture es el de `tests/proyectos-fixture.ts`, servido por
 * `PROOF_FEED_DIR` desde `tmpdir`. `public/proof/v1/**` no se toca.
 */

test("AC-PRY-02: ninguna etiqueta de opción lleva el número de resultados que produce", () => {
  conFeedDeFixture((proyectos) => {
    const opciones = [
      ...opcionesDeDimension().map((o) => ({
        ...o,
        cuantos: filtrarProyectos(proyectos, { ...FILTROS_VACIOS, dimension: o.valor }).length,
      })),
      ...opcionesDeProyecto(proyectos).map((o) => ({
        ...o,
        cuantos: filtrarProyectos(proyectos, { ...FILTROS_VACIOS, proyecto: o.valor }).length,
      })),
      ...opcionesDePeriodo(proyectos).map((o) => ({
        ...o,
        cuantos: filtrarProyectos(proyectos, { ...FILTROS_VACIOS, periodo: o.valor }).length,
      })),
    ];

    assert.ok(opciones.length >= 8, "el fixture tiene que producir opciones de los tres filtros");

    for (const o of opciones) {
      // El conteo por opción es el eje de comparación que la autorización E
      // evita: pone las opciones una al lado de otra con su número, y eso las
      // ordena. Se comprueba contra el número REAL que produciría cada opción,
      // que es lo único que un conteo por opción podría decir.
      assert.doesNotMatch(
        o.etiqueta,
        new RegExp(`(^|[^\\d])${o.cuantos}([^\\d]|$)`),
        `la opción «${o.etiqueta}» contiene ${o.cuantos}, que es exactamente cuántos ` +
          `proyectos deja ver: eso es un conteo por opción (decisions/0015 §4-E)`,
      );
      assert.doesNotMatch(
        o.etiqueta,
        /\(\s*\d+\s*\)/,
        `la opción «${o.etiqueta}» lleva una cifra entre paréntesis: el control dice ` +
          `«Formo», nunca «Formo (2)»`,
      );
    }
  });
});

test("AC-PRY-02: el control renderiza la etiqueta declarada y nada más", () => {
  // La comprobación anterior mira los datos; esta mira el marcado. Si alguien
  // añade `({n})` junto a la etiqueta en el JSX, los datos siguen limpios y solo
  // esta se pone roja.
  const fuente = leer("components/proof/ExploradorDeProyectos.tsx");

  assert.match(
    fuente,
    /<button[^>]*aria-pressed=\{[^}]+\}[^>]*>\s*\{\s*o\.etiqueta\s*\}\s*<\/button>/,
    "el botón de dimensión debe renderizar exactamente {o.etiqueta}",
  );
  assert.match(
    fuente,
    /<option[^>]*value=\{o\.valor\}[^>]*>\s*\{\s*o\.etiqueta\s*\}\s*<\/option>/,
    "cada <option> debe renderizar exactamente {o.etiqueta}",
  );

  // Y ninguna longitud interpolada dentro de la zona de controles.
  const controles = /<form[\s\S]*?<\/form>/.exec(fuente);
  assert.ok(controles, "los controles viven en un <form> para poder acotarlos aquí");
  assert.doesNotMatch(
    controles[0],
    /\.length/,
    "hay una longitud interpolada dentro del control: el recuento de resultados va " +
      "fuera del control, nunca por opción (docs/plataforma/01 §4.2)",
  );
});

test("AC-PRY-02: sin filtro por defecto — la primera carga muestra el conjunto completo", () => {
  conFeedDeFixture((proyectos) => {
    // `docs/plataforma/01` §4.4.4: un filtro preseleccionado es una vista
    // editorializada que el lector no eligió.
    assert.equal(FILTROS_VACIOS.dimension, "todas");
    assert.equal(FILTROS_VACIOS.proyecto, "todos");
    assert.equal(FILTROS_VACIOS.periodo, "todo");
    assert.equal(filtrarProyectos(proyectos, FILTROS_VACIOS).length, proyectos.length);
  });
});
