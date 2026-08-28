import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  claimSchema,
  evidenceSchema,
  metaSchema,
  projectSchema,
} from "../lib/proof/schema.ts";

/**
 * La contrapartida de haber elegido `zod` sobre `ajv`.
 *
 * `ajv` contra los JSON Schema publicados eliminaba por construcción la
 * divergencia entre validador y contrato. `zod` no: **puede** divergir. Se eligió
 * igualmente porque `ajv` no da tipos —`ajv.compile<Feed>()` es un cast que
 * TypeScript se cree sin comprobar— y ese fallo es peor: invisible, porque
 * `typecheck` pasa igual.
 *
 * Pero elegir la opción con un riesgo conocido obliga a cubrirlo, y **no con
 * disciplina**. Esto es lo que lo cubre: si alguien añade un `required` o un
 * valor de enum en `public/proof/schemas/*.json` y no aquí, o al revés, se pone
 * rojo. Sin este archivo, la decisión del gate era una promesa.
 *
 * La jerarquía no cambia: `docs/05` es la autoridad, los JSON Schema son su
 * derivado, y `lib/proof/schema.ts` es derivado de los dos. Un desacuerdo se
 * arregla mirando la prosa, nunca el artefacto.
 */

const DIR = path.join(process.cwd(), "public", "proof", "schemas");

function schemaJson(nombre: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(DIR, `${nombre}.schema.json`), "utf8"));
}

/** Las claves requeridas de un `$defs.<x>` (o de la raíz si no se pasa def). */
function requeridos(nombre: string, def?: string): string[] {
  const doc = schemaJson(nombre);
  const nodo = def
    ? ((doc["$defs"] as Record<string, Record<string, unknown>>)[def] as Record<string, unknown>)
    : doc;
  return [...((nodo["required"] as string[]) ?? [])].sort();
}

/** Los valores de un enum, buscándolo por ruta de propiedades. */
function enumDe(nombre: string, def: string, prop: string): string[] {
  const doc = schemaJson(nombre);
  const props = (doc["$defs"] as Record<string, Record<string, unknown>>)[def]?.[
    "properties"
  ] as Record<string, Record<string, unknown>>;
  return [...((props[prop]?.["enum"] as string[]) ?? [])].sort();
}

/** Las claves que zod declara como NO opcionales. */
function requeridosZod(schema: { shape: Record<string, { safeParse: (x: unknown) => { success: boolean } }> }): string[] {
  return Object.entries(schema.shape)
    .filter(([, v]) => !v.safeParse(undefined).success)
    .map(([k]) => k)
    .sort();
}

test("projects: los mismos campos requeridos en zod y en el JSON Schema", () => {
  assert.deepEqual(
    requeridosZod(projectSchema as never),
    requeridos("projects", "project"),
    "si esto falla, uno de los dos derivados se separo de docs/05",
  );
});

test("claims: los mismos campos requeridos en zod y en el JSON Schema", () => {
  assert.deepEqual(requeridosZod(claimSchema as never), requeridos("claims", "claim"));
});

test("evidence: los mismos campos requeridos en zod y en el JSON Schema", () => {
  assert.deepEqual(requeridosZod(evidenceSchema as never), requeridos("evidence", "evidence"));
});

test("meta: los mismos campos requeridos en zod y en el JSON Schema", () => {
  assert.deepEqual(requeridosZod(metaSchema as never), requeridos("meta"));
});

test("los enums cerrados coinciden valor a valor", () => {
  // Un enum que se separa es peor que un required: acepta en un lado lo que el
  // otro rechaza, y el sitio renderiza algo que el contrato prohibe.
  const casos: [string, string, string][] = [
    ["projects", "project", "kind"],
    ["projects", "project", "lifecycle"],
    ["projects", "project", "visibility"],
    ["projects", "project", "context"],
    ["projects", "project", "role"],
    ["claims", "claim", "dimension"],
    ["claims", "claim", "provenance"],
    ["claims", "claim", "verifiability"],
    ["evidence", "evidence", "kind"],
    ["evidence", "evidence", "actor_role"],
  ];
  const zodShapes: Record<string, Record<string, { options?: string[] }>> = {
    projects: (projectSchema as never as { shape: Record<string, { options?: string[] }> }).shape,
    claims: (claimSchema as never as { shape: Record<string, { options?: string[] }> }).shape,
    evidence: (evidenceSchema as never as { shape: Record<string, { options?: string[] }> }).shape,
  };
  for (const [archivo, def, prop] of casos) {
    const delJson = enumDe(archivo, def, prop);
    const deZod = [...(zodShapes[archivo]?.[prop]?.options ?? [])].sort();
    assert.deepEqual(deZod, delJson, `${archivo}.${prop} diverge entre zod y el JSON Schema`);
  }
});

test("visibility NO admite 'confidential' en ninguno de los dos", () => {
  // Es la garantia mas importante del contrato de proyectos: un proyecto
  // confidencial no tiene registro, no es un registro redactado.
  assert.ok(!enumDe("projects", "project", "visibility").includes("confidential"));
  assert.equal(
    projectSchema.safeParse({
      id: "x",
      title: "t",
      thesis: "t",
      kind: "tool",
      lifecycle: "alpha",
      visibility: "confidential",
      context: "personal",
      role: "author",
      timeframe: { start: "2026-01-01" },
      public_sources: [],
      has_private_sources: false,
    }).success,
    false,
  );
});

test("provenance NO admite 'attested': en V1 no hay fuente que lo produzca", () => {
  assert.ok(!enumDe("claims", "claim", "provenance").includes("attested"));
});
