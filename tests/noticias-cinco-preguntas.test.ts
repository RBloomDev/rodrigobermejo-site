import { test } from "node:test";
import assert from "node:assert/strict";

import { vistaDePieza } from "../app/noticias/vista.ts";
import { piezaSchema } from "../app/noticias/esquema.ts";
import { leer } from "./navegacion-helpers.ts";
import { accesosAVista, nombresDePropiedad } from "./noticias-pantalla.ts";
import { PIEZA_PARCIAL } from "./noticias-fixture.ts";

/**
 * `AC-NOT-02` — la ficha de una pieza renderiza **las cinco preguntas** y todo campo que
 * la spec exige.
 *
 * La regla dura del canal es de `docs/plataforma/02-editorial.md` §1: **«si no renderiza,
 * no se declara»**, y `01` §1.4 la vuelve requisito — «no hay campo obligatorio que no se
 * renderice», con su mínimo enumerado. El peor defecto medido en el canal ajeno del que
 * sale la spec fue exactamente ese: etiquetas declaradas que el código no tenía.
 *
 * ## Cómo se comprueba, en dos mitades que se necesitan
 *
 * 1. **El modelo lleva el valor.** `vistaDePieza` se ejecuta de verdad sobre una pieza
 *    completa y se comprueba que cada respuesta del registro llega a la vista con su
 *    texto. Aquí no hay AST ni cadenas: es la función corriendo.
 * 2. **La página renderiza el modelo entero.** Se recorre el AST de
 *    `app/noticias/[slug]/page.tsx` y se exige que **cada** propiedad del modelo aparezca
 *    renderizada. Un campo que se quede en el registro y no llegue a la pantalla pone esto
 *    rojo, que es lo que «si no renderiza, no se declara» significa cuando se puede medir.
 *
 * Una sola de las dos mitades no basta: la primera deja pasar una página que ignora el
 * modelo, y la segunda deja pasar un modelo que pierde el dato por el camino.
 *
 * **Lo que esto NO puede ver:** que el campo esté dentro de una rama que no se renderiza,
 * o que el texto sea el equivocado. `npm test` corre con `--conditions=react-server`,
 * donde `react-dom/server` no existe y un `.tsx` ni siquiera se importa. Verde aquí
 * significa «el campo llega a la pantalla», no «la pantalla se ve bien».
 */

const DETALLE = "app/noticias/[slug]/page.tsx";

test("AC-NOT-02: el fixture es una pieza legal del esquema de §3", () => {
  // Sin esto, todo lo demás podría estar probando contra una pieza que el corpus real
  // nunca contendría --- un verde sobre un mundo que no existe.
  const r = piezaSchema.safeParse(PIEZA_PARCIAL);
  assert.equal(r.success, true, JSON.stringify(r.error?.issues, null, 2));
});

test("AC-NOT-02: las cinco preguntas llegan al modelo de vista con su texto", () => {
  const pieza = piezaSchema.parse(PIEZA_PARCIAL);
  const vista = vistaDePieza(pieza);

  // 1. Qué ocurrió y cuándo. La fecha del hecho, en prosa y distinta de la de redacción.
  assert.equal(vista.hecho, pieza.hecho);
  assert.equal(vista.ocurridoEn, "12 de septiembre de 2026");
  assert.equal(vista.redactadoEn, "13 de septiembre de 2026");
  assert.notEqual(vista.ocurridoEn, vista.redactadoEn);

  // 2. Qué fuentes lo sostienen, con la primaria distinguida de las demás.
  assert.equal(vista.fuentePrimaria.url, pieza.fuente_primaria.url);
  assert.equal(vista.fuentePrimaria.rol, "Fuente primaria");
  assert.equal(vista.fuentes.length, pieza.fuentes.length);
  assert.equal(vista.fuentes.filter((f) => f.rol === "Fuente primaria").length, 1);
  assert.equal(vista.fuentes[0]?.rol, "Fuente primaria", "la primaria va primero");
  for (const fuente of vista.fuentes) {
    assert.notEqual(fuente.medio.trim(), "", "una fuente sin medio no es legible");
    assert.notEqual(fuente.fecha.trim(), "", "una fuente sin fecha no es comprobable");
    assert.match(fuente.url, /^https?:\/\//, "una fuente que no se puede abrir no es fuente");
  }

  // 3. Qué cambia para el lector.
  assert.equal(vista.queCambia, pieza.que_cambia);

  // 4. Qué aplica en México, CON su estado. `no_verificado` también se publica (§2).
  assert.equal(vista.mexico.texto, pieza.mexico.texto);
  assert.equal(vista.mexico.etiqueta, "Aplica en México, sin medición local");

  // 5. Qué sigue siendo incierto, completo y sin recortar.
  assert.deepEqual(vista.noEstablece, pieza.no_establece);

  // Y lo que §1.4 añade al mínimo: tipo visible, relación declarada y las cuatro etapas.
  assert.equal(vista.tipoEtiqueta, "Análisis");
  assert.equal(vista.relacion, pieza.relacion_declarada);
  assert.deepEqual(
    vista.procedencia.map((e) => e.clave),
    ["detectado", "redactado", "verificado", "publicado"],
  );
  assert.ok(
    vista.procedencia.some((e) => e.detalle.includes("modelo-de-redaccion-1")),
    "de la redacción se guarda y se enseña qué modelo la escribió (§3)",
  );
});

test("AC-NOT-02: `mexico` se publica con estado en los cuatro casos, `no_verificado` incluido", () => {
  // El campo que salva la sección: sin un estado explícito, «en México» es relleno
  // retórico en cuanto no hay dato local (§2). Se recorren los cuatro, no uno.
  for (const estado of [
    "aplica_con_datos_locales",
    "aplica_sin_datos_locales",
    "no_aplica",
    "no_verificado",
  ] as const) {
    const pieza = piezaSchema.parse({
      ...PIEZA_PARCIAL,
      mexico: { estado, texto: "Texto declarado para este estado." },
    });
    const { etiqueta, texto } = vistaDePieza(pieza).mexico;
    assert.notEqual(etiqueta.trim(), "", `${estado} se quedó sin etiqueta visible`);
    assert.equal(texto, "Texto declarado para este estado.");
  }
});

/**
 * Las propiedades del modelo, en dos listas: las raíces —que se exigen colgando de
 * `vista`— y las hojas de los objetos y arreglos, que se exigen por nombre porque dentro
 * de un `.map()` la raíz ya es la variable del recorrido.
 */
function propiedadesDelModelo(): { raices: string[]; hojas: string[] } {
  const vista = vistaDePieza(piezaSchema.parse(PIEZA_PARCIAL));
  const hojas = new Set<string>();
  const recorrer = (valor: unknown) => {
    if (Array.isArray(valor)) {
      valor.forEach(recorrer);
      return;
    }
    if (valor === null || typeof valor !== "object") return;
    for (const [clave, hijo] of Object.entries(valor)) {
      hojas.add(clave);
      recorrer(hijo);
    }
  };
  for (const hijo of Object.values(vista)) recorrer(hijo);
  return { raices: Object.keys(vista), hojas: [...hojas] };
}

test("AC-NOT-02: la ficha renderiza TODAS las propiedades del modelo, sin excepción", () => {
  const fuente = leer(DETALLE);
  const { raices, hojas } = propiedadesDelModelo();
  const desdeVista = accesosAVista(fuente);
  const porNombre = nombresDePropiedad(fuente);

  const sinRenderizar = raices.filter((r) => !desdeVista.has(r));
  assert.deepEqual(
    sinRenderizar,
    [],
    `el modelo de vista declara estos campos y la ficha no los renderiza: ` +
      `${sinRenderizar.join(", ")}. «Si no renderiza, no se declara» (02-editorial.md §1): ` +
      `o la ficha los enseña, o salen del modelo`,
  );

  const hojasSueltas = hojas.filter((h) => !porNombre.has(h));
  assert.deepEqual(
    hojasSueltas,
    [],
    `estas piezas del modelo no aparecen en la ficha: ${hojasSueltas.join(", ")}`,
  );
});

test("AC-NOT-02: la sonda de cobertura se pone roja a propósito", () => {
  // Una ficha a la que le falta el ángulo México pasa `tsc`, pasa `lint` y pasa `next
  // build`: ningún gate mira si un campo obligatorio llegó a la pantalla. Este sí.
  const mutilada = leer(DETALLE)
    .split("\n")
    .filter((linea) => !linea.includes("vista.mexico"))
    .join("\n");

  const desdeVista = accesosAVista(mutilada);
  assert.equal(
    desdeVista.has("mexico"),
    false,
    "si la sonda siguiera viendo `mexico` tras borrarlo, no estaría mirando el AST",
  );
  assert.equal(accesosAVista(leer(DETALLE)).has("mexico"), true);
});

test("AC-NOT-02: la ficha no ilustra nada, y no tiene forma de hacerlo", () => {
  // §4 de `02-editorial.md`: toda imagen generada con IA se atribuye con su modelo, y
  // nunca se ilustra con IA la evidencia de la que depende la tesis --- se muestra la
  // captura real o no se muestra nada. El registro de §3 no tiene campo de imagen, así
  // que la forma correcta de cumplirlo es que la ficha no pueda mostrar ninguna.
  const fuente = leer(DETALLE);
  assert.doesNotMatch(fuente, /<img[\s>/]/, "una <img> aquí no tendría de dónde sacar atribución");
  assert.doesNotMatch(fuente, /next\/image/, "tampoco por la vía del componente de imagen");
  assert.equal(
    nombresDePropiedad(fuente).has("imagen"),
    false,
    "el esquema de §3 no tiene campo de imagen: leerlo sería inventarlo",
  );
});
