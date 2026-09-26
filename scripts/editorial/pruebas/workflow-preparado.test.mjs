/**
 * AC-PRG-01, AC-PRG-02 y AC-PRG-04: la ejecucion programada del canal esta PREPARADA y
 * DESACTIVADA.
 *
 *   AC-PRG-01  el workflow NO esta en `.github/workflows/`. Mientras siga en `docs/` no
 *              existe para GitHub: no hay cron, no hay ejecucion y no hay consumo.
 *   AC-PRG-02  el YAML es valido, `workflow_dispatch` va primero, el cron esta COMENTADO,
 *              `concurrency` tiene group fijo y `cancel-in-progress: false`, y estan
 *              declarados el tope de duracion y el de llamadas al redactor.
 *   AC-PRG-04  la compuerta de exposicion corre ANTES de cualquier escritura al arbol
 *              publico; NINGUN paso publica nada —mientras el repositorio sea publico no
 *              existe el «artefacto privado»: `actions/upload-artifact` no tiene opcion de
 *              ACL y lo descarga cualquiera que pueda ver el repositorio—; el registro se
 *              queda en `$EDITORIAL_ESTADO_DIR`, fuera de git; y —en su forma GENERAL, que
 *              es la que vale— TODO paso con `always()` cumple una de tres: no escribe, o
 *              exige que una compuerta anterior haya PASADO, o revalida por su cuenta. Se
 *              comprueban los cuatro pasos con `always()` del archivo uno por uno, no solo
 *              el del registro: lo que hace peligroso a `always()` no es donde escribe, es
 *              que corre DESPUES de que una compuerta haya dicho que no.
 *
 * AC-PRG-03 —ningun paso commitea— vive aparte, en `workflow-no-commitea-estado.test.mjs`:
 * un archivo por criterio de aceptacion, para que cada uno se pueda correr solo.
 *
 * Y una comprobacion que no es de un criterio sino del hallazgo F-01 de la revision:
 * ninguna escritura del workflow sale de una ruta SIN VALIDAR, la validacion canonica corre
 * ANTES de la corrida, todo paso que escriba en el almacen exige que esa validacion haya
 * PASADO, y el arbol se mide tambien por lo que git IGNORA —`git status --porcelain` no
 * lista lo ignorado, y las dos rutas historicas del canal estan en `.gitignore`—.
 *
 * LA PRUEBA PUEDE FALLAR, y se demuestra: el ultimo test aplica veinte mutaciones al
 * archivo real —descomentar el cron, poner `cancel-in-progress: true`, quitar el tope de
 * llamadas, mover la compuerta al final, adelantar la medicion del arbol al paso que
 * escribe, reponer el paso que subia el artefacto, devolver el destino del registro a la
 * variable cruda, quitarle al paso que escribe la exigencia de que la validacion haya
 * pasado, añadir un paso con `always()` que escriba en el checkout, otro colgado de un paso
 * que no es compuerta, otro colgado de una compuerta POSTERIOR, y otro que vuelque el
 * resumen en la pagina publica del job— y exige que cada una ponga roja la comprobacion que
 * le toca. Una prueba verde que no puede fallar no prueba nada (`AGENTS.md`, principio de
 * verificacion, punto 4).
 *
 * La regla sobre el `if` de un paso que publique es, por construccion, una regla sobre algo
 * que hoy no existe: se comprueba sobre los pasos que publican, y hoy no hay ninguno. Para
 * que no sea una comprobacion vacua —el defecto que `AGENTS.md` llama «gate verde que no
 * mira nada»— se ejercita en los dos sentidos sobre mutantes: un paso que publica con
 * `always()` la pone roja, y el mismo paso condicionado a las compuertas la deja verde.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  RAIZ,
  RUTA,
  RUTA_INSTALADA,
  analizar,
  comoMapa,
  comoTexto,
  exigirQueCadaMutacionFalle,
  leerFuente,
  pasosDe,
} from './workflow-canal.mjs';

// ---------------------------------------------------------------------------------------
// AC-PRG-02 — preparado: valido, manual primero, cron comentado, y con sus topes.
// ---------------------------------------------------------------------------------------

export function comprobarPreparado(fuente) {
  const doc = analizar(fuente);

  for (const clave of ['name', 'on', 'concurrency', 'permissions', 'jobs']) {
    assert.ok(Object.hasOwn(doc, clave), `falta la clave de primer nivel «${clave}»`);
  }

  // Manual primero, y el cron COMENTADO: no hay `schedule` activo en ningun sitio.
  const disparadores = comoMapa(doc.on, 'on');
  assert.ok(Object.hasOwn(disparadores, 'workflow_dispatch'), 'falta `workflow_dispatch`');
  assert.ok(
    !Object.hasOwn(disparadores, 'schedule'),
    'hay un `schedule` ACTIVO: el cron tiene que estar comentado, y descomentarlo es la activacion',
  );
  assert.ok(!/^\s*schedule:/m.test(fuente), 'aparece `schedule:` sin comentar en el archivo');
  assert.ok(!/^\s*- cron:/m.test(fuente), 'aparece un `- cron:` sin comentar en el archivo');

  // El cron esta ESCRITO, comentado: preparado significa que se lee que haria.
  assert.match(fuente, /^\s*#\s*schedule:\s*$/m, 'el bloque `schedule` comentado no esta escrito');
  assert.match(fuente, /^\s*#\s*- cron: .+$/m, 'el `cron` comentado no esta escrito');

  // «workflow_dispatch primero» se mide por posicion en el archivo.
  const iDispatch = fuente.indexOf('workflow_dispatch:');
  const iSchedule = fuente.search(/^\s*#\s*schedule:\s*$/m);
  assert.ok(
    iDispatch >= 0 && iSchedule > iDispatch,
    '`workflow_dispatch` tiene que ir antes que el `schedule` comentado',
  );

  // Concurrencia: group FIJO y sin cancelacion.
  const concurrencia = comoMapa(doc.concurrency, 'concurrency');
  const grupo = comoTexto(concurrencia.group, 'concurrency.group');
  assert.ok(grupo.length > 0, '`concurrency.group` vacio');
  assert.ok(
    !grupo.includes('${{'),
    `\`concurrency.group\` tiene que ser fijo y es una expresion: «${grupo}». Un group por rama o por corrida permite dos corridas simultaneas sobre la misma bitacora, que es el problema entero`,
  );
  assert.equal(
    comoTexto(concurrencia['cancel-in-progress'], 'concurrency.cancel-in-progress'),
    'false',
    '`cancel-in-progress` tiene que ser false: se encola, no se mata',
  );

  // Topes: duracion por job, y el de llamadas al redactor declarado con valor.
  const jobs = comoMapa(doc.jobs, 'jobs');
  assert.ok(Object.keys(jobs).length > 0, 'el workflow no declara ningun job');
  for (const [nombre, crudo] of Object.entries(jobs)) {
    const job = comoMapa(crudo, `jobs.${nombre}`);
    const tope = Number(comoTexto(job['timeout-minutes'], `jobs.${nombre}.timeout-minutes`));
    assert.ok(
      Number.isInteger(tope) && tope > 0,
      `jobs.${nombre}.timeout-minutes tiene que ser un entero positivo`,
    );

    const entorno = comoMapa(job.env, `jobs.${nombre}.env`);
    const llamadas = Number(
      comoTexto(entorno.EDITORIAL_MAX_LLAMADAS, `jobs.${nombre}.env.EDITORIAL_MAX_LLAMADAS`),
    );
    assert.ok(
      Number.isInteger(llamadas) && llamadas > 0,
      `jobs.${nombre}: falta el tope de llamadas al redactor (EDITORIAL_MAX_LLAMADAS) o no es un entero positivo`,
    );
  }
}

// ---------------------------------------------------------------------------------------
// AC-PRG-04 — la compuerta de exposicion corre ANTES de cualquier escritura, y el registro
// se escribe en el almacen externo, nunca en el arbol de trabajo.
//
// Esta comprobacion existe ademas por una segunda razon: prueba que el analisis LLEGO a los
// pasos. Si el analizador se quedara corto y devolviera un arbol vacio, las comprobaciones
// de arriba pasarian en vacio; aqui se exige un numero minimo de pasos y se nombra
// contenido concreto de sus `run`.
// ---------------------------------------------------------------------------------------

export function comprobarCompuertaAntesDeEscribir(fuente) {
  const doc = analizar(fuente);
  const pasos = pasosDe(doc);

  assert.ok(pasos.length >= 9, `se esperaban al menos 9 pasos y se analizaron ${pasos.length}`);
  const guiones = pasos.map((p) => (typeof p.paso.run === 'string' ? p.paso.run : ''));
  assert.ok(
    guiones.some((g) => g.includes('generar.mjs --limite'))
      && guiones.some((g) => g.includes('verificar-canal.mjs --limite')),
    'no se encontraron las DOS invocaciones del canal —`generar` y `verificar`, §8.1—: '
    + 'o el analisis no llego al cuerpo de los pasos, o el workflow volvio a correr un solo comando',
  );

  const indiceDe = (predicado) => pasos.findIndex(({ paso }, n) => predicado(guiones[n], paso));

  const compuerta = indiceDe((g) => g.includes('auditoria-exposicion.mjs'));
  assert.ok(compuerta >= 0, 'no hay compuerta de exposicion en el workflow');

  const corrida = indiceDe((g) => g.includes('generar.mjs'));
  assert.ok(
    compuerta > corrida,
    'la compuerta tiene que correr DESPUES de la corrida: audita lo que la corrida escribio',
  );

  // Todo lo que produce algo va despues de la compuerta.
  const posteriores = [
    ['el registro de la corrida', indiceDe((g) => g.includes('registro-de-corridas.mjs >'))],
    ['la comprobacion del arbol intacto', indiceDe((g) => g.includes('git status --porcelain'))],
  ];
  for (const [nombre, indice] of posteriores) {
    assert.ok(indice >= 0, `falta el paso: ${nombre}`);
    assert.ok(
      indice > compuerta,
      `${nombre} corre ANTES que la compuerta de exposicion: la compuerta tiene que preceder a toda escritura y a toda publicacion`,
    );
  }

  // El arbol se mide DESPUES del ultimo paso que puede escribir. Una medicion que precede
  // al escritor no lo mide: el destino del registro sale de una variable, y un
  // `EDITORIAL_ESTADO_DIR` mal apuntado escribiria dentro del checkout.
  const arbol = indiceDe((g) => g.includes('git status --porcelain'));
  const registro = indiceDe((g) => g.includes('registro-de-corridas.mjs >'));
  assert.ok(
    arbol > registro,
    'la medicion del arbol de trabajo corre ANTES del paso que escribe el registro, asi que no lo mide',
  );

  // El registro se escribe en el ALMACEN EXTERNO, que es el unico destino que no publica y
  // que ademas conserva: `$RUNNER_TEMP` no tocaria el arbol publico, pero se va con el
  // runner y dejaria el registro sin existir. Y se escribe en la ruta YA VALIDADA, no en la
  // variable cruda: ese es el hallazgo F-01 y lo comprueba `comprobarEscrituraValidada`.
  const escritura = guiones.find((g) => g.includes('registro-de-corridas.mjs >')) ?? '';
  assert.match(
    escritura,
    />\s*"?\$\{?RUTA_ESTADO_VALIDADA\}?\//,
    'el registro tiene que escribirse en la ruta validada del almacen externo, fuera de todo arbol de git',
  );
}

// ---------------------------------------------------------------------------------------
// F-01 — ninguna escritura sale de una ruta sin validar, y la validacion precede a todo.
//
// El defecto que cierra esta comprobacion: los pasos del registro corren con `always()`
// —tienen que correr aunque la corrida falle— y escribian con `mkdir -p` sobre
// `$EDITORIAL_ESTADO_DIR` CRUDA. Con la variable apuntando dentro del checkout, la corrida
// abortaba por `02-editorial.md` §8.3 y el registro escribia igual dentro del repositorio
// PUBLICO; como las dos rutas historicas del canal estan en `.gitignore`, «el arbol de
// trabajo quedo intacto» tampoco lo veia, porque `git status --porcelain` no lista lo
// ignorado. La mitigacion tapaba el defecto en vez de detectarlo.
//
// Que el rechazo ocurre de verdad —y que no se escribe un solo byte— lo prueba por
// ejecucion `directorio-fuera-de-git.test.mjs`, contra un arbol de git real montado en
// `tmpdir`. Aqui se comprueba la otra mitad: que el workflow use ese mecanismo.
// ---------------------------------------------------------------------------------------

const VALIDACION = 'dirs_privados';

export function comprobarEscrituraValidada(fuente) {
  const pasos = pasosDe(analizar(fuente));
  const guionDe = ({ paso }) => (typeof paso.run === 'string' ? paso.run : '');

  const iValidacion = pasos.findIndex(({ paso }) => paso.id === VALIDACION);
  assert.ok(
    iValidacion >= 0,
    `falta el paso que valida los directorios privados (id: ${VALIDACION}): sin el, el destino del registro no lo comprueba nadie`,
  );
  assert.match(
    guionDe(pasos[iValidacion]),
    /ruta-estado\.mjs/,
    `el paso «${VALIDACION}» tiene que resolver el destino con la validacion CANONICA del canal (ruta-estado.mjs), no con una copia de la regla`,
  );

  const iCorrida = pasos.findIndex((p) => guionDe(p).includes('generar.mjs'));
  assert.ok(iCorrida >= 0, 'no se encontro el paso de la corrida');
  assert.ok(
    iValidacion < iCorrida,
    'la validacion de los directorios privados tiene que correr ANTES de la corrida: una corrida que arranca con un destino invalido ya escribio cuando alguien lo mira',
  );

  for (const { paso } of pasos) {
    const guion = typeof paso.run === 'string' ? paso.run : '';
    const etiqueta = etiquetaDe(paso);

    // 1. Ningun paso escribe sobre la variable CRUDA.
    assert.ok(
      !/\bmkdir\b[^\n]*\$\{?EDITORIAL_ESTADO_DIR\b/.test(guion) &&
        !/>\s*"?\$\{?EDITORIAL_ESTADO_DIR\b/.test(guion),
      `paso «${etiqueta}»: escribe sobre $EDITORIAL_ESTADO_DIR sin validar. El shell no comprueba §8.3, y una ruta dentro del checkout se escribiria igual (F-01)`,
    );

    // 2. Todo paso que escriba en el almacen exige que la validacion haya PASADO. No basta
    //    con que hoy la validacion preceda a la corrida: estos pasos corren con `always()`,
    //    asi que corren tambien cuando algo de antes fallo.
    //    El paso de validacion se excluye porque es quien PRODUCE la ruta, no quien escribe
    //    con ella; exigirse a si mismo su propio exito seria una condicion imposible.
    if (paso.id === VALIDACION) continue;
    if (!guion.includes('$RUTA_ESTADO_VALIDADA')) continue;
    const condicion = typeof paso.if === 'string' ? paso.if : '';
    assert.ok(
      condicion.includes(`steps.${VALIDACION}.outcome == 'success'`),
      `paso «${etiqueta}»: escribe en el almacen sin exigir que «${VALIDACION}» haya PASADO. Con always() escribiria tambien cuando la validacion dijo que no`,
    );
  }
}

/**
 * La segunda cerradura: el arbol se mide tambien por lo que git IGNORA.
 *
 * `git status --porcelain` no lista lo ignorado y `/scripts/editorial/estado/` y
 * `/scripts/editorial/redacciones/` estan en el `.gitignore` de este repositorio: sin esta
 * comprobacion, un archivo escrito ahi deja el arbol «limpio».
 */
export function comprobarArbolMideLoIgnorado(fuente) {
  const guion =
    pasosDe(analizar(fuente))
      .map(({ paso }) => (typeof paso.run === 'string' ? paso.run : ''))
      .find((g) => g.includes('git status --porcelain')) ?? '';
  assert.ok(guion.length > 0, 'falta el paso que mide el arbol de trabajo');
  for (const ruta of ['scripts/editorial/estado', 'scripts/editorial/redacciones']) {
    assert.ok(
      guion.includes(ruta),
      `el paso que mide el arbol no comprueba «${ruta}», que git ignora: un archivo escrito ahi no aparece en git status --porcelain`,
    );
  }
}

// ---------------------------------------------------------------------------------------
// AC-PRG-04, segunda mitad — NADA se publica mientras este repositorio sea publico, y la
// regla que sobrevive al paso retirado.
//
// El paso `actions/upload-artifact` que estuvo aqui hasta el 2026-09-24 se describia como
// «artefacto privado». Eso no existe: en un repositorio publico los artefactos de Actions
// los descarga cualquiera que pueda ver el repositorio, y la accion no tiene ninguna opcion
// de ACL. Sanear el contenido no vuelve privado el artefacto —vuelve publicable su
// contenido, que es otra cosa—.
// ---------------------------------------------------------------------------------------

/** Acciones cuyo efecto es dejar algo descargable fuera de la corrida. */
const ACCIONES_QUE_PUBLICAN = [
  'actions/upload-artifact',
  'actions/upload-pages-artifact',
  'actions/deploy-pages',
  'softprops/action-gh-release',
];

/**
 * Lo mismo desde un `run`.
 *
 * `$GITHUB_STEP_SUMMARY` esta en esta lista y no en la de escrituras: el resumen de un job
 * se RENDERIZA en la pagina de la corrida, y en un repositorio publico esa pagina la ve
 * cualquiera. Es la misma clase que el artefacto por otra puerta, y esta aqui porque la
 * correccion del 2026-09-24 valia para todos los canales publicos por defecto, no solo para
 * el que la revision nombro.
 */
const PUBLICACION_EN_SHELL = [
  /\bgh\s+release\s+create\b/,
  /\bgh\s+gist\s+create\b/,
  /\bgh\s+pr\s+create\b/,
  />>?\s*"?\$\{?GITHUB_STEP_SUMMARY\b/,
];

const etiquetaDe = (paso) =>
  typeof paso.name === 'string' ? paso.name : typeof paso.uses === 'string' ? paso.uses : '(sin nombre)';

function pasosQuePublican(fuente) {
  return pasosDe(analizar(fuente)).filter(({ paso }) => {
    const usa = String(paso.uses ?? '');
    const guion = typeof paso.run === 'string' ? paso.run : '';
    return (
      ACCIONES_QUE_PUBLICAN.some((accion) => usa.startsWith(accion)) ||
      PUBLICACION_EN_SHELL.some((patron) => patron.test(guion))
    );
  });
}

export function comprobarNadaSePublica(fuente) {
  const publican = pasosQuePublican(fuente).map(({ job, paso }) => `jobs.${job} «${etiquetaDe(paso)}»`);
  assert.equal(
    publican.length,
    0,
    `este repositorio es PUBLICO y no existe el artefacto privado: ningun paso puede publicar, y publican ${publican.join(', ')}. ` +
      'Un registro descargable exige repositorio privado o destino externo con credencial (prerrequisito 3, abierto)',
  );
}

export function comprobarPublicacionCondicionada(fuente) {
  for (const { job, paso } of pasosQuePublican(fuente)) {
    const donde = `jobs.${job}, paso «${etiquetaDe(paso)}»`;
    const condicion = typeof paso.if === 'string' ? paso.if : '';
    assert.ok(
      !/always\s*\(\s*\)/.test(condicion),
      `${donde}: publica con always(), asi que publicaria aunque una compuerta acabara de fallar. ` +
        'Es el defecto exacto del paso retirado el 2026-09-24',
    );
    for (const compuerta of ['exposicion', 'registro_sin_urls']) {
      assert.ok(
        condicion.includes(`steps.${compuerta}.outcome == 'success'`),
        `${donde}: no exige que la compuerta «${compuerta}» haya PASADO antes de publicar`,
      );
    }
  }
}

// ---------------------------------------------------------------------------------------
// AC-PRG-04, forma GENERAL — la regla no es «el paso del registro», es TODO paso con
// `always()`.
//
// Las dos comprobaciones de arriba son las dos formas ESTRECHAS de una misma regla:
// `comprobarPublicacionCondicionada` mira los pasos que publican, y
// `comprobarEscrituraValidada` mira los que nombran `$RUTA_ESTADO_VALIDADA`. Entre las dos
// queda un hueco por el que cabe exactamente el defecto F-01 otra vez con otro destino: un
// paso con `always()` que escriba en cualquier OTRO sitio —un archivo dentro del checkout,
// pongamos— no lo mira ninguna. Y un paso con `always()` corre DESPUES de que una compuerta
// haya dicho que no; si ademas escribe, escribe justo lo que la compuerta existia para
// impedir.
//
// La regla en su forma general, entonces, y es la que se comprueba aqui:
//
//   TODO paso con `always()` cumple una de tres: no escribe, o exige que una compuerta
//   anterior haya PASADO (`steps.<id>.outcome == 'success'`), o revalida por su cuenta.
//
// LO QUE ESTA COMPROBACION NO PUEDE VER, dicho para no venderla por mas de lo que mide:
//
//  1. Lee la FORMA DEL SHELL. Un paso cuyo `run` sea `node algo.mjs` y cuyo `algo.mjs`
//     escriba pasa por «no escribe», porque el analizador no entra en el script. Los TRES
//     pasos que se acogen hoy a la rama «no escribe» son `auditoria-exposicion.mjs`, un
//     `grep -Eq` y un `git status --porcelain`; de los tres, el unico cuyo cuerpo es codigo
//     de este repositorio —y por tanto el unico que hay que medir— es el primero. Medido:
//     sus unicos usos de `node:fs` son `readFileSync`, `existsSync`, `statSync` y
//     `readdirSync`, y TAMPOCO escribe por subproceso: sus tres `execFileSync` de
//     `node:child_process` son `gh api` y `gh repo list`, lectura pura, y ademas solo se
//     alcanzan con `--gh`, bandera que el workflow no pasa. Decirlo solo de `node:fs`
//     dejaba fuera media superficie: un subproceso puede escribir y ningun grep de
//     `node:fs` lo veria.
//  2. La lista de compuertas es una ALLOWLIST escrita a mano (`COMPUERTAS`). Una compuerta
//     nueva que nadie añada ahi pone la prueba roja —que es el lado seguro—, pero un id
//     renombrado en el workflow y no aqui tambien.
//
// Lo que respalda la rama «no escribe» por ejecucion es el ultimo paso del job, «el arbol de
// trabajo quedo intacto»: corre despues de todos y mide el arbol por lo rastreado Y por las
// dos rutas que git ignora. Una mitigacion acotada, como las de `04-architecture.md` §4.1.
// ---------------------------------------------------------------------------------------

/** Canales del runner: ni son el arbol de trabajo ni los lee nadie desde fuera. */
const DESTINOS_EXENTOS = /^\$\{?(GITHUB_ENV|GITHUB_OUTPUT|GITHUB_PATH)\}?$|^\/dev\/null$/;

/** Ordenes de shell cuyo efecto es dejar algo escrito en el disco del runner. */
const ORDENES_QUE_ESCRIBEN = [
  /\bmkdir\b/,
  /\btouch\b/,
  /\btee\b/,
  /\bcp\b/,
  /\bmv\b/,
  /\brm\b/,
  /\btruncate\b/,
  /\bsed\s+-i\b/,
  /\bgit\s+(add|commit|push|checkout|restore|clean)\b/,
];

/** Lo que un paso deja escrito, hasta donde la forma del shell permite verlo. */
function escriturasDe(paso) {
  const guion = typeof paso.run === 'string' ? paso.run : '';
  const escrituras = [];

  for (const patron of ORDENES_QUE_ESCRIBEN) {
    const m = patron.exec(guion);
    if (m !== null) escrituras.push(m[0].trim());
  }

  for (const m of guion.matchAll(/>>?\s*("[^"]*"|'[^']*'|[^\s;|&]+)/g)) {
    const destino = m[1].replace(/^["']|["']$/g, '');
    // `2>&1` y `>&2` redirigen un descriptor, no abren un archivo.
    if (destino.startsWith('&')) continue;
    if (DESTINOS_EXENTOS.test(destino)) continue;
    escrituras.push(`redireccion a ${destino}`);
  }

  const usa = String(paso.uses ?? '');
  if (ACCIONES_QUE_PUBLICAN.some((accion) => usa.startsWith(accion))) escrituras.push(usa);

  return escrituras;
}

/**
 * Las COMPUERTAS del workflow, por id. La rama «exige que una compuerta haya PASADO» se
 * restringe a estas, y no a un `steps.<cualquiera>.outcome == 'success'`: la forma sola no
 * dice nada. `steps.corrida.outcome == 'success'` casa igual de bien y no autoriza nada —la
 * corrida no comprueba ni el destino ni la exposicion—, asi que un paso futuro colgado de
 * ella pasaria por autorizado escribiendo donde quisiera.
 *
 * Y se exige ademas que el paso referenciado APAREZCA ANTES en el mismo job: una compuerta
 * posterior no puede detener lo que ya se escribio. Sin esa mitad, un `if` que nombre una
 * compuerta que corre despues es una condicion que nunca sera `success` cuando importa.
 */
const COMPUERTAS = ['dirs_privados', 'exposicion', 'registro_sin_urls'];

const esperaAUnaCompuertaAnterior = (condicion, anteriores) =>
  COMPUERTAS.some(
    (id) => anteriores.has(id) && condicion.includes(`steps.${id}.outcome == 'success'`),
  );

export function comprobarAlwaysNoEscribeSinCompuerta(fuente) {
  /** ids que ya aparecieron en el mismo job, por job. */
  const anterioresPorJob = new Map();

  for (const { job, paso } of pasosDe(analizar(fuente))) {
    if (!anterioresPorJob.has(job)) anterioresPorJob.set(job, new Set());
    const anteriores = anterioresPorJob.get(job);

    const condicion = typeof paso.if === 'string' ? paso.if : '';
    const escrituras = /always\s*\(\s*\)/.test(condicion) ? escriturasDe(paso) : [];

    if (escrituras.length > 0) {
      assert.ok(
        esperaAUnaCompuertaAnterior(condicion, anteriores),
        `jobs.${job}, paso «${etiquetaDe(paso)}»: corre con always() y escribe (${escrituras.join('; ')}) ` +
          'sin exigir que ninguna compuerta ANTERIOR haya PASADO. Un paso con always() corre tambien ' +
          'despues de que una compuerta haya rechazado la corrida, asi que escribiria justo lo que esa ' +
          `compuerta existia para impedir (F-01). O no escribe, o su \`if\` lleva ` +
          `\`steps.<compuerta>.outcome == 'success'\` con una de las compuertas que corren antes que el ` +
          `(${COMPUERTAS.join(', ')}); no vale un paso cualquiera, que no comprueba nada`,
      );
    }

    // Despues de la comprobacion, nunca antes: un paso no puede ser su propia compuerta.
    if (typeof paso.id === 'string') anteriores.add(paso.id);
  }
}

// ---------------------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------------------

/** El paso retirado, tal cual estaba, para reponerlo en un mutante con la `if` que se pida. */
const pasoQuePublica = (condicion) =>
  [
    '',
    '      - name: publicar el registro como artefacto',
    `        if: ${condicion}`,
    '        uses: actions/upload-artifact@v4',
    '        with:',
    '          name: registro-canal',
    '          path: registro-corrida.txt',
    '',
  ].join('\n');

/**
 * Un paso que ESCRIBE y no publica —el hueco que dejaban las dos comprobaciones estrechas—,
 * para reponerlo en un mutante con la `if` que se quiera.
 */
const pasoQueEscribe = (condicion) =>
  [
    '',
    '      - name: nota de la corrida',
    `        if: ${condicion}`,
    '        run: |',
    '          mkdir -p nota',
    '          echo "hubo corrida" > nota/corrida.txt',
    '',
  ].join('\n');

/** Un paso que publica por la otra puerta: el resumen del job, publico en un repo publico. */
const pasoQueResume = (condicion) =>
  [
    '',
    '      - name: resumen de la corrida',
    `        if: ${condicion}`,
    '        run: |',
    '          echo "corrida terminada" >> "$GITHUB_STEP_SUMMARY"',
    '',
  ].join('\n');

const fuente = leerFuente();

test('AC-PRG-01: el workflow del canal NO esta instalado en .github/workflows/', () => {
  assert.ok(existsSync(RUTA), `${RUTA} tiene que existir: es donde vive la configuracion preparada`);
  assert.ok(
    !existsSync(RUTA_INSTALADA),
    `${RUTA_INSTALADA} existe: el workflow esta INSTALADO. Preparado significa que GitHub no lo ve`,
  );
  // Y que no este con otro nombre: lo que importa es que no haya un workflow con este `name`.
  const ci = join(RAIZ, '.github/workflows/ci.yml');
  const instalado = existsSync(ci) ? readFileSync(ci, 'utf8') : '';
  assert.ok(!/^name: canal editorial\s*$/m.test(instalado), 'el canal editorial esta dentro de ci.yml');
});

test('AC-PRG-02: YAML valido, manual primero, cron comentado, concurrency y topes declarados', () => {
  comprobarPreparado(fuente);
});

test('AC-PRG-04: la compuerta de exposicion precede a toda escritura, y el registro va al almacen externo', () => {
  comprobarCompuertaAntesDeEscribir(fuente);
});

test('AC-PRG-04: ningun paso publica nada mientras este repositorio sea publico', () => {
  comprobarNadaSePublica(fuente);
  comprobarPublicacionCondicionada(fuente);
});

test('AC-PRG-04: la regla del `if` acepta un paso que SI espera a las compuertas', () => {
  // La otra mitad de la falsabilidad. Sin este test, «ningun paso publica con always()»
  // podria estar implementado como «ningun paso publica», y nadie lo notaria.
  const condicionado = pasoQuePublica(
    "${{ steps.exposicion.outcome == 'success' && steps.registro_sin_urls.outcome == 'success' }}",
  );
  comprobarPublicacionCondicionada(fuente + condicionado);
  assert.throws(
    () => comprobarNadaSePublica(fuente + condicionado),
    /artefacto privado/,
    'condicionarlo bien no lo vuelve publicable: hoy no puede haber NINGUN paso que publique',
  );
});

test('AC-PRG-04: NINGUN paso con always() escribe sin que una compuerta lo haya autorizado', () => {
  // Se comprueban los cuatro pasos con `always()` del archivo, uno por uno, no el que el
  // enunciado nombra. Hoy la cuenta es TRES que no escriben —«compuerta de exposicion»
  // (script de solo lectura), «el registro no lleva URLs» (`grep`) y «el arbol de trabajo
  // quedo intacto» (`git status --porcelain`)— y UNO que escribe, «registro de la corrida»,
  // que es el que cuelga de `dirs_privados`. El del arbol cuelga de `!= 'skipped'` a
  // proposito: tiene que medir tambien cuando la validacion fallo.
  comprobarAlwaysNoEscribeSinCompuerta(fuente);
});

test('AC-PRG-04: la regla general acepta un paso con always() que SI espera a la compuerta', () => {
  // La otra mitad de la falsabilidad. Sin este test, «ningun paso con always() escribe sin
  // compuerta» podria estar implementado como «ningun paso escribe», o como una funcion que
  // no mira nada, y las mutaciones de abajo no lo distinguirian.
  const condicionado = pasoQueEscribe("${{ always() && steps.dirs_privados.outcome == 'success' }}");
  comprobarAlwaysNoEscribeSinCompuerta(fuente + condicionado);

  // Y que el paso repuesto es de verdad uno que escribe: sin esto, el test de arriba pasaria
  // igual si `escriturasDe` devolviera siempre la lista vacia.
  assert.throws(
    () => comprobarAlwaysNoEscribeSinCompuerta(fuente + pasoQueEscribe('${{ always() }}')),
    /nota de la corrida/,
    'el paso repuesto tiene que contar como escritura: si no, la comprobacion pasa en vacio',
  );
});

test('F-01: ninguna escritura sale de una ruta sin validar, y el arbol se mide tambien por lo ignorado', () => {
  comprobarEscrituraValidada(fuente);
  comprobarArbolMideLoIgnorado(fuente);
});

test('las comprobaciones pueden fallar: cada mutacion pone roja la suya', () => {
  exigirQueCadaMutacionFalle(fuente, [
    {
      nombre: 'el cron descomentado',
      motivo: /schedule/,
      mutar: (f) =>
        f.replace(/^(\s*)# (schedule:)$/m, '$1$2').replace(/^(\s*)#   (- cron: .*)$/m, '$1  $2'),
      comprobar: comprobarPreparado,
    },
    {
      // Las mutaciones se anclan a principio de linea y sin `#`: una sustitucion por
      // subcadena cambiaria el COMENTARIO que explica la regla en vez de la regla, y la
      // prueba de falsabilidad pasaria sin haber roto nada.
      nombre: 'cancel-in-progress: true',
      motivo: /cancel-in-progress/,
      mutar: (f) => f.replace(/^(\s*)cancel-in-progress: false$/m, '$1cancel-in-progress: true'),
      comprobar: comprobarPreparado,
    },
    {
      nombre: 'un group de concurrencia por rama',
      motivo: /group/,
      mutar: (f) =>
        f.replace(/^(\s*)group: canal-editorial$/m, '$1group: canal-editorial-${{ github.ref }}'),
      comprobar: comprobarPreparado,
    },
    {
      nombre: 'sin timeout-minutes',
      motivo: /timeout-minutes/,
      mutar: (f) => f.replace(/^ *timeout-minutes: \d+$/m, ''),
      comprobar: comprobarPreparado,
    },
    {
      nombre: 'sin tope de llamadas al redactor',
      motivo: /EDITORIAL_MAX_LLAMADAS/,
      mutar: (f) => f.replace(/^ *EDITORIAL_MAX_LLAMADAS: .*$/m, ''),
      comprobar: comprobarPreparado,
    },
    {
      nombre: 'un tabulador en la sangria',
      motivo: /tabulador/,
      mutar: (f) => f.replace('\n  group: canal-editorial', '\n\tgroup: canal-editorial'),
      comprobar: comprobarPreparado,
    },
    {
      nombre: 'el registro escrito dentro del arbol de trabajo',
      motivo: /ruta validada/,
      mutar: (f) =>
        f.replace(
          '> "$RUTA_ESTADO_VALIDADA/registro-corrida-$GITHUB_RUN_NUMBER.txt"',
          '> registro-corrida.txt',
        ),
      comprobar: comprobarCompuertaAntesDeEscribir,
    },
    // --- Las cuatro que siguen son el hallazgo F-01, una por cada mitad del arreglo. ---
    {
      nombre: 'el registro escrito sobre la variable CRUDA, sin validar',
      motivo: /sin validar/,
      mutar: (f) =>
        f
          .replace('mkdir -p "$RUTA_ESTADO_VALIDADA"', 'mkdir -p "$EDITORIAL_ESTADO_DIR"')
          .replace(
            '> "$RUTA_ESTADO_VALIDADA/registro-corrida-$GITHUB_RUN_NUMBER.txt"',
            '> "$EDITORIAL_ESTADO_DIR/registro-corrida-$GITHUB_RUN_NUMBER.txt"',
          ),
      comprobar: comprobarEscrituraValidada,
    },
    {
      // Solo la primera ocurrencia: basta con que UN paso que escribe deje de exigirlo.
      nombre: 'el paso del registro sin exigir que la validacion haya PASADO',
      motivo: /dirs_privados/,
      mutar: (f) => f.replace(" && steps.dirs_privados.outcome == 'success' }}", ' }}'),
      comprobar: comprobarEscrituraValidada,
    },
    {
      nombre: 'la validacion de los directorios movida despues de la corrida',
      motivo: /ANTES de la corrida/,
      mutar: (f) => {
        const bloque = /^ {6}- name: los directorios privados estan fuera de git\n(?: {8}.*\n)+/m;
        const m = bloque.exec(f);
        assert.ok(m !== null, 'no se pudo aislar el paso de validacion para moverlo');
        return `${f.replace(bloque, '').replace(/\s*$/, '')}\n${m[0]}`;
      },
      comprobar: comprobarEscrituraValidada,
    },
    {
      nombre: 'el arbol medido solo con git status, sin mirar lo que git ignora',
      motivo: /que git ignora/,
      mutar: (f) => f.replace(/^ {10}for ruta in scripts\/editorial\/estado[\s\S]*?^ {10}done\n/m, ''),
      comprobar: comprobarArbolMideLoIgnorado,
    },
    {
      nombre: 'la medicion del arbol movida antes del paso que escribe el registro',
      motivo: /medicion del arbol/,
      mutar: (f) => {
        const bloque = /^ {6}- name: el arbol de trabajo quedo intacto\n(?: {8}.*\n)+/m;
        const m = bloque.exec(f);
        assert.ok(m !== null, 'no se pudo aislar el paso del arbol intacto para moverlo');
        return f
          .replace(bloque, '')
          .replace(/^ {6}- name: registro de la corrida$/m, `${m[0].trimEnd()}\n      - name: registro de la corrida`);
      },
      comprobar: comprobarCompuertaAntesDeEscribir,
    },
    {
      // Las dos mutaciones que siguen reponen EL MISMO paso retirado y exigen dos cosas
      // distintas: que hoy no pueda existir, y que si algun dia existe no pueda publicar
      // ignorando las compuertas. La segunda es la unica forma de que esa regla no sea una
      // comprobacion vacua sobre un conjunto vacio de pasos.
      nombre: 'repuesto el paso que sube el registro como artefacto',
      motivo: /artefacto privado/,
      mutar: (f) => `${f.replace(/\s*$/, '')}\n${pasoQuePublica("${{ always() }}")}`,
      comprobar: comprobarNadaSePublica,
    },
    {
      nombre: 'un paso que publica con always() en vez de esperar a las compuertas',
      motivo: /always\(\)/,
      mutar: (f) => `${f.replace(/\s*$/, '')}\n${pasoQuePublica("${{ always() }}")}`,
      comprobar: comprobarPublicacionCondicionada,
    },
    // --- Las tres que siguen son la forma GENERAL de la regla: no el paso del registro,
    //     sino CUALQUIER paso con `always()` que escriba o publique. ---
    {
      nombre: 'un paso con always() que escribe un archivo cualquiera del checkout',
      motivo: /sin exigir que ninguna compuerta/,
      mutar: (f) => `${f.replace(/\s*$/, '')}\n${pasoQueEscribe('${{ always() }}')}`,
      comprobar: comprobarAlwaysNoEscribeSinCompuerta,
    },
    {
      // El mismo defecto sobre un paso que YA existe, no sobre uno añadido: quitarle al
      // registro la exigencia de que la validacion haya pasado lo deja escribiendo con
      // `always()` sobre una ruta que nadie autorizo.
      nombre: 'el paso del registro escribiendo con always() sin ninguna compuerta',
      motivo: /sin exigir que ninguna compuerta/,
      mutar: (f) => f.replaceAll(" && steps.dirs_privados.outcome == 'success' }}", ' }}'),
      comprobar: comprobarAlwaysNoEscribeSinCompuerta,
    },
    {
      // La rama «espera a una compuerta» no puede ser «nombra un paso cualquiera»: la
      // corrida no comprueba ni destino ni exposicion, asi que colgarse de su exito no
      // autoriza nada. Sin la allowlist esta mutacion pasaba.
      nombre: 'un paso con always() que escribe colgado de un paso que NO es compuerta',
      motivo: /compuerta ANTERIOR/,
      mutar: (f) =>
        `${f.replace(/\s*$/, '')}\n${pasoQueEscribe("${{ always() && steps.corrida.outcome == 'success' }}")}`,
      comprobar: comprobarAlwaysNoEscribeSinCompuerta,
    },
    {
      // Y la compuerta tiene que correr ANTES: una que viene despues no puede detener lo
      // que ya se escribio. El paso se inserta delante de la compuerta que nombra.
      nombre: 'un paso con always() que escribe colgado de una compuerta POSTERIOR',
      motivo: /compuerta ANTERIOR/,
      mutar: (f) =>
        f.replace(
          /^ {6}- name: compuerta de exposicion$/m,
          `${pasoQueEscribe("${{ always() && steps.registro_sin_urls.outcome == 'success' }}").trimEnd()}\n      - name: compuerta de exposicion`,
        ),
      comprobar: comprobarAlwaysNoEscribeSinCompuerta,
    },
    {
      nombre: 'un paso que vuelca el resumen de la corrida en la pagina publica del job',
      motivo: /artefacto privado/,
      mutar: (f) => `${f.replace(/\s*$/, '')}\n${pasoQueResume('${{ always() }}')}`,
      comprobar: comprobarNadaSePublica,
    },
    {
      nombre: 'la compuerta de exposicion movida al final, despues de publicar',
      motivo: /compuerta de exposicion/,
      mutar: (f) => {
        const bloque = /^ {6}- name: compuerta de exposicion\n(?: {8}.*\n)+/m;
        const m = bloque.exec(f);
        assert.ok(m !== null, 'no se pudo aislar el paso de la compuerta para moverlo');
        return `${f.replace(bloque, '').replace(/\s*$/, '')}\n${m[0]}`;
      },
      comprobar: comprobarCompuertaAntesDeEscribir,
    },
  ]);
});
