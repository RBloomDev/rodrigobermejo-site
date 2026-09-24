import { z } from "zod";

/**
 * El registro editorial publicado, en zod. **Derivado de
 * `docs/plataforma/02-editorial.md` §2 y §3, que son la autoridad.** Si este archivo y esa
 * prosa dicen cosas distintas, este archivo está mal.
 *
 * ## Por qué el esquema es CERRADO y el del feed no
 *
 * `lib/proof/schema.ts` es permisivo a propósito: la regla 3 de `docs/05` obliga al
 * consumidor a ignorar campos que no conoce, porque el productor es otro repositorio y
 * puede publicar un `v1.1` compatible. Aquí pasa lo contrario. §3 declara el esquema
 * **cerrado** —«lo que no está enumerado se rechaza, no se ignora»— y el comando de
 * autorización lo impone al escribir. Un campo de más en una pieza publicada no es una
 * versión nueva del contrato: es algo que nadie autorizó, y en un repositorio público eso
 * ya está publicado. Se rechaza.
 *
 * ## Qué NO define este archivo, y es una ausencia de la spec, no un olvido
 *
 * La forma de una entrada de `correcciones[]`. §3 la declara como arreglo y no fija sus
 * claves; `01` §1.4 sí exige renderizarlas «con fecha, y sin borrar el texto corregido».
 * Inventar aquí `{ fecha, texto }` sería escribir spec desde el código, así que el tipo es
 * abierto y la pantalla renderiza lo que la entrada declare, en su orden, sin descartar
 * nada. Queda registrado como defecto de documentación.
 */

/** Fecha de calendario. `ocurrido_en` es un día, no un instante (§3). */
const fecha = z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/);

/** El `id` es también el nombre del archivo y el slug de la ruta (§3). */
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const cadenaLlena = z.string().trim().min(1);

export const TIPOS = ["noticia", "analisis", "opinion"] as const;
export const ESTADOS = ["borrador", "autorizada"] as const;
export const ESTADOS_MEXICO = [
  "aplica_con_datos_locales",
  "aplica_sin_datos_locales",
  "no_aplica",
  "no_verificado",
] as const;
/** Los tres veredictos de §5.4. `no_verificada` no es publicable (§8.8). */
export const VEREDICTOS = ["verificada", "parcial", "no_verificada"] as const;
export const ETAPAS = ["detectado", "redactado", "verificado", "publicado"] as const;

export const fuenteSchema = z.strictObject({
  titulo: cadenaLlena,
  medio: cadenaLlena,
  url: cadenaLlena,
  fecha: cadenaLlena,
  tipo: z.enum(["primaria", "secundaria"]).optional(),
});

/**
 * Una etapa de procedencia. `veredicto` y `pendientes` cuelgan de `verificado` en la
 * práctica, pero §3 los admite en cualquier etapa y el comando de autorización los valida
 * «donde aparezcan»: el esquema no es más estrecho que la autoridad.
 */
export const etapaSchema = z.strictObject({
  por: cadenaLlena,
  detalle: z.string().optional(),
  modelo: z.string().optional(),
  veredicto: z.enum(VEREDICTOS).optional(),
  pendientes: z.array(cadenaLlena).optional(),
});

export const piezaSchema = z.strictObject({
  id: slug,
  tipo: z.enum(TIPOS),
  titulo: cadenaLlena,
  entradilla: cadenaLlena,
  estado: z.enum(ESTADOS),
  ocurrido_en: fecha,
  redactado_en: cadenaLlena,
  hecho: cadenaLlena,
  que_cambia: cadenaLlena,
  mexico: z.strictObject({
    estado: z.enum(ESTADOS_MEXICO),
    // «No se sabe» también se escribe (§2): el texto nunca queda vacío.
    texto: cadenaLlena,
  }),
  // Mínimo 1: si no se sabe qué no prueba, la pieza no está lista (§3).
  no_establece: z.array(cadenaLlena).min(1),
  fuente_primaria: fuenteSchema,
  // Mínimo 2: con una sola, la pieza no se redacta (§2).
  fuentes: z.array(fuenteSchema).min(2),
  relacion_declarada: z.string().nullable().optional(),
  procedencia: z.strictObject({
    detectado: etapaSchema,
    redactado: etapaSchema,
    verificado: etapaSchema,
    publicado: etapaSchema,
  }),
  huella: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  correcciones: z.array(z.unknown()).optional(),
});

export type Pieza = z.infer<typeof piezaSchema>;
export type Fuente = z.infer<typeof fuenteSchema>;
export type Etapa = z.infer<typeof etapaSchema>;
export type Tipo = (typeof TIPOS)[number];
export type EstadoMexico = (typeof ESTADOS_MEXICO)[number];
export type Veredicto = (typeof VEREDICTOS)[number];
