/**
 * `verificar` — la SEGUNDA etapa del canal (`docs/plataforma/02-editorial.md` §8.1).
 *
 *   toma lo que quedo en `pendiente_verificacion` -> comprueba hechos (§5.4) ->
 *   SELLA el mismo borrador privado, en su sitio
 *
 * Transicion: `pendiente_verificacion -> terminada`, o `-> fallida_reintentable`.
 *
 * ============================== QUE NO HACE, Y ES EL PUNTO ==============================
 *
 * **No redacta y no autoriza.** No importa `detectar.mjs`, ni `deduplicar.mjs`, ni
 * `redactar.mjs`, y no nombra el corpus publicado: si el borrador no esta, esta corrida no
 * lo fabrica —se genera, y eso es otra invocacion—. Y `terminada` significa exactamente
 * «borrador verificado, sin publicar»: publicar es la decision de un humano y la escribe
 * `autorizar.mjs`, que es la unica puerta al arbol publico (§8.1, regla 2).
 *
 * ================== POR QUE EL SELLO VA SOBRE EL MISMO ARCHIVO ==================
 *
 * §8.1, fila «Verificar», columna «que escribe», es exhaustiva: «El sello
 * `procedencia.verificado` sobre **ese mismo borrador privado**». No hay un corpus
 * intermedio donde dejar la pieza sellada, y no lo hay a proposito: mientras existio, la
 * pieza verificada vivia en un archivo y `autorizar` leia otro
 * —`$EDITORIAL_REDACCIONES_DIR/<id>.json`—, asi que los dos solo coincidian si quien
 * corria el canal apuntaba la variable a mano. Ahora los tres comandos resuelven la misma
 * ruta con `rutaBorrador()` y no hay nada que apuntar (§8.6, fila 2).
 *
 * ============ UN ESTADO TERMINAL SOLO SE ESCRIBE CON EL HECHO YA EN DISCO ============
 *
 * `terminada` es TERMINAL: una entrada que llega ahi no vuelve a la cola de deduplicacion
 * nunca. Por eso se marca **releyendo el borrador del disco** y comprobando que el sello
 * quedo escrito, no fiandose de que `writeFileSync` no lanzara. Lo que no quedo sellado se
 * queda en `pendiente_verificacion` y la corrida siguiente lo recupera; **no se registra
 * como fallo**, porque no tener donde escribir no es culpa de la entrada y contarlo como
 * intento la descartaria a las tres corridas —cambiar una perdida silenciosa por otra—.
 *
 * Codigos de salida:
 *   0  exito: todo lo pendiente se comprobo y se sello. **Nada quedo a medias.**
 *   2  EXITO PARCIAL: quedo trabajo sin terminar, en cualquiera de sus TRES formas —una
 *      pieza que no paso la verificacion, con constancia en `estado/fallos.jsonl` y la
 *      entrada reintentable (§5.5); una entrada de la cola sin borrador en disco; un sello
 *      que no llego al archivo—. Las dos ultimas **no registran fallo** a proposito (ver
 *      el parrafo de abajo), asi que el codigo de salida es lo unico que las hace visibles
 *      desde fuera: sin el, la corrida diria EXITO habiendo dejado piezas sin verificar.
 *   1  fallo: la corrida no pudo completarse.
 *
 * Uso:
 *   node scripts/editorial/verificar-canal.mjs
 *   node scripts/editorial/verificar-canal.mjs --limite 3
 *
 * Variables de entorno: las DOS obligatorias de §8.3, sin valor por defecto. Si falta
 * cualquiera, aborta antes de abrir un archivo y no escribe un byte.
 *   EDITORIAL_ESTADO_DIR       bitacora y fallos
 *   EDITORIAL_REDACCIONES_DIR  el borrador que se sella
 */

import { randomUUID } from 'node:crypto';
import {
  ConfiguracionAusente, DirectorioVersionado, ahoraIso, argumentos, esCli,
  escribirJson, exigirDirectoriosPrivados, leerJson, rutaBorrador,
} from './comun.mjs';
import {
  instantanea,
  marcarFallida,
  marcarVerificada,
  pendientesDeVerificacion,
  registrarFallo,
} from './estado.mjs';

/**
 * `verificar.mjs` —el motor de §5.4— se carga **en el momento de usarlo**. Asi una prueba
 * que inyecta un doble no arrastra la red de esa etapa, y el comando se puede probar
 * entero sin salir a internet.
 *
 * Aqui no aparecen `detectar`, `deduplicar` ni `redactar`, ni siquiera perezosos: este
 * comando no redacta (§8.1).
 */
async function resolverEtapas(etapas = {}) {
  const necesita = !etapas.verificarPieza || !etapas.sellarVerificacion;
  const ver = necesita ? await import('./verificar.mjs') : null;
  return {
    verificarPieza: etapas.verificarPieza ?? ver.verificarPieza,
    sellarVerificacion: etapas.sellarVerificacion ?? ver.sellarVerificacion,
  };
}

/**
 * El id de la pieza cuya entrada de bitacora es esta. `pieza_id` se escribe al verificar y
 * `redaccion_id` al redactar: en la cola de verificacion siempre hay lo segundo, y lo
 * primero solo en un reintento. Se miran los dos porque mirar uno dejaria invisible
 * justamente el caso que este comando existe para atender.
 */
export function idDePieza(entrada) {
  return entrada.pieza_id ?? entrada.redaccion_id ?? null;
}

/**
 * @param {object} [banderas]  {silencioso, limite}
 * @param {object} [inyeccion] {etapas} — solo para pruebas
 */
export async function verificarPendientes(banderas = {}, inyeccion = {}) {
  // PRIMERA LINEA, antes de abrir ningun archivo (§8.3).
  exigirDirectoriosPrivados();

  const corrida = randomUUID().slice(0, 8);
  const inicio = ahoraIso();
  const linea = (s) => { if (!banderas.silencioso) console.log(s); };
  const etapas = await resolverEtapas(inyeccion.etapas);

  linea(`== verificar ${corrida} · ${inicio}`);

  const cola = pendientesDeVerificacion(
    // Mismo cuidado que `--limite` en `generar`: cero tiene que llegar como cero.
    banderas.limite != null ? { limite: banderas.limite } : {},
  );
  linea(`pendientes de verificacion: ${cola.length} (incluyen lo no terminado de corridas anteriores)`);

  const selladas = [];
  const rechazadas = [];
  const sinBorrador = [];
  const sinSellar = [];

  for (const entrada of cola) {
    const piezaId = idDePieza(entrada);
    if (!piezaId) {
      // La entrada esta en la cola sin id de pieza. No es un fallo de verificacion ---no
      // hay nada que verificar--- y no le sube `intentos`: se dice y se deja donde estaba.
      sinBorrador.push({ entrada_id: entrada.id, pieza_id: null });
      linea(`verificar: OMITIDA ${entrada.id} — sin id de pieza en la bitacora`);
      continue;
    }

    const ruta = rutaBorrador(piezaId);
    const pieza = leerJson(ruta, null);
    if (pieza === null) {
      // Redactada antes y su borrador ya no esta en disco. No es un fallo del canal: es
      // trabajo que sigue pendiente, y se dice en vez de darlo por cerrado.
      sinBorrador.push({ entrada_id: entrada.id, pieza_id: piezaId });
      linea(`verificar: OMITIDA ${piezaId} — sin borrador en ${ruta}`);
      continue;
    }

    const informe = await etapas.verificarPieza(pieza);
    // El veredicto tiene TRES valores, no dos. `parcial` significa que no hay
    // contradicciones pero queda algo sin comprobar: la pieza sigue siendo un
    // borrador valido y se sella **con su veredicto a la vista**. Lo que no
    // recibe es el sello de verificacion completa.
    //
    // Antes esto leia `informe.ok`, un booleano. Un booleano solo tiene dos
    // casillas y el tercer estado --- «no encontre contradicciones pero tampoco
    // pude comprobarlo» --- caia en la casilla `true`. Ese colapso es el que
    // hacia que una pieza con una fuente leida de once saliera como OK.
    if (informe.veredicto === 'no_verificada') {
      rechazadas.push(marcarFallida(entrada.id, 'verificar', {
        codigo: 'VERIFICACION',
        mensaje: informe.fallos.join(' | ') || 'sin fallos enumerados',
        consecuencia: 'el borrador no queda sellado; la entrada queda reintentable y se revisa en la corrida siguiente',
        contexto: { pieza_id: piezaId },
      }, { corrida }));
      linea(`verificar: FALLA ${piezaId}`);
      for (const f of informe.fallos) linea(`    - ${f}`);
      for (const a of informe.avisos ?? []) linea(`    (aviso) ${a}`);
      continue;
    }

    const sellada = etapas.sellarVerificacion(pieza, informe);
    escribirJson(ruta, sellada);

    // Se mide el DISCO, no la variable en memoria ni que `escribirJson` no lanzara. Medir
    // contra el registro de la escritura en vez de contra el archivo escrito es la misma
    // clase de error que esta comprobacion cierra.
    const enDisco = leerJson(ruta, null);
    if (!selloEscrito(enDisco, sellada)) {
      sinSellar.push({ entrada_id: entrada.id, pieza_id: piezaId });
      linea(`verificar: NO SELLADA ${piezaId} — ${entrada.id} sigue PENDIENTE, no terminada`);
      continue;
    }

    marcarVerificada(entrada.id, { pieza_id: piezaId, corrida });
    selladas.push({ entrada_id: entrada.id, pieza_id: piezaId, veredicto: informe.veredicto });
    linea(`verificar: ${informe.veredicto.toUpperCase()}   ${piezaId} — ${informe.detalle}`);
    for (const a of informe.avisos ?? []) linea(`    (aviso) ${a}`);
  }

  for (const { pieza_id: id } of sinSellar) {
    linea(`sello: NO GUARDADO ${id} — la entrada se queda en pendiente_verificacion`);
  }

  linea(`verificar: ${selladas.length} sellada(s), ${rechazadas.length} rechazada(s), `
    + `${sinBorrador.length} sin borrador, ${sinSellar.length} sin sello guardado`);
  linea(`estado: ${JSON.stringify(instantanea())}`);

  // `parcial` son TRES cosas, no una, y las dos que se sumaron aqui son justamente las que
  // NO dejan rastro en `fallos.jsonl`: una entrada sin borrador en disco y un sello que no
  // llego al archivo no registran fallo —no es culpa de la entrada y contarlo como intento
  // la descartaria a las tres corridas—. Si tampoco salieran por el codigo, no saldrian por
  // ningun sitio: el comando decia EXITO y salia 0 habiendo dejado piezas sin verificar, y
  // el workflow lo pintaba verde. Un cero medido y un cero por falta de dato se ven igual y
  // significan lo opuesto; esta linea es la que los separa.
  const parcial = rechazadas.length > 0 || sinBorrador.length > 0 || sinSellar.length > 0;
  linea(parcial
    ? `== EXITO PARCIAL: ${rechazadas.length} rechazada(s) con constancia en estado/fallos.jsonl; `
      + `${sinBorrador.length} sin borrador y ${sinSellar.length} sin sello siguen pendientes`
    : '== EXITO: sin fallos de verificacion y sin nada pendiente');

  return {
    corrida,
    parcial,
    pendientes: cola.length,
    selladas,
    rechazadas: rechazadas.map((e) => ({ id: e.id, estado: e.estado, intentos: e.intentos })),
    sinBorrador,
    sinSellar,
    estado: instantanea(),
  };
}

/**
 * ¿El sello esta de verdad EN EL ARCHIVO? Dos condiciones, y las dos hacen falta:
 *
 *   1. lo releido del disco coincide con lo que se quiso escribir —si la escritura no
 *      llego, no hay sello por mucho que la variable en memoria lo tenga—;
 *   2. ese sello lleva `veredicto`, que es lo que distingue un borrador sellado de uno sin
 *      sellar. No es una forma inventada aqui: la escribe `verificar.mjs:629` y
 *      `autorizar.mjs` **se niega** si el veredicto no es uno de los tres de §5.4. Sin
 *      esta segunda condicion, un sellado que no hiciera nada dejaria la entrada en
 *      `terminada` —TERMINAL— con un borrador que nadie podra autorizar nunca.
 */
function selloEscrito(enDisco, sellada) {
  const delDisco = enDisco?.procedencia?.verificado ?? null;
  if (delDisco === null || delDisco.veredicto === undefined) return false;
  return JSON.stringify(delDisco) === JSON.stringify(sellada?.procedencia?.verificado ?? null);
}

if (esCli(import.meta.url)) {
  // Fuera del `try` de abajo, y por la misma razon que en `generar`: sin un directorio
  // privado valido no hay donde registrar un fallo, asi que intentar registrarlo volveria
  // a lanzar y el mensaje util se perderia detras de un stack.
  try {
    exigirDirectoriosPrivados();
  } catch (e) {
    if (!(e instanceof ConfiguracionAusente) && !(e instanceof DirectorioVersionado)) throw e;
    console.error(`verificar: ABORTA — ${e.message}`);
    process.exit(1);
  }

  const banderas = argumentos(process.argv.slice(2));

  try {
    const r = await verificarPendientes(banderas);
    process.exit(r.parcial ? 2 : 0);
  } catch (e) {
    registrarFallo({
      etapa: 'estado',
      codigo: 'CORRIDA_ABORTADA',
      mensaje: `${e.name}: ${e.message}`,
      consecuencia: 'la corrida no se completo; los pendientes siguen en la bitacora y se retoman en la siguiente',
    });
    console.error(`verificar: FALLO ${e.stack}`);
    process.exit(1);
  }
}
