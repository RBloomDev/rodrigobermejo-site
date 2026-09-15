/**
 * Orquestador del canal editorial (`docs/plataforma/02-editorial.md` §5).
 *
 *   detectar -> deduplicar -> redactar -> verificar -> escribir el corpus
 *
 * Las propiedades que esta corrida tiene que sostener, y como:
 *
 *   1. **Idempotencia.** Una segunda ejecucion sobre las mismas entradas no produce una
 *      pieza duplicada. Lo garantiza el estado `terminada` de `estado.mjs`, mas el corpus
 *      como segunda barrera: `upsert()` no reescribe un `id` ni una `huella` existentes.
 *   2. **No se pierde trabajo pendiente.** Y esta es la que faltaba. El canal anterior
 *      marcaba una entrada como vista al detectarla: si despues no se redactaba, fallaba
 *      la verificacion o el proceso moria, esa entrada no volvia nunca. Ahora la corrida
 *      **no arranca del feed, arranca de la bitacora**: `pendientesDeRedaccion()` y
 *      `pendientesDeVerificacion()` devuelven primero lo que quedo a medias, y lo
 *      detectado hoy solo se suma a esa cola.
 *   3. **Un error de acceso no fabrica una noticia.** Una fuente caida produce una fila en
 *      `estado/fallos.jsonl` con etapa `detectar` y CERO items. Sin items no hay
 *      expediente, sin expediente no hay pieza (§5.5).
 *   4. **El fallo se registra en su etapa.** Un fallo al leer un feed es `detectar`; uno
 *      al componer contra el esquema de §3 es `redactar`; uno al comprobar una fuente de
 *      una pieza ya escrita es `verificar`. Y ninguno de los tres pierde la entrada: la
 *      deja `fallida_reintentable`, con cuenta de intentos.
 *
 * Codigos de salida — un exito parcial tiene que ser distinguible de un exito:
 *   0  exito: todo lo previsto se leyo y se produjo.
 *   2  EXITO PARCIAL: hubo fallos de acceso, de esquema o de verificacion; se produjo lo
 *      que si se pudo, y queda constancia de lo que no (§5.5).
 *   1  fallo: la corrida no pudo completarse.
 *
 * Un expediente que sigue esperando redactor NO es un fallo y NO da salida 2: es trabajo
 * pendiente, que ahora tiene un estado propio y sobrevive a la corrida.
 *
 * Uso:
 *   node scripts/editorial/ejecutar.mjs
 *   node scripts/editorial/ejecutar.mjs --incluir el-economista    # fuerza un fallo real
 *   node scripts/editorial/ejecutar.mjs --entradas <snapshot.json> # mismas entradas
 *
 * Variables de entorno (para probar sin tocar el estado ni el corpus reales):
 *   EDITORIAL_ESTADO_DIR  raiz de la bitacora y los fallos
 *   EDITORIAL_PIEZAS      ruta del corpus `piezas.json`
 */

import { randomUUID } from 'node:crypto';
import {
  RUTA_PIEZAS, ahoraIso, argumentos, esCli, escribirJson, leerJson,
} from './comun.mjs';
import { detectar as detectarPorDefecto, resolverFuentes } from './detectar.mjs';
import { CATALOGO } from './fuentes.mjs';
import { deduplicar } from './deduplicar.mjs';
import {
  conciliarConCorpus,
  instantanea,
  marcarExpedienteListo,
  marcarFallida,
  marcarRedactada,
  marcarVerificada,
  pendientesDeRedaccion,
  pendientesDeVerificacion,
  registrarDeteccion,
  registrarFallo,
} from './estado.mjs';

/** El corpus. Sobrescribible para que las pruebas no escriban en `docs/`. */
export function rutaPiezas() {
  return process.env.EDITORIAL_PIEZAS || RUTA_PIEZAS;
}

/**
 * `redactar.mjs` y `verificar.mjs` se cargan **en el momento de usarlos**, no al importar
 * este modulo. Asi una prueba que inyecta etapas falsas no arrastra la red ni el disco de
 * esas etapas, y el orquestador se puede probar entero sin salir a internet.
 */
async function resolverEtapas(etapas = {}) {
  const necesitaRedactar = !etapas.redactar || !etapas.prepararExpediente;
  const necesitaVerificar = !etapas.verificarPieza || !etapas.sellarVerificacion;
  const red = necesitaRedactar ? await import('./redactar.mjs') : null;
  const ver = necesitaVerificar ? await import('./verificar.mjs') : null;
  return {
    detectar: etapas.detectar ?? detectarPorDefecto,
    prepararExpediente: etapas.prepararExpediente ?? red.prepararExpediente,
    redactar: etapas.redactar ?? red.redactar,
    verificarPieza: etapas.verificarPieza ?? ver.verificarPieza,
    sellarVerificacion: etapas.sellarVerificacion ?? ver.sellarVerificacion,
  };
}

/**
 * Reconstruye el item detectado a partir de la entrada de la bitacora. La bitacora guarda
 * exactamente los campos que §5.1 autoriza, que son los que el expediente necesita: si
 * hiciera falta algo mas, seria senal de que se esta guardando de mas.
 */
/** Resuelve una fuente del catalogo por su id. `null` si ya no existe. */
function catalogoDeFuente(id) {
  return CATALOGO.find((f) => f.id === id) ?? null;
}

export function aItemDetectado(entrada) {
  // Las entradas migradas del registro antiguo (`vistos.jsonl`) no guardaban
  // `uso`, `licencia` ni `medio`: solo `fuente_id`. Sin este rescate, TODAS
  // parecian no reproducibles y el canal se saltaba hasta las que tienen
  // licencia CC BY --- 49 entradas encalladas por un campo ausente.
  //
  // No se inventa nada: se resuelve del catalogo de fuentes por su id, que es
  // la fuente de verdad de la licencia. Si el id ya no existe en el catalogo,
  // se deja ausente y la entrada se queda esperando, que es lo correcto.
  const delCatalogo = entrada.uso ? null : catalogoDeFuente(entrada.fuente_id);

  return {
    fuente_id: entrada.fuente_id,
    medio: entrada.medio ?? delCatalogo?.medio,
    licencia: entrada.licencia ?? delCatalogo?.licencia,
    uso: entrada.uso ?? delCatalogo?.uso,
    titulo: entrada.titulo,
    url: entrada.url ?? entrada.url_canonica,
    url_canonica: entrada.url_canonica,
    dominio: entrada.dominio,
    fecha_publicacion: entrada.fecha_publicacion ?? null,
    fecha_lectura: entrada.fecha_lectura ?? entrada.detectada_en,
    huella: entrada.huella,
  };
}

/**
 * @param {object} [banderas]  {incluir, soloFuente, entradas, silencioso}
 * @param {object} [inyeccion] {etapas, redacciones} — solo para pruebas
 */
export async function ejecutar(banderas = {}, inyeccion = {}) {
  const corrida = randomUUID().slice(0, 8);
  const inicio = ahoraIso();
  const linea = (s) => { if (!banderas.silencioso) console.log(s); };
  const etapas = await resolverEtapas(inyeccion.etapas);

  const piezasAntes = leerJson(rutaPiezas(), []);
  linea(`== corrida ${corrida} · ${inicio}`);
  linea(`piezas en el corpus ANTES: ${piezasAntes.length}`);

  // --- 0. conciliar ------------------------------------------------------------
  // Lo que ya tiene pieza en el corpus se cierra como `terminada` antes de nada, para
  // que no vuelva a la cola de pendientes. Tambien absorbe el `vistos.jsonl` del canal
  // anterior: lo que produjo pieza queda cerrado, lo que no, vuelve a ser pendiente.
  const conciliados = conciliarConCorpus(piezasAntes, { corrida });
  if (conciliados.length) linea(`conciliar: ${conciliados.length} entradas cerradas contra el corpus`);

  // --- 1. detectar -------------------------------------------------------------
  const fuentes = resolverFuentes(banderas);
  linea(`fuentes: ${fuentes.map((f) => `${f.id}[${f.estado}]`).join(', ')}`);

  let items = [];
  let erroresDeteccion = [];
  if (banderas.entradas) {
    items = leerJson(banderas.entradas, []);
    linea(`detectar: OMITIDO — se reusan ${items.length} entradas de ${banderas.entradas}`);
  } else {
    const d = await etapas.detectar({ fuentes, corrida });
    items = d.items;
    erroresDeteccion = d.errores;
    linea(`detectar: ${items.length} items de ${d.fuentesLeidas.length}/${fuentes.length} fuentes`);
    for (const e of erroresDeteccion) {
      linea(`  ! FALLO [${e.etapa}] ${e.contexto?.fuente_id ?? ''} [${e.codigo}] ${e.mensaje}`);
      linea(`    -> ${e.consecuencia}  (escrito en estado/fallos.jsonl)`);
    }
  }

  // --- 2. deduplicar -----------------------------------------------------------
  const { nuevos, yaPendientes, repetidos } = deduplicar(items, { piezas: piezasAntes });
  linea(`deduplicar: ${nuevos.length} nuevos, ${yaPendientes.length} ya pendientes, ${repetidos.length} cerrados`);
  const porMotivo = repetidos.reduce((a, r) => ({ ...a, [r.motivo]: (a[r.motivo] ?? 0) + 1 }), {});
  for (const [motivo, n] of Object.entries(porMotivo)) linea(`  - ${motivo}: ${n}`);
  for (const item of nuevos) registrarDeteccion(item, { corrida });

  // --- 3. redactar -------------------------------------------------------------
  // La cola arranca de la BITACORA, no del feed: primero lo que quedo a medias.
  //
  // Se recomponen los borradores de DOS colas, y la segunda es la que el canal anterior
  // no tenia: una entrada que ya fue redactada y cuya verificacion fallo necesita su
  // pieza otra vez para reintentar. Su borrador sigue en `redacciones/`; lo que se
  // perdia no era el texto, era saber que esa entrada seguia esperando.
  // El limite acota cuantas entradas se intentan en esta corrida. Lo que queda
  // fuera NO se descarta ni se marca: sigue pendiente en la bitacora y lo toma
  // la corrida siguiente. Es acotar el trabajo, no perderlo.
  const enRedaccion = pendientesDeRedaccion(
    // `!= null` y no un truthy: con truthy, `--limite 0` caia al objeto vacio y
    // el limite pasaba a ser Infinity. Cero tiene que llegar como cero.
    banderas.limite != null ? { limite: banderas.limite } : {},
  );
  const enVerificacion = pendientesDeVerificacion();
  const idsEnRedaccion = new Set(enRedaccion.map((e) => e.id));
  linea(`pendientes: ${enRedaccion.length} de redaccion, ${enVerificacion.length} de verificacion `
    + '(incluyen lo no terminado de corridas anteriores)');

  const candidatas = [];
  const sinRedaccion = [];
  const erroresRedaccion = [];

  for (const entrada of [...enRedaccion, ...enVerificacion]) {
    const primeraVuelta = idsEnRedaccion.has(entrada.id);
    if (primeraVuelta && entrada.estado !== 'pendiente_redaccion') {
      marcarExpedienteListo(entrada.id, { corrida });
    }
    const expediente = etapas.prepararExpediente(aItemDetectado(entrada));
    let resultado;
    try {
      // De uno en uno: un borrador que no compone contra §3 no puede tumbar el lote.
      resultado = await etapas.redactar([expediente], {
        ...(inyeccion.redacciones ? { redacciones: inyeccion.redacciones } : {}),
        // Con --con-redactor se pide el borrador al modelo en el momento.
        // Sin la bandera no hay inferencia y el comportamiento es el de
        // siempre: el expediente queda pendiente. Se elige explicitamente
        // porque invocar un modelo cuesta y tarda, y una corrida rutinaria
        // no deberia hacerlo sin que alguien lo pida.
        ...(inyeccion.invocarRedactor ? { invocar: inyeccion.invocarRedactor } : {}),
      });
    } catch (e) {
      erroresRedaccion.push(marcarFallida(entrada.id, 'redactar', {
        codigo: 'ESQUEMA',
        mensaje: e.message,
        consecuencia: 'esta entrada no entra al corpus; queda reintentable con el borrador corregido',
        contexto: { url_canonica: entrada.url_canonica },
      }, { corrida }));
      linea(`  ! FALLO [redactar] ${entrada.id}: ${e.message.split('\n')[0]}`);
      continue;
    }
    if (!resultado.piezas.length) {
      if (primeraVuelta) sinRedaccion.push(entrada);
      // Redactada antes y su borrador ya no esta en disco. No es un fallo del canal: es
      // trabajo que sigue pendiente, y se dice en vez de darlo por cerrado.
      else linea(`verificar: OMITIDA ${entrada.id} — redactada antes, sin borrador disponible hoy`);
      continue;
    }
    const pieza = resultado.piezas[0];
    if (primeraVuelta) {
      marcarRedactada(entrada.id, {
        redaccion_id: pieza.id,
        modelo: pieza.procedencia?.redactado?.modelo ?? null,
        corrida,
      });
    }
    candidatas.push({ entrada, pieza });
  }
  linea(`redactar: ${candidatas.length} candidatas, ${sinRedaccion.length} expedientes siguen esperando redactor`);

  // --- 4. verificar ------------------------------------------------------------
  const verificadas = [];
  const rechazadas = [];

  for (const { entrada, pieza } of candidatas) {
    const informe = await etapas.verificarPieza(pieza);
    // El veredicto tiene TRES valores, no dos. `parcial` significa que no hay
    // contradicciones pero queda algo sin comprobar: la pieza sigue siendo un
    // borrador valido y entra al corpus **con su veredicto a la vista**. Lo que
    // no recibe es el sello de verificacion completa.
    //
    // Antes esto leia `informe.ok`, un booleano. Un booleano solo tiene dos
    // casillas y el tercer estado --- «no encontre contradicciones pero tampoco
    // pude comprobarlo» --- caia en la casilla `true`. Ese colapso es el que
    // hacia que una pieza con una fuente leida de once saliera como OK.
    if (informe.veredicto !== 'no_verificada') {
      verificadas.push({ entrada, pieza: etapas.sellarVerificacion(pieza, informe) });
      linea(`verificar: ${informe.veredicto.toUpperCase()}   ${pieza.id} — ${informe.detalle}`);
    } else {
      rechazadas.push(marcarFallida(entrada.id, 'verificar', {
        codigo: 'VERIFICACION',
        mensaje: informe.fallos.join(' | ') || 'sin fallos enumerados',
        consecuencia: 'la pieza no entra al corpus; la entrada queda reintentable y se revisa en la corrida siguiente',
        contexto: { pieza_id: pieza.id },
      }, { corrida }));
      linea(`verificar: FALLA ${pieza.id}`);
      for (const f of informe.fallos) linea(`    - ${f}`);
    }
    for (const a of informe.avisos ?? []) linea(`    (aviso) ${a}`);
  }

  // --- 5. escribir el corpus ---------------------------------------------------
  const { corpus, insertadas, omitidas } = upsert(piezasAntes, verificadas.map((v) => v.pieza));
  if (insertadas.length || leerJson(rutaPiezas(), null) === null) escribirJson(rutaPiezas(), corpus);

  // `terminada` tanto si se inserto como si el corpus ya la tenia: en ambos casos existe
  // la pieza, que es lo que este estado afirma. Omitida por duplicado no es un fallo.
  for (const { entrada, pieza } of verificadas) {
    marcarVerificada(entrada.id, { pieza_id: pieza.id, corrida });
  }

  linea(`corpus: +${insertadas.length} insertadas, ${omitidas.length} omitidas por ya existir`);
  for (const o of omitidas) linea(`  - ${o.id}: ${o.motivo}`);
  linea(`piezas en el corpus DESPUES: ${corpus.length}`);
  linea(`estado: ${JSON.stringify(instantanea())}`);

  const erroresTotales = erroresDeteccion.length + erroresRedaccion.length + rechazadas.length;
  const parcial = erroresTotales > 0;
  linea(parcial
    ? `== EXITO PARCIAL: se produjo lo que si se pudo; ${erroresTotales} fallo(s) con constancia en estado/fallos.jsonl`
    : '== EXITO: sin fallos de acceso, de esquema ni de verificacion');

  return {
    corrida,
    parcial,
    antes: piezasAntes.length,
    despues: corpus.length,
    detectados: items.length,
    nuevos: nuevos.length,
    yaPendientes: yaPendientes.length,
    repetidos: repetidos.length,
    insertadas: insertadas.map((p) => p.id),
    omitidas,
    rechazadas: rechazadas.map((e) => ({ id: e.id, estado: e.estado, intentos: e.intentos })),
    errores: [...erroresDeteccion, ...erroresRedaccion],
    pendientes: sinRedaccion.length,
    estado: instantanea(),
  };
}

/**
 * Segunda barrera de idempotencia, independiente de la bitacora: el corpus no admite dos
 * veces el mismo `id` ni la misma `huella`. Si alguien borra `estado/`, la duplicacion
 * sigue sin ocurrir.
 */
export function upsert(corpusActual, piezas) {
  const corpus = [...corpusActual];
  const ids = new Set(corpus.map((p) => p.id));
  const huellas = new Set(corpus.map((p) => p.huella));
  const insertadas = [];
  const omitidas = [];
  for (const p of piezas) {
    if (ids.has(p.id)) { omitidas.push({ id: p.id, motivo: 'el id ya existe en el corpus' }); continue; }
    if (huellas.has(p.huella)) { omitidas.push({ id: p.id, motivo: 'la huella ya existe en el corpus' }); continue; }
    ids.add(p.id);
    huellas.add(p.huella);
    corpus.push(p);
    insertadas.push(p);
  }
  return { corpus, insertadas, omitidas };
}

if (esCli(import.meta.url)) {
  const banderas = argumentos(process.argv.slice(2));

  // --con-redactor: conecta la via de inferencia real. Se comprueba que existe
  // ANTES de empezar; si no la hay, se dice cual es la dependencia concreta y
  // la corrida sigue sin ella, dejando los expedientes pendientes. No se
  // inventa un borrador por no tener modelo.
  const inyeccion = {};
  if (process.argv.includes('--con-redactor')) {
    const { inferenciaDisponible, redactarConModelo } = await import('./invocar-redactor.mjs');
    if (inferenciaDisponible()) {
      inyeccion.invocarRedactor = redactarConModelo;
      console.log('redactor: CONECTADO (claude CLI)');
    } else {
      console.warn('redactor: SIN VIA DE INFERENCIA.');
      console.warn('  Dependencia concreta: el CLI `claude` autenticado, o una clave de API.');
      console.warn('  La corrida continua y deja los expedientes pendientes de redaccion.');
    }
  }

  try {
    const r = await ejecutar(banderas, inyeccion);
    process.exit(r.parcial ? 2 : 0);
  } catch (e) {
    registrarFallo({
      etapa: 'estado',
      codigo: 'CORRIDA_ABORTADA',
      mensaje: `${e.name}: ${e.message}`,
      consecuencia: 'la corrida no se completo; los pendientes siguen en la bitacora y se retoman en la siguiente',
    });
    console.error(`ejecutar: FALLO ${e.stack}`);
    process.exit(1);
  }
}
