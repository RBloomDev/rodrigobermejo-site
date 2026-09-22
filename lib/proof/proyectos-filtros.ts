/**
 * `/proyectos` · la vista de un proyecto y los tres filtros, **sin nada de servidor**.
 *
 * Este módulo lo importa un Client Component, así que no puede tocar `node:fs`
 * ni `server-only`, y **no importa `./schema.ts`**: arrastraría zod al bundle del
 * cliente para leer una constante de tres elementos. El precio de esa decisión
 * es que el orden de las dimensiones se declara dos veces, y ese precio lo paga
 * `tests/proyectos-filtros.test.ts`, que compara las dos listas y se pone rojo si
 * se separan.
 *
 * ## Qué autoriza los filtros, y hasta dónde
 *
 * Las autorizaciones **D** y **E** de `decisions/0015` §4, aterrizadas en
 * `docs/plataforma/01-noticias-y-actividad.md` §4: por proyecto, por periodo y
 * por dimensión, **solo** en `/proyectos` y `/actividad`. En `/evidencia` la
 * regla sigue entera —`dimension` es una etiqueta, no un filtro— y ahí el índice
 * se muestra completo y en orden de Registry.
 *
 * ## Las tres reglas que la forma de este módulo impone
 *
 * 1. **El filtrado no reordena.** `filtrarProyectos` preserva el orden de entrada,
 *    que es el del Registry. Ordenar por magnitud sería un ranking (§2.3), y un
 *    orden que el usuario elige sigue siendo un ranking que la pantalla construye.
 * 2. **Las opciones no saben cuántos resultados producen.** `opcionesDe*`
 *    devuelve `valor` y `etiqueta`, y nada más: no hay dónde colgar un conteo por
 *    opción, que es el eje de comparación que la autorización E evita.
 * 3. **Sin filtro por defecto.** `FILTROS_VACIOS` es el estado inicial y muestra
 *    el conjunto completo (§4.4.4).
 */

/** El orden del contrato (`docs/05`: `dimension: build|lead|teach`), nunca por magnitud. */
export const DIMENSIONES_EN_ORDEN = ["build", "lead", "teach"] as const;

export type Dimension = (typeof DIMENSIONES_EN_ORDEN)[number];

/** Copy de `docs/brand/03-copy-deck.md` §2, que es la autoridad sobre el texto. */
export const DIMENSION_COPY: Record<Dimension, string> = {
  build: "Construyo",
  lead: "Dirijo",
  teach: "Formo",
};

/** Los cuatro contextos del contrato. Misma duplicación deliberada que arriba. */
export const CONTEXTOS = ["personal", "rbloomdev", "inadaptados", "client"] as const;

export type Contexto = (typeof CONTEXTOS)[number];

/**
 * El contexto en copy público. No es una descripción de la plantilla: `context`
 * dice bajo qué contexto y **para quién** se hizo el trabajo
 * (`docs/02-domain-and-evidence-model.md` §Validación de solapamiento).
 */
export const CONTEXT_COPY: Record<Contexto, string> = {
  personal: "personal",
  rbloomdev: "RBloomDev",
  inadaptados: "Inadaptados",
  client: "un encargo de un tercero",
};

/**
 * Los contextos que `docs/` declara **colectivos**, y solo esos.
 *
 * Hoy uno: `docs/brand/00-brand-brief.md` §Lo que no se dice nombra a Inadaptados
 * —y a nadie más— como «una organización con equipo», y de ahí sale el mandato de
 * atribuir el crédito al equipo. Los otros tres contextos **no** tienen ese
 * respaldo: `docs/00-product-brief.md` dice de RBloomDev que «es la organización
 * que opera el sitio», sin atribuirle más gente, y `client` dice para quién se
 * hizo el trabajo, no con cuánta gente.
 *
 * Por qué importa que la lista sea corta: afirmar «el crédito es del equipo»
 * sobre un contexto que el contrato no declara colectivo publica una cota
 * inferior de dos personas sobre la plantilla de un tercero —eso es inferencia, y
 * `decisions/0015` §5 dice literalmente que la enmienda «no pide autorizar
 * inferencia alguna»—. `tests/credito-sin-afirmar-equipo.test.ts` lo sostiene
 * midiendo esta lista contra la línea de `docs/brand/00` que la respalda.
 */
export const CONTEXTOS_COLECTIVOS: ReadonlySet<string> = new Set(["inadaptados"]);

/**
 * La frase de **crédito** de una fila, en un solo sitio.
 *
 * Vive aquí y no en cada superficie porque `/proyectos` y `/proyectos/[slug]`
 * tienen que decir lo mismo: dos redacciones en paralelo divergirían en el primer
 * cambio y una de las dos acabaría afirmando de más sin que nada fallara.
 *
 * Las dos ramas sostienen la distinción de `decisions/0015` §4-ter —trabajo
 * colectivo no es contribución personal— sin colapsarla al revés: donde el
 * contrato declara equipo, el crédito es del equipo; donde no lo declara, no se
 * afirma ni equipo ni autoría exclusiva, porque el feed no guarda personas y no
 * hay de dónde saberlo.
 */
export function creditoDe(contexto: string): string {
  const nombre = CONTEXT_COPY[contexto as Contexto] ?? contexto;
  if (CONTEXTOS_COLECTIVOS.has(contexto)) {
    return (
      `Trabajo en el contexto de ${nombre}, que es una organización con equipo: el crédito ` +
      "es del equipo. Qué parte del trabajo es de quién no se publica, porque esa cifra " +
      "describiría a personas que no lo decidieron."
    );
  }
  return (
    `Contexto declarado en el feed: ${nombre}. El feed guarda el rol y el contexto, nunca a ` +
    "las personas, así que aquí no se atribuye autoría exclusiva ni se publica ningún reparto."
  );
}

/**
 * Un proyecto listo para pintar: serializable, sin nada del lector de feed.
 *
 * **No hay campo de imagen, y su ausencia es la regla.** Publicar la captura de
 * un proyecto es abrir superficie pública nueva, y quién autoriza un activo
 * —contra qué se comprueba esa autorización, y qué pasa cuando el Registry
 * cambia la visibilidad de un proyecto— no está escrito en `docs/`.
 * `docs/03-privacy-and-publication-policy.md` §7 pone esa decisión fuera del
 * alcance de un agente. Mientras no exista, el modelo de vista no puede
 * transportar una imagen: `tests/proyectos-artefactos.test.ts` se pone rojo si
 * aparece el campo o si una superficie de `/proyectos` importa `next/image`.
 */
export interface ProyectoVista {
  id: string;
  titulo: string;
  tesis: string;
  tipo: string;
  estado: string;
  /** `YYYY-MM-DD` del inicio declarado. */
  inicio: string;
  /** El mismo inicio, en prosa: «junio de 2026». */
  inicioEnProsa: string;
  finEnProsa: string | null;
  /** Las dimensiones de los claims que citan al proyecto, en orden de contrato. */
  dimensiones: Dimension[];
  /** Rol declarado en el feed, en copy público. */
  rol: string;
  /**
   * El contexto declarado, **en clave de contrato**. La traducción a copy y la
   * frase de crédito las hace `creditoDe`, para que las dos superficies digan lo
   * mismo y ninguna pueda afirmar por su cuenta cuántas manos hubo.
   */
  contexto: Contexto;
  tieneFuentesPrivadas: boolean;
  fuentesPublicas: { tipo: string; url: string }[];
}

export interface Filtros {
  dimension: Dimension | "todas";
  proyecto: string;
  periodo: string;
}

export const FILTROS_VACIOS: Filtros = {
  dimension: "todas",
  proyecto: "todos",
  periodo: "todo",
};

export interface Opcion<T extends string = string> {
  valor: T;
  etiqueta: string;
}

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
 * `2026-08-28` → `28 de agosto de 2026`.
 *
 * Absoluta y en prosa, que es lo que pide el contrato de presentación de
 * `docs/05`: «hace 3 días» convierte la frescura en métrica y a los dos meses el
 * sitio se autodenuncia como abandonado. Se parte la cadena a mano en vez de
 * construir un `Date`, porque un `Date` la interpretaría en la zona horaria del
 * servidor de build y podría devolver el día anterior.
 */
export function fechaEnProsa(iso: string): string {
  const [anio, mes, dia] = iso.slice(0, 10).split("-");
  const nombre = MESES[Number(mes) - 1];
  if (!anio || !dia || !nombre) return iso;
  return `${Number(dia)} de ${nombre} de ${anio}`;
}

/** `2026-06-01` → `junio de 2026`. El grano del inicio declarado es el mes. */
export function mesEnProsa(iso: string): string {
  const [anio, mes] = iso.slice(0, 10).split("-");
  const nombre = MESES[Number(mes) - 1];
  if (!anio || !nombre) return iso;
  return `${nombre} de ${anio}`;
}

export function opcionesDeDimension(): Opcion<Dimension | "todas">[] {
  return [
    { valor: "todas", etiqueta: "Todas" },
    ...DIMENSIONES_EN_ORDEN.map((d) => ({ valor: d, etiqueta: DIMENSION_COPY[d] })),
  ];
}

/** Los proyectos del Registry, en su orden. Nunca ordenados por nada que se cuente. */
export function opcionesDeProyecto(proyectos: ProyectoVista[]): Opcion[] {
  return [
    { valor: "todos", etiqueta: "Todos" },
    ...proyectos.map((p) => ({ valor: p.id, etiqueta: p.titulo })),
  ];
}

/**
 * El periodo es el del **inicio declarado** del proyecto, y la etiqueta lo dice.
 *
 * No es un filtro sobre actividad: de actividad no hay artefacto publicado
 * (`docs/plataforma/01` §5.3), y un control que insinuara filtrarla prometería un
 * dato que no existe.
 */
export function opcionesDePeriodo(proyectos: ProyectoVista[]): Opcion[] {
  const anios = [...new Set(proyectos.map((p) => p.inicio.slice(0, 4)))].sort();
  const primero = proyectos.map((p) => p.inicio).sort()[0];
  const ultimo = proyectos.map((p) => p.inicio).sort().at(-1);

  const rango =
    primero && ultimo
      ? `Todo el rango, de ${mesEnProsa(primero)} a ${mesEnProsa(ultimo)}`
      : "Todo el rango";

  return [
    { valor: "todo", etiqueta: rango },
    ...anios.map((a) => ({ valor: a, etiqueta: `Inicio declarado en ${a}` })),
  ];
}

/**
 * El subconjunto que cumple los tres filtros, **en el orden de entrada**.
 *
 * Un proyecto sin afirmación no tiene dimensión: desaparece en cuanto se filtra
 * por una, y la pantalla lo dice en vez de dejar que parezca que se perdió.
 */
export function filtrarProyectos(
  proyectos: ProyectoVista[],
  filtros: Filtros,
): ProyectoVista[] {
  return proyectos.filter((p) => {
    if (filtros.dimension !== "todas" && !p.dimensiones.includes(filtros.dimension)) return false;
    if (filtros.proyecto !== "todos" && p.id !== filtros.proyecto) return false;
    if (filtros.periodo !== "todo" && p.inicio.slice(0, 4) !== filtros.periodo) return false;
    return true;
  });
}
