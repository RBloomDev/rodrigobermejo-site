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
 *              publico, y el registro sale como artefacto escrito fuera del checkout.
 *
 * AC-PRG-03 —ningun paso commitea— vive aparte, en `workflow-no-commitea-estado.test.mjs`:
 * un archivo por criterio de aceptacion, para que cada uno se pueda correr solo.
 *
 * LA PRUEBA PUEDE FALLAR, y se demuestra: el ultimo test aplica ocho mutaciones al archivo
 * real —descomentar el cron, poner `cancel-in-progress: true`, quitar el tope de llamadas,
 * mover la compuerta al final— y exige que cada una ponga roja la comprobacion que le toca.
 * Una prueba verde que no puede fallar no prueba nada (`AGENTS.md`, principio de
 * verificacion, punto 4).
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
// AC-PRG-04 — la compuerta de exposicion corre ANTES de cualquier escritura o publicacion,
// y el registro sale como artefacto, nunca al arbol de trabajo.
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
    guiones.some((g) => g.includes('ejecutar.mjs --limite')),
    'no se encontro la invocacion del canal: el analisis no llego al cuerpo de los pasos',
  );

  const indiceDe = (predicado) => pasos.findIndex(({ paso }, n) => predicado(guiones[n], paso));

  const compuerta = indiceDe((g) => g.includes('auditoria-exposicion.mjs'));
  assert.ok(compuerta >= 0, 'no hay compuerta de exposicion en el workflow');

  const corrida = indiceDe((g) => g.includes('ejecutar.mjs'));
  assert.ok(
    compuerta > corrida,
    'la compuerta tiene que correr DESPUES de la corrida: audita lo que la corrida escribio',
  );

  // Todo lo que produce o publica algo va despues de la compuerta.
  const posteriores = [
    ['el registro de la corrida', indiceDe((g) => g.includes('registro-de-corridas.mjs >'))],
    [
      'la publicacion del artefacto',
      indiceDe((_g, paso) => String(paso.uses ?? '').startsWith('actions/upload-artifact')),
    ],
    ['la comprobacion del arbol intacto', indiceDe((g) => g.includes('git status --porcelain'))],
  ];
  for (const [nombre, indice] of posteriores) {
    assert.ok(indice >= 0, `falta el paso: ${nombre}`);
    assert.ok(
      indice > compuerta,
      `${nombre} corre ANTES que la compuerta de exposicion: la compuerta tiene que preceder a toda escritura y a toda publicacion`,
    );
  }

  // El registro se escribe FUERA del checkout, y el artefacto lo lee de ahi.
  const escritura = guiones.find((g) => g.includes('registro-de-corridas.mjs >')) ?? '';
  assert.match(
    escritura,
    />\s*"?\$(RUNNER_TEMP|\{RUNNER_TEMP\})/,
    'el registro tiene que escribirse en $RUNNER_TEMP, fuera del arbol de trabajo publico',
  );
  const subida = pasos.find(({ paso }) =>
    String(paso.uses ?? '').startsWith('actions/upload-artifact'),
  );
  const ruta = comoTexto(
    comoMapa(subida?.paso.with, 'upload-artifact.with').path,
    'upload-artifact.with.path',
  );
  assert.match(ruta, /runner\.temp/, 'el artefacto tiene que salir de $RUNNER_TEMP, no del arbol de trabajo');
}

// ---------------------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------------------

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

test('AC-PRG-04: la compuerta de exposicion precede a toda escritura, y el registro sale como artefacto', () => {
  comprobarCompuertaAntesDeEscribir(fuente);
});

test('las comprobaciones pueden fallar: ocho mutaciones y cada una pone roja la suya', () => {
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
      motivo: /RUNNER_TEMP/,
      mutar: (f) => f.replace('> "$RUNNER_TEMP/registro-corrida.txt"', '> registro-corrida.txt'),
      comprobar: comprobarCompuertaAntesDeEscribir,
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
