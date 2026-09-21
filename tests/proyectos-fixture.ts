import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { vistaDeProyectos } from "../lib/proof/proyectos-vista.ts";

/**
 * El feed de fixture que comparten las pruebas de `/proyectos`.
 *
 * ## Por qué vive fuera de las pruebas que lo usan
 *
 * Cada criterio de aceptación tiene su archivo —`AC-PRY-01` los filtros,
 * `AC-PRY-02` la ausencia de conteos por opción— porque cada uno se ejecuta
 * solo. Si el fixture viviera dentro de uno de ellos, el otro no podría correr
 * por su cuenta; si se copiara en los dos, el día que uno cambie de forma el
 * otro seguiría probando contra un mundo que ya no existe, y estaría verde.
 *
 * Este archivo **no** termina en `.test.ts` a propósito: el glob de `npm test`
 * es `tests/**\/*.test.ts`, así que un helper con ese nombre se ejecutaría como
 * una suite vacía. Mismo precedente que `tests/navegacion-helpers.ts`.
 *
 * ## Por qué el feed se construye en un temporal
 *
 * `public/proof/v1/**` es zona prohibida (`AGENTS.md`), y un filtro solo se
 * puede comprobar de verdad sobre datos que la prueba controla: con el feed real
 * —tres afirmaciones y doce proyectos— cualquier aserción sería una foto del
 * artefacto de hoy y se pondría roja el día que el motor publique otro. El
 * lector resuelve su raíz desde `PROOF_FEED_DIR`, así que el feed se construye
 * en `tmpdir` y `v1/` no se toca ni una vez.
 */

const META = {
  schema_version: "1.0.0",
  generated_at: "2026-08-28T00:00:00Z",
  engine_version: "0.1.0",
  source_coverage: [],
  counts: { projects: 4, claims: 3, evidence: 0 },
  unassigned_events: 0,
  digest: "sha256:abc",
};

const proyecto = (
  id: string,
  inicio: string,
  visibility: "public" | "private",
  context: "personal" | "rbloomdev" | "inadaptados" | "client",
) => ({
  id,
  title: `Proyecto ${id}`,
  thesis: `Hace lo que ${id} dice que hace.`,
  kind: "tool",
  lifecycle: "production",
  visibility,
  context,
  role: "author",
  timeframe: { start: inicio },
  public_sources: [],
  has_private_sources: visibility === "private",
});

const claim = (id: string, dimension: string, project_ids: string[]) => ({
  id,
  statement: `Afirmo algo sobre ${project_ids.join(" y ")}.`,
  dimension,
  project_ids,
  evidence_ids: [],
  provenance: "declared",
  verifiability: "unverifiable",
});

/** Cuatro proyectos: dos dimensiones cruzadas, tres años y uno sin afirmación. */
export const FEED = {
  meta: META,
  projects: {
    schema_version: "1.0.0",
    projects: [
      proyecto("alfa", "2024-08-01", "public", "personal"),
      proyecto("beta", "2026-01-01", "private", "inadaptados"),
      proyecto("delta", "2025-05-01", "private", "personal"),
      proyecto("gama", "2026-06-01", "public", "rbloomdev"),
    ],
  },
  claims: {
    schema_version: "1.0.0",
    claims: [
      claim("construyo", "build", ["alfa", "gama"]),
      claim("dirijo", "lead", ["gama"]),
      claim("formo", "teach", ["beta"]),
    ],
  },
  evidence: { schema_version: "1.0.0", evidence: [] },
};

function feedEnTemporal(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "proyectos-fixture-"));
  for (const [nombre, contenido] of Object.entries(FEED)) {
    writeFileSync(path.join(dir, `${nombre}.json`), JSON.stringify(contenido), "utf8");
  }
  return dir;
}

function proyectosDeFixture() {
  const vista = vistaDeProyectos();
  assert.equal(vista.estado, "presente", "el fixture es un feed válido y completo");
  if (vista.estado !== "presente") throw new Error("inalcanzable");
  return vista.proyectos;
}

/** Lee la vista con el feed servido por `PROOF_FEED_DIR`, y restaura el entorno. */
export function conFeedDeFixture<T>(
  fn: (proyectos: ReturnType<typeof proyectosDeFixture>) => T,
): T {
  const dir = feedEnTemporal();
  const previo = process.env["PROOF_FEED_DIR"];
  process.env["PROOF_FEED_DIR"] = dir;
  try {
    return fn(proyectosDeFixture());
  } finally {
    if (previo === undefined) delete process.env["PROOF_FEED_DIR"];
    else process.env["PROOF_FEED_DIR"] = previo;
    rmSync(dir, { recursive: true, force: true });
  }
}

export const ids = (ps: { id: string }[]) => ps.map((p) => p.id);
