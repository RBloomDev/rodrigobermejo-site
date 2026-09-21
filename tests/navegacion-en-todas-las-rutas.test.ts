import { test } from "node:test";
import assert from "node:assert/strict";
import { leer, paginas, layoutsAncestros } from "./navegacion-helpers.ts";

// --- AC-NAV-01 -------------------------------------------------------------

test("AC-NAV-01: toda ruta renderizable monta Navbar y Footer", () => {
  const sinCromo = paginas().filter((pagina) => {
    const fuentes = [pagina, ...layoutsAncestros(pagina)].map(leer);
    const conNavbar = fuentes.some((f) => /<Navbar[\s/>]/.test(f));
    const conFooter = fuentes.some((f) => /<Footer[\s/>]/.test(f));
    return !(conNavbar && conFooter);
  });

  assert.deepEqual(
    sinCromo,
    [],
    `estas rutas son callejones sin salida: se entra por un enlace y no hay forma de ` +
      `volver. El cromo se monta en la página o en uno de sus layouts: ${sinCromo.join(", ")}`,
  );
});

test("AC-NAV-01: el cromo se monta una sola vez por ruta", () => {
  const duplicadas = paginas().filter((pagina) => {
    const capas = [pagina, ...layoutsAncestros(pagina)];
    return ["Navbar", "Footer"].some((componente) => {
      const patron = new RegExp(`<${componente}[\\s/>]`);
      return capas.filter((c) => patron.test(leer(c))).length > 1;
    });
  });

  assert.deepEqual(
    duplicadas,
    [],
    `estas rutas montan Navbar o Footer en más de una capa: ${duplicadas.join(", ")}`,
  );
});

test("N-NAV-04: la cadena flex conserva el crecimiento del contenido del blog", () => {
  assert.match(
    leer("app/layout.tsx"),
    /<div className="flex-grow flex flex-col">\{children\}<\/div>/,
    "el envoltorio compartido debe propagar el crecimiento como contenedor flex",
  );
  for (const pagina of ["app/blog/page.tsx", "app/blog/[slug]/page.tsx"]) {
    assert.match(
      leer(pagina),
      /return\s*\(\s*<div className="flex flex-col flex-grow">/,
      `${pagina}: el envoltorio debe crecer para que su main ocupe el espacio disponible`,
    );
  }
});
