/**
 * Invariantes de la maquina de estados. No son las cinco propiedades de `canal.test.mjs`
 * (esas son de punta a punta); son las reglas que el modulo tiene que sostener solo.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { item, nuevoEntorno } from './ayuda.mjs';
import {
  ESTADOS,
  MAX_INTENTOS,
  TRANSICIONES,
  estadoDe,
  fallosRegistrados,
  instantanea,
  marcarDescartada,
  marcarExpedienteListo,
  marcarFallida,
  marcarRedactada,
  marcarVerificada,
  pendientesDeRedaccion,
  pendientesDeVerificacion,
  reabrir,
  registrarDeteccion,
  registrarFallo,
  rutaBitacora,
} from '../estado.mjs';

const unItem = (n = 1) => item({
  titulo: `Hecho ${n}`,
  url: `https://medio-uno.mx/hecho-${n}`,
});

test('la tabla de transiciones solo apunta a estados que existen', () => {
  for (const [desde, eventos] of Object.entries(TRANSICIONES)) {
    assert.ok(
      desde === '__inexistente__' || ESTADOS.includes(desde),
      `estado de origen desconocido: ${desde}`,
    );
    for (const hacia of Object.values(eventos)) {
      assert.ok(ESTADOS.includes(hacia), `${desde} apunta a un estado inexistente: ${hacia}`);
    }
  }
  assert.deepEqual(TRANSICIONES.terminada, {}, '`terminada` es terminal');
  assert.deepEqual(Object.keys(TRANSICIONES.descartada), ['reabierta'],
    'de `descartada` solo se sale reabriendo, y es explicito');
});

test('el camino feliz recorre los cuatro estados en orden', () => {
  nuevoEntorno('feliz');
  const { id, nuevo } = registrarDeteccion(unItem());
  assert.equal(nuevo, true);
  assert.equal(estadoDe(id).estado, 'detectada');
  assert.equal(marcarExpedienteListo(id).estado, 'pendiente_redaccion');
  assert.equal(marcarRedactada(id, { redaccion_id: 'r1', modelo: 'modelo-de-prueba' }).estado, 'pendiente_verificacion');
  assert.equal(marcarVerificada(id, { pieza_id: 'p1' }).estado, 'terminada');
  assert.deepEqual(instantanea(), {
    detectada: 0, pendiente_redaccion: 0, pendiente_verificacion: 0,
    fallida_reintentable: 0, descartada: 0, terminada: 1,
  });
});

test('una transicion ilegal lanza y NO se escribe en la bitacora', () => {
  nuevoEntorno('ilegal');
  const { id } = registrarDeteccion(unItem());
  const antes = readFileSync(rutaBitacora(), 'utf8');

  // Verificar algo que nadie redacto.
  assert.throws(() => marcarVerificada(id, { pieza_id: 'p1' }), /transicion ilegal: detectada --verificada/);
  assert.equal(readFileSync(rutaBitacora(), 'utf8'), antes, 'el log no guarda transiciones ilegales');

  marcarExpedienteListo(id);
  marcarRedactada(id, { redaccion_id: 'r1' });
  marcarVerificada(id, { pieza_id: 'p1' });
  assert.throws(() => marcarExpedienteListo(id), /transicion ilegal: terminada/);
});

test('los reintentos se cuentan y al agotarse la entrada cae a descartada, con motivo', () => {
  nuevoEntorno('reintentos');
  const { id } = registrarDeteccion(unItem());
  marcarExpedienteListo(id);

  for (let n = 1; n < MAX_INTENTOS; n++) {
    const e = marcarFallida(id, 'redactar', { codigo: 'ESQUEMA', mensaje: `intento ${n}` });
    assert.equal(e.estado, 'fallida_reintentable');
    assert.equal(e.intentos, n);
    assert.equal(pendientesDeRedaccion().length, 1, 'mientras queden intentos, sigue en la cola');
  }

  const agotada = marcarFallida(id, 'redactar', { codigo: 'ESQUEMA', mensaje: 'ultimo' });
  assert.equal(agotada.estado, 'descartada');
  assert.equal(agotada.intentos, MAX_INTENTOS);
  assert.match(agotada.motivo_descarte, /reintentos_agotados/);
  assert.equal(pendientesDeRedaccion().length, 0);

  // Y se puede reabrir, que es la unica salida y es explicita.
  assert.equal(reabrir(id, { motivo: 'el feed volvio' }).estado, 'detectada');
  assert.equal(estadoDe(id).intentos, 0);
});

test('un fallo de verificacion sale de la cola de redaccion y entra en la de verificacion', () => {
  nuevoEntorno('colas');
  const { id } = registrarDeteccion(unItem());
  marcarExpedienteListo(id);
  marcarRedactada(id, { redaccion_id: 'r1' });
  marcarFallida(id, 'verificar', { codigo: 'VERIFICACION', mensaje: 'la fuente no resuelve' });

  assert.equal(pendientesDeRedaccion().length, 0, 'ya tiene borrador: no vuelve a la cola de redaccion');
  assert.equal(pendientesDeVerificacion().length, 1, 'lo que fallo verificando se reintenta verificando');
});

test('un fallo sin etapa, codigo o consecuencia se rechaza al escribirlo', () => {
  nuevoEntorno('fallos');
  assert.throws(() => registrarFallo({ codigo: 404, mensaje: 'x', consecuencia: 'y' }), /sin etapa/);
  assert.throws(() => registrarFallo({ etapa: 'detectar', mensaje: 'x', consecuencia: 'y' }), /sin codigo/);
  assert.throws(() => registrarFallo({ etapa: 'detectar', codigo: 404, mensaje: 'x' }), /sin consecuencia/);
  assert.throws(() => registrarFallo({ etapa: 'inventada', codigo: 1, mensaje: 'x', consecuencia: 'y' }), /etapa desconocida/);

  registrarFallo({
    etapa: 'verificar', entrada_id: 'hecho:abc', codigo: 'TIMEOUT',
    mensaje: 'AbortError', consecuencia: 'la pieza no entra al corpus',
  });
  const f = fallosRegistrados().at(-1);
  assert.equal(f.etapa, 'verificar');
  assert.equal(f.entrada_id, 'hecho:abc');
  assert.ok(f.registrado_en);
});

test('la bitacora no guarda cuerpos, prompts ni transcripciones, aunque se los pasen', () => {
  nuevoEntorno('sin-cuerpos');
  registrarDeteccion({
    ...unItem(),
    // Todo esto viene de una fuente que reserva derechos y NO puede tocar el disco.
    cuerpo: 'TEXTO COMPLETO DEL ARTICULO CON DERECHOS RESERVADOS',
    'content:encoded': '<p>otro cuerpo</p>',
    resumen: 'resumen que no se pidio',
    prompt: 'eres un redactor...',
    transcripcion: 'turno 1: ...',
  });

  const crudo = readFileSync(rutaBitacora(), 'utf8');
  for (const prohibido of ['TEXTO COMPLETO', 'content:encoded', 'resumen', 'prompt', 'transcripcion']) {
    assert.ok(!crudo.includes(prohibido), `la bitacora contiene «${prohibido}»`);
  }
  assert.ok(crudo.includes('Hecho 1'), 'el titulo si, que §5.1 lo autoriza');
});

test('descartar exige motivo', () => {
  nuevoEntorno('motivo');
  const { id } = registrarDeteccion(unItem());
  assert.throws(() => marcarDescartada(id, ''), /se exige un motivo/);
  assert.equal(marcarDescartada(id, 'fuera de alcance editorial').motivo_descarte, 'fuera de alcance editorial');
});
