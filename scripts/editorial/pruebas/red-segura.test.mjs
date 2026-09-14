/**
 * La guarda contra SSRF (`red-segura.mjs`), y por que cada caso.
 *
 * El defecto que estas pruebas existen para impedir: el canal descarga URLs que NO
 * elegimos --- salen de feeds RSS de terceros y del texto de articulos ajenos que el
 * redactor cita. La version anterior validaba solo el esquema, y `http://169.254.169.254/`
 * pasa esa comprobacion perfectamente.
 *
 * COMO SE PONEN ROJAS, todas a la vez: quita la llamada a `destinoPermitido` de
 * `traerSeguro` y de `obtener`, o haz que `ipv4Vetada` devuelva siempre `false`.
 *
 * Sin red: lo que se rechaza se rechaza ANTES de abrir ningun socket, y esa es justamente
 * la propiedad que se comprueba.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { destinoPermitido } from '../red-segura.mjs';

// Cada fila: [url, fragmento esperado del motivo]. No basta con comprobar que se rechaza:
// se comprueba QUE SE RECHACE POR LO CORRECTO. Un rechazo por «URL mal formada» cuando lo
// que hay delante es la IP de metadatos de la nube seria un aprobado por accidente.
const VETADAS = [
  ['http://169.254.169.254/latest/meta-data/', 'vetad'],   // metadatos de nube
  ['http://127.0.0.1:6379/', 'puerto'],                    // redis local: cae antes por puerto
  ['http://127.0.0.1/', 'vetad'],                          // loopback en puerto 80
  ['http://10.0.0.5/admin', 'vetad'],                      // red privada
  ['http://192.168.1.1/', 'vetad'],                        // router domestico
  ['http://172.16.0.1/', 'vetad'],                         // privada 172.16/12
  ['http://100.64.0.1/', 'vetad'],                         // CGNAT
  ['http://[::1]/', 'vetad'],                              // loopback IPv6
  ['http://[::ffff:127.0.0.1]/', 'vetad'],                 // IPv4 embebida: el rodeo clasico
  ['http://localhost/', 'reservad'],                       // nombre, sin resolver siquiera
  ['http://LOCALHOST./', 'reservad'],                      // mayusculas + punto final
  ['http://metadata.google.internal/', 'reservad'],
  ['http://algo.internal/', 'reservad'],
  ['https://ejemplo.com:8080/', 'puerto'],                 // puerto no estandar
  ['file:///C:/Windows/win.ini', 'esquema'],
  ['gopher://ejemplo.com/', 'esquema'],
  ['no-es-una-url', 'mal formada'],
];

for (const [url, fragmento] of VETADAS) {
  test(`destino vetado: ${url}`, async () => {
    const r = await destinoPermitido(url);
    assert.equal(r.permitido, false, `${url} deberia rechazarse`);
    assert.match(r.motivo, new RegExp(fragmento, 'i'));
  });
}

test('172.32.0.1 NO esta en el rango privado y no se veta por error', async () => {
  // 172.16/12 llega hasta 172.31. Vetar 172.32 seria bloquear internet publica, y una
  // guarda que rechaza de mas termina desactivada --- y entonces no guarda nada.
  const r = await destinoPermitido('http://172.32.0.1/');
  assert.equal(r.permitido, true);
});

test('una IP publica literal pasa', async () => {
  const r = await destinoPermitido('https://93.184.216.34/');
  assert.equal(r.permitido, true);
});

test('un nombre que no resuelve se rechaza como dato, no como excepcion', async () => {
  // Importa la FORMA del fallo: el canal registra fallos, no los lanza. Si esto lanzara,
  // la corrida moriria en vez de dejar constancia (§5.5).
  const r = await destinoPermitido('https://no-existe-este-dominio-jamas-12345.invalid/');
  assert.equal(r.permitido, false);
  assert.match(r.motivo, /no resuelve/i);
});

// --- La redireccion, que es la parte que mas se olvida ------------------------------
//
// Validar la primera URL no sirve de nada si despues se obedece un 302 a ciegas. Aqui se
// comprueba la puerta de red del canal entero (`comun.obtener`) contra ese caso exacto,
// con `fetch` sustituido: sin red, y deterministico.
//
// COMO SE PONE ROJA: cambia `redirect: 'manual'` por `redirect: 'follow'` en `obtener`.

test('un 302 hacia la IP de metadatos NO se sigue', async () => {
  const { obtener } = await import('../comun.mjs');
  const original = globalThis.fetch;
  const visitadas = [];
  const METADATOS = 'http://169.254.169.254/latest/meta-data/';
  // El doble HONRA `init.redirect`, y eso no es un detalle: la primera version de esta
  // prueba devolvia siempre 302 pasara lo que pasara, asi que seguia verde aunque se
  // cambiara `manual` por `follow` --- una prueba que no puede ponerse roja. Con un
  // `fetch` real, `follow` sigue la redireccion por dentro y nunca nos devuelve el 302:
  // la guarda quedaria puenteada sin que nadie lo notara. El doble reproduce eso.
  globalThis.fetch = async (url, init) => {
    visitadas.push(String(url));
    if (init?.redirect === 'follow') {
      visitadas.push(METADATOS);         // fetch salta solo, sin preguntar
      return {
        status: 200,
        ok: true,
        statusText: 'OK',
        headers: { get: () => null },
        text: async () => 'credenciales-de-instancia',
      };
    }
    return {
      status: 302,
      ok: false,
      statusText: 'Found',
      headers: { get: (k) => (k.toLowerCase() === 'location' ? METADATOS : null) },
      text: async () => '',
    };
  };
  try {
    // Primer salto: IP publica literal, para que la prueba no dependa de DNS.
    const r = await obtener('https://93.184.216.34/noticia');
    assert.equal(r.ok, false);
    assert.equal(r.codigo, 'DESTINO_VETADO');
    assert.match(r.mensaje, /vetad/i);
    // Y lo que de verdad importa: la segunda peticion NUNCA se hizo.
    assert.equal(visitadas.length, 1, 'no debe pedirse el destino de la redireccion');
    assert.equal(visitadas[0], 'https://93.184.216.34/noticia');
  } finally {
    globalThis.fetch = original;
  }
});

test('una cadena de redirecciones publicas se corta a los 5 saltos', async () => {
  const { obtener } = await import('../comun.mjs');
  const original = globalThis.fetch;
  let n = 0;
  globalThis.fetch = async () => {
    n += 1;
    return {
      status: 302,
      ok: false,
      statusText: 'Found',
      headers: { get: () => `https://93.184.216.${34 + n}/` },
      text: async () => '',
    };
  };
  try {
    const r = await obtener('https://93.184.216.34/bucle');
    assert.equal(r.codigo, 'DEMASIADAS_REDIRECCIONES');
  } finally {
    globalThis.fetch = original;
  }
});
