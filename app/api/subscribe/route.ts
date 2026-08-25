import { NextResponse } from "next/server";
import {
  classifyUpstream,
  clientKeyFrom,
  clientResponseFor,
  createRateLimiter,
  isAllowedOrigin,
  isValidEmail,
  normalizeSource,
  resolveAllowedHosts,
  safeProviderCode,
} from "./policy";

/**
 * Suscripcion al newsletter (Buttondown).
 *
 * Frontera de PII: esta ruta es el unico punto del sitio que maneja datos
 * personales. Ver docs/03-privacy-and-publication-policy.md.
 *
 * Reglas que no se rompen aqui:
 *  - Nunca loguear el payload de la peticion ni la respuesta upstream.
 *    Volcaria emails a los logs de la plataforma. CI lo verifica.
 *  - Nunca revelar si un email ya estaba suscrito: seria un oraculo de
 *    enumeracion. La respuesta al cliente es identica en ambos casos.
 *  - Nunca propagar el status upstream: filtra semantica del proveedor.
 *  - Nunca devolver exito por un fallo del proveedor. El unico caso que se
 *    presenta como alta correcta es un 400 con codigo `email_already_exists`;
 *    el limite diario de creacion, un `email_invalid`, un 409 o un codigo
 *    desconocido, no.
 *
 * Las decisiones viven en `./policy.ts`, que es puro y esta cubierto por
 * `policy.test.ts`. Este archivo solo hace E/S: leer la peticion, hablar con el
 * proveedor y traducir la decision a HTTP.
 */

const limiter = createRateLimiter({
  windowMs: 60_000,
  max: 5,
  maxKeys: 5_000,
});

/**
 * Extrae el codigo de error del proveedor. Se lee el cuerpo porque es lo unico
 * que distingue una colision de un limite de cuota, pero **solo** se conserva
 * el campo `code` y ya saneado: el resto del cuerpo puede contener la
 * direccion y no debe sobrevivir a esta funcion.
 */
async function readProviderCode(upstream: Response): Promise<string> {
  try {
    const payload: unknown = await upstream.json();
    if (payload && typeof payload === "object" && "code" in payload) {
      return safeProviderCode((payload as { code: unknown }).code);
    }
  } catch {
    // Cuerpo ausente o no-JSON: se trata como codigo desconocido.
  }
  return "desconocido";
}

export async function POST(request: Request) {
  const allowedHosts = resolveAllowedHosts({
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    vercelUrl: process.env.VERCEL_URL,
    allowLocalhost: process.env.NODE_ENV !== "production",
  });
  const origin =
    request.headers.get("origin") ?? request.headers.get("referer");

  if (!isAllowedOrigin(origin, allowedHosts)) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  }

  const key = clientKeyFrom(request.headers.get("x-forwarded-for"));
  if (limiter.hit(key, Date.now())) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un momento." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  let email: unknown;
  let source: unknown;
  try {
    ({ email, source } = await request.json());
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  const safeSource = normalizeSource(source);

  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    console.error("subscribe: BUTTONDOWN_API_KEY ausente");
    return NextResponse.json(
      { error: "Servicio no disponible" },
      { status: 503 }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch("https://api.buttondown.com/v1/subscribers", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: email,
        tags: ["newsletter", safeSource],
        metadata: { source: safeSource },
      }),
    });
  } catch {
    console.error("subscribe: fallo de red hacia el proveedor");
    return NextResponse.json({ error: "Error al suscribir" }, { status: 502 });
  }

  const providerCode = upstream.ok ? "" : await readProviderCode(upstream);
  const outcome = classifyUpstream(upstream.status, providerCode);

  if (outcome === "failed") {
    // Solo el status y el codigo saneado. Nunca el cuerpo: puede llevar la
    // direccion.
    console.error(
      `subscribe: proveedor respondio ${upstream.status} (${providerCode})`
    );
  }

  const { status, body } = clientResponseFor(outcome);
  return NextResponse.json(body, { status });
}
