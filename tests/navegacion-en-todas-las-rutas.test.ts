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
    const montajes = capas.filter((c) => /<Navbar[\s/>]/.test(leer(c)));
    return montajes.length > 1;
  });

  assert.deepEqual(
    duplicadas,
    [],
    `estas rutas montan Navbar dos veces —en la página y en un layout ancestro—, ` +
      `así que renderizan dos encabezados: ${duplicadas.join(", ")}`,
  );
});

