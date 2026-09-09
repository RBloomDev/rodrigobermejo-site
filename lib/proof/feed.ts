import "server-only";

import { readFileSync, statSync } from "node:fs";
import path from "node:path";

import {
  claimsDocSchema,
  evidenceDocSchema,
  metaSchema,
  projectsDocSchema,
} from "./schema.ts";
import type { Feed } from "./schema.ts";

/**
 * `D-06` · lectura del feed publicado, en build.
 *
 * ## La distinción que el plan original tenía mal
 *
 * `docs/05` regla 5 decía «feed ausente → renderiza la vista solo-declarada», y
 * eso es **lógicamente imposible**: las declaraciones viven en `claims.json`. Sin
 * feed no hay claims que mostrar, salvo duplicándolos aquí — que crearía la
 * segunda fuente de verdad que el contrato existe para evitar. «Sin evidencia» y
 * «sin feed» son estados distintos (`decisions/0011`).
 *
 * | Estado | Build |
 * |---|---|
 * | `v1/` no existe (solo `ENOENT` sobre `meta.json`) | verde, superficie editorial sin afirmaciones |
 * | `v1/` existe pero vacío | **rojo** |
 * | `meta.json` de 0 bytes, `EISDIR`, o JSON roto | **rojo** |
 * | `meta.json` presente sin los otros tres | **rojo** |
 * | Los cuatro válidos con `evidence: []` | verde, experiencia normal |
 * | `meta.counts` no cuadra con la longitud real | **rojo** |
 *
 * ## Por qué se captura SOLO `ENOENT`
 *
 * El patrón cómodo —`try { ... } catch { return null }`— colapsa todos los
 * fallos en «ausente», y con él un JSON truncado, un permiso mal puesto o un
 * publish que abortó a medias dan **build verde indistinguible del estado
 * legítimo**. Es el peor de los resultados: el sitio se publica midiendo la cosa
 * equivocada, que `docs/05` declara peor que fallar.
 *
 * ## `PROOF_FEED_DIR`
 *
 * La raíz es parametrizable, y no es una comodidad: `public/proof/v1/**` es zona
 * prohibida para los agentes (`AGENTS.md`), así que **el gate `D-10` —«feed
 * borrado → verde», «feed corrupto → rojo»— solo es ejecutable si se puede
 * apuntar el lector a otro sitio.** Sin esto, el gate se «verificaría» leyendo
 * código, que es justo lo que el principio de verificación prohíbe.
 */

export type EstadoFeed =
  | { estado: "ausente" }
  | { estado: "presente"; feed: Feed };

export class FeedInvalidoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "FeedInvalidoError";
  }
}

const ARCHIVOS = ["meta", "projects", "claims", "evidence"] as const;

export function raizDelFeed(): string {
  return process.env["PROOF_FEED_DIR"] ?? path.join(process.cwd(), "public", "proof", "v1");
}

function esEnoent(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "ENOENT";
}

/**
 * Lee un archivo del feed. Devuelve `null` **solo** si no existe; cualquier otro
 * fallo se convierte en `FeedInvalidoError` con problema, causa y arreglo.
 */
function leerCrudo(dir: string, nombre: string): string | null {
  const ruta = path.join(dir, `${nombre}.json`);
  let bruto: string;
  try {
    bruto = readFileSync(ruta, "utf8");
  } catch (e) {
    if (esEnoent(e)) return null;
    // EISDIR, EACCES y compañía. Un directorio donde va un archivo, o un permiso
    // mal puesto, NO es "no hay feed": es un feed roto.
    throw new FeedInvalidoError(
      `E_FEED_ILEGIBLE ${nombre}.json\n` +
        `  Problema: el archivo existe pero no se pudo leer.\n` +
        `  Causa: ${(e as Error).message}\n` +
        `  Arreglo: comprueba que ${ruta} es un archivo y es legible.`,
    );
  }
  if (bruto.trim() === "") {
    throw new FeedInvalidoError(
      `E_FEED_VACIO ${nombre}.json\n` +
        `  Problema: el archivo existe y esta vacio.\n` +
        `  Causa: probablemente una escritura interrumpida a medias.\n` +
        `  Arreglo: vuelve a correr 'npm run feed:build' en el motor y republica.`,
    );
  }
  return bruto;
}

function parsear(nombre: string, bruto: string): unknown {
  try {
    return JSON.parse(bruto);
  } catch (e) {
    throw new FeedInvalidoError(
      `E_FEED_JSON ${nombre}.json\n` +
        `  Problema: el archivo no es JSON valido.\n` +
        `  Causa: ${(e as Error).message}\n` +
        `  Arreglo: vuelve a generarlo con 'npm run feed:build'. No lo edites a mano:` +
        ` public/proof/v1/** lo escribe solo el motor.`,
    );
  }
}

export function leerFeed(dir: string = raizDelFeed()): EstadoFeed {
  // El ancla es `meta.json`: `docs/05` dice que siempre esta presente si existe
  // cualquier otro archivo. Si el ancla no esta, se comprueba que NINGUNO este
  // — una ausencia parcial es corrupcion, no ausencia.
  const metaBruto = leerCrudo(dir, "meta");

  if (metaBruto === null) {
    const huerfanos = ARCHIVOS.filter((n) => n !== "meta" && leerCrudo(dir, n) !== null);
    if (huerfanos.length > 0) {
      throw new FeedInvalidoError(
        `E_FEED_PARCIAL\n` +
          `  Problema: falta meta.json pero existen ${huerfanos.join(", ")}.\n` +
          `  Causa: docs/05 exige que meta.json este presente si existe cualquier otro` +
          ` archivo; esto es una publicacion a medias.\n` +
          `  Arreglo: republica el feed completo, o borra v1/ entero.`,
      );
    }
    // Y un directorio que existe pero esta vacio tampoco es "no hay feed".
    try {
      if (statSync(dir).isDirectory()) {
        throw new FeedInvalidoError(
          `E_FEED_DIR_VACIO\n` +
            `  Problema: ${dir} existe y no contiene ninguno de los cuatro archivos.\n` +
            `  Causa: un directorio vacio donde deberia haber un feed suele ser un publish` +
            ` que aborto, no una ausencia deliberada.\n` +
            `  Arreglo: borra el directorio, o republica el feed completo.`,
        );
      }
    } catch (e) {
      if (!esEnoent(e)) throw e;
    }
    return { estado: "ausente" };
  }

  const faltan = ARCHIVOS.filter((n) => n !== "meta" && leerCrudo(dir, n) === null);
  if (faltan.length > 0) {
    throw new FeedInvalidoError(
      `E_FEED_INCOMPLETO\n` +
        `  Problema: existe meta.json pero faltan ${faltan.join(", ")}.\n` +
        `  Causa: el feed es todo-o-nada; meta.json declara conteos de archivos que no estan.\n` +
        `  Arreglo: republica el feed completo.`,
    );
  }

  const docs = Object.fromEntries(
    ARCHIVOS.map((n) => [n, parsear(n, n === "meta" ? metaBruto : (leerCrudo(dir, n) as string))]),
  );

  const validar = <T>(nombre: string, schema: { safeParse: (x: unknown) => { success: boolean; data?: T; error?: unknown } }, doc: unknown): T => {
    const r = schema.safeParse(doc);
    if (!r.success || r.data === undefined) {
      throw new FeedInvalidoError(
        `E_FEED_SCHEMA ${nombre}.json\n` +
          `  Problema: el documento no cumple el contrato de docs/05.\n` +
          `  Causa: ${JSON.stringify(r.error, null, 2)?.slice(0, 1200)}\n` +
          `  Arreglo: el motor genero un artefacto que no valida. Corrige publish/feed.ts;` +
          ` no toques el schema para que encaje con el artefacto.`,
      );
    }
    return r.data;
  };

  const meta = validar("meta", metaSchema, docs["meta"]);
  const projects = validar("projects", projectsDocSchema, docs["projects"]);
  const claims = validar("claims", claimsDocSchema, docs["claims"]);
  const evidence = validar("evidence", evidenceDocSchema, docs["evidence"]);

  // Cross-check de cardinalidad. NINGUN schema puede expresar esto: es una
  // relacion ENTRE archivos. Sin el, un `projects: []` sintacticamente perfecto
  // —un publish que aborto tras el filtro— renderiza "0 proyectos" con un
  // `generated_at` fresco afirmando que si se publico.
  const reales = {
    projects: projects.projects.length,
    claims: claims.claims.length,
    evidence: evidence.evidence.length,
  };
  for (const k of ["projects", "claims", "evidence"] as const) {
    if (meta.counts[k] !== reales[k]) {
      throw new FeedInvalidoError(
        `E_FEED_COUNTS ${k}\n` +
          `  Problema: meta.counts.${k} dice ${meta.counts[k]} y ${k}.json tiene ${reales[k]}.\n` +
          `  Causa: un artefacto a medio escribir, o dos corridas mezcladas.\n` +
          `  Arreglo: republica el feed completo desde una sola corrida de feed:build.`,
      );
    }
  }

  // G2 sobre el ARTEFACTO: toda referencia de un claim tiene que existir. El
  // schema no puede comprobarlo porque es una relacion entre archivos.
  const ids = new Set(projects.projects.map((p) => p.id));
  for (const c of claims.claims) {
    const colgantes = c.project_ids.filter((id) => !ids.has(id));
    if (colgantes.length > 0) {
      throw new FeedInvalidoError(
        `E_FEED_G2 ${c.id}\n` +
          `  Problema: el claim referencia proyectos ausentes del artefacto: ${colgantes.join(", ")}.\n` +
          `  Causa: el recorte de claims no elimino un id no publicable, o projects.json` +
          ` esta incompleto.\n` +
          `  Arreglo: revisa el orden de la transformacion en publish/feed.ts (docs/05).`,
      );
    }
  }

  return {
    estado: "presente",
    feed: {
      meta,
      projects: projects.projects,
      claims: claims.claims,
      evidence: evidence.evidence,
    },
  };
}

/**
 * Los claims que sostiene un proyecto, computados al vuelo.
 *
 * **Regla G6:** el índice inverso `Project → Claims` no se persiste en ningún
 * artefacto. La arista la posee `claims[].project_ids`; persistir la inversa
 * crearía una segunda fuente de verdad para la misma relación, que podría
 * discrepar sin que nada fallara.
 */
export function claimsDeProyecto(feed: Feed, projectId: string): Feed["claims"] {
  return feed.claims.filter((c) => c.project_ids.includes(projectId));
}
