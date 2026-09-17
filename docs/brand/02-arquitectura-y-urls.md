# 02 — Arquitectura de información y URLs

> **Estado: Autoridad desde 2026-09-15 (ADR 0014 ACEPTADA).** Gobierna identidad,
> posicionamiento, tipografía, color, arquitectura de información y copy público del sitio.
> **Cláusula de precedencia:** en `/evidencia`, `/proyectos`, `/proyectos/[slug]` y
> `components/proof/**`, `docs/05-feed-contract.md` § Contrato de presentación y
> `docs/02-domain-and-evidence-model.md` §6–§7
> ganan sobre la marca, y la divergencia es **FAIL, no deuda**.
> Esta autoridad no afirma que lo aquí descrito ya esté implementado ni publicado.

> Documento normativo del rediseño de marca. Define **qué rutas existen, qué las alimenta y
> qué no puede cruzar entre ellas**. No define copy: eso es `03-copy-deck.md`, y es autoridad
> sobre los textos propuestos aquí.
>
> Todo lo que este documento afirma sobre el código está verificado contra el árbol de
> `docs/rediseno-de-marca` con `archivo:línea`. Donde lo medido no coincidió con lo esperado,
> manda lo medido y está marcado.

---

## 1. Mapa de rutas

Hoy existen siete rutas renderizables: `/`, `/proyectos`, `/proyectos/[slug]`, `/evidencia`,
`/blog`, `/blog/[slug]` y la ruta de API `/api/subscribe`. Verificado enumerando
`app/**/page.tsx` y `app/**/route.ts`.

| Ruta | Qué es | Estado | Qué la alimenta |
|---|---|---|---|
| `/` | Portada de identidad. Quién es Rodrigo y a dónde ir. **Sin comercio**: ni oferta, ni precios, ni CTA de venta como eje | Reescrita | **Copy editorial estático.** Prohibido leer el feed (§3) |
| `/colaborar` | El funnel comercial íntegro: `Hero`, `Problems`, `HowItWorks`, `Offers`, `FAQ`, `FinalCTA` | **Nueva** | Copy editorial estático |
| `/sobre-mi` | Trayectoria, Inadaptados y docencia, en una sola página con secciones ancladas | **Nueva** | Copy editorial estático |
| `/proyectos` | El desglose de proyectos que sostienen las afirmaciones | Reestilizada | **Feed** (`lib/proof/feed.ts`, `public/proof/v1/projects.json`) |
| `/proyectos/[slug]` | Ficha por proyecto | Reestilizada | **Feed** |
| `/evidencia` | Método y límites: el índice canónico `Claim → Project → Evidence` | Reestilizada | **Feed** (`claims.json` + etiquetas de procedencia y verificabilidad) |
| `/blog` | Índice de artículos | Reestilizada | Markdown en `posts/` vía `lib/posts.ts` |
| `/blog/[slug]` | Artículo | Reestilizada | Markdown en `posts/` |
| `/api/subscribe` | Alta de suscripción. Maneja PII | Sin cambio | — |

Dos cosas que el mapa deja explícitas y conviene no perder:

- **`/` deja de ser el funnel.** Hoy `app/page.tsx:11-24` monta la cadena comercial completa
  en la portada. Después del rediseño esa cadena vive entera en `/colaborar` y la portada
  solo enlaza hacia ella.
- **El índice canónico del sistema de evidencia sigue siendo `/evidencia`, no `/proyectos`.**
  `app/evidencia/page.tsx:8` y `app/proyectos/page.tsx:9-12` lo dicen en el propio código, y
  `docs/05` lo fundamenta: la cadena del dominio es `Claim → Project → Evidence`, y entrar
  por los proyectos la invierte. El rediseño no toca esa jerarquía.

### Defecto encontrado al levantar el mapa

**`/proyectos` y `/evidencia` no renderizan `Navbar` ni `Footer`.** Medido con
`grep -rn "Navbar\|Footer" app/`: solo `app/page.tsx`, `app/blog/page.tsx` y
`app/blog/[slug]/page.tsx` los montan. `app/layout.tsx:85-95` no contiene ninguno — cada
página monta su propio cromo. Las dos rutas de evidencia son hoy callejones sin salida: se
entra por un enlace y no hay forma de volver a ninguna parte. El rediseño debe subir
`Navbar` y `Footer` al layout, o montarlos explícitamente en las cuatro rutas que hoy no los
tienen. No es una decisión estética; es navegación ausente.

---

## 2. Navegación

Seis destinos, en este orden:

**Trabajo · Inadaptados · Docencia · Escribo · Trayectoria · Trabajar conmigo**

| Etiqueta | Destino | Tipo |
|---|---|---|
| Trabajo | `/proyectos` | Ruta |
| Inadaptados | `/sobre-mi#inadaptados` | **Ancla de sección** |
| Docencia | `/sobre-mi#docencia` | **Ancla de sección** |
| Escribo | `/blog` | Ruta |
| Trayectoria | `/sobre-mi` | Ruta |
| Trabajar conmigo | `/colaborar` | Ruta |

### Por qué Inadaptados y Docencia no son rutas propias

Porque el contenido no alcanza para dos páginas. Una ruta `/inadaptados` y una ruta
`/docencia` con tres párrafos cada una son dos páginas delgadas: peor arquitectura, peor
señal de profundidad, y dos superficies más que mantener, indexar y meter en el sitemap.
Una página `/sobre-mi` con tres secciones ancladas concentra la trayectoria completa y deja
que el menú apunte al fragmento relevante.

Los anclajes son `/sobre-mi#inadaptados` y `/sobre-mi#docencia`. Los `id` correspondientes
(`inadaptados`, `docencia`) son **parte del contrato de esta página**: si el copy deck
renombra las secciones, los `id` no cambian.

Si más adelante alguna de las dos crece hasta justificar su propia ruta, el ascenso es
barato — `/sobre-mi#inadaptados` → `/inadaptados` es una redirección de **ruta**, que sí se
puede escribir en `next.config.ts`. Lo contrario (romper una ruta ya indexada) no lo es.

### El menú móvil debe existir. Hoy no existe.

En `components/Navbar.tsx`:

- La navegación real está en `<nav className="hidden md:flex ...">` (línea 18). `hidden md:flex`
  significa **oculta por completo debajo del breakpoint `md`**.
- El botón hamburguesa está en las líneas **58-72**: `<button className="md:hidden p-2 ...">`
  con un `<svg>` de tres líneas dentro. No tiene `onClick`, no tiene `aria-expanded`, no tiene
  estado, y el archivo no declara `"use client"` — es un Server Component, así que no podría
  tener handler aunque se le escribiera uno.
- No hay ningún panel de menú en el componente. El botón no abre nada porque no hay nada que
  abrir.

**Consecuencia medida: en móvil el sitio no tiene navegación.** Lo único clicable es el logo,
que lleva a `/`. Esto es un defecto, no una omisión de diseño: el botón está dibujado, ocupa
su lugar y promete un comportamiento que no ocurre. Un afordance muerto es peor que ningún
afordance.

El rediseño **debe** entregar el menú móvil funcionando, con los seis destinos, y verificarlo
operándolo en un navegador a ancho de móvil — no compilándolo.

### Segundo defecto del array de navegación

`components/Navbar.tsx:19` construye los `href` a partir de la etiqueta:

```ts
`/#${item.toLowerCase().replace(" ", "-").replace("ó", "o")}`
```

Evaluado tal cual, `"Sobre mí"` produce **`/#sobre-mí`**, con acento en la `í` — porque el
`.replace("ó", "o")` solo cubre la `ó` de `"Solución"`. El `id` real de la sección es
`sobre-mi` sin acento (`components/About.tsx:6`). **El enlace «Sobre mí» del menú está roto
hoy**: no hace scroll a ningún lado.

Además `String.prototype.replace` con un string literal sustituye **solo la primera
ocurrencia**. Una etiqueta de tres palabras como «Trabajar conmigo» sobreviviría por
casualidad (tiene un solo espacio), pero el patrón no escala. El menú nuevo debe declarar
`{ label, href }` de forma explícita, no derivar el `href` de la etiqueta. Derivar rutas del
copy acopla la URL al texto: cambiar una palabra del menú rompe un enlace.

### El pie

`components/Footer.tsx:5-73` declara **siete** enlaces sociales: GitHub, LinkedIn,
X (Twitter), Instagram, Threads, Facebook y YouTube. Todos con `target="_blank"`,
`rel="noopener noreferrer"` y `aria-label` con el nombre de la red. Siete se conservan; el
rediseño no recorta la lista, la reestiliza.

El pie también monta `SubscriptionBlock` (línea 117) y un botón a Calendly (líneas 104-111).
El botón de Calendly duplicado en `Navbar` (líneas 46-53) y en `Footer` es parte del funnel
y se mueve con él a `/colaborar`: la portada de identidad no lleva CTA de agenda en el cromo.

---

## 3. La frontera del funnel

Esta es la sección que más importa del documento. Es la que se rompe sin darse cuenta.

### Qué comprueba el guard, exactamente

`scripts/check-funnel-isolation.mjs` recorre el **cierre transitivo de imports estáticos**
(BFS, líneas 140-172) desde cada entrada del funnel, y falla si alguna cadena alcanza un
módulo del sistema de evidencia.

Las entradas son `FUNNEL_ENTRYPOINTS`, líneas 33-53 — **diez**, no ocho:

```
app/page.tsx
app/layout.tsx
components/Hero.tsx
components/Offers.tsx
components/FinalCTA.tsx
components/Navbar.tsx
components/Footer.tsx
components/FAQ.tsx
components/Problems.tsx
components/HowItWorks.tsx
```

Los destinos prohibidos son `EVIDENCE_PREFIXES`, líneas 56-65 — **ocho** prefijos:
`lib/proof`, `lib/evidence`, `components/proof`, `components/evidence`, `app/proyectos`,
`app/evidencia`, `app/actividad`, `public/proof`.

`docs/04-architecture.md` §4 invariante 4 enumera ocho componentes y no menciona
`app/page.tsx` ni `app/layout.tsx`; el script ya cubre diez. La spec va detrás del guard en
este punto, y es una divergencia a corregir en `docs/04` — no aquí.

Lo que el guard **no** cubre está tabulado en `docs/04` §4.1 y repetido en el encabezado del
script (líneas 16-20): `import()` dinámico cuyo argumento no sea un literal, re-exports vía
alias no resolubles estáticamente, y acoplamiento por copia de código en lugar de import. Un
verde de `npm run guard:funnel` significa «no se rompió por la vía que el guard cubre», no
«el invariante se cumple».

### La portada no puede importar nada del feed

`app/page.tsx` y `app/layout.tsx` **son entradas**. El comentario que las añadió nombra la
tentación exacta, líneas 34-38 del script:

> Un import del feed anadido en `app/page.tsx` --- que es donde resulta mas tentador ponerlo,
> para "ensenar unos proyectos en la home" --- no lo veia nadie.

Y aclara la asimetría, líneas 40-42:

> Ojo con lo que esto NO cambia: `app/proyectos` y `app/evidencia` siguen siendo DESTINOS
> PROHIBIDOS, no entradas. Anadirlos como entradas seria conceptualmente al reves --- son las
> rutas que SI pueden leer el feed.

La dirección importa: `/evidencia` puede importar `Navbar`; `Navbar` no puede importar
`lib/proof`.

### Consecuencia de diseño, dicha sin rodeos

**El «trabajo seleccionado» de la portada es copy editorial escrito a mano. Nunca se lee del
feed.**

Si el rediseño quiere mostrar tres proyectos destacados en `/`, esos tres títulos, sus
descripciones y sus enlaces se escriben en el copy deck y viven como constantes en el
componente de la portada. No se derivan de `projects.json`, no se filtran por `lifecycle`, no
se ordenan por nada del feed. Un import así pone `guard:funnel` en rojo, y con razón: ataría
la ruta de conversión a la salud de un artefacto que publica otro repo.

**La lista canónica de proyectos vive en `/proyectos`**, alimentada por el feed, y la portada
llega ahí con un enlace estático. Si el copy editorial de la portada se desincroniza del feed,
el costo es una portada desactualizada — no una portada rota. Esa asimetría es el punto
completo del invariante.

### Enlazar sí. Importar no.

`docs/05-feed-contract.md`, sección «La frontera del funnel es de datos, no de navegación»:

> `04-architecture.md` §4 invariante 4 prohíbe que el funnel comercial **importe** nada del
> feed, y `guard:funnel` lo comprueba sobre el cierre transitivo de imports. Eso no prohíbe
> enlazar: la navegación lleva a las rutas de evidencia con enlaces estáticos. Dejarlas sin
> enlace haría la prueba de trabajo invisible justo para quien evalúa contratar.

Por eso «Trabajo» → `/proyectos` en el menú es legítimo aunque `Navbar.tsx` sea una entrada
del funnel: un `<Link href="/proyectos">` no importa nada. El mismo argumento cubre un enlace
a `/evidencia` desde la portada o desde el pie.

`app/sitemap.ts` sí importa `leerFeed` (línea 3), y tampoco viola el invariante: el propio
archivo lo argumenta en las líneas 20-23 — `sitemap.ts` no está en `FUNNEL_ENTRYPOINTS`, así
que la ruta de conversión sigue sin poder romperse por evidencia.

### Tarea obligatoria al mover el funnel

`FUNNEL_ENTRYPOINTS` fija **nombres de archivo literales**. Mover el funnel a `/colaborar`
mueve archivos, y el guard no se entera solo.

Cuando una entrada apunta a un archivo que ya no existe, el script sale en rojo con este
mensaje (líneas 174-181):

```
::error::Entradas del funnel inexistentes: <lista>. Si un componente se renombro,
actualiza FUNNEL_ENTRYPOINTS en este script. Un guard que apunta a archivos que no
existen pasa en verde sin comprobar nada.
```

Corrección a lo que se suele contar de este guard: **hoy no pasa en verde** — `missing.length > 0`
provoca `process.exit(1)` en la línea 180. La frase «pasa en verde sin comprobar nada» es la
**justificación** de que ese caso sea rojo, escrita en el propio mensaje de error. Sin esa
comprobación, un `FUNNEL_ENTRYPOINTS` con rutas muertas recorrería cero archivos y saldría
`OK`. La defensa existe; hay que respetarla, no descubrirla en CI.

Lo que hay que hacer, **en el mismo commit que mueve el funnel**:

1. Añadir `app/colaborar/page.tsx` a `FUNNEL_ENTRYPOINTS`.
2. Añadir `app/sobre-mi/page.tsx` si termina montando cualquier componente del funnel. Si es
   puramente editorial, no hace falta — pero decidirlo, no omitirlo por descuido.
3. Dejar `app/page.tsx` y `app/layout.tsx` en la lista. La portada nueva sigue siendo el
   archivo donde más tienta importar el feed; sacarla porque «ya no es el funnel» sería
   quitar la defensa justo cuando empieza a hacer falta.
4. Actualizar la enumeración de `docs/04-architecture.md` §4 invariante 4 para que nombre las
   entradas reales. La spec es autoridad sobre el código; una spec que enumera ocho y un
   guard que vigila doce es una divergencia, y en este repo divergencia es FAIL.
5. Correr `npm run guard:funnel` y **leer la salida**. La línea final imprime cuántas entradas
   y cuántos módulos recorrió (líneas 195-197): si el número de módulos cae a algo absurdo,
   el guard dejó de mirar el código real.
6. Romperlo a propósito una vez — un `import { leerFeed } from "@/lib/proof/feed"` en
   `app/colaborar/page.tsx` — y comprobar que sale rojo. Un guard que nunca se vio fallar
   sobre la entrada nueva no está probado sobre la entrada nueva.

---

## 4. Continuidad de URLs

### Ninguna ruta existente desaparece

`/`, `/proyectos`, `/proyectos/[slug]`, `/evidencia`, `/blog`, `/blog/[slug]` siguen
existiendo con la misma URL después del rediseño. **No hay 404 y no hacen falta redirecciones
de ruta.** `/colaborar` y `/sobre-mi` son puramente aditivas.

### Lo que sí se degrada: los anclajes de la portada

`components/Navbar.tsx:19-38` genera hoy estos cuatro enlaces de fragmento, verificados
evaluando la expresión:

| Enlace generado | `id` que lo recibe | Estado hoy |
|---|---|---|
| `/#problemas` | `components/Problems.tsx:27` | Funciona |
| `/#solucion` | `components/HowItWorks.tsx:33` | Funciona |
| `/#ofertas` | `components/Offers.tsx:7` | Funciona |
| `/#sobre-mí` | `components/About.tsx:6` declara `sobre-mi` | **Roto hoy** |

Existe además `id="faq"` en `components/FAQ.tsx:29`, que ningún elemento del menú enlaza.

Las tres primeras secciones se van a `/colaborar`, así que `/#problemas`, `/#solucion` y
`/#ofertas` dejan de resolver en la portada.

**No se pueden redirigir.** Un fragmento de URL no se envía al servidor: el navegador lo
retiene y lo aplica localmente después de recibir la respuesta. Ni `next.config.ts` ni una
cabecera `Location:` lo ven jamás, porque nunca llega. Es una limitación del protocolo HTTP,
no una decisión de arquitectura ni una carencia de Next.js. Lo único que podría rescatarlos es
JavaScript en cliente leyendo `window.location.hash` en la portada y redirigiendo — y eso
significaría meter un componente de cliente en una entrada del funnel para atender enlaces
externos que no sabemos que existan. No se hace.

### Mitigación

1. **Conservar los mismos `id` en `/colaborar`.** Las secciones movidas mantienen
   `problemas`, `solucion`, `ofertas` y `faq`. Así `/colaborar#ofertas` funciona y un enlace
   antiguo se arregla cambiando una palabra, no reconstruyendo la página.
2. **Corregir `sobre-mi`** al moverlo: el `id` es `sobre-mi` sin acento y el enlace también.
   El defecto no se arrastra a la ruta nueva.
3. **Añadir `/colaborar` y `/sobre-mi` a `app/sitemap.ts`.** Sin eso, las dos rutas nuevas no
   son descubribles: el sitemap actual (líneas 40-67) enumera `/`, `/proyectos`, `/evidencia`,
   las fichas de proyecto, `/blog` y los artículos, y nada más.
4. **Dejar en `/` un ancla `#trabajar-conmigo`** — una sección breve de cierre en la portada
   que enlace a `/colaborar`. Así `/#trabajar-conmigo` es una URL compartible que sobrevive, y
   quien aterrice en la portada buscando comercio encuentra la puerta sin scrollear a ciegas.

### Riesgo residual, aceptado

Un enlace externo antiguo a `/#ofertas` aterriza en la portada nueva, no encuentra ese `id`,
y el navegador deja al visitante arriba de la página. No ve un error: ve la portada. El costo
es un clic extra hasta «Trabajar conmigo».

**Se acepta.** Dos razones, y ninguna es «no importa»:

- El volumen previsible es bajo. Esos anclajes vivían en el menú de la propia portada, no en
  material de difusión.
- No hay ningún enlace entrante conocido a esos fragmentos. No hay campaña, correo ni
  publicación que los use.

Lo que **no** se acepta es dejarlo sin medir para siempre: si en algún momento hay analítica
de referrers con fragmento, se revisa. Hoy no la hay, y esa ausencia es parte del porqué de
aceptar el riesgo, no un argumento a favor.

### Otros dos archivos fijan URLs

- **`public/llms.txt`** cierra con `link to [https://rodrigobermejo.com](https://rodrigobermejo.com)` —
  el ápex, que redirige (§6). Además describe a Rodrigo exclusivamente como «Technical
  Consultant specializing in Business Process Automation», que es precisamente el
  posicionamiento estrecho que el rediseño abandona. Hay que reescribirlo con la identidad
  nueva y con `https://www.rodrigobermejo.com`, y mencionar `/proyectos` y `/evidencia`.
- **`app/robots.ts`** publica `Sitemap: ${baseUrl}/sitemap.xml` (línea 12) sobre el mismo
  `baseUrl` defectuoso, y declara `disallow: ['/private/', '/api/']` con el comentario
  `// Example exclusions` (línea 10). `/private/` no existe en este repo. Limpiar el ejemplo
  y dejar solo `/api/`.

---

## 5. Metadatos por ruta

> **PROPUESTA — PARA REVISIÓN. No es texto final.**
>
> `docs/brand/03-copy-deck.md` es la autoridad sobre todo el copy del sitio, títulos y
> descripciones de metadatos incluidos, y lo escribe otra persona. Lo de abajo existe para que
> la arquitectura no quede con huecos y para que quien escriba el copy vea la forma y los
> límites de caracteres, no para que se copie tal cual. **Si esta tabla y el copy deck
> divergen, manda el copy deck.**

El `template` de `app/layout.tsx:40` es `"%s | Rodrigo Bermejo"`, así que el `title` por ruta
**no** debe repetir el nombre. Hoy tres rutas lo repiten a mano y se lo saltan:
`"Proyectos — Rodrigo Bermejo"` (`app/proyectos/page.tsx:29`),
`"Cómo respaldo lo que afirmo — Rodrigo Bermejo"` (`app/evidencia/page.tsx:30`) y
`"Blog | Rodrigo Bermejo"` (`app/blog/page.tsx:11`) — las tres producen el nombre duplicado o
se apoyan en que el template no aplica. Unificar es parte del rediseño.

| Ruta | `title` propuesto | `description` propuesta |
|---|---|---|
| `/` | *(usa el `default` del layout)* | Construyo sistemas, dirijo Inadaptados y doy clase. Aquí está el trabajo y la evidencia de que existe. |
| `/colaborar` | Trabajar conmigo | Cómo trabajo con negocios que quieren dejar de operar a mano: alcance, proceso y qué esperar de cada etapa. |
| `/sobre-mi` | Trayectoria | Qué he construido, qué es Inadaptados y qué enseño. La ruta larga, sin adornos. |
| `/proyectos` | Trabajo | Los proyectos sobre los que se apoyan las afirmaciones, con su naturaleza, su madurez y sus fuentes públicas. |
| `/proyectos/[slug]` | *(nombre del proyecto, desde el feed)* | *(derivada del feed — nunca escrita a mano)* |
| `/evidencia` | Cómo respaldo lo que afirmo | Cada afirmación profesional, con su procedencia, su verificabilidad y el límite exacto de lo que hoy se puede comprobar. |
| `/blog` | Escribo | Artículos sobre automatización, sistemas de negocio y lo que aprendo construyéndolos. |
| `/blog/[slug]` | *(título del artículo)* | *(resumen del artículo)* |

Tres restricciones que **no** son negociables por copy y que el copy deck tiene que respetar:

- `/proyectos/[slug]` y `/evidencia` describen contenido que viene del feed. Su `description`
  no puede afirmar cantidades ni resultados: si el feed está ausente, la página renderiza una
  superficie sin afirmaciones (`docs/04` §4 invariante 3) y un metadato que prometa «12
  proyectos en producción» quedaría mintiendo sin que nada falle.
- El `keywords` de `app/layout.tsx:44-53` es hoy una lista de SEO de consultoría de
  automatización. Contradice el posicionamiento nuevo. Se reescribe o se elimina — en Next 16
  `keywords` no aporta ranking, así que eliminarlo es defendible.
- `openGraph.url: "/"` y `alternates.canonical: "/"` (`app/layout.tsx:59` y `:76`) están
  fijados en el layout raíz. Cada ruta nueva necesita su propia `canonical`, o todas declaran
  ser la portada.

---

## 6. El defecto abierto que esto NO cierra

**`NEXT_PUBLIC_SITE_URL` no está definida en producción.**

Medido el 2026-09-12 y coincidente con lo registrado en
`docs/audits/2026-09-10-promocion-y-bloqueo-sprint-2.md`:

```
sitemap.xml de produccion   ->  https://rodrigobermejo.com/...    (apex)
https://rodrigobermejo.com  ->  HTTP 307 a https://www.rodrigobermejo.com/
robots.txt                  ->  Sitemap: https://rodrigobermejo.com/sitemap.xml
```

El sitemap publica **19 URLs, todas con el ápex, y las 19 redirigen**. Las 19 se componen de
`/`, `/proyectos`, `/evidencia`, **12** fichas de proyecto (`public/proof/v1/projects.json`
declara 12), `/blog` y **3** artículos (`posts/`). Verificado contando los artefactos, no
recordándolo.

La causa es el fallback del código, en tres archivos y tres líneas:

| Archivo:línea | Expresión |
|---|---|
| `app/layout.tsx:36` | `process.env.NEXT_PUBLIC_SITE_URL \|\| "https://rodrigobermejo.com"` |
| `app/sitemap.ts:6` | `process.env.NEXT_PUBLIC_SITE_URL \|\| 'https://rodrigobermejo.com'` |
| `app/robots.ts:4` | `process.env.NEXT_PUBLIC_SITE_URL \|\| 'https://rodrigobermejo.com'` |

Los tres caen al ápex cuando la variable falta. El valor correcto está documentado en
`.env.example:6` (`NEXT_PUBLIC_SITE_URL=https://www.rodrigobermejo.com`), con el comentario
que explica exactamente esta falla, y `ci.yml` lo define para el build de CI. **Lo que falta
es producción.**

El impacto no se limita al sitemap: `metadataBase` (`app/layout.tsx:35-37`) alimenta la
canónica y las URLs de OpenGraph de **todas** las rutas. Cada canónica servida hoy apunta a
un host que responde 307.

**Un agente no puede cerrar esto.** Es una variable de entorno del proyecto en Vercel y está
fuera del acceso de cualquier agente de este repo. Le corresponde a Rodrigo definirla en el
dashboard de Vercel para el entorno de producción y redesplegar. No hay forma de arreglarlo
desde el código sin hardcodear `www` en el fallback, que cambiaría el defecto de sitio en vez
de resolverlo y dejaría el mismo problema para el siguiente dominio.

Este documento **no lo cierra, no lo mitiga y no lo esconde.** El rediseño lo empeora en una
dimensión concreta: `/colaborar` y `/sobre-mi` suman dos URLs más al sitemap, así que serán
21 URLs redirigidas en vez de 19. Cambiar el fallback del código no es la mitigación; definir
la variable lo es.

---

## Referencias

- `docs/04-architecture.md` §4 (invariantes 1-5) y §4.1 (qué garantiza cada guard y qué no)
- `docs/05-feed-contract.md`, «La frontera del funnel es de datos, no de navegación»
- `docs/03-privacy-and-publication-policy.md` §2-§3 (qué se puede publicar)
- `docs/audits/2026-08-19-site-baseline.md` (tokens de color en `@theme`)
- `docs/audits/2026-09-10-promocion-y-bloqueo-sprint-2.md` §2 (`NEXT_PUBLIC_SITE_URL`)
- `scripts/check-funnel-isolation.mjs` (`FUNNEL_ENTRYPOINTS`, `EVIDENCE_PREFIXES`)
- `docs/brand/03-copy-deck.md` — **autoridad sobre todos los textos propuestos en §5**
