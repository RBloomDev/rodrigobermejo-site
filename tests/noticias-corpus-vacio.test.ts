import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";

import { leerCorpus, raizDelCorpus } from "../app/noticias/corpus.ts";
import { vistaDeIndice } from "../app/noticias/vista.ts";
import { RAIZ, leer } from "./navegacion-helpers.ts";
import { sinComentarios } from "./noticias-pantalla.ts";

/**
 * `AC-NOT-04` — con el corpus vacío, `/noticias` renderiza un **estado declarado**. Ni
 * error, ni página rota, ni lista fantasma.
 *
 * ## Esto no es un caso borde: es el estado del sitio hoy
 *
 * `docs/plataforma/01-noticias-y-actividad.md` §5.4 y §5.5 lo declaran normativo: el
 * corpus arranca vacío, publicar una pieza es una decisión de Rodrigo que toma el comando
 * de autorización (`02-editorial.md` §8.4), y **el vacío es el comportamiento correcto del
 * sistema, no un defecto pendiente**. «Un reporte que diga “/noticias no muestra datos” se
 * cierra como funciona según spec.»
 *
 * Lo que sí sería un defecto, y es lo que estas pruebas vigilan: rellenar el hueco. Un
 * conteo de borradores —que publicaría su existencia—, una fecha prometida, un
 * «próximamente», un esqueleto de carga o una lista vacía sin decir por qué.
 *
 * ## Por qué se lee el corpus REAL y no un temporal
 *
 * Porque el estado real es el que se publica. Un fixture vacío probaría que la función
 * sabe devolver `[]`; esto prueba que el sitio, tal como está, no revienta y dice lo que
 * pasa. Si algún día `content/noticias/` tiene piezas, la primera aserción deja de aplicar
 * y esta prueba lo dice en vez de quedarse verde por casualidad.
 */

const INDICE = "app/noticias/page.tsx";

test("AC-NOT-04: el corpus real se lee sin lanzar, y hoy está vacío", () => {
  const previo = process.env["NOTICIAS_CORPUS_DIR"];
  delete process.env["NOTICIAS_CORPUS_DIR"];
  try {
    const piezas = leerCorpus();
    assert.equal(
      existsSync(join(RAIZ, "content", "noticias")),
      false,
      "`content/noticias/` no existe todavía, y ese es el estado correcto: lo crea el " +
        "comando de autorización al escribir la primera pieza (02-editorial.md §8.6)",
    );
    assert.deepEqual(
      piezas,
      [],
      "nadie ha autorizado ninguna pieza: el índice no tiene nada que listar",
    );
    assert.deepEqual(vistaDeIndice(piezas), [], "y el índice no fabrica entradas");
    assert.ok(raizDelCorpus().length > 0);
  } finally {
    if (previo !== undefined) process.env["NOTICIAS_CORPUS_DIR"] = previo;
  }
});

test("AC-NOT-04: un directorio de corpus existente y sin piezas tampoco es un error", () => {
  // La otra forma del vacío: el directorio ya creado, con todas sus piezas retiradas. Es
  // ausencia legítima igual que la primera, y se distingue de un corpus corrupto --- eso
  // sí lanza, y lo fija `tests/noticias-lee-el-corpus.test.ts`.
  const dir = mkdtempSync(join(os.tmpdir(), "noticias-vacio-"));
  assert.deepEqual(leerCorpus(dir), []);
});

test("AC-NOT-04: el índice declara el vacío, en vez de dibujar una lista fantasma", () => {
  const fuente = leer(INDICE);

  assert.match(
    fuente,
    /entradas\.length === 0/,
    "el índice tiene que decidir sobre el corpus vacío explícitamente, no esperar a que " +
      "un `.map()` sobre un arreglo vacío no pinte nada: eso es una lista fantasma",
  );
  assert.match(
    fuente,
    /Todav[ií]a no hay ninguna pieza publicada/,
    "el estado vacío se rotula con palabras, y dice qué pasa",
  );
});

test("AC-NOT-04: el vacío no se rellena --- ni con promesa, ni con conteo, ni con esqueleto", () => {
  // Sobre lo que se RENDERIZA, no sobre los comentarios: la cabecera de la página explica
  // que no promete fechas, y esa explicación es lo que la regla pide escribir.
  const fuente = sinComentarios(leer(INDICE)).toLowerCase();

  const rellenos = [
    "próximamente",
    "proximamente",
    "en construcción",
    "en construccion",
    "muy pronto",
    "vuelve pronto",
    "borradores en camino",
    "skeleton",
    "animate-pulse",
    "cargando",
  ].filter((frase) => fuente.includes(frase));

  assert.deepEqual(
    rellenos,
    [],
    `el índice rellena su estado vacío con ${rellenos.join(", ")}. «Una fuente ausente ` +
      `sigue siendo un dato desconocido: no es cero, no es pendiente, no es próximamente» ` +
      `(decisions/0015 §4-ter, citada por 01 §5.1)`,
  );

  // Y ninguna cifra sobre lo no publicado. Un «3 borradores en revisión» publica la
  // existencia de los borradores, que es justo lo que no está publicado (§5.4, punto 1).
  assert.doesNotMatch(
    sinComentarios(leer(INDICE)),
    /borrador(es)?\s*(en|:)|\d+\s+borrador/i,
    "sin conteo de borradores: publicaría su existencia",
  );
});
