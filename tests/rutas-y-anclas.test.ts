import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { RAIZ, leer, paginas, cierreDeImports } from "./navegacion-helpers.ts";

/**
 * AC-POR-01 — las rutas nuevas existen, con sus anclas y su fila en el sitemap.
 *
 * `docs/brand/02-arquitectura-y-urls.md` §1 separa identidad de comercio: `/`
 * deja de ser el funnel, la cadena comercial entera se muda a `/colaborar` y la
 * trayectoria a `/sobre-mi`. Lo que este archivo fija no es el diseño —eso es
 * revisión— sino las tres cosas que se rompen **en silencio** al mover archivos:
 * una ruta que no existe, un `id` renombrado que convierte
 * `/sobre-mi#inadaptados` en scroll a ninguna parte, y una ruta viva fuera del
 * sitemap, que no es descubrible.
 *
 * Los otros dos criterios machine de este work item viven en archivos aparte,
 * porque el Orchestrator los invoca uno por uno: `tests/guard-funnel-falsable.test.ts`
 * (AC-POR-02) y `tests/portada-sin-feed.test.ts` (AC-POR-03).
 */

test("AC-POR-01: /colaborar y /sobre-mi existen como rutas renderizables", () => {
  const faltantes = ["app/colaborar/page.tsx", "app/sobre-mi/page.tsx"].filter(
    (p) => !existsSync(join(RAIZ, p)),
  );

  assert.deepEqual(
    faltantes,
    [],
    `docs/brand/02 §1 declara estas dos rutas. Sin ellas el menú publica un 404: ${faltantes.join(", ")}`,
  );
});

test("AC-POR-01: los id 'inadaptados' y 'docencia' existen en /sobre-mi", () => {
  // No son decoración: `docs/brand/02` §2 los llama «parte del contrato de esta
  // página». El menú enlaza `/sobre-mi#inadaptados` y `/sobre-mi#docencia`, así
  // que si el copy renombra las secciones, los `id` no cambian.
  const alcanzables = cierreDeImports("app/sobre-mi/page.tsx");

  for (const fragmento of ["inadaptados", "docencia"]) {
    const presente = alcanzables.some((archivo) =>
      new RegExp(`id=["']${fragmento}["']`).test(leer(archivo)),
    );
    assert.ok(
      presente,
      `ningún id="${fragmento}" en el cierre de imports de /sobre-mi. El ancla del menú ` +
        `no resuelve y el enlace hace scroll a ninguna parte (docs/brand/02 §2)`,
    );
  }
});

test("AC-POR-01: toda ruta estática del App Router está en app/sitemap.ts", () => {
  // Los dos conjuntos, no uno: lo que el sitemap enumera y lo que el árbol
  // renderiza. Comprobar un solo lado deja pasar la ruta nueva que nadie añadió
  // —el defecto que `docs/brand/02` §4 nombra para `/colaborar` y `/sobre-mi`— y
  // también la fila que quedó apuntando a una ruta borrada.
  const fuente = leer("app/sitemap.ts");

  const estaticas = paginas()
    .filter((p) => !p.includes("["))
    .map((p) => p.replace(/^app/, "").replace(/\/page\.tsx$/, ""))
    .map((ruta) => (ruta === "" ? "/" : ruta));

  const ausentes = estaticas.filter((ruta) =>
    ruta === "/" ? !/url:\s*baseUrl\b/.test(fuente) : !fuente.includes(`\${baseUrl}${ruta}\``),
  );

  assert.deepEqual(
    ausentes,
    [],
    `estas rutas existen y no están en el sitemap: no son descubribles (docs/brand/02 §4): ` +
      `${ausentes.join(", ")}`,
  );
});
