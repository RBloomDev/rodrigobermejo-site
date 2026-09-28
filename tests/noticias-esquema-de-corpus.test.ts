import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";

import { INSTANTE, URL_ENLAZABLE, piezaSchema } from "../app/noticias/esquema.ts";
import { leerCorpus } from "../app/noticias/corpus.ts";
import { PIEZA_VERIFICADA } from "./noticias-fixture.ts";

/**
 * Los dos campos del registro de §3 cuyo **formato** importa aguas abajo, y que el esquema
 * dejaba pasar como «cadena no vacía».
 *
 * ## `redactado_en`: una cadena cualquiera tiraba el build sin nombrar el corpus
 *
 * §3 lo fija como `YYYY-MM-DDTHH:MMZ`. `app/sitemap.ts` construye
 * `lastModified: new Date(pieza.redactado_en)` y Next serializa ese `Date` con
 * `.toISOString()`, que lanza `RangeError` sobre un `Invalid Date`. Con el campo validado
 * solo por longitud, una pieza autorizada con la fecha malformada ponía rojo el build del
 * sitio público con un error que no habla ni del corpus ni de la pieza.
 *
 * ## `url`: `01` §1.4 pide las fuentes «enlazadas»
 *
 * Y la ficha vuelca el valor directo a un `href`. Una cadena no vacía que no navega
 * produce un enlace muerto sin que nada falle: es «si no renderiza, no se declara»
 * aplicado a la comprobabilidad de la pieza, que es el producto entero de este canal.
 *
 * ## Por qué cada caso trae su contraste
 *
 * Una prueba que solo comprueba que el fixture bueno pasa no distingue un esquema estricto
 * de uno que acepta cualquier cosa. Por eso cada bloque enfrenta el esquema real con el
 * laxo que había antes —`z.string().trim().min(1)`— sobre el **mismo** valor: si el
 * estricto dejara de serlo, las dos columnas coincidirían y la prueba se pone roja.
 */

const LAXO = z.string().trim().min(1);

/** Escribe una pieza en un corpus temporal y devuelve su directorio. */
function corpusCon(pieza: { id: string } & Record<string, unknown>): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "noticias-esquema-"));
  writeFileSync(path.join(dir, `${pieza.id}.json`), JSON.stringify(pieza), "utf8");
  return dir;
}

test("`redactado_en` sin el formato de §3 se rechaza al leer el corpus", () => {
  const malos = [
    "13 de septiembre de 2026",
    "2026-09-13",
    "2026-09-13T10:30:00Z",
    "2026-13-01T10:30Z",
    "2026-09-13T25:00Z",
    "ayer",
  ];

  for (const valor of malos) {
    assert.equal(
      piezaSchema.safeParse({ ...PIEZA_VERIFICADA, redactado_en: valor }).success,
      false,
      `el esquema aceptó \`redactado_en: ${JSON.stringify(valor)}\`, que §3 no admite`,
    );
    // El contraste: con la validación anterior, los seis pasaban.
    assert.equal(LAXO.safeParse(valor).success, true, `el caso ${valor} no discrimina nada`);
  }

  // Y el formato correcto sigue pasando: una regla que rechaza todo tampoco sirve.
  assert.equal(piezaSchema.safeParse(PIEZA_VERIFICADA).success, true);
  assert.match(PIEZA_VERIFICADA.redactado_en, INSTANTE);
});

test("una pieza con `redactado_en` malformado falla nombrando el archivo, no el sitemap", () => {
  const dir = corpusCon({ ...PIEZA_VERIFICADA, redactado_en: "13/09/2026" });

  assert.throws(
    () => leerCorpus(dir),
    /E_CORPUS_ESQUEMA norma-de-datos-en-escuelas\.json/,
    "el corpus roto tiene que decir qué archivo y qué campo lo rompe",
  );

  // Y el modo de fallo que esto evita es real, no supuesto: así se comporta el valor que
  // `app/sitemap.ts` le pasa a Next.
  assert.equal(Number.isNaN(new Date("13/09/2026").getTime()), true);
  assert.throws(() => new Date("13/09/2026").toISOString(), RangeError);
  assert.equal(new Date(PIEZA_VERIFICADA.redactado_en).toISOString().slice(0, 4), "2026");
});

test("una `url` de fuente que no navega se rechaza: §1.4 las exige enlazadas", () => {
  const malos = ["ejemplo.test/nota", "/noticias/interna", "javascript:alert(1)", "ftp://x.test/a"];

  for (const valor of malos) {
    const conFuenteRota = {
      ...PIEZA_VERIFICADA,
      fuentes: PIEZA_VERIFICADA.fuentes.map((f, i) => (i === 1 ? { ...f, url: valor } : f)),
    };
    assert.equal(
      piezaSchema.safeParse(conFuenteRota).success,
      false,
      `el esquema aceptó una fuente con url ${JSON.stringify(valor)}, que no se puede abrir`,
    );
    assert.equal(LAXO.safeParse(valor).success, true);
  }

  // La misma regla sobre `fuente_primaria`, que es otro objeto del registro: una
  // corrección se aplica a los dos sitios donde vive el mismo campo, no solo al primero.
  assert.equal(
    piezaSchema.safeParse({
      ...PIEZA_VERIFICADA,
      fuente_primaria: { ...PIEZA_VERIFICADA.fuente_primaria, url: "ejemplo.test/nota" },
    }).success,
    false,
    "`fuente_primaria.url` es la que sostiene el hecho: si no se puede abrir, menos aún",
  );

  for (const f of PIEZA_VERIFICADA.fuentes) assert.match(f.url, URL_ENLAZABLE);
});
