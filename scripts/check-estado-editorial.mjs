#!/usr/bin/env node
/**
 * Guard: el estado del canal editorial NO esta versionado en este repositorio publico.
 *
 * Invariante que protege: `docs/plataforma/02-editorial.md` §8.3 — la bitacora, los
 * fallos, el `vistos.jsonl` heredado y los borradores viven en `$EDITORIAL_ESTADO_DIR` y
 * `$EDITORIAL_REDACCIONES_DIR`, **fuera de todo arbol de git**.
 *
 * Por que existe (§8.6): el 2026-09-17 `git ls-files scripts/editorial` devolvia cinco
 * archivos de estado publicados en un repositorio PUBLICO. Sacarlos no basta: sin
 * compuerta, un `git add` distraido los devuelve la semana siguiente en silencio, que es
 * exactamente como el arbol llego a ese estado. `typecheck`, `lint`, `test`, `build`,
 * `guard:exposicion` y `guard:funnel` pasaban los seis con el estado dentro.
 * `auditoria-exposicion.mjs` tampoco sirve para esto: corre *despues* de escribir.
 *
 * LAS RUTAS VAN LITERALES, y es deliberado (§8.6, punto 1). Este guard vigila las **rutas
 * historicas dentro del repositorio**, no las nuevas: sobre `$EDITORIAL_ESTADO_DIR` no
 * serviria de nada, porque vive fuera de todo arbol de git y `git ls-files` no devolveria
 * nada nunca — el guard no podria fallar, y un guard que no puede fallar es decorado.
 *
 * GARANTIZA: que el INDICE de git no rastrea ningun archivo bajo esas dos rutas.
 * NO GARANTIZA: que el estado no este en el historico (ya publicado no se despublica
 * reescribiendo el arbol), ni que no exista en disco sin rastrear — eso es lo normal
 * mientras Rodrigo no corra la migracion de
 * `docs/plataforma/programacion/01-migrar-el-estado-editorial.md`.
 *
 * Uso:
 *   node scripts/check-estado-editorial.mjs
 *   node scripts/check-estado-editorial.mjs --raiz <dir>   # otro arbol (lo usa su prueba)
 *
 * Exit 0 = ningun archivo rastreado. Exit 1 = hay estado versionado, o no se pudo medir.
 */

import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Las rutas historicas. Si una tarea futura añade otra ruta de estado dentro del
 * repositorio, se añade aqui: la lista es el alcance del guard.
 */
const RUTAS_VIGILADAS = ["scripts/editorial/estado", "scripts/editorial/redacciones"];

const RAIZ_POR_DEFECTO = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const idxRaiz = args.indexOf("--raiz");
const raiz = idxRaiz >= 0 ? resolve(args[idxRaiz + 1] ?? "") : RAIZ_POR_DEFECTO;

let rastreados;
try {
  const salida = execFileSync("git", ["ls-files", "--", ...RUTAS_VIGILADAS], {
    cwd: raiz,
    encoding: "utf8",
    timeout: 60_000,
  });
  rastreados = salida.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
} catch (e) {
  // Sin medicion no hay verde. Un guard que se rinde en silencio cuando no puede
  // comprobar es peor que no tenerlo: informa de lo que no sabe.
  console.error(
    `::error::No se pudo consultar el indice de git en ${raiz}: ${e.message.split("\n")[0]}. ` +
      "Este guard no puede pasar sin medir."
  );
  process.exit(1);
}

if (rastreados.length > 0) {
  for (const ruta of rastreados) {
    console.error(`::error::Estado del canal editorial versionado en el repositorio publico: ${ruta}`);
  }
  console.error(
    `::error::${rastreados.length} archivo(s) bajo ${RUTAS_VIGILADAS.join(" y ")}. ` +
      "El estado y las redacciones viven FUERA de todo arbol de git " +
      "($EDITORIAL_ESTADO_DIR, $EDITORIAL_REDACCIONES_DIR). Ver docs/plataforma/02-editorial.md §8.3."
  );
  console.error(
    "::error::Para desrastrearlos SIN perder su contenido: " +
      "`git rm --cached -r scripts/editorial/estado scripts/editorial/redacciones` " +
      "(los archivos siguen en disco) y despues la migracion de " +
      "docs/plataforma/programacion/01-migrar-el-estado-editorial.md."
  );
  process.exit(1);
}

console.log(
  `OK: git no rastrea nada bajo ${RUTAS_VIGILADAS.join(" ni ")}. ` +
    "El estado del canal editorial no esta en el repositorio publico."
);
