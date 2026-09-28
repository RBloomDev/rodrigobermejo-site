import { test } from "node:test";
import assert from "node:assert/strict";

import { piezaSchema } from "../app/noticias/esquema.ts";
import { revisionDePieza, vistaDePieza } from "../app/noticias/vista.ts";
import { leer } from "./navegacion-helpers.ts";
import { envoltoriosDe, envoltoriosDeCadaUno } from "./noticias-pantalla.ts";
import { PIEZA_PARCIAL, PIEZA_VERIFICADA } from "./noticias-fixture.ts";

/**
 * `AC-NOT-03` — una pieza con veredicto `parcial` enseña sus **afirmaciones pendientes en
 * pantalla**: en el cuerpo, donde se leen, y no en una nota al pie ni dentro de un
 * `<details>` cerrado.
 *
 * ## Por qué esto es un criterio y no un detalle de maquetación
 *
 * `parcial` significa que parte de lo que la pieza afirma no se pudo comprobar contra sus
 * fuentes (`02-editorial.md` §5.4), y el conjunto exacto de pendientes es lo que una
 * persona aceptó por escrito al autorizar la publicación (§8.8). Una pieza que enseña el
 * veredicto y esconde los pendientes se lee como comprobada: es la misma omisión que
 * `01` §1.4 persigue cuando exige la procedencia «abierta por defecto», porque «ellos la
 * colapsan y el lector no se entera de que nadie revisó la nota». Y `01` §1.3 lo dice en
 * su forma general para los avisos de la pieza: **un aviso que exige un clic es un aviso
 * que no se dio**.
 *
 * ## Cómo se comprueba
 *
 * El comportamiento, ejecutando la función sobre las dos piezas de fixture. La estructura,
 * recorriendo el AST de la ficha: dónde cae la lista de pendientes dentro del árbol JSX.
 * Preguntar «¿está dentro de un `<details>`?» con un `includes()` no distingue dos
 * páginas opuestas que contienen las mismas palabras.
 */

const DETALLE = "app/noticias/[slug]/page.tsx";

/** Envoltorios que convierten un aviso en un aviso no dado. */
const ESCONDITES = ["details", "summary", "footer"];

test("AC-NOT-03: un veredicto `parcial` llega con sus pendientes enumerados", () => {
  const pieza = piezaSchema.parse(PIEZA_PARCIAL);
  const revision = revisionDePieza(pieza);

  assert.equal(revision.etiqueta, "Verificación parcial");
  assert.equal(revision.tienePendientes, true);
  assert.deepEqual(revision.pendientes, pieza.procedencia.verificado.pendientes);
  assert.equal(revision.pendientes.length, 2);
  assert.deepEqual(vistaDePieza(pieza).revision, revision, "la ficha ve lo mismo");
});

test("AC-NOT-03: sin pendientes no se inventa un bloque de pendientes", () => {
  // La simétrica, y no es cortesía: un «sin pendientes» en toda pieza entrena al lector a
  // ignorar el bloque, y entonces tampoco lee el que sí los tiene (§1.3, requisito 5).
  const revision = revisionDePieza(piezaSchema.parse(PIEZA_VERIFICADA));
  assert.equal(revision.etiqueta, "Verificación completa");
  assert.equal(revision.tienePendientes, false);
  assert.deepEqual(revision.pendientes, []);
});

test("AC-NOT-03: un veredicto que la pieza no declara no se da por bueno", () => {
  const pieza = piezaSchema.parse({
    ...PIEZA_PARCIAL,
    procedencia: {
      ...PIEZA_PARCIAL.procedencia,
      verificado: { por: "pendiente", detalle: "Sin comprobación registrada." },
    },
  });
  const revision = revisionDePieza(pieza);
  assert.equal(revision.etiqueta, "Verificación no declarada");
  assert.equal(revision.tienePendientes, false);
  assert.notEqual(
    revision.etiqueta,
    "Verificación completa",
    "la ausencia de veredicto no es una verificación: asumirla publicaría una pieza sin " +
      "comprobar como si lo estuviera (§8.8)",
  );
});

test("AC-NOT-03: los pendientes se renderizan en el cuerpo, fuera de todo escondite", () => {
  const envoltorios = envoltoriosDe(leer(DETALLE), "vista.revision.pendientes");

  assert.notEqual(
    envoltorios,
    null,
    "la ficha no renderiza `vista.revision.pendientes` en ninguna parte: el veredicto " +
      "`parcial` quedaría sin sus límites a la vista",
  );
  const escondido = (envoltorios ?? []).filter((e) => ESCONDITES.includes(e.toLowerCase()));
  assert.deepEqual(
    escondido,
    [],
    `los pendientes se renderizan dentro de <${escondido.join(">, <")}>. Un aviso que ` +
      `exige un clic es un aviso que no se dio, y un pie de página no es donde se lee ` +
      `lo que la pieza no pudo comprobar (01 §1.3, §1.4)`,
  );
  assert.ok(
    (envoltorios ?? []).includes("section"),
    "los pendientes van en una sección del cuerpo, con su encabezado",
  );
});

test("AC-NOT-03: la procedencia tampoco se pliega", () => {
  // La misma regla, sobre el otro bloque que `01` §1.4 pide «abierto por defecto».
  const envoltorios = envoltoriosDe(leer(DETALLE), "vista.procedencia");
  assert.notEqual(envoltorios, null, "la ficha no renderiza la procedencia");
  assert.deepEqual(
    (envoltorios ?? []).filter((e) => ESCONDITES.includes(e.toLowerCase())),
    [],
    "la procedencia de las cuatro etapas va abierta: plegarla esconde que nadie revisó la nota",
  );
});

test("AC-NOT-03: la declaración de conflicto de interés tampoco se pliega", () => {
  // El tercer bloque de aviso de la ficha, y el que más se parece a lo que `01` §1.3
  // persigue: la relación declarada existe para que el lector sepa que la pieza cubre
  // trabajo propio o de Inadaptados **antes** de leer el análisis. §4 de `02-editorial.md`
  // la manda «en la pieza, visible», y §1.3 requisito 3 da la forma general: un aviso que
  // exige un clic es un aviso que no se dio. Sin esta sonda, envolverla mañana en un
  // `<details>` pasaba typecheck, lint, los cinco criterios y el build.
  // Todas sus apariciones, no solo la primera: la ficha lee `vista.relacion` dos veces
  // --- en la condición, que cuelga del `<main>`, y en el párrafo que la enseña. Mirar
  // solo la primera dejaría sin comprobar justo el bloque que se renderiza.
  const apariciones = envoltoriosDeCadaUno(leer(DETALLE), "vista.relacion");

  assert.notEqual(
    apariciones.length,
    0,
    "la ficha no renderiza `vista.relacion` en ninguna parte: una pieza sobre trabajo " +
      "propio saldría sin declararlo",
  );
  const escondido = apariciones
    .flat()
    .filter((e) => ESCONDITES.includes(e.toLowerCase()));
  assert.deepEqual(
    escondido,
    [],
    `el conflicto de interés se renderiza dentro de <${escondido.join(">, <")}>. Plegarlo ` +
      `o mandarlo al pie es no declararlo (02-editorial.md §4, 01 §1.3)`,
  );
  assert.ok(
    apariciones.some((e) => e.includes("section")),
    "el texto de la relación va en una sección del cuerpo, antes del análisis",
  );
});

test("AC-NOT-03: la sonda del conflicto de interés se pone roja a propósito", () => {
  // Las tres formas llevan la condición fuera del bloque, igual que la ficha real: es la
  // forma que una sonda sobre la primera aparición no distingue.
  const suelta = `
    <main>{vista.relacion !== null && (
      <section>
        <h2>Relación declarada</h2>
        <p>{vista.relacion}</p>
      </section>
    )}</main>`;
  const plegada = `
    <main>{vista.relacion !== null && (
      <section>
        <details>
          <summary>Relación declarada</summary>
          <p>{vista.relacion}</p>
        </details>
      </section>
    )}</main>`;
  const alPie = `<main>{vista.relacion !== null && (<footer><p>{vista.relacion}</p></footer>)}</main>`;

  const escondidosDe = (fuente: string) =>
    envoltoriosDeCadaUno(fuente, "vista.relacion")
      .flat()
      .filter((e) => ESCONDITES.includes(e));

  assert.deepEqual(escondidosDe(suelta), []);
  assert.deepEqual(
    escondidosDe(plegada),
    ["details"],
    "la sonda no vio el <details> que esconde la declaración de relación",
  );
  assert.deepEqual(
    escondidosDe(alPie),
    ["footer"],
    "un aviso en el pie no es un aviso dado",
  );
  assert.deepEqual(
    envoltoriosDeCadaUno("<p>ninguna relación por aquí</p>", "vista.relacion"),
    [],
    "«no aparece» y «aparece suelta» tienen que ser respuestas distintas",
  );
});

test("AC-NOT-03: la sonda del escondite se pone roja a propósito", () => {
  // Dos fuentes con exactamente las mismas palabras y veredictos opuestos. Si la sonda no
  // separa estas dos, no está comprobando nada.
  const suelta = `
    <section>
      <h2>Revisión</h2>
      <ul>{vista.revision.pendientes.map((p) => <li key={p}>{p}</li>)}</ul>
    </section>`;
  const plegada = `
    <section>
      <details>
        <summary>Revisión</summary>
        <ul>{vista.revision.pendientes.map((p) => <li key={p}>{p}</li>)}</ul>
      </details>
    </section>`;

  assert.deepEqual(
    (envoltoriosDe(suelta, "vista.revision.pendientes") ?? []).filter((e) =>
      ESCONDITES.includes(e),
    ),
    [],
  );
  assert.deepEqual(
    (envoltoriosDe(plegada, "vista.revision.pendientes") ?? []).filter((e) =>
      ESCONDITES.includes(e),
    ),
    ["details"],
    "la sonda no vio el <details> que esconde los pendientes",
  );
  assert.equal(
    envoltoriosDe("<p>sin pendientes por ninguna parte</p>", "vista.revision.pendientes"),
    null,
    "«no aparece» y «aparece suelta» tienen que ser respuestas distintas",
  );
});
