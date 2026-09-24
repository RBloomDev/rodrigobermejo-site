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

/**
 * Los destinos que el menú publica, comprobando que cada uno resuelve a una página real y
 * a un `id` real. Se parametriza por la tabla para poder ejercitarla con una tabla
 * sintética: desde que las siete entradas de `DESTINOS` están en `disponible: true`, la
 * rama que salta un destino no disponible no la ejercita ningún caso, y un mecanismo sin
 * cobertura en la dirección que importa es un mecanismo que no se sabe si funciona.
 */
function destinosRotos(destinos: readonly { etiqueta: string; href: string; disponible: boolean }[]) {
  const rotos: string[] = [];

  for (const destino of destinos) {
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

  return rotos;
}

test("AC-NAV-03: todo destino renderizado existe, y toda ancla resuelve a un id real", async () => {
  const { DESTINOS } = await import("../lib/navegacion.ts");
  const rotos = destinosRotos(DESTINOS);

  assert.deepEqual(
    rotos,
    [],
    `estos destinos del menú están marcados disponibles y no resuelven. Marcar ` +
      `disponible una ruta que no existe publica un 404 en la navegación principal: ` +
      `${rotos.join("; ")}`,
  );
});

test("AC-NAV-03: la bandera `disponible` sigue discriminando, y el guard la respeta", async () => {
  // Las siete entradas de `DESTINOS` están hoy en `true` —`/noticias` fue la última en
  // aterrizar—, así que el guard de arriba nunca recorre la rama del destino no
  // disponible. Mientras la bandera se conserve para el próximo destino de
  // `docs/brand/02` §2 que el árbol todavía no tenga, su mecanismo tiene que seguir
  // siendo falsable: aquí se ejercita con una tabla sintética.
  const { DESTINOS, DESTINOS_VISIBLES } = await import("../lib/navegacion.ts");

  const inexistente = { etiqueta: "Actividad", href: "/actividad", disponible: true };
  assert.deepEqual(
    destinosRotos([inexistente]),
    ["Actividad → /actividad (no existe app/actividad/page.tsx)"],
    "marcar disponible una ruta que no existe tiene que ponerse rojo; si no, la bandera " +
      "no protege de nada",
  );
  assert.deepEqual(
    destinosRotos([{ ...inexistente, disponible: false }]),
    [],
    "y declararla no disponible la deja fuera de la comprobación: esa es la rama que la " +
      "tabla real ya no ejercita",
  );

  // Y la otra mitad del mecanismo: lo que el menú renderiza sale del filtro, así que un
  // destino no disponible no llega a publicarse como enlace.
  const sintetica = [...DESTINOS, { ...inexistente, disponible: false }];
  assert.equal(
    sintetica.filter((d) => d.disponible).length,
    DESTINOS_VISIBLES.length,
    "`DESTINOS_VISIBLES` publica exactamente los disponibles",
  );
  assert.equal(
    DESTINOS_VISIBLES.some((d) => d.href === "/actividad"),
    false,
  );
});

