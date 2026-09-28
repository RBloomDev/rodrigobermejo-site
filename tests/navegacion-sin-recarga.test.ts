import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { paginas, leer, RAIZ } from "./navegacion-helpers.ts";

/**
 * Ninguna ruta interna se enlaza con `<a>`: eso recarga el documento entero.
 *
 * Encontrado el 2026-09-24 OPERANDO el navegador, no leyendo el codigo. En `/actividad`
 * puse una marca en `window`, hice clic en «cómo respaldo lo que afirmo», y la marca no
 * sobrevivio: navegacion de documento completa. Con `<Link>` habria sobrevivido.
 *
 * Esa diferencia no se ve en el DOM ---Next renderiza `<Link>` como `<a>`--- ni la ve
 * ningun gate: `tsc`, `lint`, las 315 pruebas y `next build` pasaron con los dos anclajes
 * puestos. Se pierde el prefetch, parpadea la pantalla y se reinicia el estado del cliente.
 *
 * Eran exactamente DOS en todo el arbol, los dos en `app/actividad/page.tsx`, y uno de
 * ellos convivia con un `<Link>` en la MISMA oracion (:77) --- lo que delata que no fue una
 * decision de diseno sino un descuido. La sonda cubre `app/` y `components/` enteros, no
 * el archivo que fallaba.
 *
 * Lo que esta prueba NO ve: un `<Link>` mal usado, o un `<a>` construido dinamicamente. Es
 * una mitigacion acotada, no una garantia; verde aqui significa «no hay anclajes crudos
 * escritos literalmente», no «toda la navegacion es de cliente».
 */

/** `<a ... href="/algo"`, pero no `href="//host"` --- eso es externo con protocolo relativo. */
const ANCLA_INTERNA = /<a\b[^>]*\bhref=["']\/(?!\/)/g;

test("ninguna ruta interna se enlaza con <a>: recargaria el documento entero", () => {
  const culpables: string[] = [];

  for (const archivo of fuentes()) {
    const encontrados = (leer(archivo).match(ANCLA_INTERNA) ?? []).length;
    if (encontrados > 0) culpables.push(`${archivo} (${encontrados})`);
  }

  assert.deepEqual(
    culpables,
    [],
    `un <a> a una ruta interna del App Router fuerza una carga completa del documento: se ` +
      `pierde el prefetch, parpadea la pantalla y se reinicia el estado del cliente. Usa ` +
      `<Link>. En: ${culpables.join(", ")}`,
  );
});

test("la sonda recorre algo, y se pone roja cuando debe", () => {
  // Sin esto, mover `app/` dejaria la sonda verde para siempre sobre cero archivos ---
  // un vacio y un «no hay culpables» se ven iguales y significan lo opuesto.
  const archivos = fuentes();
  assert.ok(archivos.length > 8, `solo encontro ${archivos.length} fuentes; hoy son bastantes mas`);
  assert.ok(
    archivos.some((a) => a.startsWith("components/")),
    "no alcanza components/, y ahi tambien se escriben enlaces",
  );

  // Y el predicado detecta lo que dice detectar, sin confundir un enlace externo.
  assert.equal((`<a href="/evidencia">x</a>`.match(ANCLA_INTERNA) ?? []).length, 1);
  assert.equal((`<a className="u" href="/x">y</a>`.match(ANCLA_INTERNA) ?? []).length, 1);
  assert.equal((`<a href="https://x.com">y</a>`.match(ANCLA_INTERNA) ?? []).length, 0);
  assert.equal((`<a href="//cdn.x.com/a">y</a>`.match(ANCLA_INTERNA) ?? []).length, 0, "protocolo relativo es externo");
  assert.equal((`<Link href="/x">y</Link>`.match(ANCLA_INTERNA) ?? []).length, 0);
});

/** Todo `.tsx` bajo `app/` y `components/`. Las paginas salen de `paginas()`; el resto se anade. */
function fuentes(): string[] {
  const salida = new Set<string>(paginas());
  const recorrer = (dir: string) => {
    for (const e of readdirSync(join(RAIZ, dir), { withFileTypes: true })) {
      const hijo = `${dir}/${e.name}`;
      if (e.isDirectory()) recorrer(hijo);
      else if (e.name.endsWith(".tsx")) salida.add(hijo);
    }
  };
  for (const raiz of ["app", "components"]) recorrer(raiz);
  return [...salida].sort();
}
