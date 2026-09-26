import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { FeedInvalidoError, leerFeed, raizDelFeed } from "./feed.ts";

// Derivado de docs/05: dos documentos opcionales, sin métricas calculadas aquí.
const period = z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2]|Q[1-4])$/);
const source = z.literal("wakatime");
const record = z.object({
  kind: z.literal("human_editor_activity"), period, source,
  seconds: z.number().finite().nonnegative(), unit: z.literal("recorded_activity_seconds"),
  coverage: z.object({
    dias_con_dato: z.number().int().nonnegative(), dias_del_periodo: z.number().int().positive(),
    // Obligatorio a proposito (docs/05 §proceso.json). Sin el, `dias_del_periodo` no dice si
    // es el denominador del mes o el de los dias transcurridos, y los dos numeros se ven igual.
    periodo_abierto: z.boolean(),
    del_trabajo: z.literal("desconocida"),
  }).strict(),
}).strict();
const absence = z.object({
  period, source,
  motivo_de_ausencia: z.enum(["sin_fuente_registrada", "fuera_del_periodo_medido", "fuente_no_respondio"]),
}).strict();
const procesoSchema = z.object({
  schema_version: z.literal("1.0.0"), records: z.array(record), absences: z.array(absence),
}).strict();
const count = z.number().int().nonnegative();
const activitySchema = z.object({
  schema_version: z.string(), buckets: z.array(z.object({
    period, claim_ids: z.array(z.string()).min(1), project_id: z.string().optional(),
    counts: z.object({ commits: count, pull_requests: count, reviews: count, releases: count, deployments: count }),
    visibility_scope: z.enum(["public", "mixed"]),
  })),
});

function opcional<T>(dir: string, nombre: string, schema: z.ZodType<T>): T | null {
  let raw: string;
  try { raw = readFileSync(path.join(dir, `${nombre}.json`), "utf8"); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw new FeedInvalidoError(`No se pudo leer ${nombre}.json. Revisa el artefacto del motor.`);
  }
  try { return schema.parse(JSON.parse(raw)); }
  catch { throw new FeedInvalidoError(`${nombre}.json no cumple docs/05. Regenera el artefacto en el motor.`); }
}

/** Solo calendario de presentación: no rellena valores ni infiere causas. */
export function periodosCompletos(publicados: string[]): string[] {
  const resultado: string[] = [];
  for (const trimestral of [false, true]) {
    const grupo = publicados.filter(p => p.includes("Q") === trimestral).sort();
    if (!grupo.length) continue;
    const pasos = trimestral ? 4 : 12;
    const ordinal = (p: string) => Number(p.slice(0, 4)) * pasos + Number(p.slice(trimestral ? 6 : 5)) - 1;
    for (let n = ordinal(grupo[0]); n <= ordinal(grupo[grupo.length - 1]); n++) {
      resultado.push(`${Math.floor(n / pasos)}-${trimestral ? `Q${n % pasos + 1}` : String(n % pasos + 1).padStart(2, "0")}`);
    }
  }
  return resultado;
}

/**
 * El primer par mes/trimestre que cubre los mismos segundos, o `null`.
 *
 * Un mes `AAAA-MM` esta dentro del trimestre `AAAA-Qn` cuando comparten ano y
 * `n === ceil(MM / 3)`. Se devuelve el par y no un booleano para que el mensaje de error
 * pueda nombrar los dos culpables: «hay un solape» no le dice a nadie cual corregir.
 */
export function periodosSolapados(periodos: string[]): [string, string] | null {
  const meses = periodos.filter(p => !p.includes("Q"));
  const trimestres = new Set(periodos.filter(p => p.includes("Q")));
  for (const mes of meses) {
    const ano = mes.slice(0, 4);
    const n = Math.ceil(Number(mes.slice(5)) / 3);
    const trimestre = `${ano}-Q${n}`;
    if (trimestres.has(trimestre)) return [mes, trimestre];
  }
  return null;
}

export function leerActividad(dir = raizDelFeed()) {
  const proceso = opcional(dir, "proceso", procesoSchema);
  const actividad = opcional(dir, "activity", activitySchema);
  const estado = actividad ? leerFeed(dir) : null;
  const claims = estado?.estado === "presente" ? estado.feed.claims : [];
  for (const bucket of actividad?.buckets ?? []) {
    if (bucket.claim_ids.some(id => !claims.some(c => c.id === id))) {
      throw new FeedInvalidoError("activity.json referencia una afirmación ausente del feed.");
    }
  }
  if (proceso) {
    const pares = new Set<string>();
    for (const entrada of [...proceso.records, ...proceso.absences]) {
      if (pares.has(entrada.period)) throw new FeedInvalidoError("proceso.json repite un periodo de WakaTime.");
      pares.add(entrada.period);
    }
    // Repetir una CADENA no es la unica forma de contar dos veces los mismos segundos.
    //
    // `docs/05` §proceso.json:370 admite mes `AAAA-MM` y trimestre `AAAA-Qn`, asi que un
    // artefacto puede declarar `2026-01` Y `2026-Q1` sin repetir ninguna cadena --- y son
    // los MISMOS segundos, presentados dos veces en la misma lista. Quien la lea de un
    // vistazo sumara mal, y nada se lo advierte.
    //
    // No se prohibe mezclar granularidades, porque el contrato las permite y docs/ es
    // autoridad sobre el codigo. Se prohibe el SOLAPE, que es lo que hace falsa la suma.
    const solapado = periodosSolapados([...pares]);
    if (solapado) {
      throw new FeedInvalidoError(
        `proceso.json declara ${solapado[0]} y ${solapado[1]}, que cubren los mismos segundos. ` +
        "Mes y trimestre pueden convivir, pero no solaparse: se presentarian dos veces.",
      );
    }
  }
  return { proceso, actividad, claims, generatedAt: estado?.estado === "presente" ? estado.feed.meta.generated_at : null };
}
