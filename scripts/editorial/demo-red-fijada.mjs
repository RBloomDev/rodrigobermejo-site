/**
 * Demostracion con RED REAL de que el fijado de direccion funciona y no rompe nada.
 *
 * Va aparte de `pruebas/` a proposito: esa suite corre sin red y tiene que seguir
 * corriendo sin red. Esto sale a internet, asi que es un comando que se ejecuta y cuya
 * salida se pega en el informe, no un test de CI.
 *
 *     node scripts/editorial/demo-red-fijada.mjs
 *
 * Comprueba cuatro cosas, y la tercera es la que mas importa:
 *
 *   1. Una peticion HTTPS permitida **sigue funcionando** con la direccion fijada. Si el
 *      fijado rompiera SNI o el virtual hosting, esto fallaria --- y era justo lo que la
 *      version anterior de `red-segura.mjs` afirmaba, sin haberlo probado.
 *   2. Un host con virtual hosting real responde su propio contenido, no el de otro sitio
 *      del mismo servidor compartido. Es la comprobacion concreta de que el SNI viaja.
 *   3. **La validacion del certificado sigue activa.** Se fija a proposito una direccion
 *      que NO corresponde al hostname; el handshake tiene que fallar por nombre de
 *      certificado. Si esto pasara en verde, significaria que alguien desactivo la
 *      verificacion --- el modo de fallo mas peligroso de todo este archivo.
 *   4. Un destino vetado se rechaza antes de abrir socket.
 */

import { destinoPermitido, pedirPinneado, seguirConGuarda } from "./red-segura.mjs";

const linea = (s) => console.log(s);
let fallos = 0;

function resultado(ok, titulo, detalle) {
  linea(`${ok ? "  OK  " : " FALLO"}  ${titulo}`);
  if (detalle) linea(`        ${detalle}`);
  if (!ok) fallos += 1;
}

linea("\n== Demostracion de red con direccion fijada ==\n");

// --- 1. Una peticion HTTPS permitida funciona -------------------------------------
{
  const url = "https://arxiv.org/list/cs.CY/recent";
  const permiso = await destinoPermitido(url);
  const r = await seguirConGuarda(url, { timeoutMs: 20000 });
  resultado(
    r.ok && r.texto.length > 0,
    `HTTPS permitido sigue funcionando con la direccion fijada: ${url}`,
    `validada y fijada ${permiso.ip} · HTTP ${r.codigo} · ${r.texto.length} bytes · ${r.ms} ms`,
  );
}

// --- 2. El SNI viaja: virtual hosting intacto -------------------------------------
{
  // `observatorio.tec.mx` esta detras de un CDN compartido. Si el SNI no viajara, el
  // servidor no sabria que sitio servir y devolveria un error o el sitio equivocado.
  const url = "https://observatorio.tec.mx/";
  const permiso = await destinoPermitido(url);
  const r = await seguirConGuarda(url, { timeoutMs: 20000 });
  const suyo = /observatorio/i.test(r.texto ?? "");
  resultado(
    r.ok && suyo,
    `virtual hosting intacto: el servidor compartido sirve SU sitio`,
    `fijada ${permiso.ip} · HTTP ${r.codigo} · el cuerpo menciona «observatorio»: ${suyo}`,
  );
}

// --- 3. La validacion del certificado NO esta desactivada -------------------------
//
// Un intento anterior de esta comprobacion fijaba `example.com` a la direccion de
// Cloudflare esperando un fallo de certificado, y salio HTTP 403: `example.com` hoy se
// sirve DESDE Cloudflare, asi que el handshake era legitimo. La prueba estaba mal
// construida, no la guarda. Se usan los hosts que existen exactamente para esto.
{
  const CASOS = [
    ["https://expired.badssl.com/", "certificado caducado"],
    ["https://wrong.host.badssl.com/", "certificado que no cubre el hostname"],
    ["https://self-signed.badssl.com/", "certificado autofirmado"],
  ];
  for (const [url, que] of CASOS) {
    const r = await seguirConGuarda(url, { timeoutMs: 15000 });
    const murioPorCertificado = r.codigo === "TLS_INVALIDO"
      || /cert|altname|self.signed|hostname|expired/i.test(r.mensaje ?? "");
    resultado(
      !r.ok && murioPorCertificado,
      `la validacion del certificado sigue activa: ${que}`,
      `${url} -> codigo=${r.codigo} · ${r.mensaje}`,
    );
  }

  // Y el mismo caso, pero con la direccion fijada a mano: fijar NO puentea la validacion.
  const permiso = await destinoPermitido("https://expired.badssl.com/");
  if (permiso.permitido) {
    const r = await pedirPinneado("https://expired.badssl.com/", {
      ip: permiso.ip, familia: permiso.familia, timeoutMs: 15000,
    });
    resultado(
      !r.ok && (r.codigo === "TLS_INVALIDO" || /cert|expired/i.test(r.mensaje ?? "")),
      "fijar la direccion NO puentea la validacion del certificado",
      `fijada ${permiso.ip} -> codigo=${r.codigo} · ${r.mensaje}`,
    );
  }
}

// --- 4. Un destino vetado no abre socket -----------------------------------------
{
  const r = await seguirConGuarda("http://169.254.169.254/latest/meta-data/");
  resultado(
    !r.ok && r.codigo === "DESTINO_VETADO",
    "el endpoint de metadatos de la nube se rechaza sin conectar",
    `codigo=${r.codigo} · ${r.mensaje}`,
  );
}

linea(`\n${fallos === 0 ? "TODO OK" : `${fallos} FALLO(S)`}\n`);
process.exit(fallos === 0 ? 0 : 1);
