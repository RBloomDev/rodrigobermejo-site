import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { leerFeed, claimsDeProyecto, FeedInvalidoError } from "../lib/proof/feed.ts";

/**
 * `D-06` y `D-10` · la máquina de estados del feed.
 *
 * ## Por qué estos tests construyen su feed en un temporal
 *
 * `public/proof/v1/**` es **zona prohibida** (`AGENTS.md`): lo escribe solo el
 * motor. Pero el gate exige «feed borrado → verde» y «feed corrupto → rojo», y
 * ejecutarlo literalmente significaría borrar y corromper archivos de esa zona.
 * El gate solo sería ejecutable violando una regla dura.
 *
 * `PROOF_FEED_DIR` lo resuelve: los seis escenarios se construyen en `tmpdir` y
 * el gate se falsa **sin tocar `v1/` ni una vez**. Es además la única forma de
 * que corra en CI antes de que exista el primer artefacto.
 *
 * ## Por qué cada caso inválido importa
 *
 * El patrón cómodo —`try { ... } catch { return null }`— colapsa todo fallo en
 * «ausente». Con él, un JSON truncado o un publish a medias dan **build verde
 * indistinguible del estado legítimo**, que `docs/05` declara peor que fallar.
 * Cada caso de abajo es una puerta por la que eso entraría.
 */

const META = {
  schema_version: "1.0.0",
  generated_at: "2026-08-28T00:00:00Z",
  engine_version: "0.1.0",
  source_coverage: [],
  counts: { projects: 1, claims: 1, evidence: 0 },
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
  public_sources: [{ type: "github_repo", url: "https://github.com/duenyo/repo" }],
  has_private_sources: false,
};

const CLAIM = {
  id: "afirmo-algo",
  statement: "Afirmo algo comprobable.",
  dimension: "build",
  project_ids: ["uno"],
  evidence_ids: [],
  provenance: "declared",
  verifiability: "unverifiable",
};

/** Construye un feed en un temporal. `null` como contenido = archivo ausente. */
function feedEn(archivos: Record<string, unknown>): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "proof-feed-"));
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

const COMPLETO = {
  meta: META,
  projects: { schema_version: "1.0.0", projects: [PROYECTO] },
  claims: { schema_version: "1.0.0", claims: [CLAIM] },
  evidence: { schema_version: "1.0.0", evidence: [] },
};

// ---------------------------------------------------------------------------
// Los dos estados VERDES. Sin esto, todo lo de abajo es vacuo.
// ---------------------------------------------------------------------------

test("feed completo con evidencia vacia: presente, y NO es un estado degradado", () => {
  const dir = feedEn(COMPLETO);
  const r = leerFeed(dir);
  assert.equal(r.estado, "presente");
  if (r.estado !== "presente") return;
  assert.equal(r.feed.projects.length, 1);
  assert.equal(r.feed.claims.length, 1);
  assert.equal(r.feed.evidence.length, 0);
  assert.equal(r.feed.claims[0]?.verifiability, "unverifiable");
  rmSync(dir, { recursive: true });
});

test("directorio inexistente: ausente, build VERDE", () => {
  const r = leerFeed(path.join(os.tmpdir(), "no-existe-" + Math.random().toString(36).slice(2)));
  assert.equal(r.estado, "ausente");
});

// ---------------------------------------------------------------------------
// Los estados ROJOS. Cada uno es una puerta por la que entraria un verde falso.
// ---------------------------------------------------------------------------

test("directorio que existe pero esta VACIO: rojo, no ausente", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "proof-vacio-"));
  assert.throws(() => leerFeed(dir), FeedInvalidoError);
  assert.throws(() => leerFeed(dir), /E_FEED_DIR_VACIO/);
  rmSync(dir, { recursive: true });
});

test("meta.json de 0 bytes: rojo", () => {
  // Una escritura interrumpida a medias. Con un catch generico esto seria verde.
  const dir = feedEn({ ...COMPLETO, meta: "" });
  assert.throws(() => leerFeed(dir), /E_FEED_VACIO/);
  rmSync(dir, { recursive: true });
});

test("meta.json truncado: rojo, y NO se confunde con ausente", () => {
  const dir = feedEn({ ...COMPLETO, meta: '{"schema_version": "1.0.0", "gener' });
  assert.throws(() => leerFeed(dir), /E_FEED_JSON/);
  rmSync(dir, { recursive: true });
});

test("meta.json presente sin los otros tres: rojo", () => {
  const dir = feedEn({ meta: META, projects: null, claims: null, evidence: null });
  assert.throws(() => leerFeed(dir), /E_FEED_INCOMPLETO/);
  rmSync(dir, { recursive: true });
});

test("falta meta.json pero hay otros archivos: rojo, publicacion a medias", () => {
  const dir = feedEn({ ...COMPLETO, meta: null });
  assert.throws(() => leerFeed(dir), /E_FEED_PARCIAL/);
  rmSync(dir, { recursive: true });
});

test("un projects vacio con meta que dice 1: rojo por CARDINALIDAD", () => {
  // El caso peligroso: sintacticamente perfecto, valida contra todo schema, y
  // renderiza "0 proyectos" con un generated_at fresco afirmando que si publico.
  const dir = feedEn({
    ...COMPLETO,
    projects: { schema_version: "1.0.0", projects: [] },
    claims: { schema_version: "1.0.0", claims: [] },
  });
  assert.throws(() => leerFeed(dir), /E_FEED_COUNTS/);
  rmSync(dir, { recursive: true });
});

test("un claim que referencia un proyecto ausente: rojo por G2", () => {
  const dir = feedEn({
    ...COMPLETO,
    claims: {
      schema_version: "1.0.0",
      claims: [{ ...CLAIM, project_ids: ["uno", "fantasma"] }],
    },
  });
  assert.throws(() => leerFeed(dir), /E_FEED_G2/);
  rmSync(dir, { recursive: true });
});

test("un valor fuera del contrato: rojo por schema", () => {
  const dir = feedEn({
    ...COMPLETO,
    claims: {
      schema_version: "1.0.0",
      claims: [{ ...CLAIM, verifiability: "muy_verificable" }],
    },
  });
  assert.throws(() => leerFeed(dir), /E_FEED_SCHEMA/);
  rmSync(dir, { recursive: true });
});

test("una fecha que no es fecha: rojo", () => {
  const dir = feedEn({
    ...COMPLETO,
    projects: {
      schema_version: "1.0.0",
      projects: [{ ...PROYECTO, timeframe: { start: "ayer" } }],
    },
  });
  assert.throws(() => leerFeed(dir), /E_FEED_SCHEMA/);
  rmSync(dir, { recursive: true });
});

// ---------------------------------------------------------------------------
// Regla 3 del contrato: un consumidor IGNORA lo que no conoce
// ---------------------------------------------------------------------------

test("un campo desconocido NO rompe el sitio: regla 3 del contrato", () => {
  // Un `strict()` aqui romperia el sitio ante un feed v1.1 perfectamente
  // compatible. El mundo cerrado se impone en el PRODUCTOR, no aqui.
  const dir = feedEn({
    ...COMPLETO,
    projects: {
      schema_version: "1.0.0",
      projects: [{ ...PROYECTO, campo_del_futuro: "algo" }],
    },
  });
  assert.equal(leerFeed(dir).estado, "presente");
  rmSync(dir, { recursive: true });
});

// ---------------------------------------------------------------------------
// G6 · el indice inverso se computa, no se persiste
// ---------------------------------------------------------------------------

test("claimsDeProyecto computa el indice inverso al vuelo", () => {
  const dir = feedEn(COMPLETO);
  const r = leerFeed(dir);
  assert.equal(r.estado, "presente");
  if (r.estado !== "presente") return;
  assert.deepEqual(
    claimsDeProyecto(r.feed, "uno").map((c) => c.id),
    ["afirmo-algo"],
  );
  assert.deepEqual(claimsDeProyecto(r.feed, "otro"), []);
  // Y el proyecto NO lleva la relacion persistida.
  assert.equal((r.feed.projects[0] as Record<string, unknown>)["claim_ids"], undefined);
  rmSync(dir, { recursive: true });
});
