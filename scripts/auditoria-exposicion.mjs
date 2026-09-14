#!/usr/bin/env node
/**
 * Auditoria de exposicion: detecta datos de repositorios privados en el arbol
 * publico.
 *
 * Por que existe: el repo del sitio es PUBLICO. El PR #25 incorporo documentos
 * que nombran repositorios privados y publican conteos por organizacion --- los
 * mismos datos que esos documentos declaraban no publicar. Este script existe
 * para que esa contradiccion sea detectable por maquina y no dependa de que
 * alguien se acuerde.
 *
 * Que NO hace: no imprime los valores encontrados. Reporta archivo, linea y
 * clase de hallazgo. Un detector de fugas que imprime la fuga en el log de CI
 * es una fuga mas.
 *
 * Uso:
 *   node scripts/auditoria-exposicion.mjs                 # arbol de trabajo
 *   node scripts/auditoria-exposicion.mjs --lista ruta    # nombres privados desde archivo
 *   node scripts/auditoria-exposicion.mjs --gh           # los pide a `gh` (no los escribe a disco)
 *   node scripts/auditoria-exposicion.mjs --json          # salida legible por maquina
 *
 * Exit 0 = limpio. Exit 1 = hay exposicion.
 */

import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, relative, sep } from "node:path";

const RAIZ = process.cwd();
const args = process.argv.slice(2);
const comoJson = args.includes("--json");
const idxLista = args.indexOf("--lista");
const rutaLista = idxLista >= 0 ? args[idxLista + 1] : null;
// Sin --lista, se puede pedir la lista a `gh` con --gh. Sin ninguna de las dos,
// solo corren los patrones que no necesitan conocer los nombres privados.
const usarGh = args.includes("--gh");

/** Directorios que no se auditan. */
const IGNORAR = new Set([
  ".git", "node_modules", ".next", "out", "dist", "coverage", ".gstack",
]);

/** Extensiones de texto que se revisan. */
const EXT = [".md", ".mdx", ".html", ".json", ".jsonl", ".js", ".mjs", ".ts", ".tsx", ".css", ".txt", ".yml", ".yaml"];

/**
 * Nombres de repositorios privados.
 * NO se hardcodean aqui: escribir la lista de repos privados dentro del repo
 * publico seria exactamente la fuga que este script persigue. Se pasan por
 * --lista desde un archivo fuera del arbol, o se generan al vuelo con `gh`.
 */
/**
 * Genera la lista de repositorios privados con `gh`, para no depender de un
 * archivo suelto en /tmp. Sin esto el guard solo lo podia correr quien tuviera
 * ese archivo, que es como un guard deja de correrse.
 *
 * La lista NUNCA se escribe al disco del repo: se tiene en memoria y se
 * descarta. Escribir la lista de repositorios privados dentro del repositorio
 * publico seria exactamente la fuga que este script persigue.
 */
function generarListaConGh() {
  const orgs = [];
  try {
    const propias = execFileSync("gh", ["api", "user/orgs", "--jq", ".[].login"], {
      encoding: "utf8", timeout: 60_000,
    });
    orgs.push(...propias.split(/\r?\n/).map((s) => s.trim()).filter(Boolean));
  } catch {
    return null; // sin `gh` autenticado no se puede; se dice, no se finge
  }
  // La cuenta personal tambien tiene repositorios privados.
  try {
    const yo = execFileSync("gh", ["api", "user", "--jq", ".login"], { encoding: "utf8", timeout: 60_000 });
    orgs.push(yo.trim());
  } catch { /* si falla, se sigue con las orgs */ }

  const nombres = new Set();
  for (const o of orgs) {
    try {
      const salida = execFileSync("gh", [
        "repo", "list", o, "--limit", "500",
        "--json", "name,isPrivate",
        "--jq", ".[]|select(.isPrivate)|.name",
      ], { encoding: "utf8", timeout: 120_000 });
      for (const n of salida.split(/\r?\n/)) if (n.trim()) nombres.add(n.trim());
    } catch { /* una org sin acceso no invalida el resto */ }
  }
  return [...nombres];
}

function cargarNombresPrivados() {
  const permitidosGh = nombresYaPublicados();
  if (!rutaLista) {
    if (!usarGh) return [];
    const generados = generarListaConGh();
    if (!generados) return null; // marca «no se pudo», distinto de «no hay»
    return generados
      .filter((n) => n.length > 5 && !/^(git|intranet|quinzo|weather-app)$/i.test(n))
      .filter((n) => !permitidosGh.has(n.toLowerCase()));
  }
  if (!existsSync(rutaLista)) return [];
  const permitidos = nombresYaPublicados();
  return readFileSync(rutaLista, "utf8")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    // Nombres cortos o palabras comunes producen falsos positivos.
    .filter((n) => n.length > 5 && !/^(git|intranet|quinzo|weather-app)$/i.test(n))
    // Y los que YA son publicos por decision registrada no son una fuga.
    .filter((n) => !permitidos.has(n.toLowerCase()));
}

/**
 * Nombres que coinciden con un repositorio privado pero que ya son publicos
 * POR DECISION, no por descuido. No se hardcodean: se derivan de donde esa
 * decision esta registrada, para que la lista no se quede obsoleta en silencio.
 *
 *  - Los `id` de public/proof/v1/projects.json los publica el motor, y el
 *    contrato del feed los declara publicos (docs/05-feed-contract.md).
 *  - `proof-engine` y el repo del perfil estan en la tabla de tres repos de
 *    docs/00-product-brief.md, que los nombra a proposito.
 */
function nombresYaPublicados() {
  const fuera = new Set([
    "proof-engine", "rodrigobermejo", "rodrigobermejo-site",
    // Homonimos: el nombre del repositorio privado coincide con algo que ya es
    // publico o de uso comun, y retirarlo empobrece el documento sin ganar
    // privacidad. Nadie infiere un repositorio de estas dos apariciones.
    //
    //  - un dominio publico que cualquiera puede visitar;
    //  - una palabra corriente del espanol, que aparece en prosa normativa.
    //
    // Es el limite real de un detector lexico: no distingue homonimos. Se
    // declara aqui en vez de bajar el listen, para que la excepcion sea
    // visible y revisable.
    "inadaptados.mx",
    "posible",
  ]);
  const feed = join(RAIZ, "public", "proof", "v1", "projects.json");
  if (existsSync(feed)) {
    try {
      const doc = JSON.parse(readFileSync(feed, "utf8"));
      for (const p of doc.projects ?? []) if (p?.id) fuera.add(String(p.id).toLowerCase());
    } catch { /* si el feed no parsea, la lista queda con los fijos */ }
  }
  return fuera;
}

/**
 * Patrones de exposicion que NO dependen de conocer los nombres privados.
 * Estos son los que pueden correr en CI sin acceso a la lista.
 */
const PATRONES = [
  {
    clase: "conteo-por-organizacion",
    // "1,319 en Inadaptados", "80 PRs en RBloomDev", "96 repos"
    re: /\b\d[\d,\.]{1,}\s*(?:PRs?|pull requests?|commits?|repos(?:itorios)?|reviews?)[^.\n]{0,40}\b(?:en|de|del)\s+(?:la\s+)?(?:org(?:anizaci[oó]n)?\s+)?(Inadaptados|RBloomDev|ISC-UPA|TerracotaFloreria)\b/gi,
    porque: "atribuye un volumen a una organizacion concreta: aisla un sujeto (docs/03 §3 regla 2)",
  },
  {
    clase: "conteo-por-organizacion-invertido",
    // "Inadaptados tiene 96 repos", "Solo Inadaptados: 96"
    re: /\b(Inadaptados|RBloomDev|ISC-UPA|TerracotaFloreria)\b[^.\n]{0,40}\b\d[\d,\.]{1,}\s*(?:PRs?|pull requests?|commits?|repos(?:itorios)?|reviews?)/gi,
    porque: "atribuye un volumen a una organizacion concreta: aisla un sujeto (docs/03 §3 regla 2)",
  },
  {
    clase: "serie-temporal-de-actividad",
    // "ene 20, feb 31, mar 102, abr 163" -- cuatro o mas pares mes:cifra
    re: /(?:\b(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\b[^\n,;]{0,4}\d{1,4}[,;]\s*){3,}/gi,
    porque: "una serie mensual es un corte mas fino que deja de cubrir dos sujetos independientes",
  },
  {
    clase: "conteo-de-repos-privados",
    re: /\b\d{2,4}\s*(?:repos(?:itorios)?)\b[^.\n]{0,30}\bprivad/gi,
    porque: "el numero de repositorios privados es en si mismo informacion sobre trabajo no publicado",
  },
  {
    clase: "reparto-publico-privado",
    re: /\b\d[\d,\.]*\s*(?:de\s+(?:los\s+)?)?\d[\d,\.]*\s*(?:son\s+)?privad/gi,
    porque: "el reparto publico/privado permite derivar el volumen no publicado por resta",
  },
  {
    clase: "porcentaje-de-actividad-privada",
    re: /\b\d{1,3}(?:[.,]\d+)?\s*%[^.\n]{0,40}\b(?:privad|restringid)/gi,
    porque: "el porcentaje privado permite derivar el volumen absoluto si se conoce el total",
  },
  {
    clase: "autoria-parcial-en-repo-privado",
    // "en X es el 70%" junto a un nombre de repo -- se detecta por el patron de porcentaje de commits
    re: /\b(?:solo\s+)?el\s+\d{1,3}\s*%\s+de\s+los\s+commits?\b/gi,
    porque: "revela composicion de equipo de un repositorio no publico",
  },
];

function esTexto(p) {
  return EXT.some((e) => p.toLowerCase().endsWith(e));
}

function* recorrer(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORAR.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* recorrer(p);
    else if (e.isFile() && esTexto(p) && statSync(p).size < 4_000_000) yield p;
  }
}

const privados = cargarNombresPrivados();
const hallazgos = [];

for (const abs of recorrer(RAIZ)) {
  const rel = relative(RAIZ, abs).split(sep).join("/");
  // El propio detector nombra las clases, no los valores: no se audita a si mismo.
  if (rel === "scripts/auditoria-exposicion.mjs") continue;

  let texto;
  try { texto = readFileSync(abs, "utf8"); } catch { continue; }
  const lineas = texto.split(/\r?\n/);

  for (const { clase, re, porque } of PATRONES) {
    lineas.forEach((linea, i) => {
      re.lastIndex = 0;
      if (re.test(linea)) hallazgos.push({ archivo: rel, linea: i + 1, clase, porque });
    });
  }

  if (privados.length) {
    // Insensible a mayusculas: la version anterior comparaba literal, asi que
    // capitalizar un nombre lo evadia. Un detector evadible por Shift no es
    // un detector.
    //
    // Y con limite de palabra, no subcadena: hay un nombre de repositorio que
    // aparece dentro de una palabra comun en espanol, y la coincidencia por
    // `includes` marcaba parrafos normativos que no tenian nada que ver. Un
    // detector con falsos positivos se acaba desactivando, que es peor que no
    // tenerlo.
    const privadosRe = privados.map((n) => ({
      nombre: n,
      re: new RegExp(`(^|[^\\p{L}\\p{N}])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}\\p{N}]|$)`, "iu"),
    }));
    lineas.forEach((linea, i) => {
      for (const { re } of privadosRe) {
        if (re.test(linea)) {
          hallazgos.push({
            archivo: rel, linea: i + 1,
            clase: "nombre-de-repositorio-privado",
            porque: "el nombre de un repositorio privado revela una linea de trabajo no publicada",
          });
          break; // uno por linea basta; no se enumera cual
        }
      }
    });
  }
}

if (comoJson) {
  console.log(JSON.stringify({ total: hallazgos.length, hallazgos }, null, 2));
} else if (hallazgos.length === 0) {
  console.log("OK: sin exposicion detectada.");
  if (!privados.length) {
    console.log("NOTA: sin --lista, no se comprobaron nombres de repositorios privados.");
  }
} else {
  const porClase = {};
  for (const h of hallazgos) porClase[h.clase] = (porClase[h.clase] ?? 0) + 1;
  console.error("EXPOSICION DETECTADA. No se imprimen los valores, solo su ubicacion.\n");
  for (const h of hallazgos) {
    console.error(`  ${h.archivo}:${h.linea}  [${h.clase}]`);
  }
  console.error("\nResumen por clase:");
  for (const [c, n] of Object.entries(porClase).sort((a, b) => b[1] - a[1])) {
    const porque = PATRONES.find((p) => p.clase === c)?.porque
      ?? "el nombre de un repositorio privado revela una linea de trabajo no publicada";
    console.error(`  ${String(n).padStart(3)} x ${c}\n        ${porque}`);
  }
  console.error(`\nTotal: ${hallazgos.length}. Ver docs/03-privacy-and-publication-policy.md §3.`);
  process.exit(1);
}
