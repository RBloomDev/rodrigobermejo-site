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

import { destinoPermitido, seguirConGuarda } from '../red-segura.mjs';

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

// --- Las IPv4 escondidas dentro de una IPv6 ---------------------------------------
//
// Son cuatro formas distintas de escribir la MISMA direccion IPv4, y las cuatro terminan
// alcanzandola. Una revision adversarial encontro NAT64 y 6to4 abiertas: la version
// anterior solo desenvolvia la forma mapeada, y las otras dos salian PERMITIDO.
//
// COMO SE PONEN ROJAS: borra la rama correspondiente de `ipv6Vetada`.
const IPV6_CON_IPV4_DENTRO = [
  ['http://[::ffff:127.0.0.1]/', 'mapeada a loopback'],
  ['http://[::ffff:169.254.169.254]/', 'mapeada a metadatos de nube'],
  ['http://[::127.0.0.1]/', 'compatible (obsoleta) a loopback'],
  ['http://[64:ff9b::7f00:1]/', 'NAT64 a 127.0.0.1'],
  ['http://[64:ff9b::a9fe:a9fe]/', 'NAT64 a 169.254.169.254'],
  ['http://[2002:7f00:1::]/', '6to4 a 127.0.0.1'],
  ['http://[2002:a9fe:a9fe::]/', '6to4 a 169.254.169.254'],
  ['http://[2002:c0a8:101::]/', '6to4 a 192.168.1.1'],
];

for (const [url, que] of IPV6_CON_IPV4_DENTRO) {
  test(`IPv6 que envuelve una IPv4 vetada: ${que}`, async () => {
    const r = await destinoPermitido(url);
    assert.equal(r.permitido, false, `${url} (${que}) deberia rechazarse`);
  });
}

test('una IPv6 publica de verdad NO se veta por error', async () => {
  // Si la guarda rechazara toda IPv6, el arreglo de arriba seria un apagon disfrazado de
  // seguridad. `2606:4700::1111` es Cloudflare; `2002:5db8:d822::` es 6to4 sobre una
  // IPv4 publica (93.184.216.34) y tambien debe pasar.
  for (const url of ['http://[2606:4700::1111]/', 'http://[2002:5db8:d822::]/']) {
    const r = await destinoPermitido(url);
    assert.equal(r.permitido, true, `${url} deberia permitirse`);
  }
});

// --- DNS REBINDING: la demostracion ------------------------------------------------
//
// Esta es la prueba que el usuario pidio: que un cambio de resolucion ENTRE la validacion
// y la conexion no alcance un destino vetado.
//
// El montaje: un resolutor hostil que contesta una IP publica la primera vez ---para pasar
// la validacion--- y `127.0.0.1` a partir de la segunda. Es exactamente lo que hace un
// servidor DNS con TTL 0 bajo control del atacante.
//
// Lo que se observa es `pedir`, que recibe la `ip` a la que la conexion se va a hacer. Si
// la guarda fija la direccion validada, ahi llega la publica. Si volviera a resolver,
// llegaria `127.0.0.1` --- y ese es el fallo que esto impide.

function resolutorQueCambia(primera, despues) {
  let llamadas = 0;
  const fn = async () => {
    llamadas += 1;
    return llamadas === 1
      ? [{ address: primera, family: 4 }]
      : [{ address: despues, family: 4 }];
  };
  fn.llamadas = () => llamadas;
  return fn;
}

test('REBINDING: la conexion usa la direccion validada, no la que el DNS contesta despues', async () => {
  const resolver = resolutorQueCambia('93.184.216.34', '127.0.0.1');
  const vistas = [];
  const pedir = async (url, opciones) => {
    vistas.push(opciones.ip);
    return { ok: true, codigo: 200, texto: 'ok', cabeceras: {}, ms: 1 };
  };

  const r = await seguirConGuarda('http://rebind.ejemplo/', { resolver, pedir });

  assert.equal(r.ok, true);
  // Lo que importa: se conecto a la direccion VALIDADA.
  assert.deepEqual(vistas, ['93.184.216.34']);
  assert.notEqual(vistas[0], '127.0.0.1');
  // Y solo se resolvio UNA vez. Una segunda resolucion es, por definicion, la ventana.
  assert.equal(resolver.llamadas(), 1);
});

test('REBINDING: el control negativo --- volver a resolver SI alcanza el loopback', async () => {
  // Sin este control, la prueba de arriba no demuestra nada: podria estar verde porque el
  // resolutor nunca cambia. Aqui se reproduce a mano el comportamiento ingenuo ---resolver
  // para validar y volver a resolver para conectar--- y se comprueba que SI llega a
  // 127.0.0.1. Esa es la diferencia exacta que introduce el fijado.
  const resolver = resolutorQueCambia('93.184.216.34', '127.0.0.1');

  const permiso = await destinoPermitido('http://rebind.ejemplo/', { resolver });
  assert.equal(permiso.permitido, true);
  assert.equal(permiso.ip, '93.184.216.34');

  const segunda = await resolver('rebind.ejemplo', { all: true });
  assert.equal(segunda[0].address, '127.0.0.1');
  assert.notEqual(segunda[0].address, permiso.ip);
});

test('REBINDING: si la PRIMERA resolucion ya es privada, no hay conexion en absoluto', async () => {
  const resolver = resolutorQueCambia('127.0.0.1', '93.184.216.34');
  let seLlamo = false;
  const pedir = async () => { seLlamo = true; return { ok: true, codigo: 200 }; };

  const r = await seguirConGuarda('http://hostil.ejemplo/', { resolver, pedir });

  assert.equal(r.ok, false);
  assert.equal(r.codigo, 'DESTINO_VETADO');
  assert.equal(seLlamo, false, 'no debe abrirse ninguna conexion');
});

// --- Las redirecciones, sobre el cliente nuevo ------------------------------------
//
// COMO SE PONEN ROJAS: haz que `seguirConGuarda` deje de revalidar en cada salto.

test('un 302 hacia la IP de metadatos NO se sigue', async () => {
  const pedidas = [];
  const pedir = async (url) => {
    pedidas.push(url);
    return {
      ok: false, codigo: 302, texto: '',
      cabeceras: { location: 'http://169.254.169.254/latest/meta-data/' }, ms: 1,
    };
  };

  const r = await seguirConGuarda('https://93.184.216.34/noticia', { pedir });

  assert.equal(r.ok, false);
  assert.equal(r.codigo, 'DESTINO_VETADO');
  assert.match(r.mensaje, /vetad/i);
  // Lo que de verdad importa: la segunda peticion nunca se hizo.
  assert.deepEqual(pedidas, ['https://93.184.216.34/noticia']);
});

test('cada salto se valida por separado, no solo el primero', async () => {
  // Dos saltos publicos y un tercero al loopback. El tercero tiene que morir aunque los
  // dos anteriores fueran legitimos.
  const cadena = {
    'https://93.184.216.34/uno': 'https://93.184.216.35/dos',
    'https://93.184.216.35/dos': 'http://10.0.0.5/admin',
  };
  const pedidas = [];
  const pedir = async (url) => {
    pedidas.push(url);
    const destino = cadena[url];
    return destino
      ? { ok: false, codigo: 302, texto: '', cabeceras: { location: destino }, ms: 1 }
      : { ok: true, codigo: 200, texto: 'llegue', cabeceras: {}, ms: 1 };
  };

  const r = await seguirConGuarda('https://93.184.216.34/uno', { pedir });

  assert.equal(r.codigo, 'DESTINO_VETADO');
  assert.equal(pedidas.length, 2, 'el tercer salto no debe pedirse');
});

test('una cadena de redirecciones publicas se corta a los 5 saltos', async () => {
  let n = 0;
  const pedir = async () => {
    n += 1;
    return {
      ok: false, codigo: 302, texto: '',
      cabeceras: { location: `https://93.184.216.${34 + n}/` }, ms: 1,
    };
  };
  const r = await seguirConGuarda('https://93.184.216.34/bucle', { pedir });
  assert.equal(r.codigo, 'DEMASIADAS_REDIRECCIONES');
});

test('con credencial no se sigue ninguna redireccion', async () => {
  // Seguir un 3xx reenviaria la cabecera Authorization a un destino que elige quien
  // controle la respuesta. `maxSaltos: 0` lo impide, y la sonda de WakaTime lo usa.
  const pedir = async () => ({
    ok: false, codigo: 302, texto: '',
    cabeceras: { location: 'https://93.184.216.99/' }, ms: 1,
  });
  const r = await seguirConGuarda('https://93.184.216.34/api', { pedir, maxSaltos: 0 });
  assert.equal(r.codigo, 'DEMASIADAS_REDIRECCIONES');
  assert.match(r.mensaje, /credencial/i);
});
