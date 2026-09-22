import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DIMENSION_COPY,
  DIMENSIONES_EN_ORDEN,
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
 * ## Las cuatro pruebas son cuatro puertas distintas
 *
 * 1. **Los datos.** Ninguna etiqueta publica el número que esa opción produce.
 *    Se comprueba contra el conteo REAL, que es lo único que un conteo por opción
 *    podría decir.
 * 2. **La sonda misma.** Etiquetas fabricadas que tiene que señalar, y títulos
 *    legítimos con dígito que **no** puede señalar. Sin este control la primera
 *    prueba podría estar verde por no encontrar nada nunca.
 * 3. **El marcado.** Si alguien añade `({n})` en el JSX, los datos siguen limpios
 *    y solo esta se pone roja.
 * 4. **El estado inicial.** Sin filtro por defecto: un filtro preseleccionado es
 *    una vista editorializada que el lector no eligió (`docs/plataforma/01`
 *    §4.4.4).
 *
 * El feed de fixture es el de `tests/proyectos-fixture.ts`, servido por
 * `PROOF_FEED_DIR` desde `tmpdir`. `public/proof/v1/**` no se toca.
 *
 * Las etiquetas de proyecto y dimension se comparan exactamente con su origen.
 * Los titulos con cifras se conservan literalmente. La sonda de formas solo
 * se aplica a las etiquetas construidas de periodo, nunca a los titulos.
 */

/** Formas de conteo agregado en una etiqueta construida. */
const FORMAS_DE_CONTEO = [
  /\(\s*(\d+)\s*\)/, //            «Formo (2)»
  /\[\s*(\d+)\s*\]/, //            «Formo [2]»
  /[\s·:•|–—-]\s*(\d+)\s*$/, // «Formo 2», «Formo · 2», «Formo: 2»
];

/** La forma encontrada si la etiqueta publica su propio conteo, o `null`. */
function conteoPublicado(etiqueta: string, cuantos: number): string | null {
  for (const forma of FORMAS_DE_CONTEO) {
    const m = forma.exec(etiqueta);
    if (m && Number(m[1]) === cuantos) return m[0];
  }
  return null;
}

test("AC-PRY-02: ninguna etiqueta de opción lleva el número de resultados que produce", () => {
  conFeedDeFixture((proyectos) => {
    const opciones = [
      ...opcionesDePeriodo(proyectos).map((o) => ({
        ...o,
        cuantos: filtrarProyectos(proyectos, { ...FILTROS_VACIOS, periodo: o.valor }).length,
      })),
    ];

    assert.deepEqual(opcionesDeDimension(), [
      { valor: "todas", etiqueta: "Todas" },
      ...DIMENSIONES_EN_ORDEN.map((d) => ({ valor: d, etiqueta: DIMENSION_COPY[d] })),
    ]);
    const esperadas = [
      { valor: "todos", etiqueta: "Todos" },
      ...proyectos.map((p) => ({ valor: p.id, etiqueta: p.titulo })),
    ];
    assert.deepEqual(opcionesDeProyecto(proyectos), esperadas);
    const alteradas = opcionesDeProyecto(proyectos).map((o, i) =>
      i === 1 ? { ...o, etiqueta: `${o.etiqueta} 1` } : o,
    );
    assert.throws(() => assert.deepEqual(alteradas, esperadas), assert.AssertionError);
    for (const titulo of ["MathGym 1.0", "Fase 1", "Proyecto (2)"]) {
      const numerados = proyectos.map((p) => ({ ...p, titulo }));
      assert.deepEqual(opcionesDeProyecto(numerados).slice(1),
        numerados.map((p) => ({ valor: p.id, etiqueta: p.titulo })));
    }
    // El rango completo más los tres años distintos de inicio del fixture.
    assert.equal(opciones.length, 4, "el fixture produce el rango y 2024, 2025 y 2026");

    for (const o of opciones) {
      // El conteo por opción es el eje de comparación que la autorización E
      // evita: pone las opciones una al lado de otra con su número, y eso las
      // ordena. Se comprueba contra el número REAL que produciría cada opción,
      // que es lo único que un conteo por opción podría decir.
      assert.equal(
        conteoPublicado(o.etiqueta, o.cuantos),
        null,
        `la opción «${o.etiqueta}» publica ${o.cuantos}, que es exactamente cuántos ` +
          `proyectos deja ver: eso es un conteo por opción (decisions/0015 §4-E)`,
      );
      // La forma canónica se prohíbe además sin mirar el conteo: una cifra sola
      // entre paréntesis junto a un control de filtro no es otra cosa.
      assert.doesNotMatch(
        o.etiqueta,
        /\(\s*\d+\s*\)/,
        `la opción «${o.etiqueta}» lleva una cifra entre paréntesis: el control dice ` +
          `«Formo», nunca «Formo (2)»`,
      );
    }
  });
});

test("AC-PRY-02: la sonda de conteos detecta de verdad, y no señala títulos legítimos", () => {
  // Control negativo, que es lo que convierte la regla en prueba. Sin él, la
  // comprobación de arriba podría estar verde porque el matcher no encuentra
  // nada nunca —y con el matcher anterior escondía además un falso rojo—.
  const conConteo: [string, number][] = [
    ["Formo 2", 2],
    ["Formo  3", 3],
    ["Todos 12", 12],
    ["Formo (2)", 2],
    ["Formo [2]", 2],
    ["Formo · 2", 2],
    ["Formo: 2", 2],
    ["Formo — 2", 2],
    ["Todos - 12", 12],
  ];
  for (const [etiqueta, cuantos] of conConteo) {
    assert.ok(
      conteoPublicado(etiqueta, cuantos),
      `la sonda dejó pasar «${etiqueta}», que publica su propio conteo`,
    );
  }

  // Títulos y etiquetas que el Registry puede publicar mañana. Ninguno cuenta
  // nada, y ninguno puede poner roja la prueba de arriba.
  const legitimas: [string, number][] = [
    ["MathGym 1.0", 1],
    ["Punto de Venta v1", 1],
    ["Inicio declarado en 2026", 2],
    ["Todo el rango, de agosto de 2024 a junio de 2026", 12],
    ["Proyecto (piloto)", 1],
  ];
  for (const [etiqueta, cuantos] of legitimas) {
    assert.equal(
      conteoPublicado(etiqueta, cuantos),
      null,
      `la sonda señala de más «${etiqueta}»: ahí no hay ningún conteo por opción`,
    );
  }
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
