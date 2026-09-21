import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { RAIZ, leer, paginas } from "./navegacion-helpers.ts";

// --- AC-NAV-02 -------------------------------------------------------------

test("AC-NAV-02: el menú móvil es un Client Component aislado", () => {
  const ruta = "components/MenuMovil.tsx";
  assert.ok(
    existsSync(join(RAIZ, ruta)),
    `sin ${ruta} el botón hamburguesa no puede abrir nada: un Server Component no ` +
      `tiene handlers`,
  );

  const fuente = leer(ruta);
  assert.match(
    fuente,
    /^\s*["']use client["']/,
    `${ruta} necesita "use client" en la primera línea: el estado del panel vive en el ` +
      `cliente`,
  );

  // El aislamiento es el punto: el cliente se detiene aquí y no sube al layout
  // ni a ninguna página.
  const contagiados = ["app/layout.tsx", "components/Navbar.tsx", ...paginas()].filter((f) =>
    /^\s*["']use client["']/.test(leer(f)),
  );
  assert.deepEqual(
    contagiados,
    [],
    `el menú móvil volvió cliente a archivos que deben seguir siendo servidor: ` +
      `${contagiados.join(", ")}`,
  );
});

test("AC-NAV-02: el botón controla un panel real y refleja su estado", () => {
  const fuente = leer("components/MenuMovil.tsx");

  const estado = /const\s+\[(\w+),\s*(\w+)\]\s*=\s*useState/.exec(fuente);
  assert.ok(estado, "el panel necesita estado: sin él el botón no puede abrir nada");
  const abierto = estado[1]!;

  assert.match(
    fuente,
    new RegExp(`aria-expanded=\\{${abierto}\\}`),
    `aria-expanded debe reflejar el estado real (${abierto}), no un literal: un lector ` +
      `de pantalla anuncia lo que diga el atributo`,
  );

  const controla = /aria-controls=\{(\w+)\}/.exec(fuente);
  assert.ok(controla, "el botón debe declarar aria-controls apuntando al panel");
  const idPanel = controla[1]!;

  assert.match(
    fuente,
    new RegExp(`id=\\{${idPanel}\\}`),
    `aria-controls apunta a ${idPanel} y ningún elemento lleva ese id: un aria-controls ` +
      `que no resuelve es peor que ninguno`,
  );

  // El panel se renderiza siempre y se oculta con `hidden`. Si solo existiera
  // cuando está abierto, el `aria-controls` del botón cerrado apuntaría a la
  // nada — que es justo lo que la prueba de arriba cree haber descartado.
  assert.match(
    fuente,
    new RegExp(`hidden=\\{!${abierto}\\}`),
    `el panel debe existir siempre y ocultarse con hidden={!${abierto}}, para que ` +
      `aria-controls resuelva también con el menú cerrado`,
  );

  assert.match(
    fuente,
    /aria-label=\{[^}]*Cerrar menú[^}]*Abrir menú[^}]*\}|aria-label=\{[^}]*Abrir menú[^}]*Cerrar menú[^}]*\}/,
    "el microcopy del botón es `Abrir menú` / `Cerrar menú` en aria-label " +
      "(docs/brand/03-copy-deck.md §3)",
  );
});

test("AC-NAV-02: Escape cierra el panel y devuelve el foco al botón", () => {
  const fuente = leer("components/MenuMovil.tsx");

  assert.match(
    fuente,
    /["']Escape["']/,
    "sin manejo de Escape el único modo de cerrar es encontrar el botón a ciegas",
  );

  const ref = /ref=\{(\w+)\}/.exec(fuente);
  assert.ok(ref, "el botón necesita una ref para poder recuperar el foco");

  assert.match(
    fuente,
    new RegExp(`${ref[1]!}\\.current\\?\\.focus\\(\\)`),
    `al cerrar con Escape el foco debe volver al botón (${ref[1]!}): si se queda en el ` +
      `panel oculto, el siguiente Tab empieza desde la nada`,
  );

  assert.match(
    fuente,
    /removeEventListener\(\s*["']keydown["']/,
    "el listener de teclado se desmonta: uno colgado por cada apertura es una fuga",
  );
});

test("AC-NAV-02: el Navbar monta el menú móvil y ya no dibuja un botón muerto", () => {
  const fuente = leer("components/Navbar.tsx");

  assert.match(
    fuente,
    /<MenuMovil[\s/>]/,
    "el Navbar debe montar MenuMovil: es el único que tiene handlers",
  );

  const botonesSueltos = fuente.match(/<button/g) ?? [];
  assert.deepEqual(
    botonesSueltos,
    [],
    "el Navbar es un Server Component: cualquier <button> que declare aquí es un " +
      "afordance muerto, que es peor que ningún afordance",
  );
});

