import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * La navegación del sitio, y los tres defectos medidos que fija.
 *
 * Los tres salen de `docs/brand/02-arquitectura-y-urls.md` §1 y §2, que los
 * documenta con `archivo:línea`:
 *
 * 1. **`/proyectos`, `/proyectos/[slug]` y `/evidencia` no montaban cromo.**
 *    Cada página montaba su propio `Navbar`/`Footer` y esas tres lo olvidaron.
 *    Eran callejones sin salida: se entraba por un enlace y no había forma de
 *    volver a ninguna parte.
 * 2. **El botón de menú móvil no abría nada.** Estaba dibujado, ocupaba su
 *    lugar y prometía un comportamiento que no ocurría: sin `onClick`, sin
 *    `aria-expanded`, sin estado, sin panel, y en un Server Component que no
 *    podía tener handler aunque se le escribiera uno. En móvil el sitio no
 *    tenía navegación: lo único clicable era el logo.
 * 3. **Los `href` se derivaban de la etiqueta.**
 *    `` `/#${item.toLowerCase().replace(" ", "-").replace("ó", "o")}` ``
 *    producía `/#sobre-mí` con acento, y el `id` real es `sobre-mi` sin él.
 *    El enlace estaba roto.
 *
 * ## Por qué estas pruebas leen el código fuente y no el DOM
 *
 * El repo corre `node --test` sin dependencias y sin red, y no hay biblioteca
 * de renderizado. Comprobar que la tecla Escape cierra el panel *de verdad*
 * necesita un DOM, así que lo que estas pruebas fijan es el **contrato
 * estructural** que lo hace posible: si alguien quita el `aria-controls`,
 * desliga el `aria-expanded` del estado o borra el manejo de Escape, se ponen
 * rojas.
 *
 * Lo que **no** pueden ver es un contrato bien escrito y mal conectado. Estas
 * pruebas no sustituyen a operar el menú en un navegador real, y esa pasada
 * —Chrome a 1280 y a 390, apertura, Escape, retorno de foco y navegación por
 * teclado— **está pendiente**: la hace Rodrigo a mano y sus hallazgos entran
 * por T-S6. Verde aquí significa «el cableado está declarado», no «el menú
 * funciona».
 *
 * ## La prueba que hace honesto al menú
 *
 * `DESTINOS` declara los siete destinos de `docs/brand/02` §2 y marca cuáles
 * existen hoy. La comprobación de anclas **no se salta los no disponibles por
 * cortesía**: los salta porque no se renderizan. En cuanto alguien marque
 * `disponible: true` sin haber creado la ruta o el `id`, esta prueba se pone
 * roja. El gate no es un comentario, es lo que la prueba vigila.
 */

export const RAIZ = fileURLToPath(new URL("..", import.meta.url));

export const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), "utf8");

/** Toda ruta renderizable del App Router: cada `app/**\/page.tsx`. */
export function paginas(): string[] {
  const encontradas: string[] = [];
  const recorrer = (dir: string) => {
    for (const entrada of readdirSync(join(RAIZ, dir), { withFileTypes: true })) {
      const hijo = `${dir}/${entrada.name}`;
      if (entrada.isDirectory()) recorrer(hijo);
      else if (entrada.name === "page.tsx") encontradas.push(hijo);
    }
  };
  recorrer("app");
  return encontradas.sort();
}

/** Los `layout.tsx` que envuelven a una página, del más cercano a la raíz. */
export function layoutsAncestros(pagina: string): string[] {
  const capas: string[] = [];
  let dir = dirname(pagina);
  for (;;) {
    const candidato = `${dir}/layout.tsx`;
    if (existsSync(join(RAIZ, candidato))) capas.push(candidato);
    if (dir === "app") break;
    dir = dirname(dir);
  }
  return capas;
}

const EXTENSIONES = [".tsx", ".ts"];

/** Resuelve un especificador de import a un archivo del repo, o `null`. */
function resolverImport(desde: string, especificador: string): string | null {
  let base: string;
  if (especificador.startsWith("@/")) base = especificador.slice(2);
  else if (especificador.startsWith(".")) {
    base = relative(RAIZ, resolve(RAIZ, dirname(desde), especificador)).split("\\").join("/");
  } else return null;

  for (const ext of EXTENSIONES) {
    if (existsSync(join(RAIZ, base + ext))) return base + ext;
    if (existsSync(join(RAIZ, `${base}/index${ext}`))) return `${base}/index${ext}`;
  }
  return null;
}

/**
 * El cierre transitivo de imports desde un archivo, dentro del repo.
 *
 * Un `id` de sección casi nunca vive en el `page.tsx`: vive en el componente
 * que la página monta. Buscar el `id` solo en la página daría un falso rojo;
 * buscarlo en todo el árbol daría un falso verde, porque encontraría un `id`
 * que **otra** ruta renderiza.
 */
export function cierreDeImports(entrada: string): string[] {
  const vistos = new Set<string>([entrada]);
  const pendientes = [entrada];
  while (pendientes.length > 0) {
    const actual = pendientes.pop()!;
    const fuente = leer(actual);
    for (const m of fuente.matchAll(/from\s+["']([^"']+)["']/g)) {
      const destino = resolverImport(actual, m[1]!);
      if (destino && !vistos.has(destino)) {
        vistos.add(destino);
        pendientes.push(destino);
      }
    }
  }
  return [...vistos];
}

