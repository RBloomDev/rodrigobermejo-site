#!/usr/bin/env node
/**
 * Registro minimo de corridas: inicio, fin, estado y etapa. Nada mas.
 *
 * Se deriva de la bitacora, no es un log paralelo: un segundo log que se
 * escribe aparte se desincroniza del primero en cuanto alguien olvida una
 * linea. Aqui la unica fuente es `estado/bitacora.jsonl` mas `estado/fallos.jsonl`.
 *
 * Lo que NO sale de aqui, y es deliberado:
 *   - ningun titulo, ninguna URL, ningun cuerpo de fuente;
 *   - ningun prompt ni respuesta de modelo;
 *   - ningun nombre de repositorio ni de organizacion.
 * Un registro de operacion tiene que poder pegarse en un ticket sin revisarlo.
 *
 * Uso:
 *   node scripts/editorial/registro-de-corridas.mjs [--ultimas N] [--json]
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIR = join(process.cwd(), "scripts", "editorial", "estado");
const args = process.argv.slice(2);
const comoJson = args.includes("--json");
const iN = args.indexOf("--ultimas");
const ultimas = iN >= 0 ? Number(args[iN + 1]) || 10 : 10;

function leerJsonl(ruta) {
  if (!existsSync(ruta)) return [];
  return readFileSync(ruta, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

const eventos = leerJsonl(join(DIR, "bitacora.jsonl"));
const fallos = leerJsonl(join(DIR, "fallos.jsonl"));

/** Agrupa por corrida. La corrida es el unico identificador que se publica. */
const corridas = new Map();
const tocar = (id, ts) => {
  if (!id) return null;
  if (!corridas.has(id)) {
    corridas.set(id, { corrida: id, inicio: ts, fin: ts, eventos: {}, fallos: {}, etapas: new Set() });
  }
  const c = corridas.get(id);
  if (ts < c.inicio) c.inicio = ts;
  if (ts > c.fin) c.fin = ts;
  return c;
};

for (const e of eventos) {
  const c = tocar(e.corrida, e.ts);
  if (!c) continue;
  c.eventos[e.evento] = (c.eventos[e.evento] ?? 0) + 1;
}
for (const f of fallos) {
  const c = tocar(f.corrida, f.registrado_en);
  if (!c) continue;
  c.fallos[f.etapa] = (c.fallos[f.etapa] ?? 0) + 1;
  c.etapas.add(f.etapa);
}

const filas = [...corridas.values()]
  .sort((a, b) => String(a.inicio).localeCompare(String(b.inicio)))
  .slice(-ultimas)
  .map((c) => {
    const nFallos = Object.values(c.fallos).reduce((a, b) => a + b, 0);
    const dur = (new Date(c.fin) - new Date(c.inicio)) / 1000;
    return {
      corrida: c.corrida,
      inicio: c.inicio,
      fin: c.fin,
      duracion_s: Number.isFinite(dur) ? Math.round(dur) : null,
      // Estado de la corrida, no de las piezas: exito, exito parcial, o nada que hacer.
      estado: nFallos > 0 ? "exito_parcial" : (Object.keys(c.eventos).length ? "exito" : "sin_cambios"),
      etapas_con_fallo: [...c.etapas].sort(),
      fallos_por_etapa: c.fallos,
      eventos: c.eventos,
    };
  });

if (comoJson) {
  console.log(JSON.stringify(filas, null, 2));
} else {
  console.log("corrida   inicio                estado          dur   etapas con fallo   eventos");
  console.log("--------  --------------------  --------------  ----  -----------------  -------------------------");
  for (const f of filas) {
    const ev = Object.entries(f.eventos).map(([k, v]) => `${k}:${v}`).join(" ");
    console.log(
      `${f.corrida.slice(0, 8)}  ${String(f.inicio).slice(0, 19)}  ${f.estado.padEnd(14)}  `
      + `${String(f.duracion_s ?? "-").padStart(4)}  ${(f.etapas_con_fallo.join(",") || "-").padEnd(17)}  ${ev}`,
    );
  }
  console.log(`\n${filas.length} corrida(s). Sin titulos, sin URLs, sin prompts: solo operacion.`);
}
