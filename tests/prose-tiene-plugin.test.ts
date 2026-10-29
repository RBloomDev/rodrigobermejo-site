import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Si algún componente usa clases `prose`, el CSS carga el plugin que las genera.
 *
 * Medido el 2026-10-29 abriendo `/blog/[slug]` en Chrome a 1280 y 390 px: los artículos se
 * renderizaban **sin ningún estilo de lectura**. Encabezados del tamaño del párrafo, cero
 * espacio entre párrafos, listas numeradas sin números, citas sin distinguir, y un bloque de
 * código que desbordaba la página entera 2,017 px en escritorio y 2,651 en móvil.
 *
 * La causa: `app/blog/[slug]/page.tsx` declara `prose prose-lg prose-headings:...` y
 * `@tailwindcss/typography` está en `devDependencies`, pero en Tailwind v4 un plugin se carga
 * con `@plugin` en el CSS, y `app/globals.css` nunca lo tuvo. Sin esa línea las clases
 * `prose*` no generan una sola regla. `docs/audits/2026-08-19-site-baseline.md:12` da el
 * plugin por parte del stack: lo estaba en `package.json`, no en el CSS.
 *
 * Nadie lo vio porque ningún gate mira el CSS generado: `tsc`, `lint`, la suite y
 * `next build` pasan igual con o sin el plugin.
 *
 * ## Lo que esta prueba NO puede ver
 *
 * Que los estilos se vean bien. Verde aquí significa «las clases `prose` tienen de dónde
 * salir», no «el artículo se lee bien». Eso es navegador.
 */

const RAIZ = process.cwd();
const PLUGIN = /@plugin\s+["']@tailwindcss\/typography["']\s*;/;
const PROSE = /className=\{?["'`][^"'`]*\bprose\b/;

const fuentes = (dir: string): string[] =>
  readdirSync(join(RAIZ, dir)).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(join(RAIZ, ruta)).isDirectory()) return fuentes(ruta);
    return /\.tsx$/.test(nombre) ? [ruta] : [];
  });

test("las clases prose tienen plugin: si un componente las usa, globals.css carga @tailwindcss/typography", () => {
  const conProse = [...fuentes("app"), ...fuentes("components")].filter((f) =>
    PROSE.test(readFileSync(join(RAIZ, f), "utf8")),
  );
  // Si esto falla, la prueba dejó de vigilar algo: hoy el artículo del blog usa `prose`.
  assert.ok(conProse.includes(join("app", "blog", "[slug]", "page.tsx")), "app/blog/[slug]/page.tsx debería usar prose");

  const css = readFileSync(join(RAIZ, "app", "globals.css"), "utf8");
  assert.match(
    css,
    PLUGIN,
    `${conProse.join(", ")} usan clases prose, pero app/globals.css no tiene @plugin "@tailwindcss/typography": esas clases no generan CSS.`,
  );
});
