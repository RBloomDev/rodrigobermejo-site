import "server-only";

import { leerFeed } from "./feed.ts";
import {
  DIMENSIONES_EN_ORDEN,
  fechaEnProsa,
  mesEnProsa,
  type Dimension,
  type ProyectoVista,
} from "./proyectos-filtros.ts";
import type { Feed, FeedProject } from "./schema.ts";

/**
 * El modelo de vista de `/proyectos`, construido en build desde el feed.
 *
 * ## Por qué esto existe y la página no lo hace en línea
 *
 * Los filtros viven en el cliente y el feed se lee en el servidor, así que hace
 * falta una frontera: lo que cruza es este objeto, plano y serializable. Y hace
 * falta **probarla**: `react-dom/server` no existe bajo `--conditions=react-server`,
 * así que un `page.tsx` que calculara todo en línea sería incomprobable sin
 * navegador. Aquí sí se puede apuntar `PROOF_FEED_DIR` a un feed de `tmpdir` y
 * medir el resultado.
 *
 * ## Los dos estados del feed se propagan, no se colapsan
 *
 * No hay `try/catch`. Un feed ausente devuelve `{ estado: "ausente" }` y la ruta
 * renderiza su estado declarado; un feed corrupto **lanza**, y el build se pone
 * rojo. Envolver esto en un `catch` daría un build verde indistinguible del
 * estado legítimo, que `docs/05` declara peor que fallar.
 *
 * ## Lo que este módulo NO computa
 *
 * Ninguna cifra sobre el sujeto. No hay conteo de commits, ni de entregas, ni de
 * actividad: el sitio **solo lee y renderiza** (`AGENTS.md`), y toda métrica de
 * evidencia necesita `claim_ids`. La actividad por proyecto vive en
 * `activity.json`, que el motor no emite hoy; la ruta lo muestra como hueco
 * declarado (`docs/plataforma/01` §5.3), nunca como cero.
 *
 * ## Y lo que este módulo NO adjunta: ninguna imagen
 *
 * `visibility` se traduce a `esPublico` y se queda ahí. No existe ninguna ruta
 * que convierta esa bandera en una captura, porque publicar la pantalla de un
 * proyecto es publicar un valor nuevo en la superficie pública y `docs/03` §7
 * reserva esa decisión a un humano. Falta lo que autorizaría un activo —quién lo
 * autoriza y contra qué se comprueba—, así que no hay activos. La pantalla lo
 * dice con todas sus letras en vez de dejar un hueco donde iría una imagen.
 */

const KIND_COPY: Record<string, string> = {
  product: "Producto",
  tool: "Herramienta",
  education: "Formación",
  lab: "Laboratorio",
  experiment: "Experimento",
};

const LIFECYCLE_COPY: Record<string, string> = {
  production: "en producción",
  maintenance: "en mantenimiento",
  beta: "en beta",
  alpha: "en alfa",
  prototype: "prototipo",
  discovery: "en exploración",
  archived: "archivado",
};

/**
 * El rol declarado en el feed. Es lo único que el contrato sabe de la
 * participación: no hay campo de personas, y por eso no hay porcentaje de autoría
 * que publicar (`decisions/0015` §4-ter).
 */
const ROLE_COPY: Record<string, string> = {
  author: "autor",
  maintainer: "responsable del mantenimiento",
  contributor: "colaborador",
  reviewer: "revisor",
  operator: "operador",
};

const CONTEXT_COPY: Record<string, string> = {
  personal: "trabajo personal",
  rbloomdev: "RBloomDev",
  inadaptados: "Inadaptados",
  client: "trabajo para un tercero",
};

/** Un contexto de organización significa manos ajenas, y el crédito es de ellas también. */
const COLECTIVOS = new Set(["rbloomdev", "inadaptados", "client"]);

export type VistaProyectos =
  | { estado: "ausente" }
  | {
      estado: "presente";
      proyectos: ProyectoVista[];
      /** Fecha absoluta y en prosa del `meta.generated_at`. */
      publicadoEl: string;
      afirmaciones: number;
    };

function dimensionesDe(feed: Feed, proyecto: FeedProject): Dimension[] {
  const citadas = new Set(
    feed.claims.filter((c) => c.project_ids.includes(proyecto.id)).map((c) => c.dimension),
  );
  // El orden es el del contrato, no el de aparición en `claims.json`.
  return DIMENSIONES_EN_ORDEN.filter((d) => citadas.has(d));
}

/**
 * Un proyecto del feed, listo para pintar. Exportada porque `/proyectos/[slug]`
 * necesita la **misma** traducción que el índice: dos mapas de copy en paralelo
 * divergirían en el primer cambio, y la ficha acabaría diciendo del rol algo
 * distinto que la lista.
 */
export function proyectoAVista(feed: Feed, p: FeedProject): ProyectoVista {
  return {
    id: p.id,
    titulo: p.title,
    tesis: p.thesis,
    tipo: KIND_COPY[p.kind] ?? p.kind,
    estado: LIFECYCLE_COPY[p.lifecycle] ?? p.lifecycle,
    inicio: p.timeframe.start,
    inicioEnProsa: mesEnProsa(p.timeframe.start),
    finEnProsa: p.timeframe.end ? mesEnProsa(p.timeframe.end) : null,
    dimensiones: dimensionesDe(feed, p),
    rol: ROLE_COPY[p.role] ?? p.role,
    contexto: CONTEXT_COPY[p.context] ?? p.context,
    colectivo: COLECTIVOS.has(p.context),
    esPublico: p.visibility === "public",
    tieneFuentesPrivadas: p.has_private_sources,
    fuentesPublicas: p.public_sources.map((s) => ({ tipo: s.type, url: s.url })),
  };
}

export function vistaDeProyectos(dir?: string): VistaProyectos {
  const estado = dir === undefined ? leerFeed() : leerFeed(dir);
  if (estado.estado === "ausente") return { estado: "ausente" };

  const { feed } = estado;
  return {
    estado: "presente",
    // Orden del Registry, tal cual llega. Cualquier reordenación aquí sería un
    // ranking construido por la pantalla.
    proyectos: feed.projects.map((p) => proyectoAVista(feed, p)),
    publicadoEl: fechaEnProsa(feed.meta.generated_at),
    afirmaciones: feed.claims.length,
  };
}
