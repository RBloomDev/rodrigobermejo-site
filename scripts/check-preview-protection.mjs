/**
 * Comprueba que un deployment de preview NO sirve el feed publicamente.
 *
 * ## Por que existe este archivo
 *
 * El 2026-08-28 reporte que los previews de Vercel eran publicos, con un
 * "HTTP 200 verificado" que era falso. El comando era:
 *
 *     curl -s -o /dev/null -w "%{http_code}" -L <preview-url>/proof/schemas/...
 *
 * `-L` sigue los redirects y reporta el estado de la respuesta FINAL. Con la
 * proteccion activa, el preview responde 302 hacia `vercel.com/sso-api`, y `-L`
 * iba al login de Vercel y devolvia el **200 de la pagina de login**. El cuerpo
 * era HTML de Vercel, no el archivo. Nunca lo mire.
 *
 * El defecto no fue la conclusion, fue el metodo: **un test que no distingue
 * "servido" de "redirigido a un login" no comprueba nada.** Y lo peor es que
 * fallaba en la direccion cara: reportaba un agujero de privacidad inexistente,
 * y por ese camino se toman decisiones de arquitectura equivocadas.
 *
 * Asi que la comprobacion deja de ser un comando a mano y pasa a ser esto, que
 * corre solo en cada deployment de preview.
 *
 * ## Que comprueba y que no
 *
 * COMPRUEBA: que las rutas del feed en un preview responden con algo distinto de
 * 200 **sin seguir redirects**, y que el cuerpo no es el artefacto.
 *
 * NO COMPRUEBA: que la proteccion sea de un tipo concreto, ni que produccion siga
 * siendo publica, ni nada sobre dominios propios. Es una mitigacion acotada, y se
 * tabula como tal en `docs/04-architecture.md` §4.1.
 *
 * NUNCA pasa vacuamente: sin URL, falla. Un guard que se salta cuando no
 * encuentra su objetivo es peor que no tenerlo, porque su verde se lee igual.
 */

const RUTAS = ["/proof/v1/meta.json", "/proof/v1/projects.json", "/proof/schemas/meta.schema.json"];

const url = process.argv[2];

if (!url) {
  console.error("::error::Sin URL de preview no hay nada que comprobar, y pasar en ese caso");
  console.error("::error::seria un verde que no significa nada. Uso: node scripts/check-preview-protection.mjs <url>");
  process.exit(1);
}

const base = url.replace(/\/+$/, "");
let expuestas = 0;

for (const ruta of RUTAS) {
  const destino = `${base}${ruta}`;
  let res;
  try {
    // `redirect: "manual"` es TODO el punto de este archivo: sin el, un 302 al
    // login de Vercel se convierte en un 200 y el guard miente en verde.
    res = await fetch(destino, { redirect: "manual" });
  } catch (e) {
    console.error(`::error::No se pudo consultar ${destino}: ${e.message}`);
    process.exit(1);
  }

  if (res.status === 200) {
    const cuerpo = await res.text();
    expuestas++;
    console.error(`::error::${ruta} responde 200 SIN autenticacion en un preview.`);
    console.error(`::error::  Los primeros bytes son: ${cuerpo.slice(0, 120).replace(/\n/g, " ")}`);
    console.error(
      "::error::  Esto rompe el control de docs/03 §1.5: el PR deja de ser el punto donde " +
        "se decide que se vuelve publico, porque ya lo es antes del merge.",
    );
  } else {
    console.log(`  ${ruta} -> HTTP ${res.status} (protegido)`);
  }
}

if (expuestas > 0) {
  console.error(
    `::error::${expuestas} ruta(s) del feed expuestas en preview. Comprueba Deployment ` +
      "Protection en Vercel: deberia estar en 'all_except_custom_domains' o mas estricto.",
  );
  process.exit(1);
}

console.log(`OK: ninguna ruta del feed se sirve sin autenticacion en ${base}`);
