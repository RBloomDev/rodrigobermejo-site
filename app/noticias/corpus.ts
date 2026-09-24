import "server-only";

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { piezaSchema } from "./esquema.ts";
import type { Pieza } from "./esquema.ts";

/**
 * Lectura del **corpus editorial publicado**. Es la única fuente de datos de `/noticias` y
 * de `/noticias/[slug]`.
 *
 * ## La frontera, y por qué este archivo no importa nada del feed
 *
 * `docs/03-privacy-and-publication-policy.md` §4, tabla «Fronteras que nunca se cruzan»:
 * el contenido editorial puede *enlazar* a evidencia y **jamás derivarse de ella ni
 * alimentarla**. `docs/plataforma/01-noticias-y-actividad.md` §1.2 lo baja a una
 * prohibición comprobable: cero imports de `lib/proof`, `lib/evidence`, `components/proof`
 * o `public/proof`. Por eso este lector repite lo poco que necesita —formato de fecha,
 * lectura de JSON— en vez de reutilizar el del feed: compartir un módulo sería el primer
 * hilo de la derivación.
 *
 * ## Por qué vive en `app/noticias/` y no en `lib/`
 *
 * `scripts/editorial/pruebas/autorizar.test.mjs` (AC-AUT-05) exige que **ningún** módulo
 * de `scripts/` ni de `lib/` resuelva la ruta `content/noticias`: la única puerta de
 * ESCRITURA al árbol público es el comando de autorización. La sonda excluye `app/` a
 * propósito —«el corpus existe para renderizarse, y una ruta que lo LEE es el objetivo del
 * diseño»—, así que el lector se coloca donde la invariante lo admite. Escribirlo en `lib/`
 * habría obligado a aflojar esa sonda para terminar, que es justo lo que no se hace.
 *
 * ## `NOTICIAS_CORPUS_DIR`
 *
 * La raíz es parametrizable **solo para leer**. No es una comodidad: el corpus real está
 * vacío hoy y solo Rodrigo puede llenarlo (`02-editorial.md` §8.4), así que sin esta
 * variable las pruebas de lo que se renderiza con una pieza publicada no serían
 * ejecutables —habría que escribir una pieza en `content/noticias/` para probar, y eso es
 * publicar—. Mismo precedente y mismo alcance que `PROOF_FEED_DIR` en `lib/proof/feed.ts`.
 * **No abre ninguna vía de escritura**: aquí no se escribe un byte, y el comando de
 * autorización sigue derivando su destino de su propia ubicación, sin leer esta variable.
 *
 * ## Estados, y cuál es rojo
 *
 * | Estado del corpus | Resultado |
 * |---|---|
 * | El directorio no existe | **Vacío.** Es el estado correcto de hoy (`01` §5.4), no un error |
 * | El directorio existe y no tiene ningún `.json` | **Vacío.** Nadie ha autorizado todavía |
 * | Un archivo con JSON roto | **Rojo.** Un corpus a medio escribir no se renderiza a medias |
 * | Un archivo que no compone contra §3 | **Rojo.** El esquema es cerrado (§3) |
 * | El `id` no coincide con el nombre del archivo | **Rojo.** El `id` ES el nombre y el slug |
 * | Una pieza en `borrador` | **Se descarta al leer**, nunca llega al render (§1.1) |
 *
 * La distinción que no se colapsa: «no hay corpus» y «el corpus está roto» son estados
 * distintos, y el cómodo `try { ... } catch { return [] }` los vuelve indistinguibles —con
 * él, un archivo truncado publicaría un índice vacío en verde.
 */

export class CorpusInvalidoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "CorpusInvalidoError";
  }
}

export function raizDelCorpus(): string {
  return (
    process.env["NOTICIAS_CORPUS_DIR"] ?? path.join(process.cwd(), "content", "noticias")
  );
}

function esEnoent(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "ENOENT";
}

function archivosDelCorpus(dir: string): string[] {
  let entradas: string[];
  try {
    entradas = readdirSync(dir);
  } catch (e) {
    // El directorio ausente es el corpus vacío: lo crea el comando de autorización al
    // escribir la primera pieza (§8.4). Cualquier otro fallo —permisos, un archivo donde
    // va el directorio— es un corpus roto y se dice.
    if (esEnoent(e)) return [];
    throw new CorpusInvalidoError(
      `E_CORPUS_ILEGIBLE\n` +
        `  Problema: ${dir} existe y no se pudo listar.\n` +
        `  Causa: ${(e as Error).message}\n` +
        `  Arreglo: comprueba que es un directorio legible.`,
    );
  }
  return entradas.filter((n) => n.endsWith(".json")).sort();
}

function leerPiezaDeArchivo(dir: string, nombre: string): Pieza {
  const ruta = path.join(dir, nombre);
  let bruto: string;
  try {
    bruto = readFileSync(ruta, "utf8");
  } catch (e) {
    throw new CorpusInvalidoError(
      `E_CORPUS_ILEGIBLE ${nombre}\n` +
        `  Problema: el archivo está en el corpus y no se pudo leer.\n` +
        `  Causa: ${(e as Error).message}\n` +
        `  Arreglo: comprueba que ${ruta} es un archivo legible.`,
    );
  }

  let documento: unknown;
  try {
    documento = JSON.parse(bruto);
  } catch (e) {
    throw new CorpusInvalidoError(
      `E_CORPUS_JSON ${nombre}\n` +
        `  Problema: el archivo no es JSON válido.\n` +
        `  Causa: ${(e as Error).message}\n` +
        `  Arreglo: el corpus lo escribe solo \`autorizar\`; no lo edites a mano. Vuelve a` +
        ` autorizar la pieza (docs/plataforma/02-editorial.md §8.4).`,
    );
  }

  const r = piezaSchema.safeParse(documento);
  if (!r.success) {
    throw new CorpusInvalidoError(
      `E_CORPUS_ESQUEMA ${nombre}\n` +
        `  Problema: la pieza no compone contra el esquema de 02-editorial.md §3.\n` +
        `  Causa: ${JSON.stringify(r.error.issues, null, 2).slice(0, 1200)}\n` +
        `  Arreglo: corrige la pieza en el canal editorial y vuelve a autorizarla. No` +
        ` aflojes el esquema para que encaje: §3 es la autoridad y es cerrado.`,
    );
  }

  const esperado = nombre.replace(/\.json$/, "");
  if (r.data.id !== esperado) {
    throw new CorpusInvalidoError(
      `E_CORPUS_ID ${nombre}\n` +
        `  Problema: el \`id\` es "${r.data.id}" y el archivo se llama "${esperado}".\n` +
        `  Causa: el \`id\` es el nombre del archivo y también el slug de la ruta (§3);` +
        ` si divergen, dos URLs distintas describen la misma pieza.\n` +
        `  Arreglo: vuelve a autorizar la pieza, que escribe el archivo con su \`id\`.`,
    );
  }
  return r.data;
}

/**
 * Las piezas **publicadas**, en orden cronológico descendente por `ocurrido_en`.
 *
 * El filtrado por estado ocurre aquí, en la lectura, y no en el render: `01` §1.1
 * requisito 1 lo exige literalmente porque «un `.filter()` dentro del JSX es la forma en
 * que un borrador se sirve por accidente». Una pieza en borrador no llega al componente.
 *
 * El orden es temporal, no de magnitud, así que no cae en la prohibición de ranking de
 * `01` §2.3. El desempate por `id` existe para que dos piezas del mismo día no cambien de
 * sitio entre builds.
 */
export function leerCorpus(dir: string = raizDelCorpus()): Pieza[] {
  return archivosDelCorpus(dir)
    .map((nombre) => leerPiezaDeArchivo(dir, nombre))
    .filter((pieza) => pieza.estado === "autorizada")
    .sort((a, b) =>
      a.ocurrido_en === b.ocurrido_en
        ? a.id.localeCompare(b.id)
        : b.ocurrido_en.localeCompare(a.ocurrido_en),
    );
}

/** Una pieza publicada por su slug, o `null`. Un borrador nunca se encuentra. */
export function leerPieza(slug: string, dir: string = raizDelCorpus()): Pieza | null {
  return leerCorpus(dir).find((p) => p.id === slug) ?? null;
}
