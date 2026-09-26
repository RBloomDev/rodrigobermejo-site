/**
 * AC-PRG-03: el workflow preparado del canal NO contiene ningun paso que commitee estado ni
 * borradores a este repositorio, y su bloque de permisos NO pide `contents: write`.
 *
 * Viene del hallazgo F-01. `00-donde-correria.md` describia el mecanismo —commitear el
 * estado y el corpus de vuelta a la rama— y el YAML lo contenia en el paso «persistir estado
 * y corpus». El documento se corrigio en su tarea; el archivo se corrige aqui, y esta prueba
 * es lo que impide que el paso vuelva. Este repositorio es PUBLICO: versionar la bitacora y
 * las redacciones publica trabajo que nadie autorizo, que es lo que `02-editorial.md` §8.3
 * prohibe.
 *
 * Se comprueban las dos cerraduras, no una: que ningun paso escriba, Y que el workflow no
 * pida el permiso que haria posible escribir. Una sola seria una promesa —el primer paso que
 * alguien anada la desmiente—; las dos son mecanicas.
 *
 * Vive aparte de `workflow-preparado.test.mjs` a proposito: un archivo por criterio de
 * aceptacion, para que cada uno se pueda correr solo.
 *
 * LA PRUEBA PUEDE FALLAR, y se demuestra: el ultimo test devuelve `contents: write` al
 * archivo y repone el paso que commitea, y exige que las dos mutaciones se pongan rojas.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  analizar,
  comoMapa,
  comoTexto,
  exigirQueCadaMutacionFalle,
  leerFuente,
  pasosDe,
} from './workflow-canal.mjs';

/** Lo que escribe en el repositorio desde un `run`. Ampliar esta lista es barato. */
const ESCRITURA_EN_SHELL = [
  /\bgit\s+add\b/,
  /\bgit\s+commit\b/,
  /\bgit\s+push\b/,
  /\bgit\s+tag\b/,
  /\bgit\s+am\b/,
  /\bgh\s+pr\s+(create|merge)\b/,
  /\bgh\s+release\s+create\b/,
];

/** Acciones de terceros cuyo unico proposito es commitear o abrir un PR. */
const ACCIONES_QUE_COMMITEAN = [
  'stefanzweifel/git-auto-commit-action',
  'peter-evans/create-pull-request',
  'EndBug/add-and-commit',
  'ad-m/github-push-action',
  'github-actions-x/commit',
];

export function comprobarNoCommitea(fuente) {
  const doc = analizar(fuente);

  // 1. Ningun `run` escribe en el repositorio.
  for (const { job, paso } of pasosDe(doc)) {
    const etiqueta =
      typeof paso.name === 'string' ? paso.name : typeof paso.uses === 'string' ? paso.uses : '(sin nombre)';
    const guion = typeof paso.run === 'string' ? paso.run : '';
    for (const patron of ESCRITURA_EN_SHELL) {
      // `git status` y `git diff` son lecturas y estan permitidas a proposito: son como se
      // comprueba que la corrida NO escribio.
      assert.ok(
        !patron.test(guion),
        `jobs.${job}, paso «${etiqueta}»: commitea o empuja a este repositorio (${patron}). ` +
          'El estado y los borradores viven fuera de git (02-editorial.md §8.3)',
      );
    }
    const usa = typeof paso.uses === 'string' ? paso.uses : '';
    for (const accion of ACCIONES_QUE_COMMITEAN) {
      assert.ok(
        !usa.startsWith(accion),
        `jobs.${job}, paso «${etiqueta}»: usa ${accion}, que commitea a este repositorio`,
      );
    }
  }

  // 2. El bloque de permisos no pide escritura. Ni a nivel workflow ni a nivel job.
  const revisarPermisos = (crudo, donde) => {
    if (crudo === undefined) return;
    const permisos = comoMapa(crudo, donde);
    for (const [alcance, valor] of Object.entries(permisos)) {
      assert.notEqual(
        comoTexto(valor, `${donde}.${alcance}`),
        'write',
        `${donde}.${alcance}: este workflow no escribe nada en el repositorio, asi que no pide permiso de escritura`,
      );
    }
  };
  revisarPermisos(doc.permissions, 'permissions');
  assert.ok(Object.hasOwn(doc, 'permissions'), 'sin bloque `permissions` se heredan los del repositorio');
  const raizPermisos = comoMapa(doc.permissions, 'permissions');
  assert.equal(
    comoTexto(raizPermisos.contents, 'permissions.contents'),
    'read',
    '`permissions.contents` tiene que ser `read`: es lo que sostenia el paso de commitear',
  );

  const jobs = comoMapa(doc.jobs, 'jobs');
  for (const [nombre, crudo] of Object.entries(jobs)) {
    revisarPermisos(comoMapa(crudo, `jobs.${nombre}`).permissions, `jobs.${nombre}.permissions`);
  }
}

// ---------------------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------------------

const fuente = leerFuente();

test('AC-PRG-03: ningun paso commitea estado ni borradores, y no se pide contents: write', () => {
  comprobarNoCommitea(fuente);
});

test('la comprobacion puede fallar: dos mutaciones reabren el camino al arbol publico', () => {
  exigirQueCadaMutacionFalle(fuente, [
    {
      // Anclada a principio de linea y sin `#`: una sustitucion por subcadena cambiaria el
      // COMENTARIO que explica la regla en vez de la regla, y la mutacion pasaria sin haber
      // roto nada.
      nombre: 'contents: write de vuelta',
      motivo: /permissions\.contents/,
      mutar: (f) => f.replace(/^(\s*)contents: read$/m, '$1contents: write'),
      comprobar: comprobarNoCommitea,
    },
    {
      nombre: 'repuesto el paso que commitea estado y corpus',
      motivo: /commitea o empuja/,
      mutar: (f) =>
        `${f.replace(/\s*$/, '')}\n` +
        '      - name: persistir estado y corpus\n' +
        '        run: |\n' +
        '          git add scripts/editorial/estado/\n' +
        '          git commit -m "corrida"\n' +
        '          git push origin HEAD\n',
      comprobar: comprobarNoCommitea,
    },
  ]);
});
