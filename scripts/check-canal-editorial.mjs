#!/usr/bin/env node
/**
 * Guard: el canal editorial es determinista, recupera lo que quedo a medias, y cierra lo
 * que falla tres veces con un motivo escrito.
 *
 * Invariante que protege: `docs/plataforma/02-editorial.md` §5.2 (los tres niveles de
 * deduplicacion) y §8.1 (la maquina de estados). Las tres propiedades que comprueba son
 * las que el canal ANTERIOR no tenia: marcaba una entrada como vista al detectarla, asi
 * que lo que no llegaba a pieza se perdia para siempre y en silencio.
 *
 * ================== SOBRE LOS DOS COMANDOS, NO SOBRE UNO ==================
 *
 * Desde que el canal se partio (§8.1), cada propiedad se ejercita invocando `generar()` y
 * despues `verificarPendientes()`, que es como se opera de verdad. Repartir las etapas no
 * puede romper la idempotencia de §5.2, y este guard es lo que lo mide: si `generar`
 * volviera a sellar, o si `verificar` volviera a redactar, las tres propiedades dejarian
 * de sostenerse por caminos distintos.
 *
 * El «corpus» de este guard son los BORRADORES en `$EDITORIAL_REDACCIONES_DIR`: el corpus
 * intermedio se retiro con su variable (§8.6, fila 2), y lo que hay que contar es cuantas
 * piezas selladas quedaron en disco.
 *
 * ============================ SIN RED Y SIN INFERENCIA ============================
 *
 * Este guard **no llama a ningun modelo**. Usa el redactor falso de
 * `editorial/pruebas/ayuda.mjs` —el mismo doble que usa la suite— y las etapas que
 * tocarian la red (`detectar`, `verificar`) se inyectan como dobles con datos locales.
 *
 * No es una comodidad, es la condicion para que exista: un guard que invocara inferencia
 * dejaria de ser determinista —la misma entrada daria salidas distintas—, costaria dinero
 * en cada iteracion y no podria correr en CI. La demostracion CON inferencia real es otra
 * cosa, y va aparte.
 *
 * Todo lo que escribe vive en `tmpdir`, por las dos variables obligatorias y ninguna mas.
 * La ultima comprobacion verifica que el fixture trackeado del prototipo quedo intacto: un
 * guard que ensucia el arbol que vigila acaba ignorandose.
 *
 * Uso:
 *   node scripts/check-canal-editorial.mjs
 *   node scripts/check-canal-editorial.mjs --sin-deduplicacion   # PRUEBA NEGATIVA
 *
 * `--sin-deduplicacion` sustituye la etapa de deduplicacion por una que deja pasar todo.
 * Con ella el guard TIENE que ponerse rojo; si sigue verde, el guard esta desconectado y
 * no prueba nada (`AGENTS.md`, principio de verificacion, punto 4). Su prueba automatica
 * esta en `scripts/editorial/pruebas/guard-canal-falsable.test.mjs`.
 *
 * Exit 0 = las tres propiedades se sostienen. Exit 1 = alguna no.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { RUTA_FIXTURE_PROTOTIPO } from "./editorial/comun.mjs";
import { generar } from "./editorial/generar.mjs";
import { verificarPendientes } from "./editorial/verificar-canal.mjs";
import { estadoDe, pendientesDeRedaccion, porUrlCanonica } from "./editorial/estado.mjs";
import {
  DIR_EDITORIAL,
  borrador,
  borradorEnDisco,
  borradoresEnDisco,
  etapasFalsas,
  item,
  nuevoEntorno,
  referencia,
} from "./editorial/pruebas/ayuda.mjs";

const SIN_DEDUPLICACION = process.argv.includes("--sin-deduplicacion");

/**
 * La deduplicacion rota, a proposito: deja pasar todo como nuevo. Es lo que el canal
 * anterior hacia de hecho cuando el registro perdia una entrada.
 */
const deduplicarRota = (items) => ({ nuevos: items, yaPendientes: [], repetidos: [] });

/** Las etapas del guard: dobles locales, y la deduplicacion real salvo prueba negativa. */
function etapas(opciones) {
  const base = etapasFalsas(opciones);
  return SIN_DEDUPLICACION ? { ...base, deduplicar: deduplicarRota } : base;
}

const fallos = [];
function comprobar(propiedad, condicion, detalle) {
  if (!condicion) fallos.push(`${propiedad}: ${detalle}`);
}

/**
 * Una pasada completa del canal: los DOS comandos, en su orden, con las mismas etapas
 * dobles. Devuelve los dos resultados, que es lo que permite exigirle a cada uno lo suyo.
 */
const correr = async (etapasDelCaso, banderas = {}) => {
  const generado = await generar({ silencioso: true, ...banderas }, { etapas: etapasDelCaso });
  const verificado = await verificarPendientes(
    { silencioso: true, ...banderas },
    { etapas: etapasDelCaso },
  );
  return { generado, verificado };
};

/** Las piezas selladas que quedaron en disco. Es lo que antes contaba el corpus. */
/**
 * Los borradores en disco CON SU CONTENIDO, no solo sus nombres.
 *
 * Comparaba `borradoresEnDisco()` a secas, que devuelve los ids ordenados. En `develop` la
 * propiedad 1 comparaba el corpus COMPLETO, asi que el refactor debilito la asercion sin
 * que nada se pusiera rojo: una regresion que reescribiera el contenido de un borrador ya
 * sellado en la segunda corrida ---un `generar` que volviera a redactar sobre el mismo
 * id--- pasaba, porque el conjunto de nombres no cambia.
 *
 * Una compuerta que se afloja durante un refactor es peor que una que nunca existio: la
 * primera sigue dando verde y nadie vuelve a mirarla.
 */
const selladas = () => borradoresEnDisco().map((id) => ({ id, contenido: borradorEnDisco(id) }));

/** El item y su borrador: los mismos datos en las tres propiedades. */
function caso(titulo, url, id) {
  const noticia = item({ titulo, url });
  const redacciones = new Map([
    [
      noticia.url_canonica,
      borrador({
        id,
        titulo,
        fuentes: [
          referencia({ titulo: "Documento primario", medio: "Organismo", url: `https://organismo.example/${id}` }),
          referencia({ titulo, medio: "Medio Uno", url: noticia.url_canonica, tipo: "secundaria" }),
        ],
      }),
    ],
  ]);
  return { noticia, redacciones };
}

// El fixture trackeado del prototipo. Se mide ANTES de correr nada.
const fixtureAntes = existsSync(RUTA_FIXTURE_PROTOTIPO) ? readFileSync(RUTA_FIXTURE_PROTOTIPO) : null;

// =====================================================================================
// PROPIEDAD 1 — la segunda corrida sobre las mismas entradas da 0 nuevos.
// =====================================================================================
{
  nuevoEntorno("guard-determinismo");
  const { noticia, redacciones } = caso(
    "Un organismo publica su marco de alfabetizacion en IA",
    "https://medio-uno.mx/marco-alfabetizacion-ia",
    "marco-alfabetizacion-ia"
  );
  const deteccion = { items: [noticia] };

  const p1 = await correr(etapas({ deteccion, redacciones }));
  comprobar("1 determinismo", p1.generado.nuevos === 1, `la primera corrida deberia detectar 1 nuevo, dio ${p1.generado.nuevos}`);
  comprobar("1 determinismo", p1.generado.borradores.length === 1, `deberia escribir 1 borrador, escribio ${p1.generado.borradores.length}`);
  comprobar("1 determinismo", p1.verificado.selladas.length === 1, `deberia sellar 1 pieza, sello ${p1.verificado.selladas.length}`);
  const trasUno = JSON.stringify(selladas());

  const p2 = await correr(etapas({ deteccion, redacciones }));
  comprobar("1 determinismo", p2.generado.nuevos === 0, `la segunda corrida sobre las mismas entradas deberia dar 0 nuevos, dio ${p2.generado.nuevos}`);
  comprobar("1 determinismo", p2.generado.borradores.length === 0, `la segunda corrida no deberia escribir borradores, escribio ${p2.generado.borradores.length}`);
  comprobar("1 determinismo", p2.verificado.selladas.length === 0, `la segunda corrida no deberia sellar nada, sello ${p2.verificado.selladas.length}`);
  comprobar("1 determinismo", selladas().length === 1, `deberia quedarse en 1 borrador, hay ${selladas().length}`);
  comprobar("1 determinismo", JSON.stringify(selladas()) === trasUno, "los borradores cambiaron entre dos corridas identicas: compara ids Y contenido, porque una reescritura del mismo id no cambia el conjunto de nombres");
  comprobar(
    "1 determinismo",
    porUrlCanonica(noticia.url_canonica)?.estado === "terminada",
    `la entrada deberia quedar terminada, quedo ${porUrlCanonica(noticia.url_canonica)?.estado}`
  );
}

// =====================================================================================
// PROPIEDAD 2 — una corrida interrumpida deja la entrada PENDIENTE, y la siguiente la
// recupera sin duplicar. Se interrumpe de verdad: un proceso hijo que muere por SIGKILL
// a media corrida, que es la unica forma de probar lo que una caida real deja en disco.
// =====================================================================================
{
  const entorno = nuevoEntorno("guard-interrupcion");
  const { noticia, redacciones } = caso(
    "Se publica el padron de escuelas con conectividad medida",
    "https://medio-uno.mx/padron-conectividad",
    "padron-conectividad"
  );

  const guion = join(entorno.raiz, "muere-a-medias.mjs");
  const moduloEstado = pathToFileURL(join(DIR_EDITORIAL, "estado.mjs")).href;
  writeFileSync(
    guion,
    `
import { marcarExpedienteListo, registrarDeteccion } from ${JSON.stringify(moduloEstado)};
const entrada = ${JSON.stringify(noticia)};
const r = registrarDeteccion(entrada);
marcarExpedienteListo(r.id);
// Muere aqui: la entrada esta detectada y con expediente, y no hay pieza.
process.kill(process.pid, 'SIGKILL');
`,
    "utf8"
  );

  const hijo = spawnSync(process.execPath, [guion], {
    env: {
      ...process.env,
      EDITORIAL_ESTADO_DIR: entorno.estado,
      EDITORIAL_REDACCIONES_DIR: entorno.redacciones,
    },
    encoding: "utf8",
  });
  comprobar("2 interrupcion", hijo.status !== 0, "el proceso hijo tenia que morir, no terminar bien");

  const traslaCaida = porUrlCanonica(noticia.url_canonica);
  comprobar("2 interrupcion", traslaCaida?.estado === "pendiente_redaccion", `tras la caida la entrada deberia quedar pendiente_redaccion, quedo ${traslaCaida?.estado}`);
  comprobar("2 interrupcion", pendientesDeRedaccion().length === 1, `la entrada deberia seguir en la cola de pendientes, hay ${pendientesDeRedaccion().length}`);

  const p = await correr(etapas({ deteccion: { items: [noticia] }, redacciones }));
  comprobar("2 interrupcion", p.generado.repetidos === 0, "lo interrumpido no puede descartarse por «ya visto»: nunca llego a pieza");
  comprobar("2 interrupcion", p.generado.borradores.length === 1, `la corrida siguiente deberia recuperarla y escribir 1 borrador, escribio ${p.generado.borradores.length}`);
  comprobar("2 interrupcion", selladas().length === 1, `sin duplicar: deberia haber 1 borrador, hay ${selladas().length}`);
  comprobar("2 interrupcion", porUrlCanonica(noticia.url_canonica)?.estado === "terminada", "la entrada recuperada deberia quedar terminada");
}

// =====================================================================================
// PROPIEDAD 3 — tres fallos descartan la entrada CON MOTIVO. Un descarte sin motivo
// escrito no se puede auditar, y una entrada que se reintenta para siempre es una cola
// que nunca se vacia.
//
// Con el canal partido, los tres intentos los hace `verificar`: `generar` escribe el
// borrador una vez y no vuelve a tocarlo. Que los reintentos sigan contando igual es
// justamente lo que hay que comprobar tras repartir las etapas.
// =====================================================================================
{
  nuevoEntorno("guard-reintentos");
  const { noticia, redacciones } = caso(
    "Un laboratorio publica su evaluacion de tutores automaticos",
    "https://medio-uno.mx/tutores-automaticos",
    "tutores-automaticos"
  );
  const verificaciones = new Map([
    [
      "tutores-automaticos",
      {
        veredicto: "no_verificada",
        fallos: ["fuente no existe: https://organismo.example/tutores-automaticos [404] Not Found"],
        avisos: [],
        pendientes: [],
        detalle: "VEREDICTO no_verificada — una fuente citada no existe",
      },
    ],
  ]);

  const esperados = ["fallida_reintentable", "fallida_reintentable", "descartada"];
  for (let intento = 1; intento <= 3; intento++) {
    await correr(etapas({ deteccion: { items: [noticia] }, redacciones, verificaciones }));
    const entrada = porUrlCanonica(noticia.url_canonica);
    comprobar(
      "3 reintentos",
      entrada?.estado === esperados[intento - 1],
      `tras el fallo ${intento} la entrada deberia estar ${esperados[intento - 1]}, esta ${entrada?.estado}`
    );
    comprobar("3 reintentos", entrada?.intentos === intento, `intentos deberia ser ${intento}, es ${entrada?.intentos}`);
  }

  const final = porUrlCanonica(noticia.url_canonica);
  comprobar("3 reintentos", Boolean(final?.motivo_descarte), "la entrada descartada tiene que llevar motivo escrito");
  comprobar("3 reintentos", /reintentos_agotados/.test(final?.motivo_descarte ?? ""), `el motivo deberia decir reintentos_agotados, dice: ${final?.motivo_descarte}`);
  comprobar("3 reintentos", /verificar/.test(final?.motivo_descarte ?? ""), "el motivo tiene que nombrar la etapa que fallo");
  comprobar("3 reintentos", estadoDe(final?.id)?.estado === "descartada", "la entrada no queda reintentandose para siempre");
  // El borrador de una entrada descartada sigue en disco —`generar` lo escribio— y eso es
  // correcto: no se borra trabajo. Lo que NO puede llevar es sello, porque nunca paso la
  // verificacion; y sin sello `autorizar` se niega. Se mide el archivo, no la intencion.
  comprobar(
    "3 reintentos",
    (borradorEnDisco("tutores-automaticos")?.procedencia?.verificado?.detalle ?? null) === "sin verificar",
    "una entrada que fallo tres veces no puede dejar un borrador sellado"
  );
}

// =====================================================================================
// El guard no ensucia el arbol que vigila. Se mide sobre el DISCO, no con `git status`:
// las rutas privadas estan ignoradas y un `git status --porcelain` no lista ignorados.
// =====================================================================================
{
  const fixtureDespues = existsSync(RUTA_FIXTURE_PROTOTIPO) ? readFileSync(RUTA_FIXTURE_PROTOTIPO) : null;
  const intacto =
    (fixtureAntes === null && fixtureDespues === null) ||
    (fixtureAntes !== null && fixtureDespues !== null && fixtureAntes.equals(fixtureDespues));
  comprobar("4 aislamiento", intacto, `el guard escribio en el fixture trackeado ${RUTA_FIXTURE_PROTOTIPO}`);
}

if (fallos.length > 0) {
  for (const f of fallos) console.error(`::error::${f}`);
  console.error(
    `::error::${fallos.length} comprobacion(es) rotas. ` +
      (SIN_DEDUPLICACION
        ? "Esperado: corre con --sin-deduplicacion, que existe para demostrar que este guard puede fallar."
        : "Ver docs/plataforma/02-editorial.md §5.2 y §8.1.")
  );
  process.exit(1);
}

console.log(
  "OK: canal determinista (2a corrida = 0 nuevos), lo interrumpido se recupera sin duplicar, " +
    "y tres fallos descartan con motivo. Los dos comandos, sin red y sin inferencia."
);
