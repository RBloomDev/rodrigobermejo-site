#!/usr/bin/env node
/**
 * Vuelve a pasar TODO el corpus por el verificador actual y reescribe el sello.
 *
 * Por que hace falta: las piezas se sellaron con el criterio anterior, que solo
 * tenia dos casillas y mandaba a «OK» cualquier cosa que no fuera una
 * contradiccion explicita. Una pieza con once fuentes citadas y una leida salio
 * marcada como verificada. Ese sello reclama algo que la pieza no se gano, y
 * dejarlo puesto seria peor que no haber verificado nunca: un sello falso se
 * cree, un hueco no.
 *
 * Esto no republica nada ni cambia el contenido: solo actualiza
 * `procedencia.verificado` con el veredicto real y sus pendientes.
 *
 * DONDE ESTA EL CORPUS QUE RESELLA: en `$EDITORIAL_REDACCIONES_DIR/piezas.json`, y no en
 * el fixture del repositorio. Lo pide `docs/plataforma/02-editorial.md` §8.6, fila
 * «Reverificacion del corpus», con su razon: reverificar es **sellar un borrador**, y los
 * borradores viven fuera del repositorio. Antes este comando importaba `RUTA_PIEZAS`
 * directo de `comun.mjs` —una constante sin variable, no un default con respaldo—, asi que
 * leia Y REESCRIBIA un archivo trackeado del arbol publico aunque las variables del canal
 * estuvieran bien puestas. No se resuelve por `rutaPiezas()` a proposito: esa funcion se
 * elimina cuando el comando se parta en `generar`/`autorizar` (§8.6 fila 2).
 *
 * Uso: node scripts/editorial/reverificar-corpus.mjs [--seco]
 *   --seco  solo informa, no escribe.
 *
 * Requiere `EDITORIAL_REDACCIONES_DIR`. Sin ella aborta y no escribe nada (§8.3).
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { dirRedacciones } from "./comun.mjs";
import { verificarPieza, sellarVerificacion } from "./verificar.mjs";

const seco = process.argv.includes("--seco");

let RUTA_CORPUS;
try {
  RUTA_CORPUS = join(dirRedacciones(), "piezas.json");
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

if (!existsSync(RUTA_CORPUS)) {
  console.error(
    `No hay corpus que reverificar en ${RUTA_CORPUS}.\n\n` +
      "Este comando resella borradores, y los borradores viven en " +
      "$EDITORIAL_REDACCIONES_DIR (docs/plataforma/02-editorial.md §8.6). No cae al " +
      "fixture del repositorio: reescribir un archivo trackeado del arbol publico es " +
      "justo lo que se retiro.\n\nNo se escribio nada."
  );
  process.exit(1);
}

const piezas = JSON.parse(readFileSync(RUTA_CORPUS, "utf8"));

console.log(`Reverificando ${piezas.length} pieza(s) con el criterio vigente.\n`);

const selladas = [];
const resumen = { verificada: 0, parcial: 0, no_verificada: 0 };

for (const p of piezas) {
  const anterior = p.procedencia?.verificado?.veredicto ?? "(sin veredicto: sello antiguo)";
  const inf = await verificarPieza(p);
  resumen[inf.veredicto] = (resumen[inf.veredicto] ?? 0) + 1;

  const c = inf.corroboracion;
  console.log(`${p.id}`);
  console.log(`  antes:      ${anterior}`);
  console.log(`  ahora:      ${inf.veredicto.toUpperCase()}`);
  console.log(`  fuentes:    ${c.citadas} citadas · ${c.leidas} leidas · `
    + `${c.no_consultadas} no consultadas · ${c.no_existen} inexistentes`);
  console.log(`  corrobora:  ${c.corroborantes} de ${c.minimo} necesarias `
    + `${c.cumple_minimo ? "(cumple)" : "(NO cumple)"}`);
  console.log(`  pendientes: ${inf.pendientes.length}`);
  for (const q of inf.pendientes.slice(0, 3)) {
    console.log(`     - ${q.motivo}: «${String(q.texto).slice(0, 70)}…»`);
  }
  console.log();

  selladas.push(sellarVerificacion(p, inf));
}

console.log("resumen: " + JSON.stringify(resumen));

if (seco) {
  console.log("\n--seco: no se escribio nada.");
} else {
  writeFileSync(RUTA_CORPUS, JSON.stringify(selladas, null, 2) + "\n");
  console.log(`\nSellos actualizados en ${RUTA_CORPUS}.`);
  console.log("Ninguna pieza cambia de contenido y ninguna se publica: solo dice la verdad sobre su verificacion.");
}
