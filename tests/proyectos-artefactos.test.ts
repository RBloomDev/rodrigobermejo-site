import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { RAIZ, leer } from "./navegacion-helpers.ts";
import { conFeedDeFixture } from "./proyectos-fixture.ts";

/**
 * `AC-PRY-07` — **ninguna superficie de evidencia puede renderizar una imagen de
 * un proyecto**, y la pantalla declara por qué.
 *
 * ## Por qué esta prueba dejó de contar capturas y pasó a prohibirlas
 *
 * La autorización **F** de `decisions/0015` §4 concede presencia visual plena, y
 * no concede nada sobre **qué** se puede enseñar. Eso lo gobierna
 * `docs/03-privacy-and-publication-policy.md`, cuyo §7 reserva a un humano
 * «publicar un campo o un valor nuevo en la superficie pública». La política que
 * autorizaría un activo —quién lo autoriza, contra qué se comprueba esa
 * autorización, y qué pasa cuando el Registry cambia la visibilidad de un
 * proyecto— **no está escrita en `docs/`**. Decisión de Rodrigo del 2026-09-21:
 * sin esa política, cero imágenes, y la política se decide en su propio PR.
 *
 * Una allowlist declarada en un módulo era la respuesta anterior. No basta: un
 * módulo no es fuente de verdad, `docs/` lo es (`AGENTS.md`), y una lista que un
 * agente puede ampliar convierte «dejar caer un PNG» en «publicar». La regla
 * fuerte es que no exista el camino.
 *
 * ## Las cinco puertas, y por qué hacen falta las cinco
 *
 * 1. **El transporte.** `ProyectoVista` no lleva ningún campo de imagen: sin
 *    campo no hay nada que pintar, y el error se ve en `tsc`, no en pantalla.
 * 2. **El marcado.** Ninguna superficie de evidencia importa `next/image` ni
 *    escribe `<img>`. Aunque alguien reintrodujera el campo, esto se pone rojo.
 * 3. **Los activos.** No hay directorio servible de capturas de proyecto, y no
 *    queda el módulo de allowlist que las declaraba.
 * 4. **El control negativo.** La sonda detecta de verdad: se le da una fuente
 *    que sí importa `next/image` y tiene que señalarla. Una prueba verde que no
 *    puede fallar no sirve.
 * 5. **Lo declarado.** El estado se dice en pantalla. Un espacio vacío donde
 *    iría una captura se lee como que algo falló; una frase que dice que no hay
 *    artefactos publicados y por qué se lee como lo que es.
 */

/** Las superficies del sistema de evidencia. Mismo conjunto que la regla de las promesas de futuro. */
function superficies(): string[] {
  return [
    ...readdirSync(join(RAIZ, "components/proof")).map((f) => `components/proof/${f}`),
    "app/evidencia/page.tsx",
    "app/proyectos/page.tsx",
    "app/proyectos/[slug]/page.tsx",
  ];
}

/** Descarta comentarios: la regla se enuncia ahí, y nombrarla no es infringirla. */
function soloCodigo(fuente: string): string {
  return fuente
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((linea) => !/^\s*(\/\/|\*)/.test(linea))
    .join("\n");
}

/** Las formas de meter una imagen en una página de este repo. */
const VIAS_DE_IMAGEN: [string, RegExp][] = [
  ["importa next/image", /from\s+["']next\/image["']/],
  ["renderiza <Image", /<Image[\s/>]/],
  ["renderiza <img", /<img[\s/>]/],
  ["usa backgroundImage", /backgroundImage/],
];

function viasEn(fuente: string): string[] {
  const codigo = soloCodigo(fuente);
  return VIAS_DE_IMAGEN.filter(([, patron]) => patron.test(codigo)).map(([nombre]) => nombre);
}

test("AC-PRY-07: el modelo de vista de un proyecto no transporta ninguna imagen", () => {
  const fuente = soloCodigo(leer("lib/proof/proyectos-filtros.ts"));
  const cuerpo = /export interface ProyectoVista \{([\s\S]*?)\n\}/.exec(fuente);
  assert.ok(cuerpo, "ProyectoVista tiene que seguir siendo la frontera servidor→cliente");

  for (const campo of ["artefacto", "captura", "imagen", "image", "screenshot", "src", "alt"]) {
    assert.doesNotMatch(
      cuerpo[1]!,
      new RegExp(campo, "i"),
      `ProyectoVista expone «${campo}»: eso es una imagen cruzando al cliente, y quién ` +
        `autoriza publicarla no está escrito en docs/ (docs/03 §7)`,
    );
  }
});

test("AC-PRY-07: ninguna superficie de evidencia tiene forma de renderizar una imagen", () => {
  const hallazgos: string[] = [];
  for (const archivo of superficies()) {
    for (const via of viasEn(leer(archivo))) hallazgos.push(`${archivo}: ${via}`);
  }

  assert.deepEqual(
    hallazgos,
    [],
    `una superficie de evidencia puede publicar una imagen, y la autorización que lo ` +
      `permitiría no existe. Escribe primero la política en docs/ y su PR:\n${hallazgos.join("\n")}`,
  );
});

test("AC-PRY-07: no queda ni el directorio de capturas ni la allowlist que las declaraba", () => {
  assert.equal(
    existsSync(join(RAIZ, "public/artefactos")),
    false,
    "public/artefactos/ vuelve a existir: un directorio servible convierte «dejar caer un " +
      "PNG» en «publicar», sin que nadie autorice nada",
  );
  assert.equal(
    existsSync(join(RAIZ, "lib/proof/artefactos.ts")),
    false,
    "volvió la allowlist en código: la política de artefactos es de docs/, no de un módulo " +
      "que un agente puede ampliar (AGENTS.md)",
  );
});

test("AC-PRY-07: la sonda detecta de verdad — control negativo", () => {
  // Romper el arreglo a propósito: si esto no señalara, las dos pruebas de
  // arriba estarían verdes por vacío y nadie se enteraría.
  const conImagen = [
    'import Image from "next/image";',
    "export const X = () => <Image src={a.src} alt={a.alt} width={1} height={1} />;",
  ].join("\n");
  assert.deepEqual(viasEn(conImagen), ["importa next/image", "renderiza <Image"]);

  const conImg = "export const Y = () => <img src={a.src} alt={a.alt} />;";
  assert.deepEqual(viasEn(conImg), ["renderiza <img"]);

  // Y no señala un comentario que enuncia la regla, ni el texto que la explica.
  assert.deepEqual(viasEn("/** No se importa next/image ni se escribe <img>. */"), []);
  assert.deepEqual(viasEn('const t = "en el código no existe ruta capaz de mostrar una imagen";'), []);
});

test("AC-PRY-07: el estado sin artefactos está DECLARADO en las dos rutas", () => {
  for (const archivo of [
    "components/proof/ExploradorDeProyectos.tsx",
    "app/proyectos/[slug]/page.tsx",
  ]) {
    const texto = soloCodigo(leer(archivo));
    assert.match(
      texto,
      /Artefactos de (estos proyectos|este proyecto)/,
      `${archivo} necesita rotular el bloque: un espacio en blanco donde iría una captura ` +
        `se lee como que algo falló`,
    );
    assert.match(
      texto,
      /(No hay ninguno publicado|Ninguno publicado)/,
      `${archivo} tiene que decir que no hay artefactos publicados, no dejar el hueco`,
    );
    assert.match(
      texto,
      /autoriza/,
      `${archivo} tiene que decir POR QUÉ no los hay: falta la decisión de quién autoriza ` +
        `un activo, no la imagen`,
    );
  }
});

test("AC-PRY-07: el bloque declarado no depende del feed ni de los filtros", () => {
  // Un filtro recorta resultados, y esto no es un resultado
  // (`docs/plataforma/01` §4.4.3). El bloque vive fuera de la lista filtrada, y
  // por eso ningún proyecto del fixture puede hacerlo aparecer o desaparecer.
  conFeedDeFixture((proyectos) => {
    assert.ok(proyectos.length > 0, "el fixture publica proyectos");
    for (const p of proyectos) {
      assert.equal(
        Object.keys(p).some((k) => /artefacto|captura|imagen|src/i.test(k)),
        false,
        `el proyecto ${p.id} llega al cliente con un campo de imagen`,
      );
    }
  });
});
