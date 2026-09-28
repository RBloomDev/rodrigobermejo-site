import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { RAIZ, leer, cierreDeImports } from "./navegacion-helpers.ts";
import { getPostData } from "../lib/posts.ts";

/**
 * Un slug que no existe da 404, no 500. Las tres rutas dinamicas, no la que fallaba.
 *
 * Medido el 2026-09-24 contra el servidor de produccion local, recorriendo las rutas con
 * un slug inventado:
 *
 *   /noticias/no-existe   404   correcto
 *   /proyectos/no-existe  404   correcto
 *   /blog/no-existe       500   <-- y asi estaba en `main`
 *
 * La causa: `getPostData` hacia `readFileSync` sin comprobar existencia, lanzaba ENOENT y
 * Next lo servia como error del servidor. Las otras dos rutas ya usaban `notFound()`; el
 * blog era la unica de las tres que no.
 *
 * La diferencia no es cosmetica. Un 500 le dice a un buscador «este recurso existe y esta
 * roto» ---y lo reintenta--- y a una persona «el sitio fallo», cuando lo cierto es que la
 * pagina no existe. Ningun gate lo veia: `next build` solo construye los slugs que SI
 * existen, asi que el camino del slug inexistente no se ejercita nunca.
 *
 * Esta prueba tiene dos mitades a proposito: una comprueba el comportamiento real de la
 * funcion que fallaba, y la otra que las TRES rutas dinamicas tengan su `notFound()` ---
 * porque la correccion se aplica a todos los casos, no al ejemplo.
 */

test("getPostData devuelve null para un slug inexistente, en vez de lanzar", async () => {
  assert.equal(await getPostData("este-slug-no-existe-jamas"), null);
});

test("getPostData sigue leyendo un post real: el arreglo no vacia la funcion", async () => {
  // La otra direccion. Un `return null` incondicional tambien pasaria la prueba de arriba,
  // y romperia el blog entero sin que nada se pusiera rojo.
  const alguno = readdirSync(join(RAIZ, "content", "posts")).find((f) => f.endsWith(".md"));
  assert.ok(alguno, "no hay posts en content/posts: la prueba de arriba no probaria nada");
  const post = await getPostData(alguno.replace(/\.md$/, ""));
  assert.ok(post, "un post que SI existe tiene que leerse");
  assert.ok(post.title, "y traer su titulo");
});

test("las TRES rutas dinamicas llaman notFound(); el blog era la unica que no", () => {
  const dinamicas = rutasDinamicas();
  assert.equal(dinamicas.length, 3, `esperaba 3 rutas dinamicas, encontre ${dinamicas.length}: ${dinamicas.join(", ")}`);

  // Se quitan los comentarios ANTES de medir, y no es un detalle: la primera version de
  // esta prueba daba verde con el arreglo revertido, porque casaba el `notFound()` que
  // aparece dentro del COMENTARIO que explica por que se llama. Leer la mencion como el
  // hecho es exactamente el defecto que estas pruebas persiguen, y lo cometi aqui.
  const sinNotFound = dinamicas.filter(
    (ruta) => !cierreDeImports(ruta).some((a) => /\bnotFound\s*\(/.test(sinComentarios(leer(a)))),
  );

  assert.deepEqual(
    sinNotFound,
    [],
    `estas rutas dinamicas no llaman notFound() en ningun archivo alcanzable, asi que un ` +
      `slug inexistente saldra como 500 en vez de 404: ${sinNotFound.join(", ")}`,
  );
});

/** Un `notFound()` mencionado en prosa no es una llamada. Fuera bloques y de linea. */
function sinComentarios(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Toda `app/**\/[slug]/page.tsx` --- las rutas que reciben un identificador de fuera. */
function rutasDinamicas(): string[] {
  const salida: string[] = [];
  const recorrer = (dir: string) => {
    for (const e of readdirSync(join(RAIZ, dir), { withFileTypes: true })) {
      const hijo = `${dir}/${e.name}`;
      if (e.isDirectory()) recorrer(hijo);
      else if (e.name === "page.tsx" && /\[[^\]]+\]/.test(dir)) salida.push(hijo);
    }
  };
  recorrer("app");
  return salida.sort();
}
