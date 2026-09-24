import { test } from "node:test";
import assert from "node:assert/strict";
import { paginas, leer, cierreDeImports } from "./navegacion-helpers.ts";

/**
 * Toda ruta renderizable tiene exactamente un `<h1>`.
 *
 * Medido el 2026-09-24 abriendo las ocho rutas en Chrome, no leyendo el codigo: siete
 * tenian su `h1` y `/blog` tenia **cero**. Su encabezado visible era un `<h2>` que decia
 * «Insights de Automatizacion», con una bajada sobre «negocios digitales eficientes» ---
 * copy comercial de la plantilla que contradice el reposicionamiento entero, y que
 * `docs/brand/03-copy-deck.md:273` sustituyo por «Escribo» hace varias tareas. El
 * `metadata.title` SI se actualizo; lo que se ve en pantalla, no.
 *
 * Los dos defectos venian juntos y por la misma causa: la pagina heredaba su encabezado de
 * `SectionHeader`, que siempre renderiza `<h2>`. Nadie lo noto porque ningun gate mira la
 * jerarquia de encabezados: `tsc`, `lint`, la suite y `next build` pasaron los tres meses
 * que llevaba asi.
 *
 * ## Por que cuenta el cierre de imports y no el archivo
 *
 * Una pagina puede poner su `h1` en un componente que importa ---y varias lo hacen---, asi
 * que contar solo `page.tsx` daria rojo sobre paginas correctas. Se recorre el cierre de
 * imports, igual que el resto de pruebas de navegacion.
 *
 * ## Lo que esta prueba NO puede ver
 *
 * Que el `h1` este dentro de una rama que no se renderiza, o que el texto sea el
 * equivocado. Eso es revision y navegador. Verde aqui significa «hay exactamente un h1
 * alcanzable», no «el encabezado dice lo que debe».
 */

/** `<h1`, `<h1>` o `<h1 className=...>`, pero no `<h10` ni el texto «h1» en prosa. */
const H1 = /<h1[\s>/]/g;

const RUTAS_SIN_PAGINA_PROPIA = new Set<string>([
  // `not-found` no es una ruta navegable del sitio: la monta Next cuando nada coincide.
  "app/not-found.tsx",
]);

test("ninguna ruta se queda sin h1 --- /blog se quedo, y ningun gate lo vio", () => {
  const sinH1: string[] = [];

  for (const pagina of paginas()) {
    if (RUTAS_SIN_PAGINA_PROPIA.has(pagina)) continue;
    const cuantos = cierreDeImports(pagina)
      .map((archivo) => (leer(archivo).match(H1) ?? []).length)
      .reduce((a, b) => a + b, 0);
    if (cuantos === 0) sinH1.push(pagina);
  }

  assert.deepEqual(
    sinH1,
    [],
    `estas rutas no tienen ningun <h1> alcanzable, ni propio ni en los componentes que ` +
      `importan: ${sinH1.join(", ")}. Una pagina sin h1 no tiene encabezado para un lector ` +
      `de pantalla ni para un buscador, y el titulo de la pestana no lo sustituye: ese vive ` +
      `en metadata y no se lee en la pagina.`,
  );
});

test("/blog dice lo que el copy deck manda, no lo que decia la plantilla", () => {
  // La segunda mitad del mismo defecto. Se fija el texto RETIRADO, no el nuevo: fijar el
  // nuevo convertiria esto en un gate de frase literal que se pone verde pegando la frase.
  const alcanzables = cierreDeImports("app/blog/page.tsx").map((a) => leer(a));
  const plantilla = ["Insights de Automatización", "negocios digitales eficientes"];

  const sobreviven = plantilla.filter((frase) => alcanzables.some((t) => t.includes(frase)));

  assert.deepEqual(
    sobreviven,
    [],
    `/blog todavia muestra copy comercial de la plantilla: ${sobreviven.join(" | ")}. ` +
      `docs/brand/03-copy-deck.md:273 fija esta ruta como «Escribo», y el reposicionamiento ` +
      `saco los terminos comerciales del sitio a proposito.`,
  );
});
