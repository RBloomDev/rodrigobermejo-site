/**
 * El host canónico del sitio, en un solo lugar.
 *
 * ## Por qué existe este archivo
 *
 * El default vivía duplicado en tres archivos —`app/layout.tsx`, `app/robots.ts`
 * y `app/sitemap.ts`— y en los tres era **`https://rodrigobermejo.com`**, el
 * apex. El sitio vive en `www`: el apex responde **307** y redirige. Así que
 * cuando `NEXT_PUBLIC_SITE_URL` no está definida en el entorno del build —y no
 * lo está— el sitio publicaba su `sitemap.xml` entero, su `robots.txt`, su
 * `canonical` y su `og:url` apuntando a un host que no sirve contenido.
 *
 * Medido el 2026-09-15 contra producción: 19 URLs del sitemap en el apex, y
 * `https://rodrigobermejo.com/evidencia` respondiendo `307 → www`.
 *
 * Tres copias del mismo valor son tres oportunidades de que diverjan, y ya
 * habían divergido de `.env.example`, que documenta `www` desde el principio.
 * Por eso el valor vive aquí y se importa: corregir el default en dos de los
 * tres archivos habría dejado el defecto vivo justo donde nadie lo mirara.
 *
 * ## Qué NO resuelve
 *
 * `NEXT_PUBLIC_SITE_URL` sigue siendo la fuente preferente, y sigue sin estar
 * definida en Vercel. Este default hace que su ausencia deje de ser un defecto
 * publicado; no la sustituye. La variable entra en **build time**: definirla
 * exige redesplegar.
 *
 * Este módulo no importa nada, a propósito: `app/layout.tsx` es parte del funnel
 * comercial, y `guard:funnel` comprueba por cierre transitivo de imports que el
 * funnel no alcanza el feed.
 */

/** El host donde el sitio sirve de verdad. El apex redirige aquí. */
export const HOST_CANONICO = "https://www.rodrigobermejo.com";

/**
 * La base para metadata, sitemap y robots.
 *
 * Prefiere `NEXT_PUBLIC_SITE_URL` cuando está definida —es lo que permite que un
 * preview se describa a sí mismo— y cae al host canónico cuando no.
 */
export const baseUrl = (): string =>
  process.env.NEXT_PUBLIC_SITE_URL || HOST_CANONICO;
