/**
 * Politica de /api/subscribe, en funciones puras.
 *
 * Por que vive en un modulo aparte y sin un solo import: asi se ejecuta con
 * `node --test` sin bundler, sin runtime de Next y sin dependencias nuevas
 * (AGENTS.md: "Sin dependencias nuevas sin que lo decida Rodrigo"). Las ramas
 * de decision de una ruta que maneja PII tienen que ser probables; antes no lo
 * eran, y un 400 del proveedor se devolvia como alta correcta.
 *
 * Por que dentro de `app/api/**` y no en `lib/`: los guards de CI estan
 * acotados a esa ruta (regla `no-console` de eslint.config.mjs, grep de
 * escrituras al stream, `docs/04-architecture.md` §4.1). Sacar la logica de
 * PII de ahi habria ampliado en silencio lo que los guards no miran.
 *
 * Este archivo no loguea nada, a proposito. Quien decide que se escribe en los
 * logs es `route.ts`, y solo escribe valores de forma acotada.
 */

export const EMAIL_MAX_LENGTH = 254;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SOURCE_PATTERN = /^[a-z0-9_-]{1,40}$/i;

/** Forma de un codigo de error de proveedor: enum corto, nunca PII. */
const PROVIDER_CODE_PATTERN = /^[a-z0-9_.:-]{1,64}$/i;

export function isValidEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= EMAIL_MAX_LENGTH &&
    EMAIL_PATTERN.test(value)
  );
}

/**
 * `source` llega del cliente y se convierte en tag upstream. Se valida contra
 * un patron estrecho para no permitir tags arbitrarios en la lista.
 */
export function normalizeSource(value: unknown): string {
  return typeof value === "string" && SOURCE_PATTERN.test(value)
    ? value
    : "unknown";
}

export function resolveAllowedHosts(env: {
  siteUrl?: string;
  vercelUrl?: string;
  allowLocalhost: boolean;
}): Set<string> {
  const hosts = new Set<string>();

  if (env.siteUrl) {
    try {
      hosts.add(new URL(env.siteUrl).host);
    } catch {
      // URL mal formada en env: no ampliamos la lista de hosts permitidos.
    }
  }
  if (env.allowLocalhost) {
    hosts.add("localhost:3000");
    hosts.add("127.0.0.1:3000");
  }
  // Deployments de preview de Vercel, donde NEXT_PUBLIC_SITE_URL no aplica.
  if (env.vercelUrl) hosts.add(env.vercelUrl);

  return hosts;
}

/**
 * Solo aceptamos peticiones originadas en nuestro propio sitio.
 * Detiene CSRF desde un navegador. NO es autenticacion: un cliente que no sea
 * navegador envia el Origin que quiera. Ver docs/audits/2026-08-19-site-baseline.md.
 */
export function isAllowedOrigin(
  candidate: string | null | undefined,
  allowedHosts: ReadonlySet<string>
): boolean {
  if (!candidate) return false;
  try {
    return allowedHosts.has(new URL(candidate).host);
  } catch {
    return false;
  }
}

export interface RateLimiter {
  /** true = la peticion excede el limite. `now` se inyecta para poder probarlo. */
  hit(key: string, now: number): boolean;
}

/**
 * Rate limit en memoria del proceso. Mitigacion, no garantia: en serverless
 * hay varias instancias y el contador no se comparte. Sirve para cortar el
 * abuso trivial desde una sola IP. Un limite real necesitaria un store
 * compartido, y eso es una decision de infraestructura pendiente
 * (deuda #10 en docs/audits/2026-08-19-site-baseline.md).
 */
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  maxKeys: number;
}): RateLimiter {
  const hits = new Map<string, number[]>();

  return {
    hit(key: string, now: number): boolean {
      const cutoff = now - options.windowMs;
      const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);

      if (hits.size > options.maxKeys) hits.clear(); // techo de memoria

      recent.push(now);
      hits.set(key, recent);

      return recent.length > options.max;
    },
  };
}

/**
 * Clave del rate limit. Mitigacion parcial, y el limite hay que nombrarlo:
 * se toma el valor mas a la izquierda de x-forwarded-for, que es justamente
 * el que un cliente puede prefijar. Rotarlo evade el contador. La cabecera no
 * falsificable en Vercel es x-vercel-forwarded-for; cambiar la derivacion es
 * un cambio de comportamiento de seguridad y lo decide Rodrigo.
 * Deuda #11 en docs/audits/2026-08-19-site-baseline.md.
 */
export function clientKeyFrom(forwardedFor: string | null | undefined): string {
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

/**
 * Recorta un codigo de error del proveedor a algo seguro de loguear.
 * El cuerpo de una respuesta de Buttondown puede contener la direccion; el
 * patron excluye `@` y acota la longitud, asi que un email no lo atraviesa.
 * Cualquier otra cosa colapsa a "desconocido".
 */
export function safeProviderCode(code: unknown): string {
  return typeof code === "string" && PROVIDER_CODE_PATTERN.test(code)
    ? code.toLowerCase()
    : "desconocido";
}

export type UpstreamOutcome =
  /** Alta creada. */
  | "created"
  /** La direccion ya estaba en la lista. */
  | "duplicate"
  /** Cualquier otro fallo: cuota, email invalido, tag inexistente, 5xx, codigo desconocido. */
  | "failed";

/**
 * Unico codigo que se presenta como exito: la direccion ya existe. Se responde
 * como un alta correcta para no construir un oraculo de enumeracion.
 *
 * Es un literal, no una lista ni un patron. Un `already_exists` reconocido por
 * parecido reintroduciria el defecto por la puerta de atras: cualquier codigo
 * futuro del proveedor cuyo nombre se parezca pasaria a devolver exito sin que
 * nadie lo haya decidido. La lista de codigos que significan exito la decide
 * este repo, no el proveedor.
 */
const DUPLICATE_CODE = "email_already_exists";

/**
 * Clasifica la respuesta del proveedor. Es el corazon del finding P1-SUB-01:
 * la version anterior mapeaba **todo** 400 a exito, asi que el limite diario
 * de creacion y un `email_invalid` se le presentaban al usuario como
 * suscripcion correcta.
 *
 * La regla, y no admite excepciones: **solo** un 400 con codigo
 * `email_already_exists` es exito. Todo lo demas —incluido un 409, un 400 de
 * validez de la direccion y un 400 con codigo desconocido— es "failed" y sale
 * como error generico. Mentir en la direccion de "todo salio bien" es el fallo
 * que este finding describe, y cualquier codigo no enumerado aqui puede
 * significarlo.
 *
 * Supuesto declarado, y es el riesgo residual: `email_already_exists` es el
 * codigo que documenta Buttondown hoy. Si el proveedor lo renombrara, un alta
 * duplicada pasaria a "failed" y devolveria error en lugar de exito. Ese fallo
 * es visible para el usuario y conservador; el inverso —aceptar como exito un
 * codigo que no conocemos— no lo es. Anotado como mitigacion en
 * docs/audits/2026-08-19-site-baseline.md.
 */
export function classifyUpstream(
  status: number,
  providerCode: string
): UpstreamOutcome {
  if (status >= 200 && status < 300) return "created";
  if (status === 400 && providerCode.toLowerCase() === DUPLICATE_CODE) {
    return "duplicate";
  }
  return "failed";
}

export interface ClientResponse {
  status: number;
  body: { success: true } | { error: string };
}

/**
 * Traduce el resultado upstream a lo que ve el cliente. `created` y
 * `duplicate` son **identicos** en status y en cuerpo: es la unica forma de no
 * confirmar si una direccion ya estaba suscrita.
 *
 * `failed` tiene una sola forma, generica, para todo lo demas. No hay una
 * respuesta por clase de fallo del proveedor: distinguirlas devolveria al
 * cliente informacion sobre el estado de su direccion en la lista, que es el
 * oraculo que esta politica evita. La validez de la direccion ya la comprueba
 * `isValidEmail` antes de salir a la red.
 *
 * El status upstream nunca se propaga: filtraria semantica del proveedor.
 */
export function clientResponseFor(outcome: UpstreamOutcome): ClientResponse {
  switch (outcome) {
    case "created":
    case "duplicate":
      return { status: 200, body: { success: true } };
    case "failed":
      return { status: 502, body: { error: "Error al suscribir" } };
  }
}
