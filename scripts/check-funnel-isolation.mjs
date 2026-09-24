#!/usr/bin/env node
/**
 * Guard: el funnel comercial no depende del sistema de evidencia.
 *
 * Invariante que protege: docs/04-architecture.md §4, invariante 4 — "las rutas de
 * evidencia estan aisladas del funnel comercial; la ruta de conversion no
 * puede romperse por un problema de evidencia".
 *
 * Como lo comprueba: recorre el **cierre transitivo** de imports estaticos a
 * partir de los componentes del funnel y falla si alguno alcanza un modulo del
 * sistema de evidencia. La version anterior de este guard era un grep de las
 * palabras "proof" y "evidence" sobre los ocho archivos, que un import
 * indirecto evadia sin esfuerzo: Hero -> lib/algo -> lib/proof/feed pasaba en
 * verde.
 *
 * Lo que NO cubre, y esta tabulado en docs/04-architecture.md §4.1:
 *  - import() dinamico cuyo argumento no sea un literal
 *  - re-exports via alias no resolubles estaticamente
 *  - acoplamiento por copia de codigo en lugar de import
 *
 * Uso:
 *   node scripts/check-funnel-isolation.mjs             # entradas por defecto
 *   node scripts/check-funnel-isolation.mjs a.tsx b.tsx # entradas explicitas
 *
 * Exit 0 = aislado. Exit 1 = violacion o entrada inexistente.
 */

import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, resolve, relative, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** Componentes del funnel comercial. docs/04-architecture.md §4, invariante 4. */
const FUNNEL_ENTRYPOINTS = [
  // La pagina y el layout entran como entradas desde `D-09`: son lo que un
  // visitante carga de verdad, y hasta ahora el guard solo miraba los ocho
  // componentes. Un import del feed anadido en `app/page.tsx` --- que es donde
  // resulta mas tentador ponerlo, para "ensenar unos proyectos en la home" ---
  // no lo veia nadie.
  //
  // Ojo con lo que esto NO cambia: `app/proyectos` y `app/evidencia` siguen
  // siendo DESTINOS PROHIBIDOS, no entradas. Anadirlos como entradas seria
  // conceptualmente al reves --- son las rutas que SI pueden leer el feed.
  //
  // `app/colaborar/page.tsx` entra al mover el funnel entero ahi
  // (docs/brand/02-arquitectura-y-urls.md §1 y §3). Es tarea obligatoria del
  // mismo commit que lo mueve: esta lista fija NOMBRES DE ARCHIVO LITERALES y
  // no se entera sola de que la cadena comercial cambio de casa.
  //
  // `app/page.tsx` SE QUEDA, aunque ya no monte el funnel. Sacarla porque "ya
  // no es el funnel" quitaria la defensa justo cuando empieza a hacer falta:
  // la portada nueva es copy editorial estatico y sigue siendo el archivo
  // donde mas tienta importar el feed para "ensenar unos proyectos".
  //
  // `app/sobre-mi/page.tsx` NO entra, y es una decision medida, no un olvido.
  // §3 pide anadirla "si termina montando cualquier componente del funnel"; no
  // monta ninguno --- es copy editorial de `docs/brand/03` §5 y dos enlaces ---
  // asi que no es una entrada del funnel comercial y meterla aqui diluiria lo
  // que esta lista significa. Que tampoco lea el feed lo fija
  // `tests/portada-sin-feed.test.ts` sobre el cierre de imports de la ruta.
  "app/page.tsx",
  "app/layout.tsx",
  "app/colaborar/page.tsx",
  "components/Hero.tsx",
  "components/Offers.tsx",
  "components/FinalCTA.tsx",
  "components/Navbar.tsx",
  "components/Footer.tsx",
  "components/FAQ.tsx",
  "components/Problems.tsx",
  "components/HowItWorks.tsx",
];

/** Prefijos de ruta que pertenecen al sistema de evidencia. */
const EVIDENCE_PREFIXES = [
  "lib/proof",
  "lib/evidence",
  "components/proof",
  "components/evidence",
  "app/proyectos",
  "app/evidencia",
  "app/actividad",
  "public/proof",
];

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs"];

/**
 * Extrae los especificadores de import/export/require estaticos de un archivo.
 *
 * Se ancla en `from "..."` en lugar de intentar parsear la clausula de import
 * completa: cubre `import x from`, `import type {} from`, `export * from` y
 * `export {} from` con un solo patron, y no puede saltarse una sentencia por
 * consumir de mas entre dos de ellas.
 */
function importSpecifiers(source) {
  const patterns = [
    /\bfrom\s*["']([^"']+)["']/g, // import/export ... from "y"
    /\bimport\s+["']([^"']+)["']/g, // import "y"  (side-effect)
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g, // import("y") literal
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g, // require("y")
  ];

  const found = new Set();
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) found.add(match[1]);
  }
  return [...found];
}

/** Resuelve un especificador a una ruta del repo, o null si es externo. */
function resolveSpecifier(specifier, fromFile) {
  let base;
  if (specifier.startsWith("@/")) {
    base = join(REPO_ROOT, specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    base = resolve(dirname(fromFile), specifier);
  } else {
    return null; // node_modules o builtin: no es codigo del repo
  }

  const candidates = [
    base,
    ...EXTENSIONS.map((ext) => base + ext),
    ...EXTENSIONS.map((ext) => join(base, "index" + ext)),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** Ruta relativa al repo, siempre con separador POSIX (el guard corre en Windows y Linux). */
function repoPath(absolutePath) {
  return relative(REPO_ROOT, absolutePath).split(sep).join("/");
}

/** Devuelve el prefijo de evidencia que toca una ruta, o null. */
function evidenceHit(absolutePath) {
  const rel = repoPath(absolutePath);
  return EVIDENCE_PREFIXES.find((prefix) => rel.startsWith(prefix)) ?? null;
}

const entrypoints = process.argv.slice(2);
const targets = entrypoints.length > 0 ? entrypoints : FUNNEL_ENTRYPOINTS;
const violations = [];
const missing = [];
let filesWalked = 0;

for (const entry of targets) {
  const entryPath = resolve(REPO_ROOT, entry);
  if (!existsSync(entryPath)) {
    missing.push(entry);
    continue;
  }

  // BFS sobre el cierre de imports, con la cadena que llevo hasta cada archivo.
  const queue = [{ file: entryPath, chain: [entry] }];
  const seen = new Set([entryPath]);

  while (queue.length > 0) {
    const { file, chain } = queue.shift();
    filesWalked += 1;

    let source;
    try {
      source = readFileSync(file, "utf8");
    } catch {
      continue;
    }

    for (const specifier of importSpecifiers(source)) {
      const resolved = resolveSpecifier(specifier, file);
      if (!resolved) continue;

      const relResolved = repoPath(resolved);
      const hit = evidenceHit(resolved);
      if (hit) {
        violations.push({ chain: [...chain, relResolved], prefix: hit });
        continue; // no seguimos hacia dentro del feed
      }

      if (!seen.has(resolved)) {
        seen.add(resolved);
        queue.push({ file: resolved, chain: [...chain, relResolved] });
      }
    }
  }
}

if (missing.length > 0) {
  console.error(
    `::error::Entradas del funnel inexistentes: ${missing.join(", ")}. ` +
      "Si un componente se renombro, actualiza FUNNEL_ENTRYPOINTS en este script. " +
      "Un guard que apunta a archivos que no existen pasa en verde sin comprobar nada."
  );
  process.exit(1);
}

if (violations.length > 0) {
  for (const { chain, prefix } of violations) {
    console.error(
      `::error::El funnel alcanza el sistema de evidencia (${prefix}): ${chain.join(" -> ")}`
    );
  }
  console.error(
    "::error::Ver docs/04-architecture.md §4, invariante 4. La ruta de conversion no puede romperse por evidencia."
  );
  process.exit(1);
}

console.log(
  `OK: funnel desacoplado. ${targets.length} entradas, ${filesWalked} modulos en el cierre transitivo.`
);
