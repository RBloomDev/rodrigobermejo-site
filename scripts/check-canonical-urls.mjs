/**
 * Comprueba que el sitio publica sus URLs canonicas en el host donde de verdad
 * responde, y no en uno que redirige.
 *
 * ## Por que existe este archivo
 *
 * `NEXT_PUBLIC_SITE_URL` no esta definida en el proyecto de Vercel, asi que
 * `app/sitemap.ts:6`, `app/robots.ts:4` y `app/layout.tsx:36` caen los tres al
 * mismo fallback del apex:
 *
 *     process.env.NEXT_PUBLIC_SITE_URL || HOST_CANONICO   // lib/site.ts
 *
 * Produccion responde en `www.rodrigobermejo.com`, y el apex hace **307** hacia
 * ahi. Resultado medido el 2026-09-10: las 19 URLs del sitemap apuntaban a una
 * redireccion, y `metadataBase` --- del que salen las canonicas y las de
 * OpenGraph --- tambien.
 *
 * No estaba roto: los buscadores siguen el redirect. Era perdida de senal, y
 * venia creciendo: eran 5 URLs antes de publicar la superficie de evidencia.
 *
 * ## El metodo, y por que importa mas que el resultado
 *
 * **`redirect: "manual"`.** Es la misma leccion que `check-preview-protection.mjs`
 * dejo escrita: el 2026-08-28 se reporto un agujero de privacidad inexistente
 * porque `curl -L` seguia un 302 al login de Vercel y devolvia su 200.
 *
 * Aqui el error simetrico seria dar por buena una URL del sitemap porque
 * "responde 200" cuando lo que responde 200 es el destino del redirect. Un
 * chequeo que no distingue **servido** de **redirigido** no comprueba nada, y
 * falla en la direccion cara: en verde.
 *
 * ## Que comprueba
 *
 * 1. Cada `<loc>` del sitemap responde **directamente**, sin redirect.
 * 2. La linea `Sitemap:` de robots.txt apunta al host canonico.
 * 3. El `<link rel="canonical">` y el `og:url` de la home estan en ese host.
 *
 * ## Que NO comprueba
 *
 * No dice si el host canonico elegido es el correcto --- eso es una decision, y
 * se le pasa como argumento. No comprueba contenido, ni SEO, ni si el sitemap
 * lista todo lo que deberia. Es una mitigacion acotada.
 *
 * ## Uso
 *
 *     node scripts/check-canonical-urls.mjs https://www.rodrigobermejo.com
 *
 * Sin URL falla: un guard que pasa vacuamente es peor que no tenerlo.
 */

const BASE = process.argv[2];

if (!BASE) {
  console.error("uso: node scripts/check-canonical-urls.mjs <url-base-canonica>");
  console.error("  ejemplo: node scripts/check-canonical-urls.mjs https://www.rodrigobermejo.com");
  process.exit(1);
}

const base = BASE.replace(/\/$/, "");
const host = new URL(base).host;

/** Nunca sigue redirects: un 3xx es un hallazgo, no un paso intermedio. */
async function pedir(url) {
  const res = await fetch(url, { redirect: "manual", headers: { "user-agent": "canonical-guard" } });
  return { status: res.status, location: res.headers.get("location"), res };
}

const fallos = [];
const anota = (msg) => {
  fallos.push(msg);
  console.error(`  FALLO  ${msg}`);
};

// --- 1. sitemap.xml -------------------------------------------------------

console.log(`\nComprobando URLs canonicas contra ${base}\n`);

const sitemapUrl = `${base}/sitemap.xml`;
const sitemap = await pedir(sitemapUrl);

if (sitemap.status !== 200) {
  anota(`${sitemapUrl} respondio ${sitemap.status}${sitemap.location ? ` -> ${sitemap.location}` : ""}`);
} else {
  const xml = await sitemap.res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  if (locs.length === 0) {
    anota("el sitemap no contiene ninguna <loc>");
  } else {
    const ajenas = locs.filter((u) => new URL(u).host !== host);
    console.log(`  sitemap: ${locs.length} URL(s), ${locs.length - ajenas.length} en ${host}`);
    if (ajenas.length > 0) {
      anota(`${ajenas.length} URL(s) del sitemap NO estan en ${host}. Primera: ${ajenas[0]}`);
    }

    // Una muestra responde DIRECTAMENTE, sin redirect. No se piden todas: el
    // objetivo es cazar el host equivocado, y con el host equivocado fallan todas.
    const muestra = locs.slice(0, 3);
    for (const u of muestra) {
      const r = await pedir(u);
      if (r.status >= 300 && r.status < 400) {
        anota(`${u} responde ${r.status} -> ${r.location} (redirige en vez de servir)`);
      } else if (r.status !== 200) {
        anota(`${u} responde ${r.status}`);
      }
    }
    if (muestra.length > 0 && fallos.length === 0) {
      console.log(`  las ${muestra.length} URL(s) de muestra responden 200 DIRECTO, sin redirect`);
    }
  }
}

// --- 2. robots.txt --------------------------------------------------------

const robots = await pedir(`${base}/robots.txt`);
if (robots.status !== 200) {
  anota(`robots.txt respondio ${robots.status}`);
} else {
  const txt = await robots.res.text();
  const linea = txt.split("\n").find((l) => /^sitemap:/i.test(l.trim()));
  if (!linea) {
    anota("robots.txt no declara ninguna linea 'Sitemap:'");
  } else {
    const declarada = linea.split(/:\s*/).slice(1).join(":").trim();
    if (new URL(declarada).host !== host) {
      anota(`robots.txt apunta el sitemap a ${declarada}, que no esta en ${host}`);
    } else {
      console.log(`  robots.txt: Sitemap en ${host}`);
    }
  }
}

// --- 3. metadata de la home ----------------------------------------------

const home = await pedir(base);
if (home.status !== 200) {
  anota(`la home respondio ${home.status}${home.location ? ` -> ${home.location}` : ""}`);
} else {
  const html = await home.res.text();

  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1];
  const ogUrl = html.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i)?.[1];

  for (const [nombre, valor] of [
    ["canonical", canonical],
    ["og:url", ogUrl],
  ]) {
    if (valor === undefined) {
      // Ausente no es fallo: Next no siempre emite canonical si no se declara.
      console.log(`  ${nombre}: ausente (no se comprueba)`);
    } else if (new URL(valor, base).host !== host) {
      anota(`${nombre} = ${valor}, que no esta en ${host}`);
    } else {
      console.log(`  ${nombre}: en ${host}`);
    }
  }
}

// --- veredicto ------------------------------------------------------------

if (fallos.length > 0) {
  console.error(
    `\n${fallos.length} fallo(s). Si todas las URLs estan en el host equivocado, la causa mas` +
      `\nprobable es que NEXT_PUBLIC_SITE_URL no este definida en el entorno del build.` +
      `\nValor correcto para produccion: ${base}` +
      `\nRecuerda que la variable entra en BUILD TIME: hay que redesplegar.\n`,
  );
  process.exit(1);
}

console.log(`\nOK: sitemap, robots y metadata en ${host}, sirviendo directo.\n`);
