import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { RAIZ, leer, cierreDeImports } from "./navegacion-helpers.ts";

// --- AC-NAV-03 -------------------------------------------------------------

test("AC-NAV-03: ningún href de navegación lleva un carácter acentuado", async () => {
  const { DESTINOS } = await import("../lib/navegacion.ts");

  const acentuados = DESTINOS.filter((d) => /[^\x20-\x7E]/.test(d.href)).map(
    (d) => `${d.etiqueta} → ${d.href}`,
  );

  assert.deepEqual(
    acentuados,
    [],
    `un href con acento no resuelve a ningún id: así estaba roto «Sobre mí» → /#sobre-mí ` +
      `(docs/brand/02 §2). ${acentuados.join(", ")}`,
  );
});

test("AC-NAV-03: el href se declara, no se deriva de la etiqueta", () => {
  // `.replace(` es la huella exacta del defecto: el href salía de
  // `item.toLowerCase().replace(" ", "-").replace("ó", "o")`. Y además de
  // producir un acento, `String.prototype.replace` con un literal sustituye
  // **solo la primera ocurrencia**, así que el patrón tampoco escalaba a una
  // etiqueta de tres palabras.
  for (const archivo of ["components/Navbar.tsx", "components/MenuMovil.tsx"]) {
    assert.doesNotMatch(
      leer(archivo),
      /\.replace\(/,
      `${archivo} transforma texto para construir navegación. El href se declara junto a ` +
        `su etiqueta en lib/navegacion.ts: derivarlo acopla la URL al copy, y cambiar una ` +
        `palabra del menú rompe un enlace (docs/brand/02 §2)`,
    );
  }

  assert.match(
    leer("components/Navbar.tsx"),
    /from\s+["']@\/lib\/navegacion["']/,
    "los destinos tienen una sola fuente: lib/navegacion.ts. Un segundo array en el " +
      "Navbar es la copia que después diverge",
  );
});

test("AC-NAV-03: todo destino renderizado existe, y toda ancla resuelve a un id real", async () => {
  const { DESTINOS } = await import("../lib/navegacion.ts");

  const rotos: string[] = [];

  for (const destino of DESTINOS) {
    if (!destino.disponible) continue;

    const [ruta, fragmento] = destino.href.split("#");
    const segmentos = (ruta ?? "/").split("/").filter(Boolean);
    const pagina = `app/${segmentos.join("/")}${segmentos.length > 0 ? "/" : ""}page.tsx`;

    if (!existsSync(join(RAIZ, pagina))) {
      rotos.push(`${destino.etiqueta} → ${destino.href} (no existe ${pagina})`);
      continue;
    }

    if (!fragmento) continue;

    const alcanzable = cierreDeImports(pagina).some((archivo) =>
      new RegExp(`id=["']${fragmento}["']`).test(leer(archivo)),
    );
    if (!alcanzable) {
      rotos.push(`${destino.etiqueta} → ${destino.href} (ningún id="${fragmento}" en la ruta)`);
    }
  }

  assert.deepEqual(
    rotos,
    [],
    `estos destinos del menú están marcados disponibles y no resuelven. Marcar ` +
      `disponible una ruta que no existe publica un 404 en la navegación principal: ` +
      `${rotos.join("; ")}`,
  );
});

