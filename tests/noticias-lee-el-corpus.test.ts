import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { leerCorpus, leerPieza, raizDelCorpus } from "../app/noticias/corpus.ts";
import { cierreDeImports, leer } from "./navegacion-helpers.ts";
import { sinComentarios } from "./noticias-pantalla.ts";
import { CORPUS, conCorpusDeFixture } from "./noticias-fixture.ts";

/**
 * `AC-NOT-01` — `/noticias` se alimenta de **`content/noticias/`**, el corpus editorial
 * publicado, y de nada más.
 *
 * El prototipo de `docs/plataforma/prototipo/` es **referencia no normativa**: enseña una
 * solución, no la define (`docs/plataforma/01-noticias-y-actividad.md`, § *Autoridad y
 * precedencia*). Su `datos/piezas.json` es el fixture de una maqueta —tres piezas, las
 * tres en borrador— y servirlo desde el sitio publicaría tres borradores en un repositorio
 * público. Que la implementación no lo lea no se comprueba leyendo el código «con
 * atención»: se comprueba recorriendo el cierre de imports de las dos rutas.
 *
 * La otra mitad del criterio es que la fuente real **funcione**: que el lector lea el
 * directorio, descarte lo que no está publicado y ordene. Eso se prueba con un corpus de
 * fixture en `tmpdir`, porque el corpus real está vacío y llenarlo es publicar.
 */

test("AC-NOT-01: sin variable de entorno, el corpus es content/noticias del repositorio", () => {
  const previo = process.env["NOTICIAS_CORPUS_DIR"];
  delete process.env["NOTICIAS_CORPUS_DIR"];
  try {
    const raiz = raizDelCorpus().split(path.sep).join("/");
    assert.match(
      raiz,
      /\/content\/noticias$/,
      `el lector resolvió ${raiz}. La fuente de /noticias es el corpus publicado, que ` +
        `escribe únicamente el comando de autorización (02-editorial.md §8.4)`,
    );
  } finally {
    if (previo !== undefined) process.env["NOTICIAS_CORPUS_DIR"] = previo;
  }
});

test("AC-NOT-01: las piezas salen del directorio del corpus, y el borrador no sale", () => {
  conCorpusDeFixture(() => {
    const piezas = leerCorpus();

    assert.deepEqual(
      piezas.map((p) => p.id),
      ["norma-de-datos-en-escuelas", "modelo-con-pesos-abiertos"],
      "se listan las publicadas, en orden cronológico descendente por `ocurrido_en`",
    );
    assert.equal(
      piezas.some((p) => p.estado !== "autorizada"),
      false,
      "`estado` es el único criterio y el filtrado ocurre al leer, no en el render (§1.1)",
    );
    assert.equal(
      leerPieza("borrador-que-no-debe-salir"),
      null,
      "un borrador no tiene pieza que servir: su slug responde 404 (§1.1, requisito 2)",
    );
    // Y el borrador existe de verdad en el directorio: si el fixture no lo escribiera,
    // la aserción de arriba pasaría sin haber filtrado nada.
    assert.equal(CORPUS.filter((p) => p.estado === "borrador").length, 1);
  });
});

test("AC-NOT-01: un corpus con un archivo roto es rojo, no una lista a medias", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "noticias-roto-"));
  writeFileSync(path.join(dir, "pieza-truncada.json"), '{"id": "pieza-truncada"', "utf8");
  assert.throws(
    () => leerCorpus(dir),
    /E_CORPUS_JSON/,
    "«no hay corpus» y «el corpus está roto» son estados distintos: colapsarlos publicaría " +
      "un índice vacío en verde sobre una escritura interrumpida",
  );
});

/** Las dos rutas de `/noticias`, con todo lo que alcanzan por imports estáticos. */
function alcanzablesDesdeNoticias(): string[] {
  return [
    ...new Set([
      ...cierreDeImports("app/noticias/page.tsx"),
      ...cierreDeImports("app/noticias/[slug]/page.tsx"),
    ]),
  ];
}

/**
 * Una referencia al fixture del prototipo, en cualquiera de sus formas de escribirse. Se
 * detecta por normalización de la ruta, no por una cadena literal: `join(r, 'docs',
 * 'plataforma', ...)` y una plantilla son la misma dependencia escrita distinto.
 *
 * Los comentarios salen antes: un archivo que **nombra** el prototipo para explicar por
 * qué no lo lee no depende de él, y castigar esa explicación empujaría a borrarla.
 */
function nombraElPrototipo(fuente: string): boolean {
  const sinEspacios = sinComentarios(fuente).replace(/['"`\s,+\\/]/g, "");
  return /prototipo|piezasjson/.test(sinEspacios);
}

test("AC-NOT-01: ninguna ruta de /noticias alcanza el fixture del prototipo", () => {
  const culpables = alcanzablesDesdeNoticias().filter((archivo) =>
    nombraElPrototipo(leer(archivo)),
  );

  assert.deepEqual(
    culpables,
    [],
    `estos archivos del cierre de imports de /noticias nombran el prototipo: ` +
      `${culpables.join(", ")}. El prototipo es referencia no normativa y su corpus son ` +
      `tres borradores: servirlos desde el sitio los publicaría`,
  );
});

test("AC-NOT-01: la sonda del prototipo se pone roja a propósito", () => {
  // Las tres formas son la misma dependencia escrita distinto. Una sonda que nunca ha
  // fallado puede estar mirando la forma equivocada.
  for (const forma of [
    'import piezas from "../../docs/plataforma/prototipo/datos/piezas.json";',
    "const datos = JSON.parse(readFileSync(join(raiz, 'docs/plataforma/prototipo/datos/piezas.json')));",
    'const ruta = join(RAIZ, "docs", "plataforma", "prototipo", "datos", "piezas.json");',
  ]) {
    assert.equal(nombraElPrototipo(forma), true, `la sonda no vio: ${forma}`);
  }
  assert.equal(nombraElPrototipo('import { leerCorpus } from "./corpus";'), false);
  // Y no se dispara con lo que solo lo MENCIONA para decir que no lo usa.
  assert.equal(
    nombraElPrototipo("/** No se lee docs/plataforma/prototipo/datos/piezas.json. */"),
    false,
  );
  assert.equal(nombraElPrototipo("// el prototipo es referencia no normativa"), false);
});

test("AC-NOT-01: /noticias no importa nada del sistema de evidencia", () => {
  // La frontera de `docs/03` §4 en su forma más simple de romper: un import. `01` §1.2,
  // prohibición 1, enumera los cuatro prefijos.
  const prohibidos = ["lib/proof", "lib/evidence", "components/proof", "components/evidence"];
  const culpables = alcanzablesDesdeNoticias().filter((archivo) =>
    prohibidos.some((p) => archivo.startsWith(p)),
  );

  assert.deepEqual(
    culpables,
    [],
    `el cierre de imports de /noticias alcanza el sistema de evidencia: ${culpables.join(", ")}. ` +
      `El editorial enlaza a la evidencia y jamás se deriva de ella (docs/03 §4)`,
  );
});
