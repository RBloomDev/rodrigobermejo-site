import { test } from "node:test";
import assert from "node:assert/strict";

// --- AC-NAV-04 (la tabla normativa, convertida en prueba) -------------------

test("AC-NAV-04: los destinos son los de docs/brand/02 §2, con el copy de docs/brand/03 §3", async () => {
  const { DESTINOS } = await import("../lib/navegacion.ts");

  // Copiada de `docs/brand/02-arquitectura-y-urls.md` §2 —los destinos— con las
  // etiquetas de `docs/brand/03-copy-deck.md` §3, que es autoridad del texto.
  // «Noticias» la añadió S-B y solo está en §2.
  const CONTRATO = [
    ["Trabajo", "/proyectos"],
    ["Noticias", "/noticias"],
    ["Inadaptados", "/sobre-mi#inadaptados"],
    ["Docencia", "/sobre-mi#docencia"],
    ["Escribo", "/blog"],
    ["Trayectoria", "/sobre-mi"],
    ["Trabajar conmigo", "/colaborar"],
  ];

  assert.deepEqual(
    DESTINOS.map((d) => [d.etiqueta, d.href]),
    CONTRATO,
    "el menú divergió de la tabla normativa. Las etiquetas las manda el copy deck y los " +
      "destinos el documento de arquitectura: ninguna de las dos se inventa aquí",
  );
});
