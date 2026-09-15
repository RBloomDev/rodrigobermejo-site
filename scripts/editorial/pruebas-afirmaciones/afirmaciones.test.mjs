/**
 * Pruebas del motor DETERMINISTA de `verificar-afirmaciones.mjs`.
 *
 * Sin red y sin modelo, a proposito: si estas pruebas necesitaran el CLI, dejarian de ser
 * pruebas y serian un muestreo. Todo sale de `scripts/editorial/fixtures/`.
 *
 *   node --test scripts/editorial/pruebas-afirmaciones/
 *
 * Los fixtures son DATOS. El veredicto esperado de cada caso se escribe aqui, no alla:
 * una prueba que lee su propia respuesta del archivo de entrada no puede ponerse roja.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  cifraPrincipal,
  juzgarDeterminista,
  mismaPalabra,
  oraciones,
  revisarAfirmaciones,
  unidadJuntoA,
  cifrasEn,
} from '../verificar-afirmaciones.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(AQUI, '..', 'fixtures');

const { fuentes } = JSON.parse(readFileSync(join(FIXTURES, 'fuentes-prueba.json'), 'utf8'));
const { afirmaciones } = JSON.parse(readFileSync(join(FIXTURES, 'afirmaciones-prueba.json'), 'utf8'));

const FUENTE = new Map(fuentes.map((f) => [f.id, f]));
const AFIRMACION = new Map(afirmaciones.map((a) => [a.id, a]));

function juzgar(idAfirmacion) {
  const af = AFIRMACION.get(idAfirmacion);
  assert.ok(af, `falta la afirmacion ${idAfirmacion} en el fixture`);
  const fuente = FUENTE.get(af.fuente_id);
  assert.ok(fuente, `falta la fuente ${af.fuente_id} en el fixture`);
  return { veredicto: juzgarDeterminista(af, fuente), fuente, af };
}

// --- El caso que Rodrigo pidio expresamente --------------------------------------

test('CIFRA REUTILIZADA CON EL SUJETO EQUIVOCADO: la cifra esta en la fuente y aun asi no es respaldada', () => {
  const { veredicto: v, fuente } = juzgar('sujeto-equivocado');

  // Primero, la premisa del caso: la cifra SI esta en la fuente. Es justo lo que hace que
  // el control de `verificar.mjs` («toda cifra del texto existe en alguna fuente») la deje
  // pasar. Si esta linea fallara, el caso no estaria probando lo que dice probar.
  assert.equal(v.cifra.esperada, '18');
  assert.equal(v.cifra.coincide, true, 'la fuente contiene el 18; el caso pierde sentido si no');
  assert.ok(fuente.texto.includes('18'), 'la fuente debe contener literalmente la cifra');

  // Y sin embargo:
  assert.notEqual(v.veredicto, 'respaldada');
  assert.ok(['contradicha', 'sin_informacion'].includes(v.veredicto));
  assert.equal(v.dimension_que_falla, 'sujeto');
  assert.equal(v.dimensiones.sujeto.estado, 'discrepa');
  assert.match(v.dimensiones.sujeto.detalle, /estados mexicanos/);
  assert.match(v.dimensiones.sujeto.detalle, /pa[ií]s/i, 'el informe debe decir de que habla la fuente');

  // El pasaje concreto en que se apoya el juicio, citable y localizable.
  assert.ok(v.pasaje, 'un veredicto sin pasaje no se puede auditar');
  assert.match(v.pasaje.cita, /18 países adoptaron/);
  assert.equal(fuente.texto.slice(v.pasaje.offset_inicio, v.pasaje.offset_fin), v.pasaje.cita);
});

// --- Las otras cinco que pidio ---------------------------------------------------

test('UNIDAD: cifra correcta, unidad distinta (horas != dias) no es respaldada', () => {
  const { veredicto: v } = juzgar('unidad-distinta');
  assert.notEqual(v.veredicto, 'respaldada');
  assert.equal(v.dimension_que_falla, 'unidad');
  assert.equal(v.dimensiones.unidad.estado, 'discrepa');
  assert.match(v.dimensiones.unidad.detalle, /hora/);
  assert.equal(v.dimensiones.sujeto.estado, 'coincide', 'el sujeto si coincide: la falla es solo de unidad');
});

test('FECHA: cifra correcta, año distinto (2024 vs 2026) no es respaldada', () => {
  const { veredicto: v } = juzgar('fecha-distinta');
  assert.notEqual(v.veredicto, 'respaldada');
  assert.equal(v.dimension_que_falla, 'fecha');
  assert.equal(v.dimensiones.fecha.estado, 'discrepa');
  assert.match(v.dimensiones.fecha.detalle, /2024/);
  assert.equal(v.cifra.coincide, true, 'la cifra 12000 si esta en la fuente; lo que no esta es el año');
});

test('CONTEXTO: la fuente lo propone y la afirmacion lo da por ocurrido', () => {
  const { veredicto: v } = juzgar('propuesta-como-hecho');
  assert.notEqual(v.veredicto, 'respaldada');
  assert.equal(v.dimension_que_falla, 'contexto');
  assert.equal(v.dimensiones.contexto.estado, 'discrepa');
  assert.match(v.dimensiones.contexto.detalle, /propuesto/);
  assert.equal(v.dimensiones.sujeto.estado, 'coincide');
  assert.equal(v.dimensiones.unidad.estado, 'coincide');
});

test('RESPALDADA: la afirmacion honesta si pasa, y trae su pasaje', () => {
  const { veredicto: v, fuente } = juzgar('respaldada-limpia');
  assert.equal(v.veredicto, 'respaldada');
  assert.equal(v.motivo, 'apoyo_directo');
  assert.ok(v.pasaje);
  assert.equal(fuente.texto.slice(v.pasaje.offset_inicio, v.pasaje.offset_fin), v.pasaje.cita);
  assert.match(v.pasaje.cita, /18 países adoptaron el marco internacional/);
  assert.deepEqual(v.dimensiones_que_fallan, []);
  assert.equal(v.dimension_que_falla, null);
  for (const d of ['sujeto', 'unidad', 'fecha', 'contexto']) {
    assert.ok(['coincide', 'no_aplica'].includes(v.dimensiones[d].estado), `${d} quedo en ${v.dimensiones[d].estado}`);
  }
});

test('SIN_INFORMACION no es CONTRADICHA: una fuente que no habla del tema', () => {
  const { veredicto: v } = juzgar('tema-ausente');
  assert.equal(v.veredicto, 'sin_informacion');
  assert.notEqual(v.veredicto, 'contradicha');
  assert.equal(v.motivo, 'la_fuente_no_trata_el_tema');
  assert.equal(v.pasaje, null, 'no hay pasaje que citar: no se inventa uno');
  assert.equal(v.dimension_que_falla, null, 'nada «falla»: simplemente no hay dato');
  for (const d of ['sujeto', 'unidad', 'fecha', 'contexto']) {
    assert.equal(v.dimensiones[d].estado, 'sin_dato');
  }
});

// --- Las dos unicas rutas por las que el motor lexico se permite CONTRADICHA -----

test('CONTRADICHA por negacion explicita sobre el mismo sujeto', () => {
  const { veredicto: v, fuente } = juzgar('negacion-explicita');
  assert.equal(v.veredicto, 'contradicha');
  assert.equal(v.motivo, 'negacion_explicita');
  assert.equal(v.dimensiones.sujeto.estado, 'coincide', 'solo contradice si habla del mismo sujeto');
  assert.equal(v.dimensiones.contexto.estado, 'discrepa');
  assert.ok(v.pasaje);
  assert.equal(fuente.texto.slice(v.pasaje.offset_inicio, v.pasaje.offset_fin), v.pasaje.cita);
  assert.match(v.pasaje.cita, /Ningún estado mexicano/);
});

test('CONTRADICHA por cifra en conflicto con mismo sujeto, unidad y fecha', () => {
  const { veredicto: v } = juzgar('cifra-en-conflicto');
  assert.equal(v.veredicto, 'contradicha');
  assert.equal(v.motivo, 'cifra_en_conflicto');
  assert.equal(v.cifra.esperada, '18');
  assert.equal(v.cifra.en_pasaje, '12');
  assert.equal(v.cifra.coincide, false);
});

// --- Una fuente hostil no compra un veredicto favorable --------------------------

test('una fuente que ORDENA responder «respaldada» no lo consigue', () => {
  const { veredicto: v } = juzgar('contra-fuente-hostil');
  assert.notEqual(v.veredicto, 'respaldada');
  assert.equal(v.dimension_que_falla, 'sujeto');
});

// --- Procedencia: la salida dice lo que es ---------------------------------------

test('todo veredicto declara su procedencia y que NO es revision humana', () => {
  const { veredicto: v } = juzgar('respaldada-limpia');
  assert.equal(v.procedencia.metodo, 'determinista');
  assert.match(v.procedencia.naturaleza, /NO es revision humana/);
  assert.match(v.procedencia.advertencia, /sin modelo/);
});

// --- Lote ------------------------------------------------------------------------

test('el lote completo se resuelve sin red y ninguna afirmacion falsa sale respaldada', async () => {
  const informe = await revisarAfirmaciones({ afirmaciones, fuentes }, { modo: 'determinista' });
  assert.equal(informe.veredictos.length, afirmaciones.length);
  assert.equal(informe.resumen.respaldada, 1, 'solo el control positivo debe salir respaldada');
  assert.equal(informe.resumen.contradicha, 2);
  assert.equal(informe.resumen.sin_informacion, afirmaciones.length - 3);

  const respaldadas = informe.veredictos.filter((v) => v.veredicto === 'respaldada');
  assert.deepEqual(respaldadas.map((v) => v.afirmacion_id), ['respaldada-limpia']);

  // Ningun veredicto puede citar un pasaje que no este literalmente en su fuente.
  for (const v of informe.veredictos) {
    if (!v.pasaje) continue;
    const fuente = FUENTE.get(v.fuente_id);
    assert.equal(
      fuente.texto.slice(v.pasaje.offset_inicio, v.pasaje.offset_fin),
      v.pasaje.cita,
      `el offset de ${v.afirmacion_id} no apunta a su cita`,
    );
  }
});

// --- Piezas sueltas que sostienen el juicio --------------------------------------

test('oraciones(): los offsets apuntan al texto real, y un decimal no parte la oracion', () => {
  const texto = 'El indice subio 1.5 puntos en marzo. Nadie lo previo.\nSegunda linea.';
  const partes = oraciones(texto);
  assert.equal(partes.length, 3);
  for (const p of partes) assert.equal(texto.slice(p.inicio, p.fin), p.texto);
  assert.equal(partes[0].texto, 'El indice subio 1.5 puntos en marzo.');
});

test('mismaPalabra(): unifica plural y singular en los dos sentidos, y no unifica lo distinto', () => {
  // Los dos patrones de plural del español, que ninguna «raiz canonica» barata cubre a la vez.
  assert.ok(mismaPalabra('países', 'país'));
  assert.ok(mismaPalabra('estudiantes', 'estudiante'));
  assert.ok(mismaPalabra('entidades', 'entidad'));
  assert.ok(mismaPalabra('estados', 'estado'));
  assert.ok(!mismaPalabra('horas', 'días'));
  assert.ok(!mismaPalabra('países', 'estados'));
});

test('cifraPrincipal(): un año no es la cifra de la que habla la afirmacion', () => {
  assert.equal(cifraPrincipal({ texto: 'En 2026, 18 países firmaron.' }), '18');
  assert.equal(cifraPrincipal({ texto: 'En 2026 no hubo firmas.' }), '2026');
  assert.equal(cifraPrincipal({ texto: 'Sin cifras.' }), null);
});

test('unidadJuntoA(): porcentaje, moneda y magnitudes', () => {
  const leer = (t) => unidadJuntoA(t, cifrasEn(t).find((c) => c.valor !== '2026'));
  assert.equal(leer('creció 18% este año'), 'porcentaje');
  assert.equal(leer('costó $1,200 en total'), 'moneda');
  // La magnitud («millones») se salta: la unidad es lo que se cuenta, no la escala.
  assert.equal(leer('12 millones de estudiantes'), 'estudiantes');
  assert.equal(leer('40 horas de capacitación'), 'horas');
});
