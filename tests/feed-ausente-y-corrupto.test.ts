import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { FeedInvalidoError } from "../lib/proof/feed.ts";
import { vistaDeProyectos } from "../lib/proof/proyectos-vista.ts";
import { cierreDeImports, leer } from "./navegacion-helpers.ts";

/**
 * `AC-PRY-03` — los dos estados del feed vistos desde `/proyectos`.
 *
 * | Estado del feed | Qué tiene que pasar |
 * |---|---|
 * | Ausente | La ruta renderiza su **estado declarado** y el build sigue verde |
 * | Corrupto | **Falla ruidosamente**, con el error del lector |
 *
 * Las dos mitades hacen falta. Sin la segunda, el patrón cómodo —capturar todo
 * fallo como «ausente»— daría un build verde indistinguible del estado legítimo,
 * que `docs/05` declara peor que fallar. Y sin la primera, un feed que todavía no
 * existe tiraría la ruta: `docs/04` §4 invariante 3 dice que el sitio se
 * construye y se sirve **sin** feed.
 *
 * Los seis escenarios del lector ya están en `tests/proof-feed.test.ts`. Lo que
 * esta prueba añade es que **la vista de `/proyectos` los propaga**: un lector
 * correcto envuelto en un `try/catch` de la vista volvería a colapsar los dos
 * estados en uno, y esa regresión no la vería ninguna de aquellas.
 *
 * Todo se construye en `tmpdir` y se sirve por `PROOF_FEED_DIR`.
 * `public/proof/v1/**` no se toca ni una vez: es zona prohibida (`AGENTS.md`).
 */

const META = {
  schema_version: "1.0.0",
  generated_at: "2026-08-28T00:00:00Z",
  engine_version: "0.1.0",
  source_coverage: [],
  counts: { projects: 1, claims: 0, evidence: 0 },
  unassigned_events: 0,
  digest: "sha256:abc",
};

const PROYECTO = {
  id: "uno",
  title: "Proyecto uno",
  thesis: "Hace una cosa concreta.",
  kind: "tool",
  lifecycle: "production",
  visibility: "public",
  context: "personal",
  role: "author",
  timeframe: { start: "2026-01-01" },
  public_sources: [],
  has_private_sources: false,
};

const COMPLETO: Record<string, unknown> = {
  meta: META,
  projects: { schema_version: "1.0.0", projects: [PROYECTO] },
  claims: { schema_version: "1.0.0", claims: [] },
  evidence: { schema_version: "1.0.0", evidence: [] },
};

function feedEn(archivos: Record<string, unknown>): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "proyectos-feed-"));
  for (const [nombre, contenido] of Object.entries(archivos)) {
    if (contenido === null) continue;
    writeFileSync(
      path.join(dir, `${nombre}.json`),
      typeof contenido === "string" ? contenido : JSON.stringify(contenido),
      "utf8",
    );
  }
  return dir;
}

/** Corre `fn` con `PROOF_FEED_DIR` apuntando a `dir`, y restaura el entorno. */
function apuntando<T>(dir: string, fn: () => T): T {
  const previo = process.env["PROOF_FEED_DIR"];
  process.env["PROOF_FEED_DIR"] = dir;
  try {
    return fn();
  } finally {
    if (previo === undefined) delete process.env["PROOF_FEED_DIR"];
    else process.env["PROOF_FEED_DIR"] = previo;
  }
}

test("AC-PRY-03: feed borrado — la vista devuelve el estado declarado y NO revienta", () => {
  const inexistente = path.join(os.tmpdir(), `sin-feed-${Math.random().toString(36).slice(2)}`);
  const vista = apuntando(inexistente, () => vistaDeProyectos());
  assert.equal(vista.estado, "ausente");
});

test("AC-PRY-03: feed completo — la vista lo lee desde PROOF_FEED_DIR", () => {
  // Sin este caso, el de arriba sería vacuo: «ausente» también saldría de un
  // lector que no lee nada.
  const dir = feedEn(COMPLETO);
  try {
    const vista = apuntando(dir, () => vistaDeProyectos());
    assert.equal(vista.estado, "presente");
    if (vista.estado !== "presente") return;
    assert.deepEqual(
      vista.proyectos.map((p) => p.id),
      ["uno"],
    );
    assert.equal(vista.publicadoEl, "28 de agosto de 2026");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("AC-PRY-03: feed corrupto — falla ruidosamente, no se degrada a «ausente»", () => {
  const casos: [string, Record<string, unknown>, RegExp][] = [
    ["meta.json de 0 bytes", { ...COMPLETO, meta: "" }, /E_FEED_VACIO/],
    ["meta.json que no es JSON", { ...COMPLETO, meta: "{" }, /E_FEED_JSON/],
    ["falta claims.json", { ...COMPLETO, claims: null }, /E_FEED_INCOMPLETO/],
    [
      "meta.counts que no cuadra",
      { ...COMPLETO, meta: { ...META, counts: { projects: 9, claims: 0, evidence: 0 } } },
      /E_FEED_COUNTS/,
    ],
  ];

  for (const [nombre, archivos, error] of casos) {
    const dir = feedEn(archivos);
    try {
      apuntando(dir, () => {
        assert.throws(() => vistaDeProyectos(), FeedInvalidoError, `${nombre}: no lanzó`);
        assert.throws(() => vistaDeProyectos(), error, `${nombre}: lanzó otro error`);
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("AC-PRY-03: la ruta consume esa vista, y declara el estado sin feed en pantalla", () => {
  // Sin DOM, lo comprobable es que la ruta cuelga de la misma vista que las
  // pruebas de arriba ejercitan, y que tiene una rama para el estado ausente.
  // Si alguien reimplementa la lectura dentro de la página, esto se pone rojo.
  const alcanzados = cierreDeImports("app/proyectos/page.tsx");
  assert.ok(
    alcanzados.includes("lib/proof/proyectos-vista.ts"),
    "la ruta tiene que leer el feed por la misma vista que se prueba aquí",
  );

  const fuente = leer("app/proyectos/page.tsx");
  assert.match(
    fuente,
    /estado === "ausente"/,
    "la página necesita su rama de dato ausente: sin feed no hay proyectos que mostrar",
  );

  // Y el estado declarado no promete futuro. `docs/05` § Contrato de presentación
  // prohíbe estas cuatro palabras, y `decisions/0015` §4-ter lo repite: un hueco
  // no es «pendiente» ni «próximamente».
  for (const palabra of ["todavía", "aún", "pronto", "en construcción"]) {
    assert.doesNotMatch(
      fuente,
      new RegExp(palabra, "i"),
      `«${palabra}» describe un retraso del proyecto, no una condición del mundo`,
    );
  }
});
