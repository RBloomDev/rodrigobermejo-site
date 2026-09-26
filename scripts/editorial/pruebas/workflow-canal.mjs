/**
 * Andamiaje de las pruebas del workflow PREPARADO del canal editorial.
 *
 * Este archivo no es una prueba —no termina en `.test.mjs`, asi que el corredor no lo
 * recoge—: es lo que comparten `workflow-preparado.test.mjs` y
 * `workflow-no-commitea-estado.test.mjs`. Estan partidos en dos porque son dos criterios de
 * aceptacion distintos y cada uno se tiene que poder correr solo, igual que
 * `guard-canal-falsable.test.mjs` y `guard-estado.test.mjs`.
 *
 * SOBRE «EL YAML ES VALIDO». No hay parser de YAML en este repositorio y no se anade una
 * dependencia por una prueba (`AGENTS.md`, reglas duras). Lo que corre aqui es un
 * analizador del subconjunto que un workflow de Actions necesita, y es MAS estricto que un
 * validador generico, no menos: rechaza tabuladores en la sangria, sangria incoherente,
 * claves repetidas, lineas que no son «clave: valor» ni elemento de lista, y contenido
 * colgante al final. Un validador generico aceptaria un YAML impecable sin `jobs`; este
 * exige ademas la forma que Actions necesita. Lo que NO cubre: alias, anclas, mapas y
 * listas en flujo, y documentos multiples --- ninguno aparece en el archivo, y si alguien
 * los introduce la prueba falla en vez de pasar en silencio.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));
export const RUTA = join(RAIZ, 'docs/plataforma/programacion/canal-editorial.yml');
export const RUTA_INSTALADA = join(RAIZ, '.github/workflows/canal-editorial.yml');

export const leerFuente = () => readFileSync(RUTA, 'utf8');

// ---------------------------------------------------------------------------------------
// Analizador del subconjunto de YAML que usa un workflow de Actions.
// ---------------------------------------------------------------------------------------

const esIgnorable = (linea) => /^\s*$/.test(linea) || /^\s*#/.test(linea);
const sangria = (linea) => linea.length - linea.trimStart().length;

/** Quita el comentario de fin de linea sin tocar lo que va dentro de comillas. */
function sinComentario(linea) {
  let salida = '';
  let comilla = null;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (comilla !== null) {
      salida += c;
      if (c === comilla) comilla = null;
      continue;
    }
    if (c === '"' || c === "'") {
      comilla = c;
      salida += c;
      continue;
    }
    if (c === '#' && (i === 0 || /\s/.test(linea[i - 1]))) break;
    salida += c;
  }
  if (comilla !== null) throw new Error(`comilla sin cerrar: ${linea.trim()}`);
  return salida.replace(/\s+$/, '');
}

function escalar(bruto) {
  const t = bruto.trim();
  const entrecomillado =
    (t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"));
  return entrecomillado && t.length >= 2 ? t.slice(1, -1) : t;
}

const CLAVE = /^("[^"]*"|'[^']*'|[^:]+):(?:\s(.*))?$/;

class Analizador {
  #i = 0;
  #l;

  constructor(lineas) {
    this.#l = lineas;
  }

  raiz() {
    const valor = this.#bloque(0);
    this.#saltar();
    if (this.#i < this.#l.length) {
      throw new Error(`linea ${this.#i + 1}: contenido colgante -> ${this.#l[this.#i].trim()}`);
    }
    return valor;
  }

  #saltar() {
    while (this.#i < this.#l.length && esIgnorable(this.#l[this.#i])) this.#i++;
  }

  #bloque(minimo) {
    this.#saltar();
    if (this.#i >= this.#l.length) return '';
    const ind = sangria(this.#l[this.#i]);
    if (ind < minimo) return '';
    const texto = sinComentario(this.#l[this.#i]).trim();
    return texto === '-' || texto.startsWith('- ') ? this.#secuencia(ind) : this.#mapa(ind);
  }

  #mapa(ind) {
    const obj = {};
    for (;;) {
      this.#saltar();
      if (this.#i >= this.#l.length) break;
      const actual = sangria(this.#l[this.#i]);
      if (actual < ind) break;
      if (actual > ind) {
        throw new Error(`linea ${this.#i + 1}: sangria ${actual} donde se esperaba ${ind}`);
      }
      const texto = sinComentario(this.#l[this.#i]).trim();
      if (texto === '-' || texto.startsWith('- ')) break;
      const m = CLAVE.exec(texto);
      if (m === null) throw new Error(`linea ${this.#i + 1}: no es «clave: valor» -> ${texto}`);
      const clave = escalar(m[1]);
      if (Object.hasOwn(obj, clave)) {
        throw new Error(`linea ${this.#i + 1}: clave repetida «${clave}»`);
      }
      const resto = (m[2] ?? '').trim();
      this.#i++;
      if (/^[|>][-+]?$/.test(resto)) obj[clave] = this.#escalarEnBloque(ind);
      else if (resto === '') obj[clave] = this.#bloque(ind + 1);
      else obj[clave] = escalar(resto);
    }
    return obj;
  }

  #secuencia(ind) {
    const salida = [];
    for (;;) {
      this.#saltar();
      if (this.#i >= this.#l.length) break;
      const actual = sangria(this.#l[this.#i]);
      if (actual < ind) break;
      if (actual > ind) {
        throw new Error(`linea ${this.#i + 1}: sangria ${actual} donde se esperaba ${ind}`);
      }
      const texto = sinComentario(this.#l[this.#i]).trim();
      if (texto !== '-' && !texto.startsWith('- ')) break;
      if (texto === '-') {
        this.#i++;
        salida.push(this.#bloque(ind + 2));
        continue;
      }
      const cuerpo = texto.slice(2).trim();
      if (!CLAVE.test(cuerpo)) {
        this.#i++;
        salida.push(escalar(cuerpo));
        continue;
      }
      // El «- » se sustituye por dos espacios SOBRE LA LINEA CRUDA: asi el resto del
      // elemento queda como un mapa normal a sangria ind+2 y las columnas no se mueven.
      const cruda = this.#l[this.#i];
      this.#l[this.#i] = `${cruda.slice(0, ind)}  ${cruda.slice(ind + 2)}`;
      salida.push(this.#bloque(ind + 2));
    }
    return salida;
  }

  #escalarEnBloque(indClave) {
    const crudas = [];
    while (this.#i < this.#l.length) {
      const linea = this.#l[this.#i];
      if (/^\s*$/.test(linea)) {
        crudas.push('');
        this.#i++;
        continue;
      }
      if (sangria(linea) <= indClave) break;
      crudas.push(linea);
      this.#i++;
    }
    while (crudas.length > 0 && crudas[crudas.length - 1] === '') crudas.pop();
    const conTexto = crudas.filter((c) => c !== '');
    if (conTexto.length === 0) return '';
    const minimo = Math.min(...conTexto.map(sangria));
    return crudas.map((c) => (c === '' ? '' : c.slice(minimo))).join('\n');
  }
}

export function analizar(fuente) {
  const lineas = fuente.split(/\r?\n/);
  lineas.forEach((linea, n) => {
    if (/^ *\t/.test(linea)) throw new Error(`linea ${n + 1}: tabulador en la sangria`);
  });
  const doc = new Analizador(lineas).raiz();
  if (typeof doc !== 'object' || Array.isArray(doc)) {
    throw new Error('la raiz del workflow tiene que ser un mapa');
  }
  return doc;
}

// ---------------------------------------------------------------------------------------
// Accesores: un YAML mal formado no debe caer en un `undefined` silencioso.
// ---------------------------------------------------------------------------------------

export function comoMapa(v, donde) {
  assert.ok(
    v !== undefined && typeof v === 'object' && !Array.isArray(v),
    `${donde}: falta o no es un mapa`,
  );
  return v;
}

export function comoLista(v, donde) {
  assert.ok(Array.isArray(v), `${donde}: falta o no es una lista`);
  return v;
}

export function comoTexto(v, donde) {
  assert.equal(typeof v, 'string', `${donde}: falta o no es un escalar`);
  return v;
}

/** Todos los pasos de todos los jobs, con el job al que pertenecen. */
export function pasosDe(doc) {
  const jobs = comoMapa(doc.jobs, 'jobs');
  const salida = [];
  for (const [nombre, crudo] of Object.entries(jobs)) {
    const job = comoMapa(crudo, `jobs.${nombre}`);
    for (const paso of comoLista(job.steps, `jobs.${nombre}.steps`)) {
      salida.push({ job: nombre, paso: comoMapa(paso, `jobs.${nombre}.steps[]`) });
    }
  }
  return salida;
}

// ---------------------------------------------------------------------------------------
// Falsabilidad: aplicar una mutacion al archivo real y exigir que la comprobacion que le
// toca se ponga ROJA, y por la razon esperada.
//
// `motivo` no es adorno: sin el, una mutacion que rompiera el analizador por otra razon
// —una sangria mal puesta, por ejemplo— daria la prueba de falsabilidad por buena sin haber
// ejercitado la comprobacion que dice ejercitar.
// ---------------------------------------------------------------------------------------

export function exigirQueCadaMutacionFalle(fuente, mutaciones) {
  for (const { nombre, motivo, mutar, comprobar } of mutaciones) {
    const mutante = mutar(fuente);
    assert.notEqual(mutante, fuente, `la mutacion «${nombre}» no cambio el archivo: no prueba nada`);
    let error;
    try {
      comprobar(mutante);
    } catch (e) {
      error = e;
    }
    assert.ok(
      error instanceof Error,
      `la mutacion «${nombre}» paso la comprobacion: esa comprobacion esta desconectada`,
    );
    assert.match(
      error.message,
      motivo,
      `la mutacion «${nombre}» fallo, pero por otra razon que la esperada (${motivo}): ${error.message}`,
    );
  }
}
