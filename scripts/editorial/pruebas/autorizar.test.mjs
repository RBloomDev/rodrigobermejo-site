/**
 * `autorizar`: la tercera etapa del canal, y la unica puerta al arbol publico.
 *
 * Autoridad: `docs/plataforma/02-editorial.md` §8.1, §8.2, §8.4 y §8.8.
 *
 * DOS REGLAS DE ESTE ARCHIVO, y las dos son de fondo:
 *
 *   1. **Ninguna prueba escribe en el `content/noticias/` del repositorio.** El comando se
 *      ejecuta de verdad —el archivo real, por su CLI, sin bandera de prueba— sobre una
 *      COPIA del canal en `tmpdir`, donde el corpus resuelve dentro de la copia. Una
 *      prueba que escribiera en el corpus real seria la segunda puerta que §8.1 prohibe.
 *   2. **Ninguna pieza real se usa como fixture.** Los borradores de aqui son sinteticos.
 *      Simular la autorizacion de una pieza que nadie autorizo es exactamente el acto que
 *      este comando existe para que no ocurra.
 *
 * Dos criterios tienen su propio archivo, porque se ejecutan tambien por separado:
 * AC-AUT-02 en `corpus-solo-autorizadas.test.mjs` y AC-AUT-03 en `corpus-sin-prompts.test.mjs`.
 * El andamiaje que los tres comparten vive en `ayuda.mjs`.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  DIR_EDITORIAL,
  ETAPAS_PROCEDENCIA,
  borradorDePrueba,
  correrAutorizar,
  escribirBorrador,
  escribirRegistro,
  eventosDeAutorizacion,
  exigirNegativa,
  item,
  montarAutorizacion,
  nuevoEntorno,
  nuevoProyecto,
  registroDe,
} from './ayuda.mjs';
import {
  estadoDe,
  marcarExpedienteListo,
  marcarRedactada,
  registrarDeteccion,
} from '../estado.mjs';
import { VEREDICTOS, canonico, versionDe } from '../autorizar.mjs';

// =====================================================================================
//  AC-AUT-01 — una pieza con limites no se autoriza sin marca explicita
// =====================================================================================

test('AC-AUT-01 · veredicto `parcial` SIN la marca explicita: se niega y no escribe', () => {
  const pieza = borradorDePrueba({
    id: 'parcial-sin-marca',
    veredicto: 'parcial',
    pendientes: ['La cifra de 3 instituciones — la fuente no se pudo consultar'],
  });
  const escenario = montarAutorizacion('parcial-sin-marca', pieza);
  const registro = escribirRegistro(registroDe(pieza, {
    pendientes: ['La cifra de 3 instituciones — la fuente no se pudo consultar'],
    acepta_limites: false,
  }));

  const r = correrAutorizar(escenario.proyecto, [pieza.id, '--registro', registro]);
  exigirNegativa(r, escenario, 'ACEPTA_LIMITES_INCOHERENTE');
});

test('AC-AUT-01 · afirmaciones pendientes SIN enumerar: se niega aunque venga la marca', () => {
  const pendiente = 'La fecha del acuerdo — la fuente no resolvio';
  const pieza = borradorDePrueba({
    id: 'pendiente-sin-enumerar',
    veredicto: 'parcial',
    pendientes: [pendiente],
  });
  const escenario = montarAutorizacion('pendiente-sin-enumerar', pieza);
  // `acepta_limites: true` con la lista vacia es la firma en blanco: acepta «limites» sin
  // decir cuales. Ademas rompe la equivalencia, porque sin pendientes enumerados el
  // registro no describe esta version.
  const registro = escribirRegistro(registroDe(pieza, { pendientes: [], acepta_limites: true }));

  const r = correrAutorizar(escenario.proyecto, [pieza.id, '--registro', registro]);
  exigirNegativa(r, escenario, 'PENDIENTES_DISTINTOS');
});

test('AC-AUT-01 · CON la marca y los pendientes enumerados: autoriza', () => {
  const pendientes = [
    'La cifra de 3 instituciones — la fuente no se pudo consultar',
    'La fecha del acuerdo — no aparece en la pagina',
  ];
  const pieza = borradorDePrueba({ id: 'parcial-con-marca', veredicto: 'parcial', pendientes });
  const escenario = montarAutorizacion('parcial-con-marca', pieza);
  // El orden NO importa: es igualdad de conjuntos, no de arreglos.
  const registro = escribirRegistro(registroDe(pieza, {
    pendientes: [...pendientes].reverse(),
    acepta_limites: true,
  }));

  const r = correrAutorizar(escenario.proyecto, [pieza.id, '--registro', registro]);
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);

  const publicada = JSON.parse(readFileSync(join(escenario.proyecto.corpus, `${pieza.id}.json`), 'utf8'));
  assert.equal(publicada.estado, 'autorizada');
  // Aceptar pendientes NO los borra ni convierte el sello en verificacion completa.
  assert.equal(publicada.procedencia.verificado.veredicto, 'parcial');
  assert.deepEqual(publicada.procedencia.verificado.pendientes, pendientes);
  assert.equal(publicada.procedencia.verificado.por, 'pendiente', 'la atribucion real se conserva');

  const [evento] = eventosDeAutorizacion();
  assert.equal(evento.acepta_limites, true);
  assert.deepEqual([...evento.pendientes_aceptados].sort(), [...pendientes].sort());
  assert.equal(estadoDe(escenario.entradaId).estado, 'autorizada');
});

test('AC-AUT-01 · el otro lado de la equivalencia: `acepta_limites` true sin limites se niega', () => {
  // La direccion que se olvida. «Debe ser true si hay limites» deja legal un true sobre
  // una pieza sin limites, y un campo que siempre se puede poner en true se acaba
  // poniendo en true siempre: entonces ya no distingue nada (§8.8).
  const pieza = borradorDePrueba({ id: 'sin-limites-con-marca', veredicto: 'verificada', pendientes: [] });
  const escenario = montarAutorizacion('sin-limites-con-marca', pieza);
  const registro = escribirRegistro(registroDe(pieza, { pendientes: [], acepta_limites: true }));

  const r = correrAutorizar(escenario.proyecto, [pieza.id, '--registro', registro]);
  exigirNegativa(r, escenario, 'ACEPTA_LIMITES_INCOHERENTE');
});

test('AC-AUT-01 · sin limites y sin marca: autoriza', () => {
  const pieza = borradorDePrueba({ id: 'sin-limites-sin-marca', veredicto: 'verificada', pendientes: [] });
  const escenario = montarAutorizacion('sin-limites-sin-marca', pieza);
  const registro = escribirRegistro(registroDe(pieza));

  const r = correrAutorizar(escenario.proyecto, [pieza.id, '--registro', registro]);
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.equal(existsSync(join(escenario.proyecto.corpus, `${pieza.id}.json`)), true);
});

// El veredicto es el insumo que decide si la marca humana es obligatoria. Estas dos
// pruebas se ponen rojas quitando la enumeracion de `autorizar.mjs`: sin ella los dos
// borradores se autorizan, y publican una pieza cuyo sello dice `parcial` sin que ningun
// humano haya aceptado esos limites.
for (const [nombre, veredicto] of [['una mayuscula', 'Parcial'], ['un espacio final', 'parcial ']]) {
  test(`AC-AUT-01 · veredicto con ${nombre} NO cae en la rama «sin limites»: se niega`, () => {
    const id = `veredicto-con-${nombre.split(' ').pop()}`;
    const pieza = borradorDePrueba({ id, veredicto, pendientes: [] });
    const escenario = montarAutorizacion(id, pieza);
    // `acepta_limites: false` es lo que un registro honesto diria de una pieza que el
    // comando ve como «sin limites». Antes de enumerar, esto autorizaba.
    const registro = escribirRegistro(registroDe(pieza));

    const r = correrAutorizar(escenario.proyecto, [pieza.id, '--registro', registro]);
    exigirNegativa(r, escenario, 'VEREDICTO_DESCONOCIDO');
  });
}

test('la enumeracion de veredictos no puede divergir de la de `verificar`', async () => {
  // La copia de `verificar.mjs:104` esta en `autorizar.mjs` a proposito —importar el motor
  // de verificacion en la unica puerta del arbol publico por tres cadenas no sale a
  // cuenta—, pero una copia que se desincroniza es peor que el import. Aqui se comparan.
  //
  // `await import` y no un import estatico: `verificar.mjs` arrastra un modulo con rama de
  // CLI en el cuerpo, y cargarlo al tope de este archivo lo ejecutaria antes de cualquier
  // prueba. Es exactamente la razon por la que `autorizar.mjs` tampoco lo importa.
  const { VEREDICTOS_PIEZA } = await import('../verificar.mjs');
  assert.deepEqual([...VEREDICTOS].sort(), [...VEREDICTOS_PIEZA].sort());
});

test('el orden de las banderas no decide que se autoriza', () => {
  // `--registro r.json mi-pieza`: el valor de la bandera NO es candidato a id. Antes, un
  // `find` ingenuo devolvia `r.json`, fallaba cerrado por ID_INVALIDO, y la negativa
  // culpaba al id —asi que quien la leia buscaba el bug donde no estaba.
  const pieza = borradorDePrueba({ id: 'orden-de-banderas' });
  const escenario = montarAutorizacion('orden-de-banderas', pieza);
  const registro = escribirRegistro(registroDe(pieza));

  const r = correrAutorizar(escenario.proyecto, ['--registro', registro, pieza.id]);
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.equal(existsSync(join(escenario.proyecto.corpus, `${pieza.id}.json`)), true);
});

test('AC-AUT-01 · sin `--registro` no hay camino: se niega, no hay bandera que lo sustituya', () => {
  const pieza = borradorDePrueba({ id: 'sin-registro' });
  const escenario = montarAutorizacion('sin-registro', pieza);
  const r = correrAutorizar(escenario.proyecto, [pieza.id]);
  exigirNegativa(r, escenario, 'SIN_REGISTRO');
});

test('AC-AUT-01 · `autorizado_por` de agente: se niega', () => {
  const pieza = borradorDePrueba({ id: 'firmado-por-agente' });
  const escenario = montarAutorizacion('firmado-por-agente', pieza);
  const registro = escribirRegistro(registroDe(pieza, { cambios: { autorizado_por: 'agente' } }));
  const r = correrAutorizar(escenario.proyecto, [pieza.id, '--registro', registro]);
  exigirNegativa(r, escenario, 'REGISTRO_INCOMPLETO');
});

// =====================================================================================
//  LA VERSION EXACTA Y EL CONJUNTO DE PENDIENTES (§8.8)
// =====================================================================================

test('la version es el contenido canonico: la indentacion no la cambia, una coma si', () => {
  const pieza = borradorDePrueba({ id: 'version-canonica' });
  const compacta = JSON.parse(JSON.stringify(pieza));
  assert.equal(versionDe(compacta), versionDe(pieza));

  const reordenada = Object.fromEntries(Object.entries(pieza).reverse());
  assert.equal(versionDe(reordenada), versionDe(pieza), 'el orden de claves no es contenido');

  const conComa = { ...pieza, hecho: `${pieza.hecho},` };
  assert.notEqual(versionDe(conComa), versionDe(pieza), 'una coma dentro de un texto SI cambia la version');
  assert.match(canonico(pieza), /^\{"correcciones"/, 'las claves van ordenadas');
});

test('el borrador cambio despues de firmarse: la aceptacion no aplica y se niega', () => {
  const pieza = borradorDePrueba({ id: 'version-distinta' });
  const escenario = montarAutorizacion('version-distinta', pieza);
  const registro = escribirRegistro(registroDe(pieza));
  // Una coma despues de la aceptacion. El hash cambia y la firma deja de describir esto.
  escribirBorrador({ ...pieza, hecho: `${pieza.hecho},` });

  const r = correrAutorizar(escenario.proyecto, [pieza.id, '--registro', registro]);
  exigirNegativa(r, escenario, 'VERSION_DISTINTA');
});

test('la misma version escrita sin indentacion sigue autorizando', () => {
  const pieza = borradorDePrueba({ id: 'sin-indentacion' });
  const escenario = montarAutorizacion('sin-indentacion', pieza);
  escribirBorrador(pieza, { indentacion: 0 });
  const registro = escribirRegistro(registroDe(pieza));
  const r = correrAutorizar(escenario.proyecto, [pieza.id, '--registro', registro]);
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
});

test('un pendiente NUEVO invalida la aceptacion', () => {
  const aceptado = 'La cifra de 3 instituciones — la fuente no se pudo consultar';
  const pieza = borradorDePrueba({
    id: 'pendiente-nuevo',
    veredicto: 'parcial',
    pendientes: [aceptado, 'Un pendiente que nadie acepto — aparecio despues'],
  });
  const escenario = montarAutorizacion('pendiente-nuevo', pieza);
  // Hash correcto a proposito: aisla el rechazo por pendientes del rechazo por version.
  const registro = escribirRegistro(registroDe(pieza, { pendientes: [aceptado], acepta_limites: true }));

  const r = correrAutorizar(escenario.proyecto, [pieza.id, '--registro', registro]);
  exigirNegativa(r, escenario, 'PENDIENTES_DISTINTOS');
  assert.match(r.stderr, /aparec/, r.stderr);
});

test('un pendiente DESAPARECIDO tambien invalida la aceptacion', () => {
  // La otra direccion, y es la que se olvida: el humano acepto un estado concreto, no uno
  // mejor. Una pieza que mejoro sola tampoco esta cubierta por esa firma.
  const pieza = borradorDePrueba({
    id: 'pendiente-desaparecido',
    veredicto: 'parcial',
    pendientes: ['La cifra de 3 instituciones — la fuente no se pudo consultar'],
  });
  const escenario = montarAutorizacion('pendiente-desaparecido', pieza);
  const registro = escribirRegistro(registroDe(pieza, {
    pendientes: [
      'La cifra de 3 instituciones — la fuente no se pudo consultar',
      'Un pendiente que se acepto y ya no esta',
    ],
    acepta_limites: true,
  }));

  const r = correrAutorizar(escenario.proyecto, [pieza.id, '--registro', registro]);
  exigirNegativa(r, escenario, 'PENDIENTES_DISTINTOS');
  assert.match(r.stderr, /ya no esta/, r.stderr);
});

test('un borrador con claves duplicadas no tiene version definida: se niega', () => {
  const pieza = borradorDePrueba({ id: 'clave-duplicada' });
  const escenario = montarAutorizacion('clave-duplicada', pieza);
  const registro = escribirRegistro(registroDe(pieza));
  const crudo = JSON.stringify(pieza, null, 2).replace('"tipo": "noticia",', '"tipo": "noticia",\n  "tipo": "opinion",');
  writeFileSync(join(process.env.EDITORIAL_REDACCIONES_DIR, `${pieza.id}.json`), crudo, 'utf8');

  const r = correrAutorizar(escenario.proyecto, [pieza.id, '--registro', registro]);
  exigirNegativa(r, escenario, 'CLAVE_DUPLICADA');
});

// =====================================================================================
//  AC-AUT-05 — tres comandos, tres salidas, una sola puerta al arbol publico
// =====================================================================================

/** La raiz del repositorio, derivada del modulo igual que la deriva el propio comando. */
const RAIZ_REPO = join(DIR_EDITORIAL, '..', '..');

/** Un documento que NOMBRA el corpus no es una ruta al corpus. Los comentarios salen. */
function sinComentarios(fuente) {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * Detecta por NORMALIZACION de la ruta, no por una cadena literal. `join(r, 'content',
 * 'noticias')`, `join(r, "content/noticias")` y una plantilla son la misma ruta escrita de
 * tres formas, y la sonda anterior —un `includes("'content', 'noticias'")`— solo veia la
 * primera: las otras dos pasaban en verde.
 *
 * LIMITE, dicho para que su verde no se lea de mas: una ruta compuesta desde variables
 * —`join(raiz, DIR, SUB)`— no se ve aqui. Esto acota las formas sintacticas; no demuestra
 * la ausencia de una segunda puerta.
 */
function nombraElCorpus(fuente) {
  return /contentnoticias/.test(sinComentarios(fuente).replace(/['"`\s,+\\/]/g, ''));
}

/**
 * Todos los modulos de `scripts/` y `lib/`, no solo los de `scripts/editorial/`. La sonda
 * anterior miraba un unico directorio, asi que una segunda puerta escrita un nivel mas
 * arriba —`scripts/*.mjs`— no la veia nadie.
 *
 * `app/` y `components/` quedan fuera a proposito: el corpus existe para renderizarse, y
 * una ruta que lo LEE es el objetivo del diseño. La invariante es sobre quien lo ESCRIBE.
 */
function modulosDelRepo() {
  const salida = [];
  const caminar = (dir) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      if (entrada.name === 'node_modules' || entrada.name === 'pruebas') continue;
      const ruta = join(dir, entrada.name);
      if (entrada.isDirectory()) caminar(ruta);
      else if (/\.(mjs|js|ts|tsx)$/.test(entrada.name)) salida.push(ruta);
    }
  };
  for (const raiz of ['scripts', 'lib']) {
    const dir = join(RAIZ_REPO, raiz);
    if (existsSync(dir)) caminar(dir);
  }
  return salida;
}

test('AC-AUT-05 · `autorizar` es el UNICO modulo que resuelve `content/noticias`', () => {
  const culpables = modulosDelRepo()
    .filter((ruta) => ruta !== join(DIR_EDITORIAL, 'autorizar.mjs'))
    .filter((ruta) => nombraElCorpus(readFileSync(ruta, 'utf8')))
    .map((ruta) => ruta.slice(RAIZ_REPO.length + 1));
  assert.deepEqual(culpables, [], 'una segunda ruta al corpus publico es un defecto, no una comodidad');
});

test('AC-AUT-05 · la sonda de la unica puerta se pone roja a proposito', () => {
  // Las cuatro formas son la MISMA ruta. Las tres ultimas pasaban en verde con la sonda
  // anterior: una sonda que nunca ha fallado puede estar mirando la forma equivocada.
  for (const forma of [
    "const c = join(raiz, 'content', 'noticias');",
    'const c = join(raiz, "content", "noticias");',
    "const c = join(raiz, 'content/noticias');",
    'const c = `${raiz}/content/noticias`;',
  ]) {
    assert.equal(nombraElCorpus(forma), true, `la sonda no vio: ${forma}`);
  }
  // Y no se dispara con lo que solo lo MENCIONA, ni con otro directorio de `content/`.
  assert.equal(nombraElCorpus('// el corpus publicado vive en content/noticias/'), false);
  assert.equal(nombraElCorpus('/** escribe en `content/noticias/` */'), false);
  assert.equal(nombraElCorpus("const c = join(raiz, 'content', 'posts');"), false);
});

test('AC-AUT-05 · autorizar NO reverifica ni redacta: sin `terminada` se niega', () => {
  const pieza = borradorDePrueba({ id: 'sin-verificar-aun' });
  nuevoEntorno('sin-terminar');
  const proyecto = nuevoProyecto('sin-terminar');
  const detectado = item({ titulo: pieza.titulo, url: `https://medio-uno.mx/${pieza.id}` });
  const { id: entradaId } = registrarDeteccion(detectado);
  marcarExpedienteListo(entradaId);
  marcarRedactada(entradaId, { redaccion_id: pieza.id });
  escribirBorrador(pieza);
  const registro = escribirRegistro(registroDe(pieza));

  const r = correrAutorizar(proyecto, [pieza.id, '--registro', registro]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /SE NIEGA \[ESTADO_INCORRECTO\]/, r.stderr);
  assert.equal(existsSync(join(proyecto.corpus, `${pieza.id}.json`)), false);
  assert.equal(estadoDe(entradaId).estado, 'pendiente_verificacion', 'ni redacta ni verifica por su cuenta');
});

test('un id con recorrido de rutas se niega, tambien por la via de solo lectura', () => {
  const escenario = montarAutorizacion('id-invalido');
  for (const argumentos of [['../fuera', '--version'], ['../fuera', '--registro', 'x.json']]) {
    const r = correrAutorizar(escenario.proyecto, argumentos);
    assert.notEqual(r.status, 0, argumentos.join(' '));
    assert.match(r.stderr, /SE NIEGA \[ID_INVALIDO\]/, r.stderr);
  }
});

test('AC-AUT-05 · el registro no puede vivir dentro de un arbol de git', () => {
  const pieza = borradorDePrueba({ id: 'registro-en-el-repo' });
  const escenario = montarAutorizacion('registro-en-el-repo', pieza);
  // Un registro dentro del repositorio seria una firma commiteada en un repo PUBLICO.
  const ruta = join(DIR_EDITORIAL, 'registro-de-prueba.json');
  const r = correrAutorizar(escenario.proyecto, [pieza.id, '--registro', ruta]);
  exigirNegativa(r, escenario, 'REGISTRO_FUERA_DE_SITIO');
  assert.equal(existsSync(ruta), false, 'la prueba tampoco lo crea');
});

test('§8.2 · autorizar es idempotente: ni evento nuevo ni reescritura', () => {
  const pieza = borradorDePrueba({ id: 'idempotente' });
  const escenario = montarAutorizacion('idempotente', pieza);
  const registro = escribirRegistro(registroDe(pieza));
  assert.equal(correrAutorizar(escenario.proyecto, [pieza.id, '--registro', registro]).status, 0);

  const archivo = join(escenario.proyecto.corpus, `${pieza.id}.json`);
  const antes = readFileSync(archivo, 'utf8');
  const segunda = correrAutorizar(escenario.proyecto, [pieza.id, '--registro', registro]);

  assert.equal(segunda.status, 0, segunda.stderr);
  assert.match(segunda.stdout, /ya estaba autorizada/);
  assert.equal(readFileSync(archivo, 'utf8'), antes);
  assert.equal(eventosDeAutorizacion().length, 1, 'un evento por autorizacion, no dos');
});

// =====================================================================================
//  AC-AUT-06 — la demostracion de punta a punta
// =====================================================================================

test('AC-AUT-06 · el borrador entra por el comando y sale al corpus con su registro completo', () => {
  const pendientes = ['La cifra de 3 instituciones — la fuente no se pudo consultar'];
  const pieza = borradorDePrueba({ id: 'demostracion-e2e', veredicto: 'parcial', pendientes });
  const escenario = montarAutorizacion('demostracion-e2e', pieza);

  // El humano pregunta al comando por la version que va a firmar. Solo lectura.
  const consulta = correrAutorizar(escenario.proyecto, [pieza.id, '--version']);
  assert.equal(consulta.status, 0, consulta.stderr);
  assert.equal(consulta.stdout.trim(), versionDe(pieza));
  assert.equal(existsSync(escenario.proyecto.corpus), false, '`--version` no crea corpus');

  const registro = escribirRegistro({
    autorizado_por: 'Rodrigo Bermejo',
    autorizado_en: '2026-09-24T12:00:00-06:00',
    version_borrador: consulta.stdout.trim(),
    pendientes_aceptados: pendientes,
    acepta_limites: true,
  });

  const r = correrAutorizar(escenario.proyecto, [pieza.id, '--registro', registro]);
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);

  // 1. Salio al corpus, escrito por el comando y no copiado a mano.
  const archivo = join(escenario.proyecto.corpus, `${pieza.id}.json`);
  assert.equal(existsSync(archivo), true);
  const publicada = JSON.parse(readFileSync(archivo, 'utf8'));
  assert.equal(publicada.estado, 'autorizada');
  assert.deepEqual(Object.keys(publicada.procedencia), ETAPAS_PROCEDENCIA);
  assert.equal(publicada.procedencia.publicado.por, 'humano');
  assert.match(publicada.procedencia.publicado.detalle, /Rodrigo Bermejo/);

  // 2. Con su registro completo: los cuatro datos, mas la marca.
  const [evento] = eventosDeAutorizacion();
  assert.equal(evento.autorizado_por, 'Rodrigo Bermejo');
  assert.equal(evento.autorizado_en, '2026-09-24T12:00:00-06:00');
  assert.equal(evento.version_borrador, versionDe(pieza));
  assert.deepEqual(evento.pendientes_aceptados, pendientes);
  assert.equal(evento.acepta_limites, true);
  assert.equal(evento.pieza_id, pieza.id);

  // 3. El registro vive fuera del repositorio, y el evento no guarda el borrador.
  assert.equal(JSON.stringify(evento).includes(pieza.hecho), false);
  assert.equal(estadoDe(escenario.entradaId).estado, 'autorizada');
});

// =====================================================================================
//  AC-AUT-07 — la frontera con la evidencia no se mueve
// =====================================================================================

test('AC-AUT-07 · `autorizar` no nombra `public/proof` ni en lectura ni en escritura', () => {
  const fuente = readFileSync(join(DIR_EDITORIAL, 'autorizar.mjs'), 'utf8');
  const codigo = fuente.split('\n').filter((l) => !l.trimStart().startsWith('*')).join('\n');
  assert.equal(codigo.includes('public/proof'), false, 'el editorial enlaza a evidencia; jamas se deriva de ella');
  assert.equal(codigo.includes('claim'), false);
});

test('AC-AUT-07 · la pieza publicada no gana ningun campo de evidencia', () => {
  const pieza = borradorDePrueba({ id: 'frontera-intacta' });
  const escenario = montarAutorizacion('frontera-intacta', pieza);
  const registro = escribirRegistro(registroDe(pieza));
  assert.equal(correrAutorizar(escenario.proyecto, [pieza.id, '--registro', registro]).status, 0);

  const publicada = JSON.parse(readFileSync(join(escenario.proyecto.corpus, `${pieza.id}.json`), 'utf8'));
  // Mismo objeto de §3: cambian `estado` y `procedencia.publicado`, y nada mas.
  assert.deepEqual(Object.keys(publicada).sort(), Object.keys(pieza).sort());
  assert.deepEqual(
    { ...publicada, estado: pieza.estado, procedencia: pieza.procedencia },
    pieza,
  );
});
