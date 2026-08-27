/**
 * Pruebas de la politica de /api/subscribe.
 *
 * Runner: `node --test` (Node >= 22, type stripping nativo). Sin dependencias
 * nuevas y sin bundler, que es la razon por la que el modulo bajo prueba no
 * importa nada. Ver AGENTS.md: "Sin dependencias nuevas sin que lo decida
 * Rodrigo".
 *
 * El import lleva extension `.ts` porque lo resuelve Node, no un bundler. Es
 * el motivo de `allowImportingTsExtensions` en tsconfig.json.
 *
 * Que cubren: las ramas de decision que antes no tenian ninguna prueba, y en
 * particular el finding P1-SUB-01 — todo 400 del proveedor se devolvia como
 * suscripcion correcta. Si alguien revierte `classifyUpstream` a "cualquier 400
 * es exito", fallan `cuota diaria`, `email invalido` y `codigo desconocido`.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  EMAIL_MAX_LENGTH,
  classifyUpstream,
  clientKeyFrom,
  clientResponseFor,
  createRateLimiter,
  isAllowedOrigin,
  isValidEmail,
  normalizeSource,
  resolveAllowedHosts,
  safeProviderCode,
} from "../app/api/subscribe/policy.ts";

// --- Clasificacion de la respuesta del proveedor (P1-SUB-01) ---------------

test("un alta creada es exito", () => {
  assert.equal(classifyUpstream(201, ""), "created");
  assert.equal(classifyUpstream(200, ""), "created");
});

test("colision: solo 400 con email_already_exists es exito", () => {
  assert.equal(classifyUpstream(400, "email_already_exists"), "duplicate");
  // El codigo llega ya en minusculas desde safeProviderCode, pero la
  // comparacion no depende de ello.
  assert.equal(classifyUpstream(400, "EMAIL_ALREADY_EXISTS"), "duplicate");
});

test("ningun otro codigo con forma de duplicado se acepta como exito", () => {
  // Reconocer duplicados "por parecido" reintroduce el defecto: un codigo
  // futuro del proveedor pasaria a devolver exito sin decision humana.
  assert.equal(classifyUpstream(400, "subscriber_already_exists"), "failed");
  assert.equal(classifyUpstream(400, "already_subscribed"), "failed");
  assert.equal(classifyUpstream(400, "subscriber_already_subscribed"), "failed");
});

test("un 409 no es exito", () => {
  assert.equal(classifyUpstream(409, "desconocido"), "failed");
  assert.equal(classifyUpstream(409, "email_already_exists"), "failed");
});

test("cuota diaria: un 400 de limite NO es exito", () => {
  // El limite diario de creacion de Buttondown responde 400 y el suscriptor
  // no se crea. La version anterior devolvia {success:true} aqui.
  assert.equal(classifyUpstream(400, "creation_limit_reached"), "failed");
  assert.equal(classifyUpstream(429, "rate_limited"), "failed");
});

test("email invalido: un 400 de validez usa el error generico", () => {
  assert.equal(classifyUpstream(400, "email_invalid"), "failed");
  assert.equal(classifyUpstream(400, "invalid_email"), "failed");
});

test("un 400 con codigo desconocido falla, no miente", () => {
  assert.equal(classifyUpstream(400, "desconocido"), "failed");
  assert.equal(classifyUpstream(400, ""), "failed");
  assert.equal(classifyUpstream(400, "tag_does_not_exist"), "failed");
});

test("un 5xx del proveedor falla", () => {
  assert.equal(classifyUpstream(500, "desconocido"), "failed");
  assert.equal(classifyUpstream(503, "desconocido"), "failed");
});

// --- Respuesta al cliente: sin oraculo de enumeracion ----------------------

test("alta y duplicado son indistinguibles para el cliente", () => {
  assert.deepEqual(clientResponseFor("created"), clientResponseFor("duplicate"));
  assert.deepEqual(clientResponseFor("created"), {
    status: 200,
    body: { success: true },
  });
});

test("un fallo no propaga el status del proveedor", () => {
  assert.deepEqual(clientResponseFor("failed"), {
    status: 502,
    body: { error: "Error al suscribir" },
  });
});

test("todo fallo del proveedor tiene la misma forma para el cliente", () => {
  // Cuota, email invalido y codigo desconocido son indistinguibles: no hay
  // respuesta por clase de fallo, y por tanto no hay oraculo.
  const codes = ["creation_limit_reached", "email_invalid", "desconocido"];
  for (const code of codes) {
    assert.deepEqual(
      clientResponseFor(classifyUpstream(400, code)),
      { status: 502, body: { error: "Error al suscribir" } },
      code
    );
  }
});

// --- Saneado del codigo del proveedor -------------------------------------

test("safeProviderCode acepta codigos con forma de enum", () => {
  assert.equal(safeProviderCode("email_already_exists"), "email_already_exists");
  assert.equal(safeProviderCode("Email_Invalid"), "email_invalid");
});

test("safeProviderCode no deja pasar nada con forma de PII", () => {
  // Si el proveedor devolviera la direccion en `code`, no debe llegar al log.
  assert.equal(safeProviderCode("persona@ejemplo.com"), "desconocido");
  assert.equal(safeProviderCode("con espacios"), "desconocido");
  assert.equal(safeProviderCode("x".repeat(65)), "desconocido");
  assert.equal(safeProviderCode(undefined), "desconocido");
  assert.equal(safeProviderCode({ code: "x" }), "desconocido");
});

// --- Validacion de entrada ------------------------------------------------

test("isValidEmail acepta direcciones plausibles", () => {
  assert.equal(isValidEmail("rodrigo@ejemplo.com"), true);
  assert.equal(isValidEmail("a.b+tag@sub.ejemplo.mx"), true);
});

test("isValidEmail rechaza lo que includes(\"@\") aceptaba", () => {
  assert.equal(isValidEmail("@"), false);
  assert.equal(isValidEmail("nada"), false);
  assert.equal(isValidEmail("sin@tld"), false);
  assert.equal(isValidEmail("dos@@arrobas.com"), false);
  assert.equal(isValidEmail("con espacio@ejemplo.com"), false);
  assert.equal(isValidEmail(""), false);
});

test("isValidEmail tiene techo de longitud", () => {
  const domain = "@ejemplo.com";
  const justFits = "a".repeat(EMAIL_MAX_LENGTH - domain.length) + domain;
  assert.equal(justFits.length, EMAIL_MAX_LENGTH);
  assert.equal(isValidEmail(justFits), true);
  assert.equal(isValidEmail("a" + justFits), false);
});

test("isValidEmail rechaza lo que no es string", () => {
  assert.equal(isValidEmail(undefined), false);
  assert.equal(isValidEmail(null), false);
  assert.equal(isValidEmail(42), false);
  assert.equal(isValidEmail({ email: "a@b.co" }), false);
});

test("normalizeSource colapsa cualquier cosa rara a unknown", () => {
  assert.equal(normalizeSource("hero-form"), "hero-form");
  assert.equal(normalizeSource("blog_footer"), "blog_footer");
  assert.equal(normalizeSource("tag con espacios"), "unknown");
  assert.equal(normalizeSource("a".repeat(41)), "unknown");
  assert.equal(normalizeSource(""), "unknown");
  assert.equal(normalizeSource(undefined), "unknown");
  assert.equal(normalizeSource(["newsletter"]), "unknown");
});

// --- Origen ---------------------------------------------------------------

test("en produccion solo pasa el host del sitio", () => {
  const hosts = resolveAllowedHosts({
    siteUrl: "https://www.rodrigobermejo.com",
    allowLocalhost: false,
  });
  assert.equal(
    isAllowedOrigin("https://www.rodrigobermejo.com", hosts),
    true
  );
  assert.equal(isAllowedOrigin("https://atacante.example", hosts), false);
  assert.equal(isAllowedOrigin("http://localhost:3000", hosts), false);
});

test("sin cabecera de origen se rechaza", () => {
  const hosts = resolveAllowedHosts({
    siteUrl: "https://www.rodrigobermejo.com",
    allowLocalhost: false,
  });
  assert.equal(isAllowedOrigin(null, hosts), false);
  assert.equal(isAllowedOrigin(undefined, hosts), false);
  assert.equal(isAllowedOrigin("", hosts), false);
  assert.equal(isAllowedOrigin("no-es-una-url", hosts), false);
});

test("una NEXT_PUBLIC_SITE_URL mal formada no amplia la lista", () => {
  const hosts = resolveAllowedHosts({
    siteUrl: "esto-no-es-una-url",
    allowLocalhost: false,
  });
  assert.equal(hosts.size, 0);
  assert.equal(isAllowedOrigin("https://www.rodrigobermejo.com", hosts), false);
});

test("en desarrollo y en preview se amplian los hosts", () => {
  const hosts = resolveAllowedHosts({
    siteUrl: "https://www.rodrigobermejo.com",
    vercelUrl: "sitio-abc123.vercel.app",
    allowLocalhost: true,
  });
  assert.equal(isAllowedOrigin("http://localhost:3000/blog", hosts), true);
  assert.equal(isAllowedOrigin("http://127.0.0.1:3000", hosts), true);
  assert.equal(isAllowedOrigin("https://sitio-abc123.vercel.app", hosts), true);
});

// --- Rate limit -----------------------------------------------------------

test("el rate limit corta a partir del maximo", () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 3, maxKeys: 100 });
  const t = 1_000_000;

  assert.equal(limiter.hit("ip-a", t), false);
  assert.equal(limiter.hit("ip-a", t + 1), false);
  assert.equal(limiter.hit("ip-a", t + 2), false);
  assert.equal(limiter.hit("ip-a", t + 3), true, "la 4a excede max=3");
});

test("la ventana caduca", () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 1, maxKeys: 100 });
  const t = 1_000_000;

  assert.equal(limiter.hit("ip-a", t), false);
  assert.equal(limiter.hit("ip-a", t + 1), true);
  assert.equal(limiter.hit("ip-a", t + 60_001), false, "fuera de la ventana");
});

test("las claves no se contaminan entre si", () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 1, maxKeys: 100 });
  const t = 1_000_000;

  assert.equal(limiter.hit("ip-a", t), false);
  assert.equal(limiter.hit("ip-b", t), false);
  assert.equal(limiter.hit("ip-a", t), true);
});

test("clientKeyFrom toma el primer valor de x-forwarded-for", () => {
  // Limite conocido y documentado: ese valor lo puede prefijar el cliente.
  // Deuda #11 de docs/audits/2026-08-19-site-baseline.md.
  assert.equal(clientKeyFrom("203.0.113.5, 70.41.3.18"), "203.0.113.5");
  assert.equal(clientKeyFrom("  203.0.113.5  "), "203.0.113.5");
  assert.equal(clientKeyFrom(null), "unknown");
  assert.equal(clientKeyFrom(""), "unknown");
});
