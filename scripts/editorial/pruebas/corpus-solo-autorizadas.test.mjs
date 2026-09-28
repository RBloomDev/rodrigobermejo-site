/**
 * AC-AUT-02 — el corpus de `content/noticias/` lleva SOLO piezas `autorizada`, y cada una
 * su procedencia de redaccion con las cuatro etapas.
 *
 * Autoridad: `docs/plataforma/02-editorial.md` §8.4 paso 4, y §3 para el esquema.
 *
 * Las invariantes se comprueban sobre DOS corpus, y hacen falta los dos:
 *
 *   1. El corpus que **escribe el comando** en una copia aislada del canal. Prueba que lo
 *      que sale por esa puerta cumple. Si solo se mirara el corpus real —hoy vacio—, la
 *      comprobacion seria vacua y estaria en verde sin haber mirado nada.
 *   2. El corpus **real del repositorio**, que hoy esta vacio porque nadie ha autorizado
 *      nada. Eso no es un estado a medias: es el estado correcto. La comprobacion sigue
 *      valiendo el dia que deje de estarlo, y es la que detecta un JSON copiado a mano.
 *
 * Ninguna prueba de este archivo escribe en el `content/noticias/` del repositorio.
 */

import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  CORPUS_REAL,
  ETAPAS_PROCEDENCIA,
  borradorDePrueba,
  correrAutorizar,
  escribirBorrador,
  escribirRegistro,
  montarAutorizacion,
  registroDe,
  sembrarTerminada,
} from './ayuda.mjs';
import { buscarContenidoProhibido } from '../autorizar.mjs';

/**
 * Las invariantes de §8.4 sobre un corpus, sea el de una prueba o el del repositorio.
 * @returns {string[]} incumplimientos
 */
export function fallosDelCorpus(dir) {
  if (!existsSync(dir)) return [];
  const fallos = [];
  for (const archivo of readdirSync(dir)) {
    if (!archivo.endsWith('.json')) { fallos.push(`${archivo}: el corpus solo lleva JSON de §3`); continue; }
    const pieza = JSON.parse(readFileSync(join(dir, archivo), 'utf8'));
    if (pieza.estado !== 'autorizada') fallos.push(`${archivo}: estado ${JSON.stringify(pieza.estado)}`);
    if (`${pieza.id}.json` !== archivo) fallos.push(`${archivo}: el nombre no es el id de la pieza`);
    for (const etapa of ETAPAS_PROCEDENCIA) {
      const e = pieza?.procedencia?.[etapa];
      if (!e || typeof e.por !== 'string' || e.por.trim() === '') {
        fallos.push(`${archivo}: falta la etapa de procedencia \`${etapa}\``);
      }
    }
    if (pieza?.procedencia?.publicado?.por === 'pendiente') {
      fallos.push(`${archivo}: \`procedencia.publicado\` sigue en pendiente y la pieza esta publicada`);
    }
    fallos.push(...buscarContenidoProhibido(pieza).map((h) => `${archivo} ${h}`));
  }
  return fallos;
}

test('AC-AUT-02 · el corpus escrito por el comando lleva solo autorizadas, con las cuatro etapas', () => {
  const primera = borradorDePrueba({ id: 'corpus-uno' });
  const escenario = montarAutorizacion('corpus', primera);
  assert.equal(
    correrAutorizar(escenario.proyecto, [primera.id, '--registro', escribirRegistro(registroDe(primera), 'r1.json')]).status,
    0,
  );

  // Una segunda pieza, por el mismo camino y con su propia entrada en la bitacora.
  const segunda = borradorDePrueba({ id: 'corpus-dos', veredicto: 'parcial', pendientes: ['Un limite — sin consultar'] });
  sembrarTerminada(segunda);
  escribirBorrador(segunda);
  const registro2 = escribirRegistro(registroDe(segunda, {
    pendientes: ['Un limite — sin consultar'], acepta_limites: true,
  }), 'r2.json');
  assert.equal(correrAutorizar(escenario.proyecto, [segunda.id, '--registro', registro2]).status, 0);

  assert.deepEqual(readdirSync(escenario.proyecto.corpus).sort(), ['corpus-dos.json', 'corpus-uno.json']);
  assert.deepEqual(fallosDelCorpus(escenario.proyecto.corpus), []);
});

test('AC-AUT-02 · la comprobacion del corpus se pone roja a proposito', () => {
  // Una comprobacion que nunca ha fallado puede estar desconectada (`AGENTS.md`).
  const { proyecto } = montarAutorizacion('corpus-falsable');
  const sucio = join(proyecto.raiz, 'content', 'noticias');
  mkdirSync(sucio, { recursive: true });
  const pieza = borradorDePrueba({ id: 'nunca-autorizada' });
  // Un JSON puesto a mano, que es justo lo que AC-AUT-06 prohibe: tiene que detectarse.
  writeFileSync(join(sucio, `${pieza.id}.json`), JSON.stringify(pieza, null, 2), 'utf8');
  const fallos = fallosDelCorpus(sucio);
  assert.ok(fallos.some((f) => f.includes('"borrador"')), fallos.join(' | '));
  assert.ok(fallos.some((f) => f.includes('publicado')), fallos.join(' | '));
});

test('AC-AUT-02 · el corpus REAL del repositorio cumple las mismas invariantes', () => {
  // Hoy esta vacio —nadie ha autorizado nada— y eso no es un estado a medias: es el
  // estado correcto. La comprobacion sigue valiendo el dia que deje de estarlo.
  assert.deepEqual(fallosDelCorpus(CORPUS_REAL), []);
});
