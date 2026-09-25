/**
 * Las SEIS reglas de forma de /proyectos y /proyectos/[slug], contra el arbol RENDERIZADO.
 *
 * `docs/brand` las fija porque una cifra puede ser correcta y aun asi mentir por como se
 * presenta: un numero grande sobre una etiqueta pequena se lee como logro, una flecha verde
 * como mejora, y un orden descendente como ranking de personas. Ninguna de las tres
 * afirmaciones esta escrita en ninguna parte --- las produce la forma.
 *
 * Por que aqui y no en la suite: estas reglas hablan de TAMANOS, COLORES y ORDEN
 * COMPUTADOS. Un test que lea el .tsx comprueba que no se escribio la palabra prohibida;
 * esto comprueba lo que el navegador realmente pinta. `AC-PRY-05` quedo tres veces marcado
 * SATISFIED sin que nadie abriera un navegador, y ese fue el defecto que obligo a arreglar
 * la compuerta de criterios del orquestador.
 *
 *   node scripts/verificar-reglas-de-forma.mjs <baseUrl>
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3401";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PUERTO = 9334;
const RUTAS = ["/proyectos", "/proyectos/contenido-ia"];

class Cdp {
  constructor(ws) {
    this.ws = ws; this.n = 0; this.pendientes = new Map();
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
    ws.addEventListener("error", () => x(new Error("CDP no abrio")), { once: true });
  });
  return new Cdp(ws);
}

/**
 * Las seis reglas, evaluadas DENTRO de la pagina. Devuelve un veredicto por regla con su
 * evidencia: una regla que pasa sin decir sobre cuantos elementos paso no es evidencia.
 */
const SEIS_REGLAS = () => {
  const visible = (e) => e.offsetParent !== null || e === document.body;
  const texto = (e) => (e.textContent || "").trim();
  const px = (e) => parseFloat(getComputedStyle(e).fontSize);

  // Una CIFRA: un nodo hoja cuyo texto es esencialmente un numero.
  const cifras = [...document.querySelectorAll("main *")]
    .filter((e) => e.children.length === 0 && visible(e) && /^[\d.,]+\s*%?$/.test(texto(e)) && texto(e).length > 0);

  const etiquetaDe = (e) => {
    // La etiqueta es el texto hermano o del contenedor que la nombra.
    let p = e.parentElement;
    for (let i = 0; i < 3 && p; i++, p = p.parentElement) {
      const cand = [...p.querySelectorAll("*")]
        .filter((x) => x !== e && x.children.length === 0 && visible(x) && /[a-záéíóúñ]{3,}/i.test(texto(x)));
      if (cand.length) return cand[0];
    }
    return null;
  };

  // 1. Ninguna cifra mayor que su etiqueta.
  const mayores = cifras
    .map((c) => ({ c, l: etiquetaDe(c) }))
    .filter(({ c, l }) => l && px(c) > px(l))
    .map(({ c, l }) => `"${texto(c)}" ${px(c)}px sobre etiqueta "${texto(l).slice(0, 30)}" ${px(l)}px`);

  // 2. Cero flechas, verdes o rojos.
  const FLECHAS = /[\u2191\u2193\u2192\u2197\u2198\u25B2\u25BC\u21E7\u21E9]/;
  const esVerdeORojo = (e) => {
    const m = getComputedStyle(e).color.match(/\d+/g);
    if (!m) return false;
    const [r, g, b] = m.map(Number);
    return (g > r + 40 && g > b + 40) || (r > g + 60 && r > b + 60);
  };
  const flechas = [...document.querySelectorAll("main *")]
    .filter((e) => e.children.length === 0 && visible(e) && FLECHAS.test(texto(e)))
    .map((e) => texto(e).slice(0, 40));
  const coloreadas = cifras.filter(esVerdeORojo).map((e) => `${texto(e)} en ${getComputedStyle(e).color}`);

  // 3. El orden es el del Registry, no descendente por magnitud.
  const items = [...document.querySelectorAll("main li, main article")].filter(visible);
  const numerosPorItem = items.map((li) => {
    const m = texto(li).match(/\d[\d.,]*/g);
    return m ? Number(String(m[0]).replace(/[.,]/g, "")) : null;
  }).filter((n) => n !== null);
  const descendente = numerosPorItem.length > 2 &&
    numerosPorItem.every((n, i) => i === 0 || n <= numerosPorItem[i - 1]) &&
    new Set(numerosPorItem).size > 1;

  // 4. Sin barras de progreso ni rachas.
  const barras = [...document.querySelectorAll("main progress, main [role=progressbar], main meter")].filter(visible).length;
  const barrasPorEstilo = [...document.querySelectorAll("main div, main span")]
    .filter((e) => visible(e) && !texto(e) && /%$/.test(e.style.width || "")).length;

  // 5. Sin contadores animados.
  const animadas = cifras.filter((e) => {
    const cs = getComputedStyle(e);
    return (cs.animationName && cs.animationName !== "none") ||
           (cs.transitionProperty && /width|content|all/.test(cs.transitionProperty) && parseFloat(cs.transitionDuration) > 0);
  }).map(texto);

  // 6. Toda cifra tiene, cerca, un detalle que dice que NO cubre.
  const NO_CUBRE = /no cubre|no implica|no mide|no es una medida|no resume|no hay ning[uú]n n[uú]mero/i;
  const hayCaveatGlobal = NO_CUBRE.test(document.querySelector("main")?.innerText ?? "");

  return JSON.stringify({
    cuantasCifras: cifras.length,
    cuantosItems: items.length,
    regla1_cifraMayorQueEtiqueta: mayores,
    regla2_flechas: flechas,
    regla2_verdeORojo: coloreadas,
    regla3_ordenDescendentePorMagnitud: descendente,
    regla3_numeros: numerosPorItem.slice(0, 12),
    regla4_barras: barras + barrasPorEstilo,
    regla5_animadas: animadas,
    regla6_avisoDeQueNoCubre: hayCaveatGlobal,
  });
};

const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-forma-"));
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PUERTO}`,
  `--user-data-dir=${perfil}`, "--no-first-run", "--disable-gpu", "about:blank"], { stdio: "ignore" });

const fallos = [];
const informe = {};

try {
  let version = null;
  for (let i = 0; i < 60 && !version; i++) {
    try { version = await (await fetch(`http://127.0.0.1:${PUERTO}/json/version`)).json(); }
    catch { await dormir(500); }
  }
  if (!version) throw new Error("Chrome no expuso su endpoint");

  const cdp = await conectar(version.webSocketDebuggerUrl);
  const { targetId } = await cdp.enviar("Target.createTarget", { url: "about:blank" });
  const pagina = await conectar(`ws://127.0.0.1:${PUERTO}/devtools/page/${targetId}`);
  await pagina.enviar("Page.enable");
  await pagina.enviar("Runtime.enable");
  await pagina.enviar("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

  const evaluar = async (expr) => {
    const r = await pagina.enviar("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    return r.result.value;
  };

  for (const ruta of RUTAS) {
    await pagina.enviar("Page.navigate", { url: BASE + ruta });
    for (let i = 0; i < 60; i++) {
      if (await evaluar("document.readyState === 'complete'")) break;
      await dormir(200);
    }
    await dormir(300);

    const r = JSON.parse(await evaluar(`(${SEIS_REGLAS.toString()})()`));
    informe[ruta] = r;

    if (r.cuantasCifras === 0 && r.cuantosItems === 0) {
      fallos.push(`${ruta}: la sonda no encontro ni una cifra ni un item. Un verde sobre cero elementos no es evidencia.`);
    }
    // CUATRO de las seis hablan de CIFRAS. Si la pantalla no tiene ninguna, esas cuatro no
    // se comprobaron: se cumplieron en vacio. Y eso NO es lo mismo que haberlas verificado.
    //
    // Se dice, no se esconde tras un verde. Aqui es ademas la lectura correcta y la mas
    // fuerte: /proyectos no tiene una sola cifra suelta ---el «12» vive dentro de una
    // oracion--- asi que no hay numero que inflar, colorear, animar ni ordenar. Cumplimiento
    // POR CONSTRUCCION. Pero quien lea este informe tiene que poder distinguir «lo mire y
    // esta bien» de «no habia nada que mirar», que es la distincion que este proyecto entero
    // persigue.
    r.reglas_en_vacio = r.cuantasCifras === 0
      ? ["1 (cifra vs etiqueta)", "2 (verde/rojo sobre cifras)", "5 (contadores animados)", "6 (detalle de que no cubre)"]
      : [];

    if (r.regla1_cifraMayorQueEtiqueta.length) fallos.push(`${ruta} REGLA 1: ${r.regla1_cifraMayorQueEtiqueta.join("; ")}`);
    if (r.regla2_flechas.length) fallos.push(`${ruta} REGLA 2 (flechas): ${r.regla2_flechas.join("; ")}`);
    if (r.regla2_verdeORojo.length) fallos.push(`${ruta} REGLA 2 (verde/rojo): ${r.regla2_verdeORojo.join("; ")}`);
    if (r.regla3_ordenDescendentePorMagnitud) fallos.push(`${ruta} REGLA 3: los items van en orden descendente por magnitud (${r.regla3_numeros.join(", ")}); el orden tiene que ser el del Registry`);
    if (r.regla4_barras > 0) fallos.push(`${ruta} REGLA 4: ${r.regla4_barras} barra(s) de progreso o racha`);
    if (r.regla5_animadas.length) fallos.push(`${ruta} REGLA 5: cifras animadas: ${r.regla5_animadas.join(", ")}`);
    // Solo aplica SI HAY cifras: exigir una salvedad de «que no cubre» en una pantalla sin
    // ninguna cifra es pedir un aviso sobre nada, y convierte la regla en ruido.
    if (r.cuantasCifras > 0 && !r.regla6_avisoDeQueNoCubre) {
      fallos.push(`${ruta} REGLA 6: hay ${r.cuantasCifras} cifra(s) y ninguna viene con el detalle de que NO cubre`);
    }

    const enVacio = r.reglas_en_vacio.length
      ? `  [EN VACIO, sin cifras que mirar: reglas ${r.reglas_en_vacio.map((x) => x[0]).join(", ")}]`
      : "";
    console.log(`${ruta.padEnd(28)} cifras=${String(r.cuantasCifras).padStart(3)} items=${String(r.cuantosItems).padStart(3)}${enVacio}`);
  }
} finally {
  chrome.kill();
}

fs.writeFileSync(path.join(os.tmpdir(), "reglas-de-forma.json"), JSON.stringify(informe, null, 2));

if (fallos.length) {
  console.error(`\nSEIS REGLAS: ${fallos.length} incumplimiento(s)`);
  for (const f of fallos) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\nLas seis reglas de forma se cumplen en las dos rutas, medidas sobre el arbol renderizado.");

const conVacio = Object.entries(informe).filter(([, r]) => r.reglas_en_vacio?.length);
if (conVacio.length) {
  console.log("\nCON UNA SALVEDAD, y se dice porque cambia lo que significa este verde:");
  for (const [ruta, r] of conVacio) {
    console.log(`  ${ruta} no tiene NINGUNA cifra suelta, asi que las reglas ${r.reglas_en_vacio.map((x) => x[0]).join(", ")} se cumplen EN VACIO.`);
  }
  console.log("  No es un hueco: es cumplimiento por construccion --- no hay numero que inflar,");
  console.log("  colorear, animar ni ordenar. Pero «no habia nada que mirar» no es «lo mire y esta bien».");
}
