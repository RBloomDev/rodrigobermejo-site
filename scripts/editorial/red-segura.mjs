/**
 * Guarda contra SSRF para todo lo que el canal descarga de fuera.
 *
 * ## Por que existe
 *
 * El canal editorial lee feeds RSS de terceros y descarga las URLs que
 * encuentra: la del item detectado, y las que el redactor extrae del texto de
 * un articulo. **Ninguna de esas URLs la elige nosotros.** Basta con que un
 * feed se comprometa --- o con que alguien publique un articulo que enlace a
 * donde quiera --- para que este proceso haga una peticion a la direccion que
 * el atacante diga.
 *
 * Validar solo el esquema, que es lo que se hacia antes, no sirve de nada:
 * `http://169.254.169.254/` pasa la comprobacion de esquema perfectamente.
 *
 * ## Que bloquea, y por que cada cosa
 *
 *  - **Loopback** (`127.0.0.0/8`, `::1`): servicios locales de la maquina que
 *    corre el canal. En un portatil de desarrollo eso incluye el `next dev`,
 *    bases de datos sin contrasena y cualquier cosa escuchando en localhost.
 *  - **Link-local** (`169.254.0.0/16`, `fe80::/10`): incluye
 *    `169.254.169.254`, el endpoint de metadatos de practicamente todas las
 *    nubes. Es la primera direccion que prueba cualquier explotacion de SSRF
 *    y la que entrega credenciales de instancia.
 *  - **Rangos privados** (`10/8`, `172.16/12`, `192.168/16`, `fc00::/7`): la
 *    red local del usuario. Un canal editorial no tiene nada que buscar ahi.
 *  - **CGNAT, TEST-NET, benchmarking, multicast, reservados**: sin uso legitimo
 *    aqui, y varios son alcanzables en redes reales.
 *  - **IPv4 embebida en IPv6** (`::ffff:127.0.0.1`): es el rodeo clasico para
 *    saltarse una lista que solo mira IPv4.
 *  - **Nombres reservados** (`localhost`, `metadata.google.internal`,
 *    `*.internal`, `*.local`): se comprueban antes de resolver, normalizados en
 *    minusculas y sin el punto final --- `LOCALHOST.` resuelve igual que
 *    `localhost` y la comparacion ingenua no lo veria.
 *  - **Puertos no estandar**: solo 80 y 443. Un servicio interesante casi nunca
 *    escucha en el puerto de la web.
 *
 * ## Las redirecciones, que es la parte que mas se olvida
 *
 * `curl -L` sigue redirecciones **sin volver a preguntar**. Una URL publica
 * perfectamente valida puede devolver un 302 a `http://127.0.0.1:6379/`, y la
 * validacion inicial no habria servido para nada.
 *
 * Aqui las redirecciones se siguen **a mano**: `--max-redirs 0`, se lee el
 * `Location`, y **se vuelve a validar el destino completo** antes de dar el
 * siguiente salto. Hasta 5 saltos.
 *
 * ## Lo que esto NO resuelve, y hay que decirlo
 *
 * Queda abierta la ventana de **DNS rebinding**: entre que resolvemos el nombre
 * para validarlo y que `curl` lo resuelve por su cuenta para conectarse, un
 * servidor DNS hostil con TTL 0 puede cambiar la respuesta. Cerrarlo del todo
 * exige resolver una vez y forzar esa IP en la conexion (`--resolve`), lo que
 * rompe SNI y virtual hosting en servidores compartidos --- que es la mayoria
 * de nuestras fuentes. Se acepta el riesgo residual, se deja escrito, y se
 * mitiga con lo demas: sin redirecciones ciegas, sin puertos raros, y con el
 * resultado tratado siempre como dato no confiable.
 */

import { execFileSync } from "node:child_process";
import { lookup } from "node:dns/promises";

const PUERTOS_PERMITIDOS = new Set(["", "80", "443"]);
const MAX_SALTOS = 5;

/** Nombres que no se resuelven siquiera. */
const NOMBRES_VETADOS = [
  "localhost",
  "metadata.google.internal",
  "metadata",
  "instance-data",
];
const SUFIJOS_VETADOS = [".localhost", ".local", ".internal", ".localdomain"];

/** ¿Es una IPv4 de un rango que no debe alcanzarse? */
function ipv4Vetada(ip) {
  const o = ip.split(".").map(Number);
  if (o.length !== 4 || o.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = o;
  if (a === 0) return true;                                  // "este" host
  if (a === 10) return true;                                 // privada
  if (a === 127) return true;                                // loopback
  if (a === 100 && b >= 64 && b <= 127) return true;         // CGNAT
  if (a === 169 && b === 254) return true;                   // link-local + metadatos
  if (a === 172 && b >= 16 && b <= 31) return true;          // privada
  if (a === 192 && b === 168) return true;                   // privada
  if (a === 192 && b === 0) return true;                     // IETF / TEST-NET-1
  if (a === 192 && b === 88) return true;                    // 6to4 relay
  if (a === 198 && (b === 18 || b === 19)) return true;      // benchmarking
  if (a === 198 && b === 51) return true;                    // TEST-NET-2
  if (a === 203 && b === 0) return true;                     // TEST-NET-3
  if (a >= 224) return true;                                 // multicast y reservados
  return false;
}

function ipv6Vetada(ip) {
  const s = ip.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  if (s === "::1" || s === "::") return true;                // loopback y sin especificar
  if (/^f[cd]/.test(s)) return true;                         // fc00::/7 unicast local
  if (/^fe[89ab]/.test(s)) return true;                      // fe80::/10 link-local
  if (/^ff/.test(s)) return true;                            // multicast
  // IPv4 embebida: ::ffff:127.0.0.1 y variantes. Es el rodeo clasico.
  const m = s.match(/(?:::ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (m) return ipv4Vetada(m[1]);
  if (/^(::ffff:)?[0-9a-f]{0,4}:[0-9a-f]{0,4}$/.test(s)) return true; // compactas raras
  return false;
}

/**
 * ¿Se puede pedir esta URL?
 * @returns {Promise<{permitido: boolean, motivo?: string}>}
 */
export async function destinoPermitido(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return { permitido: false, motivo: "URL mal formada" };
  }

  if (u.protocol !== "https:" && u.protocol !== "http:") {
    return { permitido: false, motivo: `esquema no permitido: ${u.protocol}` };
  }
  if (!PUERTOS_PERMITIDOS.has(u.port)) {
    return { permitido: false, motivo: `puerto no permitido: ${u.port}` };
  }

  // Normalizar antes de comparar: "LOCALHOST." resuelve igual que "localhost".
  const host = u.hostname.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  if (NOMBRES_VETADOS.includes(host)) {
    return { permitido: false, motivo: `nombre reservado: ${host}` };
  }
  if (SUFIJOS_VETADOS.some((s) => host.endsWith(s))) {
    return { permitido: false, motivo: `sufijo reservado en: ${host}` };
  }

  // Literal IP en la URL, sin pasar por DNS.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    if (ipv4Vetada(host)) return { permitido: false, motivo: `IPv4 en rango vetado` };
    return { permitido: true };
  }
  if (host.includes(":")) {
    if (ipv6Vetada(host)) return { permitido: false, motivo: `IPv6 en rango vetado` };
    return { permitido: true };
  }

  // Nombre: se resuelve y se comprueban TODAS las direcciones. Una sola mala
  // basta para rechazar: un nombre con dos registros A, uno publico y uno
  // privado, es exactamente como se evade una comprobacion perezosa.
  let direcciones;
  try {
    direcciones = await lookup(host, { all: true });
  } catch (e) {
    return { permitido: false, motivo: `no resuelve: ${e.code ?? e.message}` };
  }
  if (!direcciones.length) return { permitido: false, motivo: "sin direcciones" };

  for (const { address, family } of direcciones) {
    const mala = family === 6 ? ipv6Vetada(address) : ipv4Vetada(address);
    if (mala) return { permitido: false, motivo: `${host} resuelve a una direccion vetada` };
  }
  return { permitido: true };
}

/**
 * Descarga una URL externa siguiendo redirecciones **a mano**, revalidando el
 * destino en cada salto. Devuelve `null` si en algun punto el destino no pasa
 * la guarda o si la peticion falla.
 */
export async function traerSeguro(url, { maxChars = 12000, timeoutS = 25 } = {}) {
  let actual = url;

  for (let salto = 0; salto <= MAX_SALTOS; salto += 1) {
    const permiso = await destinoPermitido(actual);
    if (!permiso.permitido) return { texto: null, motivo: permiso.motivo, url: actual };

    let salida;
    try {
      salida = execFileSync("curl", [
        "-sS",
        "--max-time", String(timeoutS),
        "--max-redirs", "0",          // NO seguir redirecciones por su cuenta
        "--proto", "=http,https",
        "-D", "-",                    // cabeceras a stdout, para leer Location
        "-A", "Mozilla/5.0 (compatible; canal-editorial/1.0)",
        actual,
      ], { encoding: "utf8", maxBuffer: 24 * 1024 * 1024 });
    } catch {
      return { texto: null, motivo: "error de red", url: actual };
    }

    const corte = salida.indexOf("\r\n\r\n") >= 0 ? salida.indexOf("\r\n\r\n") + 4 : salida.indexOf("\n\n") + 2;
    const cabeceras = salida.slice(0, Math.max(corte - 2, 0));
    const cuerpo = salida.slice(Math.max(corte, 0));

    const estado = Number((cabeceras.match(/^HTTP\/[\d.]+\s+(\d{3})/m) ?? [])[1]);
    if (estado >= 300 && estado < 400) {
      const loc = (cabeceras.match(/^location:\s*(.+)$/im) ?? [])[1]?.trim();
      if (!loc) return { texto: null, motivo: `redireccion ${estado} sin Location`, url: actual };
      // Se resuelve relativa a la actual y se vuelve al principio del bucle,
      // donde se valida de nuevo. Este es el punto que `curl -L` se saltaba.
      actual = new URL(loc, actual).href;
      continue;
    }
    if (estado < 200 || estado >= 300) {
      return { texto: null, motivo: `HTTP ${estado}`, url: actual };
    }

    return { texto: limpiar(cuerpo, maxChars), motivo: null, url: actual };
  }

  return { texto: null, motivo: `mas de ${MAX_SALTOS} redirecciones`, url: actual };
}

/** HTML a texto plano, conservando los enlaces como «texto [url]». */
function limpiar(html, maxChars) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
      (_m, href, txt) => `${String(txt).replace(/<[^>]+>/g, " ").trim()} [${href}]`)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
}
