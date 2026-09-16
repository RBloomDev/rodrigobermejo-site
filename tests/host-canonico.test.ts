import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

import { HOST_CANONICO, baseUrl } from "../lib/site.ts";

/**
 * El host canónico, y por qué esto es una prueba y no un comentario.
 *
 * ## El defecto que fija
 *
 * El default vivía duplicado en `app/layout.tsx`, `app/robots.ts` y
 * `app/sitemap.ts`, y en los tres era el **apex** —`https://rodrigobermejo.com`—
 * mientras el sitio sirve en `www`. Medido contra producción el 2026-09-15: las
 * 19 URLs del sitemap en el apex, y el apex respondiendo `307 → www`.
 *
 * `NEXT_PUBLIC_SITE_URL` nunca se definió en Vercel, así que el default **era**
 * el valor en producción. Un default que contradice a `.env.example` no es un
 * detalle de configuración: es el valor real publicado.
 *
 * ## Por qué el último test mira el árbol y no el módulo
 *
 * Centralizar en `lib/site.ts` arregla las tres copias de hoy; no impide la
 * cuarta. El defecto original no fue escribir mal el valor —fue **duplicarlo**,
 * y que las copias divergieran sin que nada fallara. Así que la prueba que
 * importa no es «¿el módulo devuelve www?» sino **«¿alguien volvió a escribir el
 * host a mano?»**, y esa solo se puede hacer sobre los archivos.
 */

test("el default es el host que SIRVE, no el que redirige", () => {
  assert.equal(HOST_CANONICO, "https://www.rodrigobermejo.com");
  assert.ok(
    HOST_CANONICO.startsWith("https://www."),
    "el apex responde 307 y redirige a www: publicarlo como canónico divide la señal",
  );
});

test("sin NEXT_PUBLIC_SITE_URL se cae al canónico, no al apex", () => {
  const previo = process.env["NEXT_PUBLIC_SITE_URL"];
  delete process.env["NEXT_PUBLIC_SITE_URL"];
  try {
    assert.equal(baseUrl(), HOST_CANONICO);
  } finally {
    if (previo !== undefined) process.env["NEXT_PUBLIC_SITE_URL"] = previo;
  }
});

test("NEXT_PUBLIC_SITE_URL sigue ganando: los previews se describen a si mismos", () => {
  const previo = process.env["NEXT_PUBLIC_SITE_URL"];
  process.env["NEXT_PUBLIC_SITE_URL"] = "https://preview.example.com";
  try {
    assert.equal(baseUrl(), "https://preview.example.com");
  } finally {
    if (previo === undefined) delete process.env["NEXT_PUBLIC_SITE_URL"];
    else process.env["NEXT_PUBLIC_SITE_URL"] = previo;
  }
});

test("NADIE escribe el host a mano: el apex no aparece en ningun archivo versionado", () => {
  // Las excepciones son los archivos cuyo texto **explica este mismo defecto**:
  // `.env.example` lo documenta, `lib/site.ts` y esta prueba lo citan para decir
  // qué se corrigió. `README.md` nombra el proyecto, no una URL.
  //
  // Que `lib/site.ts` esté aquí no abre un hueco: su constante la fija el primer
  // test de este archivo contra el valor exacto, que es una comprobación más
  // fuerte que la ausencia de una cadena.
  //
  // > **Esta prueba dio un verde falso la primera vez.** Pasó en local y falló en
  // > CI, y la causa es que `git grep` **solo mira archivos trackeados**: los dos
  // > archivos nuevos todavía no estaban en el índice cuando se corrió. Una
  // > prueba que consulta el índice de git se comporta distinto antes y después
  // > de `git add`, y eso hay que saberlo al escribirla.
  const PERMITIDOS = new Set([
    ".env.example",
    "README.md",
    "lib/site.ts",
    "tests/host-canonico.test.ts",
  ]);

  let salida = "";
  try {
    salida = execFileSync("git", ["grep", "-l", "https://rodrigobermejo.com"], {
      encoding: "utf8",
      cwd: new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
    });
  } catch (e) {
    // `git grep` sale 1 cuando no hay coincidencias: es el caso bueno.
    const err = e as { status?: number; stdout?: string };
    if (err.status === 1) salida = "";
    else throw e;
  }

  const culpables = salida
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((f) => !f.startsWith("docs/"))
    .filter((f) => !PERMITIDOS.has(f));

  assert.deepEqual(
    culpables,
    [],
    `estos archivos escriben el host a mano en vez de importar lib/site.ts: ${culpables.join(", ")}. ` +
      `Cada copia es una oportunidad de que diverja, y así empezó el defecto original`,
  );
});
