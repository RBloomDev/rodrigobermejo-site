import { ESTADOS_MEXICO, TIPOS, VEREDICTOS } from "./esquema.ts";
import type { EstadoMexico, Etapa, Fuente, Pieza, Tipo, Veredicto } from "./esquema.ts";

/**
 * El modelo de vista de una pieza editorial: **todo lo que la pantalla muestra, y nada
 * que la pantalla no muestre.**
 *
 * ## Por qué existe esta capa
 *
 * `docs/plataforma/02-editorial.md` §1 deja la regla dura del canal: **«si no renderiza,
 * no se declara»**, y `01` §1.4 la vuelve requisito — «no hay campo obligatorio que no se
 * renderice». Eso hay que poder comprobarlo, y en este repositorio no se puede renderizar
 * un `.tsx` dentro de la suite: `node --test` corre con `--conditions=react-server`, donde
 * `react-dom/server` no existe, y el stripping de tipos de Node no transforma JSX.
 *
 * La salida es partir la pantalla en dos mitades comprobables:
 *
 * 1. **Este archivo**, puro y sin React, donde se decide qué texto sale de cada campo del
 *    registro. Las pruebas lo ejecutan de verdad, con una pieza de fixture.
 * 2. **Las páginas**, que renderizan cada propiedad de este modelo y ninguna otra cosa.
 *    `tests/noticias-cinco-preguntas.test.ts` recorre el AST de la página y exige que
 *    **cada** propiedad de este objeto aparezca renderizada: un campo que se quede fuera
 *    pone la prueba roja, que es exactamente lo que «si no renderiza, no se declara»
 *    significa.
 *
 * Verde aquí significa «el campo llega a la pantalla», no «la pantalla se ve bien». Lo
 * segundo es revisión y navegador.
 *
 * ## Por qué duplica el formateo de fechas de `lib/proof/proyectos-filtros.ts`
 *
 * Porque no puede importarlo. `01` §1.2, prohibición 1: `/noticias` y `/noticias/[slug]`
 * no importan **nada** de `lib/proof`. La frontera cuesta veinte líneas repetidas, y ese
 * es el precio correcto: un módulo compartido entre el editorial y la evidencia es la
 * primera arista por la que uno se deriva del otro.
 */

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

/**
 * `2026-09-12` → `12 de septiembre de 2026`. Absoluta y en prosa, nunca relativa: «hace
 * tres días» envejece mal en un sitio estático, donde el build puede ser de ayer.
 *
 * Lo que no reconoce se devuelve tal cual. La fecha de una fuente es texto libre en §3 —no
 * todas las fuentes publican en ISO— y silenciarla sería peor que enseñarla como viene.
 */
export function fechaEnProsa(valor: string): string {
  const [anio, mes, dia] = valor.slice(0, 10).split("-");
  const nombre = MESES[Number(mes) - 1];
  if (!anio || !dia || !nombre || !/^\d{4}-\d{2}-\d{2}/.test(valor)) return valor;
  return `${Number(dia)} de ${nombre} de ${anio}`;
}

/** `tipo` se renderiza **siempre** y de forma visible, nunca solo por color (§3, §1.4). */
export const TIPO_ETIQUETA: Record<Tipo, string> = {
  noticia: "Noticia",
  analisis: "Análisis",
  opinion: "Opinión",
};

/**
 * El estado de `mexico`, en palabras. Los cuatro valores de §2 se publican, `no_verificado`
 * incluido: «es un valor legítimo y se publica como tal». La etiqueta lo dice sin
 * disimularlo —sin ese estado, «en México» sería relleno retórico en cuanto no hay dato—.
 */
export const MEXICO_ETIQUETA: Record<EstadoMexico, string> = {
  aplica_con_datos_locales: "Aplica en México, con datos locales",
  aplica_sin_datos_locales: "Aplica en México, sin medición local",
  no_aplica: "No aplica en México",
  no_verificado: "No verificado en México",
};

export const ETAPA_ETIQUETA: Record<string, string> = {
  detectado: "Detectado",
  redactado: "Redactado",
  verificado: "Verificado",
  publicado: "Publicado",
};

/**
 * Los tres veredictos de §5.4, con lo que cada uno significa para el lector. La
 * explicación no repite la etiqueta: dice qué queda en pie y qué no.
 */
export const VEREDICTO_COPY: Record<Veredicto, { etiqueta: string; explicacion: string }> = {
  verificada: {
    etiqueta: "Verificación completa",
    explicacion:
      "Cada afirmación de esta pieza se comprobó contra las fuentes citadas: que la fuente " +
      "la sostiene, que su enlace resuelve y que las fechas coinciden.",
  },
  parcial: {
    etiqueta: "Verificación parcial",
    explicacion:
      "Parte de lo que dice esta pieza no se pudo comprobar contra sus fuentes. Lo que " +
      "quedó sin comprobar está enumerado aquí, en el cuerpo, y quien autorizó la " +
      "publicación aceptó esos límites por escrito.",
  },
  no_verificada: {
    etiqueta: "Sin verificación utilizable",
    explicacion:
      "La comprobación de afirmaciones no produjo un resultado usable. Una pieza así no es " +
      "autorizable, así que ver esta etiqueta en una pieza publicada es un defecto del canal.",
  },
};

/**
 * Una fuente, tal como se lee. **No lleva un booleano `esPrimaria`**: lo que la pantalla
 * enseña es `rol`, en palabras, y un campo que no se renderiza no se declara (§1). Cuál es
 * la primaria se dice con texto, porque una lista de enlaces sin decirlo no cumple §1.4.
 */
export type FuenteVista = {
  readonly titulo: string;
  readonly medio: string;
  readonly fecha: string;
  readonly url: string;
  readonly rol: string;
};

export type EtapaVista = {
  readonly clave: string;
  readonly etiqueta: string;
  readonly quien: string;
  readonly detalle: string;
};

export type RevisionVista = {
  readonly etiqueta: string;
  readonly explicacion: string;
  /** Las afirmaciones que quedaron sin comprobar. Van en el cuerpo, nunca al pie. */
  readonly pendientes: readonly string[];
  readonly tienePendientes: boolean;
};

/**
 * Una corrección, tal como la declare el corpus. §3 declara `correcciones[]` como arreglo
 * y **no fija sus claves**, así que aquí no se inventan: se enseña lo que la entrada trae,
 * en su orden, con su clave a la vista. `01` §1.4 exige renderizarlas «con fecha, y sin
 * borrar el texto corregido»; enseñarlo todo es la única forma de cumplirlo sin escribir
 * spec desde el código.
 */
export type CorreccionVista = {
  readonly campos: readonly { readonly clave: string; readonly valor: string }[];
};

/**
 * Todo lo que la ficha de una pieza enseña. **Cada propiedad de este tipo se renderiza**:
 * `tests/noticias-cinco-preguntas.test.ts` lo exige recorriendo el AST de la página, que
 * es la forma comprobable de «si no renderiza, no se declara». Por eso aquí no hay `id`
 * —la ruta ya lo conoce y la pantalla no lo enseña— ni ningún auxiliar de cálculo.
 */
export type PiezaVista = {
  readonly tipoEtiqueta: string;
  readonly titulo: string;
  readonly entradilla: string;
  /** Cuándo ocurrió el hecho. Distinto de `redactadoEn`, y rotulado distinto (§1.4). */
  readonly ocurridoEn: string;
  /** Cuándo se redactó la pieza. Nunca se presenta como la fecha del hecho. */
  readonly redactadoEn: string;
  readonly hecho: string;
  readonly queCambia: string;
  readonly mexico: { readonly etiqueta: string; readonly texto: string };
  readonly noEstablece: readonly string[];
  readonly revision: RevisionVista;
  readonly fuentePrimaria: FuenteVista;
  /** Todas las fuentes, la primaria incluida y marcada como tal. */
  readonly fuentes: readonly FuenteVista[];
  /** La declaración de conflicto de interés, o `null` si no hay relación que declarar. */
  readonly relacion: string | null;
  readonly procedencia: readonly EtapaVista[];
  readonly correcciones: readonly CorreccionVista[];
};

function fuenteAVista(fuente: Fuente, esPrimaria: boolean): FuenteVista {
  return {
    titulo: fuente.titulo,
    medio: fuente.medio,
    fecha: fechaEnProsa(fuente.fecha),
    url: fuente.url,
    rol: esPrimaria ? "Fuente primaria" : "Fuente secundaria",
  };
}

function etapaAVista(clave: string, etapa: Etapa): EtapaVista {
  return {
    clave,
    etiqueta: ETAPA_ETIQUETA[clave] ?? clave,
    quien: etapa.por,
    // El modelo que redactó es atribución, no adorno: §3 guarda el vínculo, nunca el
    // prompt. Si la etapa lo declara, se enseña junto a su detalle.
    detalle: [etapa.modelo, etapa.detalle].filter((t) => t && t.trim() !== "").join(" — "),
  };
}

function correccionAVista(entrada: unknown): CorreccionVista {
  if (typeof entrada === "string") {
    return { campos: [{ clave: "corrección", valor: entrada }] };
  }
  if (entrada === null || typeof entrada !== "object") {
    return { campos: [{ clave: "corrección", valor: String(entrada) }] };
  }
  return {
    campos: Object.entries(entrada as Record<string, unknown>).map(([clave, valor]) => ({
      clave,
      valor: typeof valor === "string" ? valor : JSON.stringify(valor),
    })),
  };
}

/**
 * La revisión de afirmaciones, tal como se lee en pantalla.
 *
 * `procedencia.verificado.pendientes` es el conjunto que un humano aceptó al autorizar
 * (§8.8). Aquí se saca a la superficie en vez de dejarlo dentro del bloque de procedencia:
 * un veredicto `parcial` sin sus pendientes a la vista es una pieza que parece comprobada.
 */
export function revisionDePieza(pieza: Pieza): RevisionVista {
  const sello = pieza.procedencia.verificado;
  const pendientes = sello.pendientes ?? [];
  const veredicto = sello.veredicto;
  const copy =
    veredicto && VEREDICTOS.includes(veredicto)
      ? VEREDICTO_COPY[veredicto]
      : {
          etiqueta: "Verificación no declarada",
          explicacion:
            "Esta pieza no declara con qué resultado se comprobaron sus afirmaciones. No " +
            "se asume ninguno: lo que no está declarado no se da por hecho.",
        };
  return {
    etiqueta: copy.etiqueta,
    explicacion: copy.explicacion,
    pendientes,
    tienePendientes: pendientes.length > 0,
  };
}

/** El registro completo de una pieza, convertido en lo que la pantalla enseña. */
export function vistaDePieza(pieza: Pieza): PiezaVista {
  const urlPrimaria = pieza.fuente_primaria.url;
  const esPrimaria = (f: Fuente) => f.tipo === "primaria" || f.url === urlPrimaria;
  // La primaria primero, y el resto en el orden en que la pieza las declara. El criterio
  // es el papel de la fuente, no ninguna magnitud: no hay nada que ordenar por tamaño.
  const declaradas = [...pieza.fuentes.filter(esPrimaria), ...pieza.fuentes.filter((f) => !esPrimaria(f))];
  const fuentes = declaradas.map((f) => fuenteAVista(f, esPrimaria(f)));

  return {
    tipoEtiqueta: TIPO_ETIQUETA[pieza.tipo],
    titulo: pieza.titulo,
    entradilla: pieza.entradilla,
    ocurridoEn: fechaEnProsa(pieza.ocurrido_en),
    redactadoEn: fechaEnProsa(pieza.redactado_en),
    hecho: pieza.hecho,
    queCambia: pieza.que_cambia,
    mexico: {
      etiqueta: MEXICO_ETIQUETA[pieza.mexico.estado],
      texto: pieza.mexico.texto,
    },
    noEstablece: pieza.no_establece,
    revision: revisionDePieza(pieza),
    fuentePrimaria: fuenteAVista(pieza.fuente_primaria, true),
    // Si la primaria no aparece en `fuentes[]` se añade al frente: §1.4 pide renderizar
    // `fuente_primaria` **y** `fuentes[]`, y una lista que se la salte deja al lector sin
    // saber cuál sostiene el hecho.
    fuentes: pieza.fuentes.some(esPrimaria)
      ? fuentes
      : [fuenteAVista(pieza.fuente_primaria, true), ...fuentes],
    relacion:
      typeof pieza.relacion_declarada === "string" && pieza.relacion_declarada.trim() !== ""
        ? pieza.relacion_declarada
        : null,
    procedencia: Object.entries(pieza.procedencia).map(([clave, etapa]) =>
      etapaAVista(clave, etapa),
    ),
    correcciones: (pieza.correcciones ?? []).map(correccionAVista),
  };
}

export type EntradaDeIndice = {
  readonly id: string;
  readonly href: string;
  readonly tipoEtiqueta: string;
  readonly titulo: string;
  readonly entradilla: string;
  readonly ocurridoEn: string;
};

/**
 * El índice: `tipo`, `titulo`, `entradilla` y `ocurrido_en`, y nada más (§1.4).
 *
 * Sin destacados, sin «más leído» y sin pieza principal de mayor tamaño —eso último es un
 * ranking dibujado—. El orden cronológico descendente lo fija la lectura del corpus, no
 * esta función: ordenar dos veces invita a que las dos discrepen.
 */
export function vistaDeIndice(piezas: readonly Pieza[]): EntradaDeIndice[] {
  return piezas.map((p) => ({
    id: p.id,
    href: `/noticias/${p.id}`,
    tipoEtiqueta: TIPO_ETIQUETA[p.tipo],
    titulo: p.titulo,
    entradilla: p.entradilla,
    ocurridoEn: fechaEnProsa(p.ocurrido_en),
  }));
}

/** Enumeraciones reexportadas para que una sonda las recorra sin copiarlas a mano. */
export { ESTADOS_MEXICO, TIPOS, VEREDICTOS };
