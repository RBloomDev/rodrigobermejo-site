/**
 * Las TRES fechas de una pieza, que no son la misma:
 *
 *   fecha_acontecimiento  cuando paso el hecho
 *   fecha_fuente          cuando la fuente lo publico
 *   fecha_deteccion       cuando nuestro canal lo vio
 *
 * «Una pieza antigua recien detectada no es una noticia reciente». Estas pruebas existen
 * para que esa frase sea codigo y no una buena intencion.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { clasificarNovedad } from '../verificar-afirmaciones.mjs';

test('NOVEDAD: el hecho es de anteayer y lo detectamos hoy', () => {
  const r = clasificarNovedad({
    fecha_acontecimiento: '2026-09-10',
    fecha_fuente: '2026-09-11',
    fecha_deteccion: '2026-09-12',
  });
  assert.equal(r.ok, true);
  assert.equal(r.es_novedad, true);
  assert.equal(r.clasificacion, 'novedad');
  assert.deepEqual(r.desfase_dias, {
    acontecimiento_a_fuente: 1,
    fuente_a_deteccion: 1,
    acontecimiento_a_deteccion: 2,
  });
  assert.deepEqual(r.incoherencias, []);
});

test('PIEZA ANTIGUA RECIEN DETECTADA: no es novedad por mucho que hoy sea la primera vez que la vemos', () => {
  const r = clasificarNovedad({
    fecha_acontecimiento: '2024-01-10',
    fecha_fuente: '2024-01-12',
    fecha_deteccion: '2026-09-14',
  });
  assert.equal(r.es_novedad, false, 'detectarla hoy no la vuelve reciente');
  assert.equal(r.clasificacion, 'pieza_antigua_recien_detectada');
  assert.equal(r.desfase_dias.acontecimiento_a_deteccion, 978);
  assert.equal(r.desfase_dias.fuente_a_deteccion, 976);
  assert.match(r.motivo, /pieza antigua recien detectada/);
});

test('COBERTURA TARDIA: la fuente es de ayer, pero el hecho tiene meses', () => {
  const r = clasificarNovedad({
    fecha_acontecimiento: '2026-01-05',
    fecha_fuente: '2026-09-12',
    fecha_deteccion: '2026-09-13',
  });
  assert.equal(r.es_novedad, false);
  assert.equal(r.clasificacion, 'cobertura_tardia_del_acontecimiento');
  assert.equal(r.desfase_dias.fuente_a_deteccion, 1);
  assert.equal(r.desfase_dias.acontecimiento_a_deteccion, 251);
});

test('la fecha de deteccion por si sola NO decide: dos piezas detectadas el mismo dia', () => {
  const hoy = '2026-09-14';
  const reciente = clasificarNovedad({
    fecha_acontecimiento: '2026-09-13',
    fecha_fuente: '2026-09-13',
    fecha_deteccion: hoy,
  });
  const vieja = clasificarNovedad({
    fecha_acontecimiento: '2023-05-02',
    fecha_fuente: '2023-05-03',
    fecha_deteccion: hoy,
  });
  assert.equal(reciente.es_novedad, true);
  assert.equal(vieja.es_novedad, false);
  assert.notEqual(reciente.clasificacion, vieja.clasificacion);
});

test('ANUNCIO ANTICIPADO: el acontecimiento todavia no ocurre', () => {
  const r = clasificarNovedad({
    fecha_acontecimiento: '2026-10-01',
    fecha_fuente: '2026-09-10',
    fecha_deteccion: '2026-09-11',
  });
  assert.equal(r.clasificacion, 'anuncio_anticipado');
  assert.equal(r.desfase_dias.acontecimiento_a_deteccion, -20);
  assert.match(r.motivo, /anuncio, no un hecho consumado/);
});

test('FECHAS INCOHERENTES: no se puede detectar algo antes de que se publique', () => {
  const r = clasificarNovedad({
    fecha_acontecimiento: '2026-09-01',
    fecha_fuente: '2026-09-10',
    fecha_deteccion: '2026-09-05',
  });
  assert.equal(r.es_novedad, false);
  assert.equal(r.clasificacion, 'fechas_incoherentes');
  assert.equal(r.incoherencias.length, 1);
});

test('FECHAS ILEGIBLES: sin las tres fechas no se afirma novedad', () => {
  const r = clasificarNovedad({
    fecha_acontecimiento: '2026-09-10',
    fecha_fuente: 'ayer',
    fecha_deteccion: null,
  });
  assert.equal(r.ok, false);
  assert.equal(r.es_novedad, false, 'el caso ambiguo nunca se resuelve a favor');
  assert.equal(r.clasificacion, 'fechas_ilegibles');
  assert.match(r.incoherencias[0], /fecha_fuente/);
  assert.match(r.incoherencias[0], /fecha_deteccion/);
});

test('la ventana de novedad es un parametro, y se reporta con el resultado', () => {
  const fechas = {
    fecha_acontecimiento: '2026-08-20',
    fecha_fuente: '2026-08-21',
    fecha_deteccion: '2026-09-01',
  };
  const estricta = clasificarNovedad(fechas);
  const amplia = clasificarNovedad(fechas, { ventana_dias: 30 });
  assert.equal(estricta.ventana_dias, 7);
  assert.equal(estricta.es_novedad, false);
  assert.equal(amplia.ventana_dias, 30);
  assert.equal(amplia.es_novedad, true);
});
