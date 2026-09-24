import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { RAIZ, cierreDeImports } from "./navegacion-helpers.ts";

/**
 * AC-POR-03 — la portada no puede leer el feed, por ninguna cadena de imports.
 *
 * Es el invariante 4 de `docs/04-architecture.md` §4 visto desde la portada
 * nueva, que es —dice el propio guard, `scripts/check-funnel-isolation.mjs:36-38`—
 * «donde resulta más tentador ponerlo, para "ensenar unos proyectos en la home"».
 * `docs/brand/02` §3 lo dice sin rodeos: el trabajo que muestra la portada es
 * copy editorial estático y llega a la lista canónica con un `<Link>`. Enlazar
 * sí; importar no. Atarlo al artefacto que publica otro repo haría que la ruta de
 * identidad se rompiera por un problema de evidencia.
 *
 * Dos comprobaciones distintas, y las dos hacen falta: una lee el árbol de
 * imports con el lector del repo, y la otra comprueba que **el gate de CI**
 * también lo vería. Si el guard dejara de cubrir `app/page.tsx`, la primera
 * seguiría verde y CI no diría nada.
 */

const GUARD = "scripts/check-funnel-isolation.mjs";

/** Los prefijos de ruta que pertenecen al sistema de evidencia. */
const PROHIBIDOS = [
  "lib/proof",
  "lib/evidence",
  "components/proof",
  "components/evidence",
  "app/proyectos",
  "app/evidencia",
  "app/actividad",
];

test("AC-POR-03: el cierre de imports de la portada no alcanza lib/proof/**", () => {
  const alcanzados = cierreDeImports("app/page.tsx").filter((archivo) =>
    PROHIBIDOS.some((prefijo) => archivo.startsWith(prefijo)),
  );

  assert.deepEqual(
    alcanzados,
    [],
    `la portada alcanza el sistema de evidencia: ${alcanzados.join(", ")} ` +
      `(docs/04 §4 invariante 4)`,
  );
});

test("AC-POR-03: tampoco lo alcanza /sobre-mi, que no es entrada del guard", () => {
  // `app/sobre-mi/page.tsx` NO está en `FUNNEL_ENTRYPOINTS`, y el guard explica
  // por qué en `scripts/check-funnel-isolation.mjs:54-59`: no monta ningún
  // componente del funnel, así que meterla diluiría lo que esa lista significa.
  // El precio de esa decisión es que CI no la cubre, y el guard dice que esta
  // prueba se hace cargo. Esta es la prueba: sin ella, esa frase del guard sería
  // un contrato documentado y no implementado.
  const alcanzados = cierreDeImports("app/sobre-mi/page.tsx").filter((archivo) =>
    PROHIBIDOS.some((prefijo) => archivo.startsWith(prefijo)),
  );

  assert.deepEqual(
    alcanzados,
    [],
    `/sobre-mi alcanza el sistema de evidencia: ${alcanzados.join(", ")}. Es copy ` +
      `editorial de docs/brand/03 §5 y dos enlaces (docs/brand/02 §3)`,
  );
});

test("AC-POR-03: guard:funnel se pone rojo si la portada importa el feed", () => {
  const contaminada = "app/__prueba-portada-contaminada.tsx";
  const rutaAbs = join(RAIZ, contaminada);
  try {
    writeFileSync(
      rutaAbs,
      'import { leerFeed } from "@/lib/proof/feed";\nexport default function P() { return null; }\n',
      "utf8",
    );
    const rojo = spawnSync(process.execPath, [join(RAIZ, GUARD), contaminada], {
      cwd: RAIZ,
      encoding: "utf8",
    });
    assert.notEqual(
      rojo.status,
      0,
      "el guard salió 0 con un import de lib/proof en una página de app/. Está desconectado",
    );
  } finally {
    rmSync(rutaAbs, { force: true });
  }

  // …y que la portada real esté entre lo que el gate recorre.
  assert.ok(
    execFileSync(process.execPath, [join(RAIZ, GUARD)], { cwd: RAIZ, encoding: "utf8" }).includes(
      "OK",
    ),
  );
});
