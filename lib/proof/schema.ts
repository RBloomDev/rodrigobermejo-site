import { z } from "zod";

/**
 * `D-06` · el contrato del feed en zod. **Derivado de `docs/05-feed-contract.md`.**
 *
 * ## Por qué zod y no ajv contra los JSON Schema publicados
 *
 * `S5-00` estuvo bloqueada pidiendo esta decisión, y en el gate del `/autoplan`
 * del 2026-08-28 se evaluó la tercera opción que la card no había considerado:
 * validar con `ajv` contra `public/proof/schemas/*.json`, que ya está instalado.
 * Tenía a favor que elimina por construcción la divergencia entre validador y
 * contrato publicado.
 *
 * Se descartó porque **el riesgo no desaparece, se muda**. `ajv.compile<Feed>()`
 * es un cast que TypeScript se cree sin comprobar: nada verifica que el
 * `interface Feed` escrito a mano coincida con el schema. El fallo pasa de «el
 * validador diverge del contrato» a «el tipo diverge del contrato», y ahí es
 * **invisible**, porque `typecheck` pasa igual. `z.infer` cierra ese hueco.
 *
 * ## La contrapartida, que hay que sostener y no ignorar
 *
 * Este archivo puede divergir de `public/proof/schemas/*.json`. Eso **no** se
 * cubre con disciplina: lo cubre `tests/proof-schema-paridad.test.ts`, que
 * compara los `required` y los enums de ambos lados y falla si se separan.
 *
 * Y la jerarquía sigue intacta: `docs/05` es la autoridad, los JSON Schema son un
 * derivado suyo, y esto es un derivado de los dos. Si algo aquí discrepa de la
 * prosa, **esto está mal**.
 */

/** Fecha, no instante: el periodo de un proyecto es un rango de días. */
const fecha = z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/);

/** Instante en UTC, con Z obligatoria. */
const instante = z
  .string()
  .regex(
    /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?Z$/,
  );

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const PROVENANCE = ["declared", "collected", "derived", "correlated"] as const;
export const VERIFIABILITY = [
  "unverifiable",
  "self_link",
  "third_party_public",
  "cryptographic",
] as const;
export const DIMENSIONS = ["build", "lead", "teach"] as const;

/**
 * `passthrough` y no `strict`, y es normativo: la **regla 3** del contrato dice
 * que un consumidor debe ignorar los campos que no conoce y nunca fallar por un
 * campo extra. Un `strict()` aquí rompería el sitio ante un feed `v1.1`
 * perfectamente compatible.
 *
 * El mundo cerrado —que el PRODUCTOR no emita nada de más— se impone en el
 * motor, que es donde vive el Registry y donde se puede saber qué es legítimo.
 */
export const projectSchema = z
  .object({
    id: slug,
    title: z.string().min(1),
    thesis: z.string().min(1),
    kind: z.enum(["product", "tool", "education", "lab", "experiment"]),
    lifecycle: z.enum([
      "discovery",
      "prototype",
      "alpha",
      "beta",
      "production",
      "maintenance",
      "archived",
    ]),
    /** `confidential` NO existe aquí: ese proyecto no tiene registro. */
    visibility: z.enum(["public", "private"]),
    context: z.enum(["personal", "rbloomdev", "inadaptados", "client"]),
    role: z.enum(["author", "maintainer", "contributor", "reviewer", "operator"]),
    timeframe: z.object({ start: fecha, end: fecha.optional() }).passthrough(),
    public_sources: z.array(
      z.object({ type: z.string(), url: z.string().regex(/^https?:\/\//) }).passthrough(),
    ),
    has_private_sources: z.boolean(),
  })
  .passthrough();

export const claimSchema = z
  .object({
    id: slug,
    statement: z.string().min(1),
    dimension: z.enum(DIMENSIONS),
    project_ids: z.array(slug),
    evidence_ids: z.array(z.string()),
    provenance: z.enum(PROVENANCE),
    verifiability: z.enum(VERIFIABILITY),
  })
  .passthrough();

export const evidenceSchema = z
  .object({
    id: z.string().min(1),
    project_id: z.string().min(1),
    source: z.enum(["github"]),
    kind: z.enum([
      "commit",
      "pull_request",
      "review",
      "release",
      "tag",
      "check_run",
      "deployment",
    ]),
    occurred_at: instante,
    actor_role: z.enum(["author", "reviewer", "approver", "operator"]),
    provenance: z.enum(PROVENANCE),
    verifiability: z.enum(VERIFIABILITY),
    public_url: z.string().regex(/^https?:\/\//).optional(),
    signed: z.boolean().optional(),
  })
  .passthrough();

export const metaSchema = z
  .object({
    schema_version: z.string().regex(/^\d+\.\d+\.\d+$/),
    generated_at: instante,
    engine_version: z.string().min(1),
    source_coverage: z.array(
      z
        .object({
          source: z.string(),
          repos_public: z.number().int().min(0),
          repos_private: z.number().int().min(0),
          last_success_at: instante,
        })
        .passthrough(),
    ),
    counts: z
      .object({
        projects: z.number().int().min(0),
        claims: z.number().int().min(0),
        evidence: z.number().int().min(0),
      })
      .passthrough(),
    unassigned_events: z.number().int().min(0),
    digest: z.string().min(1),
  })
  .passthrough();

export const projectsDocSchema = z
  .object({ schema_version: z.string(), projects: z.array(projectSchema) })
  .passthrough();
export const claimsDocSchema = z
  .object({ schema_version: z.string(), claims: z.array(claimSchema) })
  .passthrough();
export const evidenceDocSchema = z
  .object({ schema_version: z.string(), evidence: z.array(evidenceSchema) })
  .passthrough();

export type FeedProject = z.infer<typeof projectSchema>;
export type FeedClaim = z.infer<typeof claimSchema>;
export type FeedEvidence = z.infer<typeof evidenceSchema>;
export type FeedMeta = z.infer<typeof metaSchema>;

export interface Feed {
  meta: FeedMeta;
  projects: FeedProject[];
  claims: FeedClaim[];
  evidence: FeedEvidence[];
}
