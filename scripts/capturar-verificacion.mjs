/**
 * Pasada de verificacion en navegador: mide, captura y escribe su manifiesto.
 *
 * Existe porque ningun run del orquestador puede hacer esto: sus gates son codigos de
 * salida y su Reviewer es de solo lectura. La parada es declarada, no una limitacion
 * escondida.
 *
 * ## Por que mide en vez de pedir
 *
 * Redimensionar la ventana NO cambia el viewport. En la linea base de esta misma tarea se
 * pidio 390 y salio **502**, porque la ventana de Chrome no baja de su ancho minimo. Una
 * captura etiquetada «movil» que en realidad es de 502px es peor que no tener captura: se
 * cree. Por eso se emula el dispositivo con `Emulation.setDeviceMetricsOverride` y se
 * **comprueba `window.innerWidth` DESPUES de emular y ANTES de capturar**. Si no coincide
 * con el nominal, el script aborta: no se guarda una captura que no se puede etiquetar.
 *
 * ## Por que un script y no la herramienta interactiva
 *
 * Veinte capturas por la via interactiva son sesenta pasos, y el manifiesto se llenaria
 * transcribiendo a mano lo que se leyo en otro sitio. Aqui mide y escribe el mismo codigo:
 * el manifiesto no puede divergir de lo medido porque no hay copia de por medio.
 *
 * Sin dependencias: CDP por el `WebSocket` global de Node y `fetch` al endpoint HTTP.
 *
 *   node scripts/capturar-verificacion.mjs <baseUrl> <salida> <sha>
 */

import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3401";
const SALIDA = process.argv[3] ?? "docs/plataforma/verificacion/2026-09-24";
const SHA = process.argv[4] ?? execFileSync("git", ["rev-parse", "HEAD"]).toString().trim();

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PUERTO = 9333;

/** Toda ruta renderizable. Las dinamicas llevan un ejemplar real, no un slug inventado. */
const RUTAS = [
  { ruta: "/", nombre: "portada" },
  { ruta: "/noticias", nombre: "noticias" },
  { ruta: "/actividad", nombre: "actividad" },
  { ruta: "/proyectos", nombre: "proyectos" },
  { ruta: "/proyectos/contenido-ia", nombre: "proyecto-detalle" },
  { ruta: "/sobre-mi", nombre: "sobre-mi" },
  { ruta: "/colaborar", nombre: "colaborar" },
  { ruta: "/evidencia", nombre: "evidencia" },
  { ruta: "/blog", nombre: "blog" },
  { ruta: "/blog/mitos-sobre-automatizacion", nombre: "blog-detalle" },
];

/**
 * `mobile: true` SI importa --- cambia las media queries y el layout, que es lo que se
 * verifica. `dsf` (densidad de pixel) NO: el viewport medido es 390 con dsf 1 o con dsf 3,
 * y el arbol renderizado es identico. Lo unico que cambia es el peso del PNG.
 *
 * Se usa dsf 1 a proposito. Con dsf 3 cada captura movil pesaba 2.6 MB y la corrida entera
 * 15 MB, en un repositorio PUBLICO y para siempre --- y esto se repite en cada pasada. Una
 * captura de verificacion existe para comprobar el layout y el ancho, no para inspeccionar
 * el antialias de una tipografia.
 */
const ANCHOS = [
  { nombre: "escritorio", width: 1280, height: 900, dsf: 1, mobile: false },
  { nombre: "movil", width: 390, height: 844, dsf: 1, mobile: true },
];

// --- cliente CDP minimo -----------------------------------------------------

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.n = 0;
    this.pendientes = new Map();
    ws.addEventListener("message", (ev) => {
      const m = JSON.parse(ev.data);
      const p = this.pendientes.get(m.id);
      if (!p) return;
      this.pendientes.delete(m.id);
      if (m.error) p.rechazar(new Error(m.error.message));
      else p.resolver(m.result);
    });
  }
  enviar(method, params = {}) {
    const id = ++this.n;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolver, rechazar) => this.pendientes.set(id, { resolver, rechazar }));
  }
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function conectar(url) {
  const ws = new WebSocket(url);
  await new Promise((r, x) => {
    ws.addEventListener("open", r, { once: true });
    ws.addEventListener("error", () => x(new Error("no se pudo abrir el WebSocket de CDP")), { once: true });
  });
  return new Cdp(ws);
}

// --- pasada -----------------------------------------------------------------

const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-verif-"));
const chrome = spawn(CHROME, [
  "--headless=new",
  `--remote-debugging-port=${PUERTO}`,
  `--user-data-dir=${perfil}`,
  "--no-first-run",
  "--disable-gpu",
  "about:blank",
], { stdio: "ignore", detached: false });

const fallos = [];
const capturas = [];

try {
  // Esperar a que el endpoint responda, sin dormir a ciegas.
  let version = null;
  for (let i = 0; i < 60 && !version; i++) {
    try { version = await (await fetch(`http://127.0.0.1:${PUERTO}/json/version`)).json(); }
    catch { await dormir(500); }
  }
  if (!version) throw new Error("Chrome no expuso su endpoint de depuracion");

  const dir = path.join(SALIDA, "capturas");
  fs.mkdirSync(dir, { recursive: true });

  const cdp = await conectar(version.webSocketDebuggerUrl);
  const { targetId } = await cdp.enviar("Target.createTarget", { url: "about:blank" });
  const pagina = await conectar(`ws://127.0.0.1:${PUERTO}/devtools/page/${targetId}`);
  await pagina.enviar("Page.enable");
  await pagina.enviar("Runtime.enable");

  const evaluar = async (expresion) => {
    const r = await pagina.enviar("Runtime.evaluate", { expression: expresion, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    return r.result.value;
  };

  for (const ancho of ANCHOS) {
    await pagina.enviar("Emulation.setDeviceMetricsOverride", {
      width: ancho.width, height: ancho.height,
      deviceScaleFactor: ancho.dsf, mobile: ancho.mobile,
    });

    for (const { ruta, nombre } of RUTAS) {
      await pagina.enviar("Page.navigate", { url: BASE + ruta });
      // Esperar a que el documento este completo, sondeando en vez de dormir un numero fijo.
      for (let i = 0; i < 60; i++) {
        if (await evaluar("document.readyState === 'complete'")) break;
        await dormir(200);
      }
      await dormir(250); // asentar fuentes y layout

      // MEDIR ANTES DE CAPTURAR. Si el ancho real no es el nominal, la captura no se guarda.
      const medida = await evaluar(`(${(() => {
        const d = document.documentElement;
        return JSON.stringify({
          innerWidth: window.innerWidth,
          scrollWidth: d.scrollWidth,
          desbordaHorizontal: d.scrollWidth > window.innerWidth + 1,
          titulo: document.title,
          h1: [...document.querySelectorAll("h1")].map((h) => h.textContent.trim()),
          jerarquia: [...document.querySelectorAll("h1,h2,h3")].map((h) => h.tagName).join(" "),
        });
      }).toString()})()`);
      const m = JSON.parse(medida);

      if (m.innerWidth !== ancho.width) {
        fallos.push(`${ruta} @${ancho.nombre}: se pidio ${ancho.width} y el viewport real es ${m.innerWidth}. No se captura.`);
        continue;
      }

      // webp y no png: una captura de pantalla comprime mal en png ---la corrida entera
      // pesaba 6.5 MB--- y esto se guarda en un repositorio PUBLICO en cada pasada. Lo que
      // se verifica aqui es el layout y el ancho, no el antialias de una tipografia.
      const archivo = `${nombre}-${ancho.nombre}.webp`;
      const { data } = await pagina.enviar("Page.captureScreenshot", { format: "webp", quality: 82, captureBeyondViewport: true });
      fs.writeFileSync(path.join(dir, archivo), Buffer.from(data, "base64"));

      capturas.push({
        archivo: `capturas/${archivo}`,
        ruta,
        viewport_nominal: ancho.width,
        viewport_medido: m.innerWidth,
        desborda_horizontal: m.desbordaHorizontal,
        scroll_width: m.scrollWidth,
        titulo: m.titulo,
        h1: m.h1,
        jerarquia_de_encabezados: m.jerarquia,
      });
      console.log(`${archivo.padEnd(32)} viewport medido ${m.innerWidth}  h1=${m.h1.length}  desborda=${m.desbordaHorizontal}`);
    }
  }

  const manifiesto = {
    sha: SHA,
    base_url: BASE,
    generado_en: new Date().toISOString(),
    como_se_midio:
      "El viewport se emula con Emulation.setDeviceMetricsOverride y se verifica leyendo " +
      "window.innerWidth DESPUES de emular y ANTES de capturar. Redimensionar la ventana no " +
      "cambia el viewport: en la linea base se pidio 390 y salio 502. Si el ancho medido no " +
      "coincide con el nominal, la captura NO se guarda y el script sale con codigo 1.",
    rutas_cubiertas: RUTAS.map((r) => r.ruta),
    capturas,
  };
  fs.writeFileSync(path.join(SALIDA, "manifiesto.json"), JSON.stringify(manifiesto, null, 2) + "\n", "utf8");

  const esperadas = RUTAS.length * ANCHOS.length;
  if (capturas.length !== esperadas) fallos.push(`se esperaban ${esperadas} capturas y hay ${capturas.length}`);
  const conDesborde = capturas.filter((c) => c.desborda_horizontal);
  if (conDesborde.length) fallos.push(`desbordan horizontalmente: ${conDesborde.map((c) => `${c.ruta}@${c.viewport_nominal}`).join(", ")}`);
  const sinH1 = capturas.filter((c) => c.h1.length !== 1);
  if (sinH1.length) fallos.push(`no tienen exactamente un h1: ${sinH1.map((c) => `${c.ruta}@${c.viewport_nominal}`).join(", ")}`);
} finally {
  chrome.kill();
}

if (fallos.length) {
  console.error(`\nPASADA ROJA: ${fallos.length} problema(s)`);
  for (const f of fallos) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`\n${capturas.length} capturas, todas con su viewport medido. Manifiesto en ${SALIDA}/manifiesto.json`);
