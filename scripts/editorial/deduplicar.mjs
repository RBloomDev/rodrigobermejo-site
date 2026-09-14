/**
 * Etapa 2 — Deduplicar (`docs/plataforma/02-editorial.md` §5.2).
 *
 * Los tres niveles, en orden, y cada uno atrapa lo que el anterior no ve:
 *
 *   1. URL canonica normalizada — sin `utm_*`, sin fragmento, sin barra final.
 *      Atrapa el mismo articulo llegando por dos campañas distintas.
 *   2. Huella `sha256` del titulo normalizado + el dominio del medio que lo publica.
 *      Atrapa el mismo articulo republicado en otra URL del mismo medio.
 *   3. La bitacora de `estado.mjs`, plegada. Atrapa la SEGUNDA EJECUCION.
 *
 * ============================ QUE CAMBIO, Y POR QUE IMPORTA ============================
 *
 * El nivel 3 lo sostenia `vistos.jsonl`, y ese registro tenia un solo bit: visto o no
 * visto. Un item se marcaba visto **al detectarlo**, asi que una entrada que no llegaba a
 * redactarse, o que fallaba verificando, o que quedaba a medias porque el proceso murio,
 * se perdia para siempre: la corrida siguiente la leia como «ya vista». Idempotencia
 * comprada al precio de perder pendientes.
 *
 * Ahora el nivel 3 pregunta por el ESTADO, no por un bit:
 *
 *   - `terminada`  -> es repetida de verdad. Ya hay pieza. No vuelve a entrar.
 *   - `descartada` -> se cerro con motivo. No vuelve a entrar sin `reabrir()`.
 *   - cualquier estado pendiente o reintentable -> **NO es repetida**: es la misma cosa
 *     que sigue sin terminarse. Sale en `yaPendientes`, y el orquestador la retoma.
 *
 * ============================ LA IDENTIDAD ES EL HECHO ============================
 *
 * La version anterior metia en el indice de «ya visto» **todas las URL de `fuentes[]` de
 * todas las piezas del corpus**, incluida `fuente_primaria`. Eso confunde la identidad de
 * una pieza con sus referencias: bastaba que una pieza publicada citara un documento para
 * que ese documento —y cualquier hecho que viviera en esa URL— quedara borrado del canal
 * para siempre, en silencio, sin una sola linea en ningun log.
 *
 * Dos noticias distintas que citan el mismo documento son **dos hechos**. Compartir una
 * referencia no las hace la misma cosa. Del corpus, por tanto, solo se toma la identidad
 * de cada pieza (`huella`, que viene del item detectado), nunca sus `fuentes[]`.
 */

import { plegar } from './estado.mjs';

/**
 * @param {object[]} items  items de `detectar()`
 * @param {object} [opciones]
 * @param {object[]} [opciones.piezas]  corpus actual de `piezas.json`
 * @param {object} [opciones.indice]    resultado de `estado.plegar()`; se pliega si falta
 * @returns {{nuevos: object[], yaPendientes: object[], repetidos: object[]}}
 *   - `nuevos`       hechos que la bitacora no conoce
 *   - `yaPendientes` hechos que la bitacora ya conoce y que **siguen sin terminar**
 *   - `repetidos`    hechos cerrados (`terminada`/`descartada`) o repetidos en el lote
 */
export function deduplicar(items, { piezas = [], indice = plegar() } = {}) {
  const { entradas, porUrl, porHuella } = indice;

  // Del corpus solo entra la identidad de la pieza. `fuentes[]` NO. Ver el encabezado.
  const huellasDelCorpus = new Set(
    (piezas ?? []).map((p) => p?.huella).filter(Boolean),
  );

  const nuevos = [];
  const yaPendientes = [];
  const repetidos = [];
  const urlsLote = new Set();
  const huellasLote = new Set();

  for (const item of items) {
    if (urlsLote.has(item.url_canonica)) {
      repetidos.push({ ...item, motivo: 'nivel_1_url_canonica_en_el_mismo_lote' });
      continue;
    }
    if (huellasLote.has(item.huella)) {
      repetidos.push({ ...item, motivo: 'nivel_2_huella_en_el_mismo_lote' });
      continue;
    }
    urlsLote.add(item.url_canonica);
    huellasLote.add(item.huella);

    const id = porUrl.get(item.url_canonica) ?? porHuella.get(item.huella);
    const previa = id ? entradas.get(id) : null;

    if (previa?.estado === 'terminada') {
      repetidos.push({ ...item, id, motivo: 'nivel_3_ya_terminada_en_la_bitacora' });
      continue;
    }
    if (previa?.estado === 'descartada') {
      repetidos.push({
        ...item,
        id,
        motivo: `nivel_3_descartada_en_la_bitacora: ${previa.motivo_descarte ?? 'sin motivo'}`,
      });
      continue;
    }
    if (previa) {
      // Conocida pero sin terminar. NO es un duplicado: es trabajo que sigue pendiente.
      yaPendientes.push({ ...item, id, estado: previa.estado });
      continue;
    }
    if (huellasDelCorpus.has(item.huella)) {
      // El corpus sobrevivio a la bitacora (o viene de otra maquina). La pieza existe;
      // el hecho esta cerrado aunque el log local no lo sepa.
      repetidos.push({ ...item, motivo: 'nivel_2_huella_ya_tiene_pieza_en_el_corpus' });
      continue;
    }
    nuevos.push(item);
  }

  return { nuevos, yaPendientes, repetidos };
}
