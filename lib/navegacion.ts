/**
 * Los destinos del menú, declarados una sola vez.
 *
 * ## Por qué `{ etiqueta, href }` explícito y no derivado
 *
 * `components/Navbar.tsx` construía el `href` a partir de la etiqueta:
 *
 * ```ts
 * `/#${item.toLowerCase().replace(" ", "-").replace("ó", "o")}`
 * ```
 *
 * Evaluado tal cual, `"Sobre mí"` producía `/#sobre-mí` **con acento**, porque
 * el `.replace("ó", "o")` solo cubría la `ó` de `"Solución"`. El `id` real es
 * `sobre-mi` sin acento, así que ese enlace del menú no llevaba a ninguna parte.
 *
 * Derivar la URL del texto acopla las dos cosas: cambiar una palabra del menú
 * mueve un enlace. Aquí la etiqueta y el destino se declaran juntos y por
 * separado, que es lo que pide `docs/brand/02-arquitectura-y-urls.md` §2.
 *
 * ## De dónde sale cada columna
 *
 * - **Los destinos** los manda `docs/brand/02-arquitectura-y-urls.md` §2.
 * - **Las etiquetas** las manda `docs/brand/03-copy-deck.md` §3, que es la
 *   autoridad única del texto del sitio.
 *
 * Ninguna de las dos se inventa en el código. «Noticias» la añadió S-B y solo
 * aparece en §2.
 *
 * ## `disponible`: por qué existe y qué NO significa
 *
 * §2 describe el mapa de rutas **después** del rediseño, y esta bandera dice
 * qué parte de ese mapa existe ya en el árbol. Medido de nuevo el 2026-09-24,
 * enumerando `app/**\/page.tsx`: existen `/proyectos`, `/blog`, `/colaborar`,
 * `/sobre-mi` y `/noticias`, y los `id` `inadaptados` y `docencia` viven en
 * `app/sobre-mi/page.tsx`. **Los siete destinos de §2 están disponibles**; la
 * bandera se queda porque el mapa de §2 puede volver a crecer antes que el
 * árbol —`/actividad` no está en el menú por decisión de §2, no por ausencia—.
 *
 * Renderizar los siete hoy publicaría cinco enlaces muertos en la navegación
 * principal de un sitio público. Esta bandera no es una opinión de producto:
 * es el estado medido del árbol, y `tests/enlaces-de-navegacion.test.ts` la vigila — en
 * cuanto alguien marque `true` sin que la ruta o el `id` existan, la prueba se
 * pone roja.
 *
 * Cuando el work item que construye cada ruta aterrice, se cambia la bandera y
 * el destino entra al menú. La tabla completa vive aquí desde hoy, a propósito:
 * el contrato es el de §2, no el subconjunto que alcanzamos a construir.
 */

export type Destino = {
  /** El texto visible. Autoridad: `docs/brand/03-copy-deck.md` §3. */
  readonly etiqueta: string;
  /** La URL. Autoridad: `docs/brand/02-arquitectura-y-urls.md` §2. */
  readonly href: string;
  /** ¿La ruta —y su `id`, si el href lleva fragmento— existe en este árbol? */
  readonly disponible: boolean;
};

export const DESTINOS: readonly Destino[] = [
  { etiqueta: "Trabajo", href: "/proyectos", disponible: true },
  // `/noticias` existe desde el work item que la construyo: `app/noticias/page.tsx` y
  // `app/noticias/[slug]/page.tsx`. Enlazarla desde el cromo es lo que `docs/brand/02`
  // §2 manda y lo que `docs/plataforma/01-noticias-y-actividad.md` §1.2 declara
  // permitido: un menu identico en todas las paginas no afirma nada sobre ninguna, asi
  // que esta entrada en `/evidencia` no convierte el editorial en evidencia.
  { etiqueta: "Noticias", href: "/noticias", disponible: true },
  { etiqueta: "Inadaptados", href: "/sobre-mi#inadaptados", disponible: true },
  { etiqueta: "Docencia", href: "/sobre-mi#docencia", disponible: true },
  { etiqueta: "Escribo", href: "/blog", disponible: true },
  { etiqueta: "Trayectoria", href: "/sobre-mi", disponible: true },
  { etiqueta: "Trabajar conmigo", href: "/colaborar", disponible: true },
];

/** Lo que el menú renderiza hoy. Enlazar no es importar: `docs/brand/02` §3. */
export const DESTINOS_VISIBLES: readonly Destino[] = DESTINOS.filter((d) => d.disponible);
