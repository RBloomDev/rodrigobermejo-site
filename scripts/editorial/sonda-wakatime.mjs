#!/usr/bin/env node
/**
 * Sonda de WakaTime: averigua QUE hay disponible, no lo publica.
 *
 * Por que existe: el catalogo de metricas declaraba el tiempo humano como
 * DATO INEXISTENTE. Con WakaTime configurado ya no lo es --- pero tampoco es
 * "horas trabajadas". Esta sonda existe para caracterizar la fuente con
 * precision antes de que nadie la presente en pantalla.
 *
 * Reglas que respeta:
 *  - La API key se lee de ~/.wakatime.cfg y NUNCA se imprime ni se escribe.
 *  - Solo lecturas. Cero escrituras a WakaTime.
 *  - Los nombres de proyecto de WakaTime coinciden con repositorios privados,
 *    asi que por defecto se AGREGAN y no se listan. Con --proyectos se
 *    imprimen hasheados, para poder contar sin identificar.
 *
 * Uso:
 *   node scripts/editorial/sonda-wakatime.mjs [--dias 30] [--proyectos] [--json]
 *
 * Exit 0 = hubo respuesta. Exit 3 = sin credencial. Exit 4 = error de acceso.
 */

import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

const args = process.argv.slice(2);
const comoJson = args.includes("--json");
const conProyectos = args.includes("--proyectos");
const iDias = args.indexOf("--dias");
const dias = iDias >= 0 ? Number(args[iDias + 1]) : 30;

function leerClave() {
  const cfg = join(homedir(), ".wakatime.cfg");
  if (!existsSync(cfg)) return null;
  for (const linea of readFileSync(cfg, "utf8").split(/\r?\n/)) {
    const m = linea.match(/^\s*api_key\s*=\s*(.+?)\s*$/);
    if (m) return m[1];
  }
  return null;
}

const clave = leerClave();
if (!clave) {
  console.error("Sin credencial de WakaTime en ~/.wakatime.cfg. Nada que sondear.");
  process.exit(3);
}

const auth = "Basic " + Buffer.from(clave).toString("base64");
const BASE = "https://wakatime.com/api/v1";

/**
 * Pasa por la misma guarda que todo lo que el canal descarga
 * (`red-segura.mjs`), aunque el host sea fijo y de primera parte. La razon no
 * es que se espere un ataque por aqui: es que «todos los clientes de descarga»
 * signifique todos, sin una excepcion que luego nadie recuerde.
 *
 * **`maxSaltos: 0` es obligatorio aqui.** Esta peticion lleva credencial, y
 * seguir una redireccion reenviaria la cabecera `Authorization` a un destino
 * que elige quien controle la respuesta. La version con `curl` no seguia
 * redirecciones porque no se le pasaba `-L`; aqui se declara explicito para
 * que no se pierda la proxima vez que alguien toque esto.
 *
 * La clave nunca viaja por la linea de comandos --- ya no hay proceso hijo,
 * que era la razon de usar `curl` --- ni se imprime en ningun camino.
 */
async function pedir(ruta) {
  const { seguirConGuarda } = await import("./red-segura.mjs");
  const r = await seguirConGuarda(BASE + ruta, {
    cabeceras: { Authorization: auth, accept: "application/json" },
    maxSaltos: 0,
  });
  if (!r.ok) {
    const e = new Error(`HTTP ${r.codigo}`);
    e.codigo = Number(r.codigo) || 0;
    throw e;
  }
  return JSON.parse(r.texto);
}

/** Nombre de proyecto -> identificador estable no reversible a simple vista. */
const seudonimo = (s) => "p_" + createHash("sha256").update(String(s)).digest("hex").slice(0, 8);

const hoy = new Date();
const desde = new Date(hoy.getTime() - dias * 864e5);
const fmt = (d) => d.toISOString().slice(0, 10);

try {
  const usuario = await pedir("/users/current");
  const resumen = await pedir(`/users/current/summaries?start=${fmt(desde)}&end=${fmt(hoy)}`);

  const dd = resumen.data ?? [];
  let segundos = 0;
  const porProyecto = new Map();
  const porLenguaje = new Map();
  const porEditor = new Map();
  let diasConDato = 0;

  for (const d of dd) {
    const s = d.grand_total?.total_seconds ?? 0;
    segundos += s;
    if (s > 0) diasConDato += 1;
    for (const p of d.projects ?? []) porProyecto.set(p.name, (porProyecto.get(p.name) ?? 0) + p.total_seconds);
    for (const l of d.languages ?? []) porLenguaje.set(l.name, (porLenguaje.get(l.name) ?? 0) + l.total_seconds);
    for (const e of d.editors ?? []) porEditor.set(e.name, (porEditor.get(e.name) ?? 0) + e.total_seconds);
  }

  const salida = {
    disponible: true,
    // Caracterizacion de la fuente. Esto es lo que hay que declarar en pantalla.
    que_mide: "tiempo con actividad en un editor instrumentado, no horas trabajadas",
    no_mide: [
      "reunion, diseno, lectura, docencia presencial, o cualquier trabajo fuera del editor",
      "trabajo en una maquina o editor sin el plugin instalado",
      "tiempo de espera de un agente mientras no hay actividad humana",
    ],
    unidad: "segundos de actividad, agregados por dia",
    zona_horaria: usuario.data?.timezone ?? null,
    plan: usuario.data?.plan ?? null,
    // El plan gratuito de WakaTime limita el historial; lo declara la propia cuenta.
    ventana_consultada_dias: dias,
    dias_con_dato: diasConDato,
    dias_devueltos: dd.length,
    horas_totales: +(segundos / 3600).toFixed(1),
    proyectos_distintos: porProyecto.size,
    lenguajes_distintos: porLenguaje.size,
    editores_distintos: porEditor.size,
    // Cuanto del total cae en el proyecto mas grande. Si un solo proyecto
    // domina, publicar el total es publicar ese proyecto con ruido.
    dominancia_del_mayor: porProyecto.size
      ? +((Math.max(...porProyecto.values()) / Math.max(segundos, 1)) * 100).toFixed(1)
      : null,
  };

  if (conProyectos) {
    salida.proyectos = [...porProyecto.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([n, s]) => ({ id: seudonimo(n), horas: +(s / 3600).toFixed(1) }));
    salida.lenguajes = [...porLenguaje.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([n, s]) => ({ lenguaje: n, horas: +(s / 3600).toFixed(1) }));
    salida.editores = [...porEditor.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([n, s]) => ({ editor: n, horas: +(s / 3600).toFixed(1) }));
  }

  if (comoJson) {
    console.log(JSON.stringify(salida, null, 2));
  } else {
    console.log("WakaTime: fuente DISPONIBLE\n");
    for (const [k, v] of Object.entries(salida)) {
      if (Array.isArray(v) && typeof v[0] === "object") continue;
      console.log(`  ${k.padEnd(26)} ${Array.isArray(v) ? "" : v}`);
      if (Array.isArray(v)) for (const x of v) console.log(`      - ${x}`);
    }
    if (conProyectos) {
      console.log("\n  proyectos (seudonimizados, no se listan sus nombres):");
      for (const p of salida.proyectos) console.log(`      ${p.id}  ${p.horas} h`);
      console.log("\n  lenguajes:");
      for (const l of salida.lenguajes) console.log(`      ${l.lenguaje.padEnd(16)} ${l.horas} h`);
      console.log("\n  editores:");
      for (const e of salida.editores) console.log(`      ${e.editor.padEnd(16)} ${e.horas} h`);
    }
  }
} catch (e) {
  console.error(`Error de acceso a WakaTime: ${e.message}`);
  console.error("No se genera ninguna cifra a partir de esto. Dato desconocido, no cero.");
  process.exit(4);
}
