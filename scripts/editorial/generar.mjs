/**
 * `generar` — la PRIMERA etapa del canal (`docs/plataforma/02-editorial.md` §8.1).
 *
 *   detectar -> deduplicar -> redactar -> el borrador privado en $EDITORIAL_REDACCIONES_DIR
 *
 * Transicion: `detectada -> pendiente_redaccion -> pendiente_verificacion`.
 *
 * ============================== QUE NO HACE, Y ES EL PUNTO ==============================
 *
 * **No verifica y no autoriza.** No importa `verificar.mjs` ni nombra el corpus publicado:
 * la separacion no es una bandera ni una rama, es que el codigo de la otra etapa no esta
 * aqui. Comprobar un hecho es otra invocacion (`verificar-canal.mjs`) y publicarlo es una
 * tercera (`autorizar.mjs`), que ademas es la unica que toca el arbol publico.
 *
 * Hasta el 2026-09-25 esto era `ejecutar.mjs`, que encadenaba detectar -> redactar ->
 * verificar -> escribir un corpus intermedio en una sola corrida. §8.1 pide tres
 * invocaciones y habia dos; el corpus intermedio existia solo para unir las dos etapas que
 * iban juntas, asi que al partirlas desaparece con su variable (§8.6, fila 2).
 *
 * ================================ LO QUE SIGUE IGUAL ================================
 *
 *   1. **Idempotencia.** Una segunda corrida sobre las mismas entradas no produce una
 *      pieza duplicada. Lo garantiza el estado de `estado.mjs`: `terminada` y `descartada`
 *      son cierres, y lo pendiente vuelve a la cola en vez de volver a entrar como nuevo.
 *   2. **No se pierde trabajo pendiente.** La corrida **no arranca del feed, arranca de la
 *      bitacora**: `pendientesDeRedaccion()` devuelve primero lo que quedo a medias, y lo
 *      detectado hoy solo se suma a esa cola.
 *   3. **Un error de acceso no fabrica una noticia.** Una fuente caida produce una fila en
 *      `estado/fallos.jsonl` con etapa `detectar` y CERO items (§5.5).
 *   4. **El fallo se registra en su etapa.** Aqui solo pueden ser `detectar` y `redactar`:
 *      `verificar` ya no ocurre en esta corrida y por eso no puede salir de aqui.
 *
 * Codigos de salida — un exito parcial tiene que ser distinguible de un exito:
 *   0  exito: todo lo previsto se leyo y se produjo.
 *   2  EXITO PARCIAL: hubo fallos de acceso o de esquema, **o la corrida se detuvo al
 *      llegar al tope de llamadas al redactor**; se produjo lo que si se pudo y queda
 *      constancia de lo que no (§5.5).
 *   1  fallo: la corrida no pudo completarse.
 *
 * Un expediente que sigue esperando redactor NO es un fallo y NO da salida 2: es trabajo
 * pendiente, que tiene estado propio y sobrevive a la corrida.
 *
 * Uso:
 *   node scripts/editorial/generar.mjs
 *   node scripts/editorial/generar.mjs --con-redactor --limite 3
 *   node scripts/editorial/generar.mjs --incluir el-economista    # fuerza un fallo real
 *   node scripts/editorial/generar.mjs --entradas <snapshot.json> # mismas entradas
 *
 * Variables de entorno:
 *   EDITORIAL_ESTADO_DIR       OBLIGATORIA. Raiz de la bitacora, los fallos y los errores.
 *   EDITORIAL_REDACCIONES_DIR  OBLIGATORIA. Raiz de los borradores.
 *
 * **Son dos, y solo dos** (§8.3). No tienen valor por defecto y sin ellas la corrida
 * ABORTA antes de escribir nada.
 *
 *   EDITORIAL_MAX_LLAMADAS     opcional. Tope de llamadas al redactor por corrida. Sin
 *                              ella no hay tope; ver `topeDeLlamadas()`.
 */

import { randomUUID } from 'node:crypto';
import {
  ConfiguracionAusente, DirectorioVersionado, ahoraIso, argumentos, esCli,
  escribirJson, exigirDirectoriosPrivados, leerJson, rutaBorrador,
} from './comun.mjs';
import { detectar as detectarPorDefecto, resolverFuentes } from './detectar.mjs';
import { CATALOGO } from './fuentes.mjs';
import { deduplicar as deduplicarPorDefecto } from './deduplicar.mjs';
import {
  instantanea,
  marcarExpedienteListo,
  marcarFallida,
  marcarRedactada,
  pendientesDeRedaccion,
  registrarDeteccion,
  registrarFallo,
} from './estado.mjs';

// =====================================================================================
//  EL TOPE DE LLAMADAS AL REDACTOR
// =====================================================================================

/**
 * Se alcanzo el tope de llamadas al redactor. **No es un fallo de la entrada**: la entrada
 * se queda donde estaba y la corrida siguiente la retoma.
 */
export class TopeDeLlamadas extends Error {
  constructor(tope) {
    super(`tope de llamadas al redactor alcanzado: EDITORIAL_MAX_LLAMADAS=${tope}`);
    this.name = 'TopeDeLlamadas';
    this.codigo = 'TOPE_LLAMADAS';
    this.tope = tope;
  }
}

/**
 * El tope de llamadas al redactor por corrida, leido de `EDITORIAL_MAX_LLAMADAS`.
 *
 * **Hasta el 2026-09-25 esta variable estaba declarada en el workflow con valor 40 y
 * NINGUN `.mjs` la leia.** El propio YAML lo decia sin adornos —«HOY ESTE TOPE ESTA
 * DECLARADO Y NO ATA»—, que es la unica forma honesta de tener un tope que no ata: un
 * limite invisible que nadie cuenta como proteccion. Cerrar la brecha es el prerrequisito
 * 4 de la activacion (`docs/plataforma/programacion/00-donde-correria.md`), y es esto.
 *
 * Sin la variable no hay tope, y esa ausencia es deliberada: NO es una tercera variable
 * obligatoria del canal (§8.3, «Son dos, y solo dos»), es un limite de consumo que pone
 * quien corre el canal en un runner. Lo que no se admite es un valor que no sea un entero
 * >= 0: un tope mal escrito que cayera en «sin tope» seria exactamente el defecto de
 * `--limite 0` con otra cara —un tope que significa lo contrario de lo que dice—.
 *
 * @returns {number|null} el tope, o `null` si no se pidió ninguno
 */
export function topeDeLlamadas(entorno = process.env) {
  const crudo = entorno.EDITORIAL_MAX_LLAMADAS;
  if (crudo === undefined || crudo === null || String(crudo).trim() === '') return null;
  const n = Number(String(crudo).trim());
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(
      `EDITORIAL_MAX_LLAMADAS espera un entero >= 0, se recibio: ${JSON.stringify(crudo)}. `
      + 'No se interpreta como «sin tope»: un tope que no se entiende y deja pasar todo es '
      + 'peor que no tenerlo, porque se cuenta como proteccion.',
    );
  }
  return n;
}

/**
 * Envuelve la via de inferencia para que **no pueda** hacer mas de `tope` llamadas. El
 * contador vive fuera de `redactar.mjs` a proposito: quien tiene que contar es el comando
 * que decide cuantas entradas intenta, no la etapa que compone una pieza.
 *
 * @returns {{invocar: Function|null, cuantas: () => number, alcanzado: () => boolean}}
 */
export function contadorDeLlamadas(invocar, tope) {
  let llamadas = 0;
  let alcanzado = false;
  if (typeof invocar !== 'function') {
    return { invocar: null, cuantas: () => 0, alcanzado: () => false };
  }
  return {
    invocar: async (expediente) => {
      if (tope !== null && llamadas >= tope) {
        alcanzado = true;
        throw new TopeDeLlamadas(tope);
      }
      llamadas += 1;
      return invocar(expediente);
    },
    cuantas: () => llamadas,
    alcanzado: () => alcanzado,
  };
}

// =====================================================================================
//  LAS ETAPAS
// =====================================================================================

/**
 * `redactar.mjs` se carga **en el momento de usarlo**, no al importar este modulo. Asi una
 * prueba que inyecta etapas falsas no arrastra el disco de esa etapa.
 *
 * Aqui no aparece `verificar.mjs`, ni siquiera perezoso: `generar` no verifica (§8.1).
 */
async function resolverEtapas(etapas = {}) {
  const necesitaRedactar = !etapas.redactar || !etapas.prepararExpediente;
  const red = necesitaRedactar ? await import('./redactar.mjs') : null;
  return {
    detectar: etapas.detectar ?? detectarPorDefecto,
    // La deduplicacion se inyecta por la misma puerta que el resto de etapas, y no es
    // una comodidad: `guard:canal` la sustituye por una que no deduplica para demostrar
    // que el guard se pone ROJO. Un guard que nunca ha fallado puede estar desconectado
    // (`AGENTS.md`, principio de verificacion, punto 4).
    deduplicar: etapas.deduplicar ?? deduplicarPorDefecto,
    prepararExpediente: etapas.prepararExpediente ?? red.prepararExpediente,
    redactar: etapas.redactar ?? red.redactar,
  };
}

/** Resuelve una fuente del catalogo por su id. `null` si ya no existe. */
function catalogoDeFuente(id) {
  return CATALOGO.find((f) => f.id === id) ?? null;
}

/**
 * Reconstruye el item detectado a partir de la entrada de la bitacora. La bitacora guarda
 * exactamente los campos que §5.1 autoriza, que son los que el expediente necesita: si
 * hiciera falta algo mas, seria senal de que se esta guardando de mas.
 */
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

// =====================================================================================
//  LA CORRIDA
// =====================================================================================

/**
 * @param {object} [banderas]  {incluir, soloFuente, entradas, silencioso, limite}
 * @param {object} [inyeccion] {etapas, redacciones, invocarRedactor, entorno} — pruebas y CLI
 *
 * `entorno` entra por la MISMA puerta que las etapas, y no es una comodidad: el tope de
 * llamadas se lee del entorno, y una prueba que lo fijara mutando `process.env` dejaria una
 * variable global puesta para las pruebas que corren despues —el estado compartido que
 * `nuevoEntorno()` existe para evitar—. Sin inyeccion cae en `process.env`, que es de donde
 * lo lee el CLI.
 */
export async function generar(banderas = {}, inyeccion = {}) {
  // PRIMERA LINEA, antes de leer un feed y antes de abrir un archivo (§8.3). Si falta
  // cualquiera de las dos variables obligatorias, esto lanza y la corrida no escribe
  // nada. Comprobarlo mas abajo seria comprobarlo despues de haber escrito.
  exigirDirectoriosPrivados();

  const corrida = randomUUID().slice(0, 8);
  const inicio = ahoraIso();
  const linea = (s) => { if (!banderas.silencioso) console.log(s); };
  const etapas = await resolverEtapas(inyeccion.etapas);

  // Se lee UNA vez por corrida: un tope que cambiara a mitad de corrida no seria un tope.
  const tope = topeDeLlamadas(inyeccion.entorno);
  const redactor = contadorDeLlamadas(inyeccion.invocarRedactor, tope);

  linea(`== generar ${corrida} · ${inicio}`);
  if (tope !== null) linea(`tope de llamadas al redactor: ${tope}`);

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
  //
  // Sin corpus intermedio, el nivel 3 de §5.2 —la bitacora— es la barrera, y era la unica
  // que decidia nada: la segunda del corpus solo atrapaba el caso de una bitacora borrada
  // con el corpus vivo, y ese corpus ya no existe. `deduplicar()` no cambia: sigue
  // aceptando `piezas` y su valor por defecto es el arreglo vacio.
  const { nuevos, yaPendientes, repetidos } = etapas.deduplicar(items, {});
  linea(`deduplicar: ${nuevos.length} nuevos, ${yaPendientes.length} ya pendientes, ${repetidos.length} cerrados`);
  const porMotivo = repetidos.reduce((a, r) => ({ ...a, [r.motivo]: (a[r.motivo] ?? 0) + 1 }), {});
  for (const [motivo, n] of Object.entries(porMotivo)) linea(`  - ${motivo}: ${n}`);
  for (const item of nuevos) registrarDeteccion(item, { corrida });

  // --- 3. redactar -------------------------------------------------------------
  // La cola arranca de la BITACORA, no del feed: primero lo que quedo a medias.
  //
  // Y arranca SOLO de `pendientesDeRedaccion()`. Lo que ya tiene borrador y espera
  // comprobacion es la cola del otro comando: mezclar las dos aqui seria volver a fundir
  // las dos etapas por dentro con los dos ejecutables por fuera, que es peor que no
  // haberlas partido —parecerian dos y serian una—.
  //
  // El limite acota cuantas entradas se intentan en esta corrida. Lo que queda
  // fuera NO se descarta ni se marca: sigue pendiente en la bitacora y lo toma
  // la corrida siguiente. Es acotar el trabajo, no perderlo.
  const enRedaccion = pendientesDeRedaccion(
    // `!= null` y no un truthy: con truthy, `--limite 0` caia al objeto vacio y
    // el limite pasaba a ser Infinity. Cero tiene que llegar como cero.
    banderas.limite != null ? { limite: banderas.limite } : {},
  );
  linea(`pendientes de redaccion: ${enRedaccion.length} (incluyen lo no terminado de corridas anteriores)`);

  const borradores = [];
  const sinRedaccion = [];
  const sinGuardar = [];
  const erroresRedaccion = [];
  let topeAlcanzado = false;

  for (const entrada of enRedaccion) {
    if (entrada.estado !== 'pendiente_redaccion') marcarExpedienteListo(entrada.id, { corrida });

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
        ...(redactor.invocar ? { invocar: redactor.invocar } : {}),
      });
    } catch (e) {
      erroresRedaccion.push(marcarFallida(entrada.id, 'redactar', {
        codigo: 'ESQUEMA',
        mensaje: e.message,
        consecuencia: 'esta entrada no produce borrador; queda reintentable con el expediente corregido',
        contexto: { url_canonica: entrada.url_canonica },
      }, { corrida }));
      linea(`  ! FALLO [redactar] ${entrada.id}: ${e.message.split('\n')[0]}`);
      if (redactor.alcanzado()) { topeAlcanzado = true; break; }
      continue;
    }

    if (!resultado.piezas.length) {
      sinRedaccion.push(entrada);
      // El tope no es un fallo de la entrada y no le sube `intentos`: la entrada se queda
      // en `pendiente_redaccion` y la corrida siguiente la retoma. Se comprueba DESPUES
      // de `redactar()` porque esa etapa se traga el error del redactor a proposito ---un
      // fallo del redactor deja el expediente pendiente, no rompe el lote---, asi que
      // mirar solo la excepcion no veria el tope nunca.
      if (redactor.alcanzado()) { topeAlcanzado = true; break; }
      continue;
    }

    const pieza = resultado.piezas[0];

    // EL BORRADOR SE ESCRIBE ANTES DE MOVER LA BITACORA, y el orden no es estetico:
    // `pendiente_verificacion` afirma que hay un borrador que comprobar, y el otro comando
    // lo busca en disco por su id. Marcarlo antes de escribirlo declara hecho lo que no se
    // hizo, y `verificar` encontraria una cola de entradas sin archivo.
    const ruta = rutaBorrador(pieza.id);
    escribirJson(ruta, pieza);
    if (leerJson(ruta, null) === null) {
      // Se mide el DISCO, no la llamada. Si el borrador no quedo, la entrada no se mueve.
      sinGuardar.push({ entrada, pieza });
      linea(`  ! borrador NO GUARDADO ${pieza.id} — ${entrada.id} sigue pendiente de redaccion`);
      continue;
    }

    marcarRedactada(entrada.id, {
      redaccion_id: pieza.id,
      modelo: pieza.procedencia?.redactado?.modelo ?? null,
      corrida,
    });
    borradores.push({ entrada_id: entrada.id, pieza_id: pieza.id, ruta });
    linea(`redactar: BORRADOR ${pieza.id} — pendiente de verificacion`);

    if (redactor.alcanzado()) { topeAlcanzado = true; break; }
  }

  linea(`redactar: ${borradores.length} borradores nuevos, ${sinRedaccion.length} expedientes siguen esperando redactor`);
  if (redactor.invocar) linea(`redactor: ${redactor.cuantas()} llamada(s)${tope === null ? '' : ` de ${tope}`}`);
  if (topeAlcanzado) {
    linea(`== TOPE DE LLAMADAS ALCANZADO (EDITORIAL_MAX_LLAMADAS=${tope}): la corrida se detiene aqui.`);
    linea('   Lo que no se intento sigue pendiente en la bitacora y lo toma la corrida siguiente.');
  }
  linea(`estado: ${JSON.stringify(instantanea())}`);

  const erroresTotales = erroresDeteccion.length + erroresRedaccion.length;
  const parcial = erroresTotales > 0 || topeAlcanzado;
  linea(parcial
    ? `== EXITO PARCIAL: se produjo lo que si se pudo; ${erroresTotales} fallo(s) con constancia en estado/fallos.jsonl`
      + `${topeAlcanzado ? ' y la corrida se detuvo en el tope de llamadas' : ''}`
    : '== EXITO: sin fallos de acceso ni de esquema');

  return {
    corrida,
    parcial,
    detectados: items.length,
    nuevos: nuevos.length,
    yaPendientes: yaPendientes.length,
    repetidos: repetidos.length,
    // Los borradores escritos en esta corrida. No hay «insertadas»: no hay corpus.
    borradores,
    // Borradores compuestos que no quedaron en disco. Se reporta en vez de esconderse:
    // una corrida que compone tres piezas y guarda cero tiene que poder distinguirse.
    sinGuardar: sinGuardar.map(({ entrada, pieza }) => ({ entrada_id: entrada.id, pieza_id: pieza.id })),
    errores: [...erroresDeteccion, ...erroresRedaccion],
    pendientes: sinRedaccion.length,
    llamadas: redactor.cuantas(),
    tope,
    topeAlcanzado,
    estado: instantanea(),
  };
}

if (esCli(import.meta.url)) {
  // Antes de nada, y fuera del `try` de abajo: sin un directorio privado valido no hay
  // donde registrar un fallo, asi que intentar registrarlo volveria a lanzar y el
  // mensaje util se perderia detras de un stack. Se dice que pasa y se sale.
  //
  // Son DOS fallos distintos y los dos abortan igual: la variable no esta (§8.3, primera
  // prohibicion) o esta pero apunta dentro de un arbol de git (§8.3, tercera). El segundo
  // es el que sobrevive a quitar el `||`, y por eso no basta con mirar el primero.
  try {
    exigirDirectoriosPrivados();
  } catch (e) {
    if (!(e instanceof ConfiguracionAusente) && !(e instanceof DirectorioVersionado)) throw e;
    console.error(`generar: ABORTA — ${e.message}`);
    process.exit(1);
  }

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
    const r = await generar(banderas, inyeccion);
    process.exit(r.parcial ? 2 : 0);
  } catch (e) {
    registrarFallo({
      etapa: 'estado',
      codigo: 'CORRIDA_ABORTADA',
      mensaje: `${e.name}: ${e.message}`,
      consecuencia: 'la corrida no se completo; los pendientes siguen en la bitacora y se retoman en la siguiente',
    });
    console.error(`generar: FALLO ${e.stack}`);
    process.exit(1);
  }
}
