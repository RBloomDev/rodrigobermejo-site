import ts from "typescript";

/**
 * Sondas sobre el **árbol sintáctico** de las páginas de `/noticias`.
 *
 * ## Por qué el AST y no un `includes()`
 *
 * Porque las preguntas que hay que responder son estructurales, y una cadena no las
 * distingue: «¿este texto se renderiza dentro de un `<details>`?» tiene respuestas
 * opuestas para dos fuentes que contienen exactamente las mismas palabras. El precedente
 * está en `tests/presentacion-fecha-y-metadatos.test.ts`, que ya lee los metadatos con
 * `typescript` en vez de con una expresión regular.
 *
 * ## Por qué no se renderiza la página y se inspecciona el HTML
 *
 * Porque no se puede en esta suite, y conviene que quede escrito para que su verde no se
 * lea de más: `npm test` corre `node --test --conditions=react-server`, donde
 * `react-dom/server` **no existe**, y el stripping de tipos de Node no transforma JSX, así
 * que un `.tsx` ni siquiera se puede importar. Estas sondas fijan el **contrato
 * estructural** de la pantalla —qué se renderiza y dentro de qué—, no su aspecto. Operar
 * la ruta en un navegador sigue siendo trabajo de revisión.
 */

/**
 * La fuente sin sus comentarios. Un archivo que **nombra** algo no depende de ello: la
 * página explica en su cabecera por qué no lee el prototipo y por qué no promete fechas, y
 * una sonda que mire el texto crudo se pondría roja justo por la documentación que la
 * regla exige escribir. El `[^:]` deja fuera el `//` de una URL.
 */
export function sinComentarios(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

export function ast(fuente: string): ts.SourceFile {
  return ts.createSourceFile("pagina.tsx", fuente, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function recorrer(nodo: ts.Node, visitar: (n: ts.Node) => void): void {
  visitar(nodo);
  ts.forEachChild(nodo, (hijo) => recorrer(hijo, visitar));
}

/**
 * Las propiedades del modelo de vista que la página **usa de verdad**: todo acceso
 * `vista.<algo>`, con su cadena completa (`revision.pendientes` cuenta como
 * `revision` y como `revision.pendientes`).
 */
export function accesosAVista(fuente: string, raiz = "vista"): Set<string> {
  const origen = ast(fuente);
  const encontrados = new Set<string>();
  recorrer(origen, (n) => {
    if (!ts.isPropertyAccessExpression(n)) return;
    const cadena: string[] = [];
    let actual: ts.Expression = n;
    while (ts.isPropertyAccessExpression(actual)) {
      cadena.unshift(actual.name.getText(origen));
      actual = actual.expression;
    }
    if (ts.isIdentifier(actual) && actual.text === raiz) {
      for (let i = 1; i <= cadena.length; i += 1) encontrados.add(cadena.slice(0, i).join("."));
    }
  });
  return encontrados;
}

/** El nombre de la etiqueta de un elemento JSX, o `null` si el nodo no lo es. */
function etiquetaDe(nodo: ts.Node, origen: ts.SourceFile): string | null {
  if (ts.isJsxElement(nodo)) return nodo.openingElement.tagName.getText(origen);
  if (ts.isJsxSelfClosingElement(nodo)) return nodo.tagName.getText(origen);
  return null;
}

/**
 * Las etiquetas JSX que **envuelven** a la primera expresión que accede a `ruta`
 * (por ejemplo `vista.revision.pendientes`), de la más externa a la más interna.
 *
 * Devuelve `null` si la ruta no se renderiza en ninguna parte: «no aparece» y «aparece
 * suelta» son respuestas distintas, y colapsarlas dejaría verde a una página que
 * simplemente borró el campo.
 */
export function envoltoriosDe(fuente: string, ruta: string): string[] | null {
  const origen = ast(fuente);
  let objetivo: ts.Node | null = null;
  recorrer(origen, (n) => {
    if (objetivo || !ts.isPropertyAccessExpression(n)) return;
    if (n.getText(origen).replace(/\s/g, "") === ruta) objetivo = n;
  });
  if (objetivo === null) return null;

  const envoltorios: string[] = [];
  let actual: ts.Node | undefined = (objetivo as ts.Node).parent;
  while (actual) {
    const etiqueta = etiquetaDe(actual, origen);
    if (etiqueta) envoltorios.unshift(etiqueta);
    actual = actual.parent;
  }
  return envoltorios;
}

/**
 * Todo nombre de propiedad que la fuente lee de algo (`x.titulo`, `fuente.url`, …).
 *
 * Sirve para las hojas del modelo de vista que se renderizan dentro de un `.map()`, donde
 * la raíz ya no es `vista` sino la variable del recorrido. **Limitación, y conviene
 * decirla:** es por nombre, no por origen, así que un `otra.url` cualquiera satisfaría a
 * `url`. Es la mitad débil del par; la fuerte es `accesosAVista`, que sí exige la raíz.
 */
export function nombresDePropiedad(fuente: string): Set<string> {
  const origen = ast(fuente);
  const nombres = new Set<string>();
  recorrer(origen, (n) => {
    if (ts.isPropertyAccessExpression(n)) nombres.add(n.name.getText(origen));
  });
  return nombres;
}

/** Toda etiqueta JSX que la fuente renderiza, sin repetir. */
export function etiquetasJsx(fuente: string): Set<string> {
  const origen = ast(fuente);
  const etiquetas = new Set<string>();
  recorrer(origen, (n) => {
    const etiqueta = etiquetaDe(n, origen);
    if (etiqueta) etiquetas.add(etiqueta);
  });
  return etiquetas;
}
