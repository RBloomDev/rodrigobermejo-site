/**
 * Guarda contra SSRF para todo lo que el canal descarga de fuera.
 *
 * ## Por que existe
 *
 * El canal editorial lee feeds RSS de terceros y descarga las URLs que
 * encuentra: la del item detectado, y las que el redactor extrae del texto de
 * un articulo. **Ninguna de esas URLs la elegimos nosotros.** Basta con que un
 * feed se comprometa --- o con que alguien publique un articulo que enlace a
 * donde quiera --- para que este proceso haga una peticion a la direccion que
 * el atacante diga.
 *
 * Validar solo el esquema, que es lo que se hacia al principio, no sirve de
 * nada: `http://169.254.169.254/` pasa la comprobacion de esquema
 * perfectamente.
 *
 * ## Las tres capas, y por que hacen falta las tres
 *
 * ### 1. Que destinos se permiten
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
 *  - **IPv4 embebida o tunelada en IPv6**: `::ffff:127.0.0.1` (mapeada),
 *    `64:ff9b::/96` (NAT64) y `2002::/16` (6to4) son tres formas distintas de
 *    escribir una IPv4 dentro de una IPv6. Las tres se desenvuelven y se
 *    comprueban contra las reglas de IPv4.
 *  - **Nombres reservados** (`localhost`, `metadata.google.internal`,
 *    `*.internal`, `*.local`): se comprueban antes de resolver, normalizados en
 *    minusculas y sin el punto final --- `LOCALHOST.` resuelve igual que
 *    `localhost` y la comparacion ingenua no lo veria.
 *  - **Puertos no estandar**: solo 80 y 443.
 *
 * ### 2. Las redirecciones, que es la parte que mas se olvida
 *
 * Seguir redirecciones automaticamente anula la validacion: una URL publica
 * perfectamente valida puede devolver un 302 a `http://127.0.0.1:6379/`.
 *
 * Aqui **ningun cliente sigue redirecciones por su cuenta**. Se leen a mano en
 * `seguirConGuarda`, y **cada salto vuelve a validarse y a fijarse por
 * separado**. Hasta 5 saltos.
 *
 * ### 3. DNS rebinding: la capa que faltaba, y que ya no falta
 *
 * **CORRECCION DEL 2026-09-14.** La version anterior de este archivo declaraba
 * el rebinding como riesgo residual aceptado, con esta justificacion:
 *
 * > «Cerrarlo del todo exige resolver una vez y forzar esa IP en la conexion
 * > (`--resolve`), lo que rompe SNI y virtual hosting en servidores
 * > compartidos.»
 *
 * **Eso era falso, y el riesgo no estaba aceptado por nadie: estaba abierto por
 * una razon inventada.** La documentacion de curl lo dice explicitamente
 * (https://everything.curl.dev/usingcurl/connections/name.html): `--resolve`
 * «inserta la direccion en la cache de DNS de curl», y *«cuando se habla HTTPS,
 * esto envia SNI para el nombre de la URL y curl verifica la respuesta del
 * servidor para asegurarse de que sirve para el nombre de la URL»*. Sustituye
 * **solo la capa DNS**: Host, SNI y validacion de certificado siguen usando el
 * hostname original. Lo que si rompe el virtual hosting es poner la IP en la
 * URL, que es otra cosa y no es lo que se hace aqui.
 *
 * Asi que se cierra. El nombre se resuelve **una sola vez**, se valida, y esa
 * misma direccion se **fija** en la conexion:
 *
 *   - En el cliente de Node, con la opcion `lookup` de `https.request`, que
 *     devuelve la direccion ya validada sin volver a consultar al sistema. El
 *     `servername` sigue siendo el hostname, asi que SNI viaja correcto, y
 *     `rejectUnauthorized` se queda en su valor por defecto: **la validacion
 *     del certificado no se toca en ningun camino de este archivo**.
 *
 * Entre la validacion y la conexion ya no hay una segunda resolucion que un
 * servidor DNS hostil con TTL 0 pueda contestar distinto. La prueba de que esto
 * funciona esta en `pruebas/red-segura.test.mjs`, con un resolutor que cambia
 * de respuesta entre una llamada y la siguiente.
 *
 * ## Un solo cliente
 *
 * Antes habia dos caminos de descarga --- `curl` para el redactor y `fetch`
 * para el verificador --- y eso significaba dos sitios donde acertar. Ahora hay
 * **uno**: `pedirPinneado`. `traerSeguro` (redactor) y `obtener` (detector y
 * verificador) son capas encima del mismo primitivo.
 *
 * ## Lo que esto sigue sin resolver
 *
 * Un servidor **legitimo y publico** que decida responder con contenido hostil
 * sigue pudiendo hacerlo: la guarda decide **a donde** se conecta, no que
 * contiene la respuesta. Por eso el resultado se trata siempre como dato no
 * confiable aguas abajo (`invocar-redactor.mjs`, `verificar-afirmaciones.mjs`).
 */

import { request as pedirHttp } from "node:http";
import { request as pedirHttps } from "node:https";
import { lookup as resolverDelSistema } from "node:dns/promises";

const PUERTOS_PERMITIDOS = new Set(["", "80", "443"]);
const MAX_SALTOS = 5;
const MAX_CUERPO = 24 * 1024 * 1024;

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

/**
 * Convierte los 32 bits que van al final de una IPv6 en su IPv4 punteada.
 * Sirve para las tres formas de meter una IPv4 dentro de una IPv6.
 */
function ipv4DeLosUltimos32(grupos) {
  const alto = grupos[6];
  const bajo = grupos[7];
  return [alto >> 8, alto & 0xff, bajo >> 8, bajo & 0xff].join(".");
}

/** Expande una IPv6 (incluida la forma `::`) a sus ocho grupos de 16 bits. */
function gruposDeIpv6(s) {
  const limpia = s.split("%")[0];
  // Forma mixta `::ffff:127.0.0.1`: se normaliza el final a hexadecimal.
  const mixta = limpia.match(/^(.*:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  let texto = limpia;
  if (mixta) {
    const o = mixta[2].split(".").map(Number);
    if (o.some((n) => Number.isNaN(n) || n > 255)) return null;
    const a = ((o[0] << 8) | o[1]).toString(16);
    const b = ((o[2] << 8) | o[3]).toString(16);
    texto = `${mixta[1]}${a}:${b}`;
  }
  const partes = texto.split("::");
  if (partes.length > 2) return null;
  const izq = partes[0] ? partes[0].split(":") : [];
  const der = partes.length === 2 && partes[1] ? partes[1].split(":") : [];
  const faltan = 8 - izq.length - der.length;
  if (partes.length === 1) {
    if (izq.length !== 8) return null;
  } else if (faltan < 0) return null;
  const todos = partes.length === 1
    ? izq
    : [...izq, ...Array(faltan).fill("0"), ...der];
  const nums = todos.map((g) => (g === "" ? 0 : parseInt(g, 16)));
  if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 0xffff)) return null;
  return nums;
}

function ipv6Vetada(ip) {
  const s = ip.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  const g = gruposDeIpv6(s);
  if (g === null) return true;                               // no la entiendo: no la uso

  if (g.every((n) => n === 0)) return true;                  // ::
  if (g.slice(0, 7).every((n) => n === 0) && g[7] === 1) return true; // ::1

  const primero = g[0];
  if ((primero & 0xfe00) === 0xfc00) return true;            // fc00::/7 unicast local
  if ((primero & 0xffc0) === 0xfe80) return true;            // fe80::/10 link-local
  if ((primero & 0xff00) === 0xff00) return true;            // ff00::/8 multicast

  // --- Las tres formas de escribir una IPv4 dentro de una IPv6 --------------
  // Las tres terminan alcanzando una direccion IPv4, asi que las tres se
  // comprueban contra las reglas de IPv4. Omitir cualquiera es una evasion.

  // 1. Mapeada: ::ffff:a.b.c.d
  if (g.slice(0, 5).every((n) => n === 0) && g[5] === 0xffff) {
    return ipv4Vetada(ipv4DeLosUltimos32(g));
  }
  // 2. Compatible (obsoleta): ::a.b.c.d
  if (g.slice(0, 6).every((n) => n === 0)) {
    return ipv4Vetada(ipv4DeLosUltimos32(g));
  }
  // 3. NAT64: 64:ff9b::/96 y 64:ff9b:1::/48
  if (g[0] === 0x0064 && g[1] === 0xff9b) {
    return ipv4Vetada(ipv4DeLosUltimos32(g));
  }
  // 4. 6to4: 2002:<ipv4>::/16 --- la IPv4 va en los grupos 1 y 2
  if (g[0] === 0x2002) {
    const alto = g[1];
    const bajo = g[2];
    return ipv4Vetada([alto >> 8, alto & 0xff, bajo >> 8, bajo & 0xff].join("."));
  }
  return false;
}

function esIpv4Literal(host) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

/**
 * ¿Se puede pedir esta URL, y a que direccion exacta hay que conectarse?
 *
 * Devuelve tambien la direccion, porque quien conecta **no debe volver a
 * resolver**: esa segunda resolucion es justo la ventana del rebinding.
 *
 * @param {string} url
 * @param {{resolver?: Function}} [opciones] `resolver` se inyecta en las
 *   pruebas para simular que el DNS cambia de respuesta entre llamadas.
 * @returns {Promise<{permitido: boolean, motivo?: string, ip?: string, familia?: number}>}
 */
export async function destinoPermitido(url, { resolver = resolverDelSistema } = {}) {
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

  // Literal IP en la URL, sin pasar por DNS. No hay rebinding posible: no hay
  // nombre que rebindear.
  if (esIpv4Literal(host)) {
    if (ipv4Vetada(host)) return { permitido: false, motivo: "IPv4 en rango vetado" };
    return { permitido: true, ip: host, familia: 4, literal: true };
  }
  if (host.includes(":")) {
    if (ipv6Vetada(host)) return { permitido: false, motivo: "IPv6 en rango vetado" };
    return { permitido: true, ip: host, familia: 6, literal: true };
  }

  // Nombre: se resuelve UNA vez y se comprueban TODAS las direcciones. Una sola
  // mala basta para rechazar: un nombre con dos registros A, uno publico y uno
  // privado, es exactamente como se evade una comprobacion perezosa.
  let direcciones;
  try {
    direcciones = await resolver(host, { all: true });
  } catch (e) {
    return { permitido: false, motivo: `no resuelve: ${e.code ?? e.message}` };
  }
  if (!direcciones?.length) return { permitido: false, motivo: "sin direcciones" };

  for (const { address, family } of direcciones) {
    const mala = family === 6 ? ipv6Vetada(address) : ipv4Vetada(address);
    if (mala) return { permitido: false, motivo: `${host} resuelve a una direccion vetada` };
  }
  // Se fija la primera. Todas pasaron, asi que cualquiera vale; lo que importa
  // es que a partir de aqui NO se vuelve a preguntar.
  const elegida = direcciones[0];
  return { permitido: true, ip: elegida.address, familia: elegida.family };
}

/**
 * Una peticion HTTP(S) a una direccion **ya validada y fijada**.
 *
 * No sigue redirecciones: devuelve el 3xx y su `Location` para que
 * `seguirConGuarda` decida. No lanza: un fallo es un dato.
 *
 * Lo que NO hace, y es deliberado: no toca `rejectUnauthorized`, no toca
 * `servername` salvo para omitirlo cuando el host es una IP literal (donde SNI
 * no aplica), y no vuelve a resolver el nombre.
 */
export function pedirPinneado(url, {
  metodo = "GET",
  timeoutMs = 25000,
  ip,
  familia,
  cabeceras = {},
  maxCuerpo = MAX_CUERPO,
} = {}) {
  return new Promise((resolve) => {
    let u;
    try {
      u = new URL(url);
    } catch {
      resolve({ ok: false, codigo: "URL_INVALIDA", texto: "", mensaje: "URL mal formada" });
      return;
    }
    const esHttps = u.protocol === "https:";
    const pedir = esHttps ? pedirHttps : pedirHttp;
    const hostDesnudo = u.hostname.replace(/^\[|\]$/g, "");
    const esLiteral = esIpv4Literal(hostDesnudo) || hostDesnudo.includes(":");
    const t0 = Date.now();

    const opciones = {
      protocol: u.protocol,
      // `hostname` se conserva: de aqui salen la cabecera Host y el SNI.
      hostname: u.hostname,
      port: u.port || (esHttps ? 443 : 80),
      path: `${u.pathname}${u.search}`,
      method: metodo,
      headers: { host: u.host, ...cabeceras },
      // ---- EL PUNTO DE TODO ESTE ARCHIVO ----
      // La direccion ya validada se entrega aqui. `net.connect` usa este
      // `lookup` en vez de preguntarle al sistema, asi que entre validar y
      // conectar no hay una segunda resolucion que contestar distinto.
      lookup: (_nombre, opts, cb) => {
        if (opts?.all) cb(null, [{ address: ip, family: familia }]);
        else cb(null, ip, familia);
      },
    };
    // SNI solo tiene sentido con un nombre. Con una IP literal, enviarlo es
    // invalido; se omite y la validacion del certificado sigue activa.
    if (esHttps && !esLiteral) opciones.servername = hostDesnudo;

    const req = pedir(opciones, (res) => {
      const trozos = [];
      let total = 0;
      res.on("data", (d) => {
        total += d.length;
        if (total <= maxCuerpo) trozos.push(d);
        else res.destroy();
      });
      res.on("end", () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          codigo: res.statusCode,
          texto: metodo === "HEAD" ? "" : Buffer.concat(trozos).toString("utf8"),
          cabeceras: res.headers,
          ms: Date.now() - t0,
          mensaje: res.statusCode >= 200 && res.statusCode < 300
            ? "OK"
            : `HTTP ${res.statusCode} ${res.statusMessage ?? ""}`.trim(),
          ip,
        });
      });
      res.on("error", (e) => resolve(fallo(e, t0, ip)));
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy(Object.assign(new Error("tiempo agotado"), { code: "TIMEOUT" }));
    });
    req.on("error", (e) => resolve(fallo(e, t0, ip)));
    req.end();
  });
}

function fallo(e, t0, ip) {
  const causa = e.code ?? e.cause?.code ?? "";
  let codigo = "RED";
  if (causa === "TIMEOUT" || causa === "ETIMEDOUT") codigo = "TIMEOUT";
  else if (/CERT|SSL|TLS|ALTNAME/i.test(causa)) codigo = "TLS_INVALIDO";
  else if (/ENOTFOUND|EAI_AGAIN/i.test(causa)) codigo = "DNS";
  else if (causa) codigo = causa;
  return {
    ok: false,
    codigo,
    texto: "",
    cabeceras: {},
    ms: Date.now() - t0,
    mensaje: `${e.name}: ${e.message}`,
    ip,
  };
}

/**
 * Pide una URL siguiendo redirecciones **a mano**, validando y fijando el
 * destino **en cada salto**. Es la unica puerta por la que el canal sale a la
 * red.
 *
 * Que no se resuelva una sola vez al principio no es un detalle: un 302 lleva a
 * otro nombre, y ese nombre necesita su propia validacion y su propia fijacion.
 */
export async function seguirConGuarda(url, {
  metodo = "GET",
  timeoutMs = 25000,
  resolver = resolverDelSistema,
  cabeceras = {},
  maxCuerpo = MAX_CUERPO,
  // `maxSaltos: 0` = no seguir ninguna redireccion. Es lo correcto para una
  // peticion que lleva credencial: seguir un 3xx reenviaria la cabecera
  // `Authorization` al destino, y ese destino lo elige quien controle la
  // respuesta. Una guarda que permite eso no protege, filtra.
  maxSaltos = MAX_SALTOS,
  // Inyectable para las pruebas. Recibe la `ip` ya validada, asi que una
  // prueba puede comprobar **a que direccion se iba a conectar** sin abrir un
  // socket --- que es justo lo que hace falta para demostrar el fijado.
  pedir = pedirPinneado,
} = {}) {
  let actual = url;
  const saltos = [];

  for (let salto = 0; salto <= maxSaltos; salto += 1) {
    const permiso = await destinoPermitido(actual, { resolver });
    if (!permiso.permitido) {
      return {
        ok: false,
        codigo: "DESTINO_VETADO",
        texto: "",
        cabeceras: {},
        ms: 0,
        mensaje: `destino no permitido: ${permiso.motivo}`,
        url: actual,
        saltos,
      };
    }

    const r = await pedir(actual, {
      metodo, timeoutMs, cabeceras, maxCuerpo,
      ip: permiso.ip, familia: permiso.familia,
    });
    saltos.push({ url: actual, ip: permiso.ip, codigo: r.codigo });

    const esRedireccion = typeof r.codigo === "number" && r.codigo >= 300 && r.codigo < 400;
    if (!esRedireccion) return { ...r, url: actual, saltos };

    const destino = r.cabeceras?.location;
    if (!destino) return { ...r, url: actual, saltos };  // 3xx sin Location: se entrega tal cual

    try {
      actual = new URL(destino, actual).href;
    } catch {
      return {
        ok: false, codigo: "REDIRECCION_INVALIDA", texto: "", cabeceras: {}, ms: r.ms,
        mensaje: `Location no es una URL usable: ${destino}`, url: actual, saltos,
      };
    }
  }

  return {
    ok: false,
    codigo: "DEMASIADAS_REDIRECCIONES",
    texto: "",
    cabeceras: {},
    ms: 0,
    mensaje: maxSaltos === 0
      ? `redireccion no permitida en una peticion con credencial: ${url}`
      : `mas de ${maxSaltos} redirecciones desde ${url}`,
    url: actual,
    saltos,
  };
}

/**
 * Descarga una URL externa y devuelve su texto plano. Capa fina sobre
 * `seguirConGuarda` para el redactor.
 */
export async function traerSeguro(url, { maxChars = 12000, timeoutS = 25, resolver } = {}) {
  const r = await seguirConGuarda(url, {
    timeoutMs: timeoutS * 1000,
    resolver,
    cabeceras: {
      "user-agent": "Mozilla/5.0 (compatible; canal-editorial/1.0)",
      accept: "text/html,application/xhtml+xml,*/*",
    },
  });
  if (!r.ok) return { texto: null, motivo: r.mensaje, url: r.url };
  return { texto: limpiar(r.texto, maxChars), motivo: null, url: r.url };
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
