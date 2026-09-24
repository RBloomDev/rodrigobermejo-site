import { test } from "node:test";
import assert from "node:assert/strict";

import { CONTEXTS } from "../lib/proof/schema.ts";
import {
  CONTEXTOS,
  CONTEXTOS_COLECTIVOS,
  CONTEXT_COPY,
  creditoDe,
  type Contexto,
} from "../lib/proof/proyectos-filtros.ts";
import { leer } from "./navegacion-helpers.ts";

/**
 * **Ninguna fila afirma con cuántas manos se hizo el trabajo.**
 *
 * El defecto que estas pruebas fijan: `context` se publicaba como una afirmación
 * de composición de equipo. `COLECTIVOS` incluía `rbloomdev`, `inadaptados` y
 * `client`, y de ahí salía la frase «con más manos que las suyas: el crédito es
 * del equipo» en 10 de las 12 filas del feed real —7 de ellas sin respaldo en
 * `docs/`—. El contrato no dice eso: `docs/02-domain-and-evidence-model.md`
 * §Validación de solapamiento define `context` como bajo qué contexto y **para
 * quién** se hizo el trabajo, nunca cuánta gente hubo, y `decisions/0015` §5 dice
 * literalmente que la enmienda «no pide autorizar inferencia alguna».
 *
 * Por qué importa más de lo que parece: afirmar equipo sobre `context: client`
 * publica una cota inferior de dos personas sobre la plantilla de un tercero, que
 * es justo lo que `decisions/0015` §4-ter reserva. Y el caso que lo vuelve
 * indefendible: `proof-of-work` es `context: rbloomdev`, así que la pantalla
 * afirmaba «el crédito es del equipo» sobre el proyecto cuyo rastro completo vive
 * en este mismo repositorio.
 *
 * La distinción de §4-ter **no se colapsa al revés**: donde `docs/` sí declara
 * equipo, el crédito sigue siendo del equipo. Lo que se acota es la lista, y la
 * prueba de abajo la mide contra la línea que la respalda en vez de creerle al
 * código.
 */

/**
 * Lo que una fila no puede decir de un contexto que `docs/` no declara colectivo.
 *
 * Es deliberadamente una sonda de **afirmación**, no de mención: la rama que no
 * afirma equipo sí dice «nunca a las personas», y prohibir la palabra suelta
 * volvería la sonda imposible de satisfacer sin empeorar el texto.
 */
const AFIRMA_COMPOSICION = /\bequipo\b|\bmanos\b|colectiv|\bvarios autores\b|\bcoautor/i;

test("los cuatro contextos del contrato son los mismos en el schema y en el cliente", () => {
  // Mismo precedente y misma razón que `DIMENSIONES_EN_ORDEN`: el módulo del
  // cliente no puede importar `schema.ts` sin arrastrar zod al bundle, así que
  // declara su propia lista y esta prueba impide que las dos se separen.
  assert.deepEqual([...CONTEXTOS], [...CONTEXTS]);
});

test("la lista de contextos colectivos es la que docs/ respalda, y ninguna más", () => {
  // Medir contra la autoridad, no contra el código. `docs/brand/00-brand-brief.md`
  // §Lo que NO se afirma es la línea que manda: nombra a Inadaptados —y a nadie más— como una
  // organización con equipo, y de ahí sale el mandato de atribuir al equipo.
  const brief = leer("docs/brand/00-brand-brief.md");
  const respaldo = /—([^—]+?) es una organización con equipo—/.exec(brief);

  // Control de vacuidad: si la frase se reescribe, esta prueba se pone roja en
  // vez de pasar por no encontrar nada que comparar.
  assert.ok(
    respaldo?.[1],
    "docs/brand/00 debe seguir nombrando qué organización tiene equipo: sin esa línea " +
      "ningún contexto puede declararse colectivo",
  );
  const declarada = respaldo[1]!;

  for (const c of CONTEXTOS_COLECTIVOS) {
    assert.ok(
      declarada.includes(CONTEXT_COPY[c as Contexto] ?? c),
      `el contexto «${c}» se trata como colectivo pero docs/brand/00 no lo nombra como ` +
        `organización con equipo: eso es inferencia (decisions/0015 §5)`,
    );
  }

  const noColectivos = CONTEXTOS.filter((c) => !CONTEXTOS_COLECTIVOS.has(c));
  assert.deepEqual(
    noColectivos.filter((c) => declarada.includes(CONTEXT_COPY[c])),
    [],
    "un contexto que docs/ declara con equipo quedó fuera de CONTEXTOS_COLECTIVOS",
  );
});

test("ninguna copia de crédito afirma equipo para un contexto que docs/ no declara colectivo", () => {
  for (const c of CONTEXTOS) {
    const copia = creditoDe(c);
    assert.ok(copia.length > 0, `el contexto «${c}» necesita su frase de crédito`);

    if (CONTEXTOS_COLECTIVOS.has(c)) {
      // La distinción de §4-ter no se colapsa al revés: donde el contrato declara
      // equipo, el crédito es del equipo y la fila lo dice.
      assert.match(
        copia,
        AFIRMA_COMPOSICION,
        `«${c}» está declarado colectivo y su copia debe atribuir el crédito al equipo`,
      );
    } else {
      assert.doesNotMatch(
        copia,
        AFIRMA_COMPOSICION,
        `la copia de «${c}» afirma composición de equipo: «${copia}». El feed guarda rol y ` +
          `contexto, nunca personas, así que no hay de dónde saber cuántas manos hubo`,
      );
    }

    // Y ninguna rama publica un reparto de autoría, que es lo que §4-ter prohíbe
    // en los dos sentidos.
    assert.doesNotMatch(
      copia,
      /\d+\s*%|por ciento/i,
      `la copia de «${c}» publica un porcentaje de autoría`,
    );
  }
});

test("la copia de crédito se lee como una oración, sin interpolación rota", () => {
  // El defecto vivía en el mismo sitio que el arreglo: `CONTEXT_COPY.client` era
  // «trabajo para un tercero» y se interpolaba en «Trabajo en el contexto de
  // trabajo para un tercero». Una frase que no se puede leer en voz alta.
  for (const c of CONTEXTOS) {
    const copia = creditoDe(c);
    assert.doesNotMatch(copia, /de trabajo para/i, `«${c}» produce una frase con «de trabajo para»`);
    assert.doesNotMatch(copia, /\bde de\b|\bes es\b/i, `«${c}» produce una preposición duplicada`);
    assert.match(copia, /\.$/, `«${c}» debe terminar en punto: es prosa, no una etiqueta`);
  }
});

test("la sonda detecta de verdad: la redacción anterior se pone roja", () => {
  // Control negativo. Sin esto, la prueba de arriba podría estar verde porque el
  // matcher no encuentra nada nunca. Estas son las frases que el defecto
  // publicaba, y la sonda tiene que señalarlas todas.
  const comoEstaba = [
    "Trabajo en el contexto de RBloomDev, con más manos que las suyas: el crédito es del equipo.",
    "Trabajo en el contexto de trabajo para un tercero, con más manos que las suyas.",
    "Trabajo colectivo de varios autores.",
  ];
  for (const frase of comoEstaba) {
    assert.match(frase, AFIRMA_COMPOSICION, `la sonda dejó pasar «${frase}»`);
  }

  // Y no señala lo que sí se puede decir: el rol declarado y el contexto.
  const legitimas = [
    "Contexto declarado en el feed: RBloomDev.",
    "Rol en el feed: autor. Sostiene Construyo y Dirijo.",
    "El feed guarda el rol y el contexto, nunca a las personas.",
  ];
  for (const frase of legitimas) {
    assert.doesNotMatch(frase, AFIRMA_COMPOSICION, `la sonda señala de más «${frase}»`);
  }
});

test("las dos superficies pintan el crédito con la MISMA frase", () => {
  // Si una de las dos vuelve a escribir su propia copia por fila, esto se pone
  // rojo: la divergencia es exactamente cómo apareció el defecto, con el índice
  // y la ficha diciendo cosas distintas del mismo proyecto.
  const indice = leer("components/proof/ExploradorDeProyectos.tsx");
  const ficha = leer("app/proyectos/[slug]/page.tsx");

  assert.match(indice, /creditoDe\(p\.contexto\)/, "el índice debe usar creditoDe");
  assert.match(ficha, /creditoDe\(vista\.contexto\)/, "la ficha debe usar creditoDe");

  for (const [nombre, fuente] of [
    ["el índice", indice],
    ["la ficha", ficha],
  ] as const) {
    assert.doesNotMatch(
      fuente,
      /con más manos que las suyas/,
      `${nombre} volvió a afirmar manos por su cuenta`,
    );
  }
});
