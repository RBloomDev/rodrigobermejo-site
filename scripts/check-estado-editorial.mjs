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
 * GARANTIZA: que el INDICE de git no rastrea ningun archivo bajo esas dos rutas. Y, SOLO
 * DESPUES DE MIGRAR (ver abajo), que esas rutas tampoco existen ya en disco.
 * NO GARANTIZA: que el estado no este en el historico (ya publicado no se despublica
 * reescribiendo el arbol), ni que no exista en disco sin rastrear ANTES de la migracion —
 * eso es lo normal mientras Rodrigo no corra
 * `docs/plataforma/programacion/01-migrar-el-estado-editorial.md`.
 *
 * LA SEGUNDA COMPROBACION VA CONDICIONADA, Y EL ORDEN ES LA RAZON (§8.6 punto 4, primera
 * sub-comprobacion). Desrastrear no es borrar: AC-EDI-07 prohibe explicitamente el
 * `git rm --cached` que deje a Rodrigo sin bitacora, asi que entre el desrastreo y la
 * migracion las dos rutas TIENEN que seguir en disco. Un guard que exigiera su ausencia
 * desde el primer dia estaria exigiendo perder la bitacora. Se mide como ausencia solo
 * cuando hay senal de que la migracion ya corrio: `$EDITORIAL_ESTADO_DIR` definida y con
 * `bitacora.jsonl` dentro. Mientras no la haya, se informa como NO MEDIDA — no como
 * verde—, que es la diferencia entre no saber y afirmar.
 *
 * Uso:
 *   node scripts/check-estado-editorial.mjs
 *   node scripts/check-estado-editorial.mjs --raiz <dir>   # otro arbol (lo usa su prueba)
 *
 * Exit 0 = ningun archivo rastreado (y, si la migracion ya corrio, nada en disco).
 * Exit 1 = hay estado versionado, quedo estado en disco tras migrar, o no se pudo medir.
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
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

// --- §8.6 punto 4, primera sub-comprobacion: ausencia EN DISCO, despues de migrar -----
//
// Se mide sobre el disco y no con `git status --porcelain` a proposito, y la spec lo
// argumenta: `git status` no lista archivos ignorados, y estas dos rutas estan justamente
// en `.gitignore` desde este cambio. Con la forma de `git status` una prueba que escribiera
// en la ruta real de estado pasaria en silencio, que es lo contrario de lo que se vigila.

const crudoEstadoPrivado = process.env.EDITORIAL_ESTADO_DIR;
const dirEstadoPrivado =
  typeof crudoEstadoPrivado === "string" && crudoEstadoPrivado.trim() !== ""
    ? crudoEstadoPrivado.trim()
    : null;
const migracionCorrida =
  dirEstadoPrivado !== null && existsSync(join(dirEstadoPrivado, "bitacora.jsonl"));

if (!migracionCorrida) {
  console.log(
    "NO MEDIDA: la ausencia en disco de las rutas historicas no se comprueba todavia. " +
      "No hay senal de que la migracion haya corrido ($EDITORIAL_ESTADO_DIR sin " +
      "bitacora.jsonl, o sin definir). Desrastrear no es borrar: hasta migrar, esas rutas " +
      "tienen que seguir en disco. Ver docs/plataforma/programacion/01-migrar-el-estado-editorial.md."
  );
  process.exit(0);
}

const enDisco = RUTAS_VIGILADAS.filter((ruta) => existsSync(join(raiz, ruta)));

if (enDisco.length > 0) {
  for (const ruta of enDisco) {
    console.error(`::error::La migracion ya corrio y ${ruta} sigue existiendo en disco.`);
  }
  console.error(
    "::error::El estado esta en $EDITORIAL_ESTADO_DIR (tiene bitacora.jsonl) y ademas " +
      "quedo una copia en la ruta historica. Dejar una copia es dejar el problema a " +
      "medias: el canal escribe en la privada y la del repositorio envejece sin que nadie " +
      "lo note. Completa la migracion de " +
      "docs/plataforma/programacion/01-migrar-el-estado-editorial.md (mueve, no copies)."
  );
  process.exit(1);
}

console.log(
  `OK: la migracion ya corrio y ni ${RUTAS_VIGILADAS.join(" ni ")} existen ya en disco. ` +
    "El estado vive solo en su directorio privado."
);
