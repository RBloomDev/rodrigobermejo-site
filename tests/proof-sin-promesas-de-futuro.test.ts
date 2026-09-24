import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";

import { RAIZ, leer } from "./navegacion-helpers.ts";

/**
 * Las cuatro palabras que el contrato de presentación prohíbe en pantalla.
 *
 * `docs/05-feed-contract.md` § Contrato de presentación → *Lo que acompaña siempre
 * a un claim sin evidencia*, literal: «**sin las palabras “todavía”, “aún”,
 * “pronto” ni “en construcción”**: la tercera fila explica una condición del
 * mundo, no un retraso del proyecto». `decisions/0015` §4-ter lo generaliza a
 * todo hueco: «no es cero, no es “pendiente”, no es “próximamente”».
 *
 * ## Por qué esta prueba existe
 *
 * `components/proof/AlcanceDeLaAfirmacion.tsx` **declaraba la regla en su
 * cabecera y la rompía doce líneas más abajo**: el motivo del claim
 * `decido-arquitectura` decía «el motor todavía no las recolecta». La regla
 * llevaba viva desde que se escribió el componente y nadie la vio, porque no
 * había nada que la mirara. Una regla sin prueba es una intención.
 *
 * ## Qué mira y qué no
 *
 * Mira el texto que llega a la pantalla. **Los comentarios se descartan**, porque
 * ahí es donde vive el enunciado de la propia regla —que necesita nombrar las
 * cuatro palabras para prohibirlas— y porque un comentario no lo lee nadie desde
 * el navegador. Lo que no puede ver: una promesa de futuro escrita con otras
 * palabras. Para eso está la revisión.
 */

/** Descarta comentarios de bloque y de línea sin tocar las URLs del código. */
function soloLoQueSeRenderiza(fuente: string): string {
  return fuente
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((linea) => !/^\s*(\/\/|\*)/.test(linea))
    .join("\n");
}

const PROHIBIDAS = ["todavía", "aún", "pronto", "en construcción", "próximamente"];

/** Un trozo de texto alrededor del hallazgo, para que el fallo diga dónde mirar. */
function contexto(texto: string, indice: number): string {
  return texto.slice(Math.max(0, indice - 45), indice + 45).replace(/\s+/g, " ").trim();
}

/** Las superficies del sistema de evidencia: sus huecos son el contenido. */
function superficies(): string[] {
  return [
    ...readdirSync(join(RAIZ, "components/proof")).map((f) => `components/proof/${f}`),
    "app/evidencia/page.tsx",
    "app/proyectos/page.tsx",
    "app/proyectos/[slug]/page.tsx",
  ];
}

test("ninguna superficie de evidencia promete futuro en pantalla", () => {
  const hallazgos: string[] = [];

  for (const archivo of superficies()) {
    const texto = soloLoQueSeRenderiza(leer(archivo));
    for (const palabra of PROHIBIDAS) {
      const encontrada = new RegExp(palabra, "i").exec(texto);
      if (encontrada) hallazgos.push(`${archivo}: «${palabra}» en «${contexto(texto, encontrada.index)}»`);
    }
  }

  assert.deepEqual(
    hallazgos,
    [],
    `una ausencia de evidencia no es un retraso del proyecto, y estas palabras dicen que ` +
      `lo es (docs/05 § Contrato de presentación):\n${hallazgos.join("\n")}`,
  );
});

test("la prueba mira de verdad el texto renderizado, no el archivo entero", () => {
  // Control negativo: si el filtro de comentarios se comiera todo, la prueba de
  // arriba sería verde por vacío. Estas dos aserciones fijan que distingue.
  const muestra = [
    "/** Un comentario que dice todavía y no se renderiza. */",
    "// otro que dice pronto",
    'const x = "el texto que sí se renderiza";',
  ].join("\n");

  const visible = soloLoQueSeRenderiza(muestra);
  assert.doesNotMatch(visible, /todavía|pronto/);
  assert.match(visible, /el texto que sí se renderiza/);
});
