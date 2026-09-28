import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * El corpus editorial de fixture que comparten las pruebas de `/noticias`.
 *
 * ## Por qué un corpus de fixture y no el real
 *
 * Porque el real está **vacío**, y esa es su forma correcta hoy: solo el comando de
 * autorización escribe en `content/noticias/`, y autorizar es una decisión de Rodrigo
 * (`docs/plataforma/02-editorial.md` §8.4). Escribir una pieza ahí «solo para probar»
 * sería publicarla —este repositorio es público— y además la escribiría alguien que no es
 * el único que puede. El lector resuelve su raíz desde `NOTICIAS_CORPUS_DIR`, así que el
 * corpus de prueba se construye en `tmpdir` y `content/noticias/` no se toca ni una vez.
 *
 * Y el vacío tampoco queda sin probar: `tests/noticias-corpus-vacio.test.ts` lee el corpus
 * real, sin variable de entorno, que es el estado que el sitio publica hoy.
 *
 * ## Por qué NO termina en `.test.ts`
 *
 * El glob de `npm test` es `tests/**\/*.test.ts`: un helper con ese nombre se ejecutaría
 * como una suite vacía. Mismo precedente que `tests/proyectos-fixture.ts` y
 * `tests/navegacion-helpers.ts`.
 */

const HUELLA = `sha256:${"a1b2c3d4".repeat(8)}`;

/**
 * Una pieza con **veredicto `parcial` y pendientes**, y con relación declarada. Es el caso
 * que `01` §1.3 y §1.4 obligan a enseñar entero: el conflicto de interés antes del
 * análisis, y lo que quedó sin comprobar donde se lee.
 */
export const PIEZA_PARCIAL = {
  id: "modelo-con-pesos-abiertos",
  tipo: "analisis",
  titulo: "Un laboratorio publicó los pesos de su modelo con licencia de uso restringido",
  entradilla:
    "La licencia permite redistribuir los pesos y prohíbe entrenar modelos competidores con sus salidas.",
  estado: "autorizada",
  ocurrido_en: "2026-09-12",
  redactado_en: "2026-09-13T10:30Z",
  hecho: "El laboratorio publicó los pesos del modelo y su licencia el 12 de septiembre de 2026.",
  que_cambia:
    "Quien quiera operar el modelo en su propia infraestructura ya puede hacerlo sin pedir acceso.",
  mexico: {
    estado: "aplica_sin_datos_locales",
    texto:
      "No hay ninguna medición mexicana del costo de operarlo aquí, y esta pieza no la estima.",
  },
  no_establece: [
    "No establece que el modelo rinda mejor que las alternativas cerradas.",
    "No establece que la licencia sea compatible con un uso comercial en México.",
  ],
  fuente_primaria: {
    titulo: "Tarjeta del modelo y texto de la licencia",
    medio: "Blog del laboratorio",
    url: "https://ejemplo-laboratorio.test/modelo/licencia",
    fecha: "2026-09-12",
  },
  fuentes: [
    {
      titulo: "Tarjeta del modelo y texto de la licencia",
      medio: "Blog del laboratorio",
      url: "https://ejemplo-laboratorio.test/modelo/licencia",
      fecha: "2026-09-12",
      tipo: "primaria",
    },
    {
      titulo: "Registro del anuncio y de las condiciones de redistribución",
      medio: "Boletín técnico independiente",
      url: "https://ejemplo-boletin.test/2026/09/pesos-abiertos",
      fecha: "2026-09-13",
      tipo: "secundaria",
    },
  ],
  relacion_declarada:
    "Inadaptados, donde dirijo tecnología, evalúa este modelo para su programa de formación.",
  procedencia: {
    detectado: { por: "agente", detalle: "Lectura programada del blog del laboratorio." },
    redactado: { por: "ia", modelo: "modelo-de-redaccion-1" },
    verificado: {
      por: "humano",
      detalle: "Comprobación de afirmaciones contra las dos fuentes.",
      veredicto: "parcial",
      pendientes: [
        "El tamaño del conjunto de entrenamiento no aparece en ninguna de las dos fuentes.",
        "La fecha del corte de datos no se pudo confirmar en la fuente primaria.",
      ],
    },
    publicado: { por: "humano", detalle: "Autorizada por Rodrigo Bermejo el 2026-09-14." },
  },
  huella: HUELLA,
  // §3 declara `correcciones[]` como arreglo y NO fija sus claves. El fixture usa la forma
  // que `01` §1.4 describe en prosa —con fecha y sin borrar el texto corregido— para que
  // la pantalla se pruebe contra algo, y la pantalla no asume estas claves: enseña las que
  // traiga la entrada. Que la spec no fije la forma queda registrado como defecto.
  correcciones: [
    {
      fecha: "2026-09-15",
      texto: "Se corrigió el nombre de la licencia: decía MIT y es una licencia propia.",
      decia: "El laboratorio publicó los pesos con licencia MIT.",
    },
  ],
};

/** Una pieza verificada, sin pendientes y sin relación que declarar. */
export const PIEZA_VERIFICADA = {
  id: "norma-de-datos-en-escuelas",
  tipo: "noticia",
  titulo: "La autoridad educativa publicó los lineamientos de datos para escuelas públicas",
  entradilla:
    "Los lineamientos fijan qué datos de alumnos se pueden tratar y con qué base legal.",
  estado: "autorizada",
  ocurrido_en: "2026-09-20",
  redactado_en: "2026-09-21T09:00Z",
  hecho: "Los lineamientos se publicaron en el diario oficial el 20 de septiembre de 2026.",
  que_cambia:
    "Una escuela que trate datos de alumnos tiene un criterio publicado contra el cual revisarse.",
  mexico: {
    estado: "aplica_con_datos_locales",
    texto: "Es una norma mexicana y aplica a las escuelas públicas del país.",
  },
  no_establece: ["No establece qué sanción corresponde a cada incumplimiento."],
  fuente_primaria: {
    titulo: "Texto íntegro de los lineamientos",
    medio: "Diario oficial",
    url: "https://ejemplo-oficial.test/lineamientos-datos-escuelas",
    fecha: "2026-09-20",
  },
  fuentes: [
    {
      titulo: "Texto íntegro de los lineamientos",
      medio: "Diario oficial",
      url: "https://ejemplo-oficial.test/lineamientos-datos-escuelas",
      fecha: "2026-09-20",
      tipo: "primaria",
    },
    {
      titulo: "Comunicado de la autoridad educativa",
      medio: "Autoridad educativa",
      url: "https://ejemplo-autoridad.test/comunicados/lineamientos",
      fecha: "2026-09-20",
      tipo: "secundaria",
    },
  ],
  relacion_declarada: null,
  procedencia: {
    detectado: { por: "agente", detalle: "Lectura del diario oficial." },
    redactado: { por: "ia", modelo: "modelo-de-redaccion-1" },
    verificado: {
      por: "humano",
      detalle: "Las dos fuentes sostienen cada afirmación.",
      veredicto: "verificada",
      pendientes: [],
    },
    publicado: { por: "humano", detalle: "Autorizada por Rodrigo Bermejo el 2026-09-21." },
  },
  huella: HUELLA,
  correcciones: [],
};

/**
 * Un borrador **dentro** del corpus. No debería llegar ahí nunca —solo `autorizar`
 * escribe, y escribe `autorizada`—, y precisamente por eso se prueba: si el filtrado por
 * estado se hiciera en el render en vez de en la lectura, bastaría un cambio de orden de
 * operaciones para servirlo (`01` §1.1, requisito 1).
 */
export const PIEZA_BORRADOR = {
  ...PIEZA_VERIFICADA,
  id: "borrador-que-no-debe-salir",
  titulo: "Borrador que no debe salir",
  estado: "borrador",
  ocurrido_en: "2026-09-23",
  procedencia: {
    ...PIEZA_VERIFICADA.procedencia,
    publicado: { por: "pendiente", detalle: "" },
  },
};

export const CORPUS = [PIEZA_PARCIAL, PIEZA_VERIFICADA, PIEZA_BORRADOR];

/** Escribe el corpus en un temporal y devuelve su ruta. */
export function corpusEnTemporal(piezas: readonly { id: string }[] = CORPUS): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "noticias-fixture-"));
  for (const pieza of piezas) {
    writeFileSync(path.join(dir, `${pieza.id}.json`), JSON.stringify(pieza, null, 2), "utf8");
  }
  return dir;
}

/**
 * Corre `fn` con el corpus de fixture servido por `NOTICIAS_CORPUS_DIR`, y restaura el
 * entorno pase lo que pase. `fn` recibe la ruta por si la prueba quiere escribir en ella.
 */
export function conCorpusDeFixture<T>(
  fn: (dir: string) => T,
  piezas: readonly { id: string }[] = CORPUS,
): T {
  const dir = corpusEnTemporal(piezas);
  const previo = process.env["NOTICIAS_CORPUS_DIR"];
  process.env["NOTICIAS_CORPUS_DIR"] = dir;
  try {
    return fn(dir);
  } finally {
    if (previo === undefined) delete process.env["NOTICIAS_CORPUS_DIR"];
    else process.env["NOTICIAS_CORPUS_DIR"] = previo;
    rmSync(dir, { recursive: true, force: true });
  }
}
