import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

// `ajv/dist/2020`, no `ajv` a secas: la exportacion por defecto compila
// draft-07, y estos schemas declaran draft 2020-12. Usar el validador
// equivocado da "no schema with key or ref", que es el sintoma barato; el caro
// seria que compilara y silenciosamente ignorara construcciones de 2020-12.
import Ajv2020 from "ajv/dist/2020.js";
import type { ValidateFunction } from "ajv";

/**
 * S1-12 · los JSON Schema del feed publico.
 *
 * `docs/05-feed-contract.md` es la AUTORIDAD y estos schemas son un derivado
 * suyo. Si la prosa y el schema discrepan, **el schema esta mal** y se regenera
 * desde la prosa: divergencia = FAIL, no deuda. Un artefacto que valida contra
 * un schema divergente da CI verde midiendo la cosa equivocada, que es peor que
 * fallar.
 *
 * Y el corolario operativo de `decisions/0009`, que es lo que hace segura la
 * apertura de `schemas/**` al Builder: el schema se escribe mirando la prosa,
 * **nunca** mirando un artefacto que no valida. Ajustar el contrato a los datos
 * es exactamente la via que la zona prohibida existia para cerrar.
 *
 * ## Por que cada test invalido importa
 *
 * «Un schema que solo se ha probado contra datos validos no se ha probado.»
 * Por eso hay un fixture invalido por cada regla, y no uno que las cubra todas:
 * comprobar que "algo falla" no demuestra que cada regla este conectada.
 */

const DIR = path.join(process.cwd(), "public", "proof", "schemas");

// `strict: false` porque `format` en JSON Schema es una anotacion, no una
// asercion: se publica para quien lea el contrato, y validarlo exigiria una
// dependencia mas para cero garantia adicional.
const ajv = new Ajv2020({ strict: false, allErrors: true });

function compilar(nombre: string): ValidateFunction {
  const bruto = readFileSync(path.join(DIR, `${nombre}.schema.json`), "utf8");
  return ajv.compile(JSON.parse(bruto));
}

const claims = compilar("claims");
const projects = compilar("projects");
const evidence = compilar("evidence");
const meta = compilar("meta");
const activity = compilar("activity");

/**
 * Devuelve una copia del objeto SIN el campo indicado.
 *
 * Se usa en lugar de desestructurar con una variable de descarte porque el lint
 * del sitio corre con `--max-warnings 0` y una variable sin usar es un warning
 * — correctamente. Ademas se lee mejor: `sin(claimValido, "statement")` dice lo
 * que hace, y `const { statement: _s, ...resto }` no.
 */
function sin<T extends object>(obj: T, campo: keyof T): Partial<T> {
  const copia: Partial<T> = { ...obj };
  delete copia[campo];
  return copia;
}

/** Afirma que el documento NO valida, y devuelve las rutas que fallaron. */
function rechaza(v: ValidateFunction, doc: unknown, porque: string): void {
  const ok = v(doc);
  assert.equal(ok, false, `deberia rechazarse: ${porque}`);
}

// ---------------------------------------------------------------------------
// Los casos VALIDOS. Sin esto, todo lo de abajo es vacuo.
// ---------------------------------------------------------------------------

const claimValido = {
  id: "construyo-sistemas",
  statement: "Construyo sistemas de software e IA utilizados en contextos reales.",
  dimension: "build",
  project_ids: ["motor-de-evidencia"],
  evidence_ids: [],
  provenance: "declared",
  verifiability: "unverifiable",
};

const proyectoValido = {
  id: "motor-de-evidencia",
  title: "Motor de evidencia",
  thesis: "Respalda afirmaciones con evidencia verificable.",
  kind: "tool",
  lifecycle: "production",
  visibility: "public",
  context: "personal",
  role: "author",
  timeframe: { start: "2026-08-19T00:00:00Z" },
  public_sources: [{ type: "github_repo", url: "https://github.com/ejemplo/uno" }],
  has_private_sources: false,
};

const evidenciaValida = {
  id: "abc123",
  project_id: "motor-de-evidencia",
  source: "github",
  kind: "commit",
  occurred_at: "2026-08-19T10:00:00Z",
  actor_role: "author",
  provenance: "collected",
  verifiability: "third_party_public",
  public_url: "https://github.com/ejemplo/uno/commit/abc123",
};

test("los cuatro archivos de V1 validan en su forma correcta", () => {
  assert.ok(claims({ schema_version: "1.0.0", claims: [claimValido] }), JSON.stringify(claims.errors));
  assert.ok(projects({ schema_version: "1.0.0", projects: [proyectoValido] }), JSON.stringify(projects.errors));
  assert.ok(evidence({ schema_version: "1.0.0", evidence: [evidenciaValida] }), JSON.stringify(evidence.errors));
  assert.ok(
    meta({
      schema_version: "1.0.0",
      generated_at: "2026-08-27T00:00:00Z",
      engine_version: "0.1.0",
      source_coverage: [
        { source: "github", repos_public: 2, repos_private: 1, last_success_at: "2026-08-27T00:00:00Z" },
      ],
      counts: { projects: 3, claims: 3, evidence: 0 },
      unassigned_events: 0,
      digest: "sha256:deadbeef",
    }),
    JSON.stringify(meta.errors),
  );
});

test("un feed VACIO es valido: aun no hay evidencia, y eso es un estado honesto", () => {
  assert.ok(claims({ schema_version: "1.0.0", claims: [] }));
  assert.ok(projects({ schema_version: "1.0.0", projects: [] }));
  assert.ok(evidence({ schema_version: "1.0.0", evidence: [] }));
});

// ---------------------------------------------------------------------------
// Regla 3 del contrato: un consumidor IGNORA los campos que no conoce.
// ---------------------------------------------------------------------------

test("un campo desconocido NO invalida: la compatibilidad es aditiva", () => {
  // Es la razon por la que los campos eliminados se prohiben UNO A UNO en vez
  // de cerrar el objeto con additionalProperties: false. Cerrarlo cumpliria G6
  // rompiendo la regla 2 del contrato, que declara compatible anadir un campo
  // opcional dentro de una version.
  assert.ok(
    claims({
      schema_version: "1.0.0",
      claims: [{ ...claimValido, campo_de_v2_que_hoy_no_existe: "algo" }],
    }),
    JSON.stringify(claims.errors),
  );
});

// ---------------------------------------------------------------------------
// claims.json — el archivo central
// ---------------------------------------------------------------------------

test("claims: statement y dimension son requeridos", () => {
  rechaza(claims, { schema_version: "1", claims: [sin(claimValido, "statement")] }, "sin statement");
  rechaza(claims, { schema_version: "1", claims: [sin(claimValido, "dimension")] }, "sin dimension");
});

test("claims: provenance y verifiability son REQUERIDOS en el artefacto", () => {
  // Prohibidos en el Registry, requeridos aqui. La asimetria es el punto: se
  // derivan, y el artefacto siempre los lleva.
  rechaza(claims, { schema_version: "1", claims: [sin(claimValido, "provenance")] }, "sin provenance");
  rechaza(claims, { schema_version: "1", claims: [sin(claimValido, "verifiability")] }, "sin verifiability");
});

test("claims: el enum de provenance NO admite attested", () => {
  rechaza(
    claims,
    { schema_version: "1", claims: [{ ...claimValido, provenance: "attested" }] },
    "provenance: attested",
  );
});

test("claims: G1 — project_ids no puede estar vacio", () => {
  rechaza(
    claims,
    { schema_version: "1", claims: [{ ...claimValido, project_ids: [] }] },
    "project_ids vacio",
  );
});

test("claims: kind y attestor estan prohibidos", () => {
  rechaza(claims, { schema_version: "1", claims: [{ ...claimValido, kind: "existence" }] }, "kind");
  rechaza(claims, { schema_version: "1", claims: [{ ...claimValido, attestor: "x" }] }, "attestor");
});

// ---------------------------------------------------------------------------
// projects.json
// ---------------------------------------------------------------------------

test("projects: visibility NO admite confidential", () => {
  // Un proyecto confidencial no tiene registro en el feed. No es un registro
  // redactado: es un registro que NO EXISTE.
  rechaza(
    projects,
    { schema_version: "1", projects: [{ ...proyectoValido, visibility: "confidential" }] },
    "visibility: confidential",
  );
});

test("projects: G6 — claim_ids esta prohibido", () => {
  rechaza(
    projects,
    { schema_version: "1", projects: [{ ...proyectoValido, claim_ids: ["c1"] }] },
    "claim_ids persistido",
  );
});

test("projects: evidence_summary y nda estan prohibidos", () => {
  rechaza(
    projects,
    { schema_version: "1", projects: [{ ...proyectoValido, evidence_summary: {} }] },
    "evidence_summary",
  );
  rechaza(projects, { schema_version: "1", projects: [{ ...proyectoValido, nda: true }] }, "nda");
});

test("projects: kind no admite client_project", () => {
  rechaza(
    projects,
    { schema_version: "1", projects: [{ ...proyectoValido, kind: "client_project" }] },
    "kind: client_project",
  );
});

// ---------------------------------------------------------------------------
// evidence.json
// ---------------------------------------------------------------------------

test("evidence: G5 — project_id es requerido y no puede ser null", () => {
  rechaza(evidence, { schema_version: "1", evidence: [sin(evidenciaValida, "project_id")] }, "sin project_id");
  rechaza(
    evidence,
    { schema_version: "1", evidence: [{ ...evidenciaValida, project_id: null }] },
    "project_id null",
  );
});

test("evidence: TEOREMA — third_party_public y cryptographic exigen public_url", () => {
  const sinUrl = sin(evidenciaValida, "public_url");
  rechaza(evidence, { schema_version: "1", evidence: [sinUrl] }, "third_party_public sin URL");
  rechaza(
    evidence,
    { schema_version: "1", evidence: [{ ...sinUrl, verifiability: "cryptographic" }] },
    "cryptographic sin URL",
  );
});

test("evidence: un registro unverifiable NO puede llevar public_url", () => {
  // Regla 6 de docs/03 §3, por su contrapositiva observable.
  rechaza(
    evidence,
    {
      schema_version: "1",
      evidence: [{ ...evidenciaValida, verifiability: "unverifiable" }],
    },
    "unverifiable con public_url",
  );
});

test("evidence: assistance esta prohibido", () => {
  rechaza(
    evidence,
    { schema_version: "1", evidence: [{ ...evidenciaValida, assistance: { provider_id: "x" } }] },
    "assistance",
  );
});

// ---------------------------------------------------------------------------
// activity.json — el unico archivo con metricas de evidencia
// ---------------------------------------------------------------------------

const bucketValido = {
  period: "2026-03",
  claim_ids: ["construyo-sistemas"],
  counts: { commits: 12, pull_requests: 4, reviews: 3, releases: 1, deployments: 2 },
  visibility_scope: "public",
};

test("activity: un bucket bien formado valida", () => {
  assert.ok(
    activity({ schema_version: "1.0.0", buckets: [bucketValido] }),
    JSON.stringify(activity.errors),
  );
});

test("activity: claim_ids es requerido y NO puede estar vacio", () => {
  // Es la regla estructural del contrato: ninguna metrica de evidencia
  // publicable puede existir sin claim_ids. Sin ese campo el registro no
  // existe, asi que no hay donde alojar un numero huerfano.
  rechaza(
    activity,
    { schema_version: "1", buckets: [{ ...bucketValido, claim_ids: [] }] },
    "claim_ids vacio",
  );
  rechaza(activity, { schema_version: "1", buckets: [sin(bucketValido, "claim_ids")] }, "sin claim_ids");
});

test("activity: el periodo es mensual o trimestral, NUNCA diario", () => {
  // Coarsening temporal, regla 4 de docs/03 §3: un grano diario sobre fuente
  // privada es reidentificante.
  assert.ok(activity({ schema_version: "1", buckets: [{ ...bucketValido, period: "2026-Q1" }] }));
  rechaza(
    activity,
    { schema_version: "1", buckets: [{ ...bucketValido, period: "2026-03-15" }] },
    "periodo diario",
  );
});

test("activity: los counts son enteros exactos, no rangos ni textos", () => {
  rechaza(
    activity,
    {
      schema_version: "1",
      buckets: [{ ...bucketValido, counts: { ...bucketValido.counts, commits: "5-10" } }],
    },
    "counts como rango",
  );
});

// ---------------------------------------------------------------------------
// Anti-vanity: los campos prohibidos permanentemente
// ---------------------------------------------------------------------------

test("los campos de vanity estan prohibidos en meta y en activity", () => {
  const base = {
    schema_version: "1.0.0",
    generated_at: "2026-08-27T00:00:00Z",
    engine_version: "0.1.0",
    source_coverage: [],
    counts: { projects: 0, claims: 0, evidence: 0 },
    unassigned_events: 0,
    digest: "d",
  };
  for (const campo of ["score", "rank", "streak", "stars", "followers", "tokens_used", "hours"]) {
    rechaza(meta, { ...base, [campo]: 1 }, `meta.${campo}`);
  }
  for (const campo of ["score", "rank", "streak", "lines_of_code", "agent_sessions"]) {
    rechaza(
      activity,
      { schema_version: "1", buckets: [{ ...bucketValido, [campo]: 1 }] },
      `activity.${campo}`,
    );
  }
});

// ---------------------------------------------------------------------------
// El feed todavia NO existe, y eso es correcto
// ---------------------------------------------------------------------------

test("public/proof/v1/ sigue sin existir: el primer artefacto es Sprint 4", () => {
  // Esta card entrega el CONTRATO, no los datos. Y `v1/**` sigue siendo zona de
  // escritura exclusiva del motor (decisions/0009): que schemas/ se haya abierto
  // al Builder no abre v1/.
  const v1 = path.join(process.cwd(), "public", "proof", "v1");
  assert.throws(() => readFileSync(path.join(v1, "meta.json"), "utf8"));
});
