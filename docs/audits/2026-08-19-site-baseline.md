# Auditoría base del sitio — 2026-08-19

Estado del repo `RBloomDev/rodrigobermejo-site` en el commit `efe108c`, antes de introducir cualquier cosa del sistema de evidencia. Es la línea base contra la que se mide la deuda.

---

## 1. Estado del stack

| Área | Estado |
|---|---|
| Framework | Next.js `16.1.1`, React `19.2.3`, App Router, TypeScript `strict` |
| Estilos | Tailwind v4 CSS-first (`@theme` en `app/globals.css`) + `@tailwindcss/typography` |
| Contenido | 3 posts Markdown en `content/posts/`, leídos con `fs` en build (`lib/posts.ts`) |
| Rendering | 100% estático. Cero `revalidate`, cero `Suspense`, cero rutas dinámicas en runtime |
| Client components | Solo 2: `components/Analytics.tsx`, `components/SubscriptionBlock.tsx` |
| API | Una sola ruta: `app/api/subscribe/route.ts` (Buttondown) |
| Tests | Ninguno. Sin runner, sin script `test` |
| CI/CD | Ninguno. Sin `.github/`. Deploy implícito por git-push a Vercel |
| Configuración | Sin `vercel.json`, sin `.env.example`, `next.config.ts` vacío |
| Git | Una rama `main`, 5 commits, **cero pull requests, cero reviews** |

Lo que está bien y hay que preservar: el sitio es estático, rápido y con superficie mínima. Solo dos componentes de cliente. Esa propiedad es la razón por la que el feed de evidencia se consume en build y no por API (`decisions/0002`).

## 2. Hallazgos

### Vocabulario de estado

Tres estados, y la distinción no es cosmética: un hallazgo declarado **corregido** deja de vigilarse, así que llamar corregido a lo mitigado apaga la vigilancia sobre un riesgo que sigue vivo.

| Estado | Significa |
|---|---|
| **CORREGIDO** | El defecto ya no existe. Verificable leyendo el código; no depende de supuestos sobre la plataforma |
| **MITIGADO** | El coste de explotarlo subió, el vector sigue abierto. Se documenta **qué** queda abierto |
| **DEUDA** | Conocido, no abordado, con criterio de cuándo se aborda |

### P1 — Fuga de PII a logs
`app/api/subscribe/route.ts` hacía `console.log("Buttondown success:", data)`, escribiendo el objeto suscriptor completo (incluido el email) en los logs de Vercel. Es exactamente la disciplina que este proyecto pretende establecer, violada en producción.

**Estado: CORREGIDO en Sprint 0.** La llamada no existe; ninguna ruta loguea payloads de peticion ni de respuesta upstream. Lo unico que se escribe al log es el `status` numerico del proveedor, su campo `code` **saneado** y la ausencia de la API key. El saneado no es decorativo: `code` viene del cuerpo upstream, y el patron que lo filtra excluye `@` y acota la longitud, asi que una direccion devuelta en ese campo no llega al log — colapsa a `desconocido`. Hay prueba de esa rama.

Lo que el guard de CI **no** garantiza: ESLint `no-console` (con `console.error` permitido) y el grep de escrituras a stdout/stderr detectan la reintroducción del patrón por la vía obvia. No detectan desestructurar o aliasar el global, ni un logger propio o de terceros, ni un `console.error` cuyo argumento sí contenga PII, ni el envío del payload a un tercero. Ver `docs/04-architecture.md` §4.1.

### P1 — Endpoint público sin protección
`POST /api/subscribe` no tenía rate limit, ni verificación de origen, ni protección anti-bot: un relay abierto contra la cuota de Buttondown usando la API key del servidor. La validación de email era `email.includes("@")`. Además propagaba el status HTTP upstream al cliente, filtrando semántica del proveedor.

**Estado: MITIGADO en Sprint 0, no corregido.** Dos partes sí están cerradas; tres son mitigaciones parciales y hay que nombrarlas como tales.

Cerrado y verificable en el código:

- La validación de email es un patrón con techo de longitud (254), no `includes("@")`.
- El status upstream no se propaga. **Y no todo 400 es éxito**, que fue el defecto de la primera remediación: colapsar los 400 a `{success:true}` convertía el límite diario de creación de Buttondown y un `email_invalid` en "suscripción correcta". Ahora el único caso que responde como alta correcta es un **400 con código `email_already_exists`** —la colisión—, y responde exactamente igual que un alta nueva: 200 y el mismo cuerpo, que es lo que evita el oráculo de enumeración. **Todo lo demás** —un 409, un `email_invalid`, el límite de cuota, un código desconocido— colapsa a un único 502 genérico. Que el fallo tenga una sola forma es parte de la propiedad: una respuesta por clase de fallo volvería a informar al cliente sobre el estado de su dirección en la lista. La segunda remediación aún reconocía duplicados "por parecido" (una lista de códigos más un patrón `already_exists`); eso se retiró, porque cualquier código futuro del proveedor cuyo nombre se pareciera habría pasado a devolver éxito sin decisión humana. La clasificación vive en `app/api/subscribe/policy.ts` y tiene pruebas en las dos direcciones (`tests/subscribe-policy.test.ts`).

Mitigado, con el vector todavía abierto:

| Mitigación | Qué no cubre |
|---|---|
| **Clasificación de la colisión por el `code` del proveedor** | Es un supuesto sobre la API de Buttondown, no un contrato verificado. El código autorizado es un **literal único**, `email_already_exists`. Si el proveedor lo renombrara, un alta duplicada caería en "fallo genérico" y devolvería 502 donde antes devolvía éxito: distinguible de un alta nueva, o sea el oráculo de vuelta, aunque en la dirección conservadora (no se afirma un éxito falso). Se elige ese riesgo sobre el inverso a propósito: reconocer códigos por parecido abriría la puerta a que un código futuro y desconocido se devolviera como éxito. El cuerpo upstream nunca se loguea: solo el campo `code` saneado |
| **Verificación de `Origin`/`Referer`** | Solo detiene CSRF desde un navegador. Un cliente que no sea navegador —`curl`, un script— envía el `Origin` que quiera y pasa. No es autenticación, y la ausencia de cabecera se rechaza, lo cual es correcto pero tampoco prueba nada sobre quien sí la envía |
| **Rate limit en memoria del proceso** | Es **por instancia**. En serverless hay varias instancias concurrentes y el contador no se comparte, así que el límite efectivo es `5 × instancias`; además se reinicia con cada cold start. Corregirlo requiere un store compartido, que es una decisión de infraestructura pendiente (`docs/03` §7: añadir un data store lo decide Rodrigo) |
| **Clave de rate limit derivada de `x-forwarded-for`** | La ruta toma el valor **más a la izquierda** de la cabecera, que es el que un cliente puede prefijar. En Vercel el proxy añade el peer real, pero al leer el primer elemento se está confiando en un valor influenciable por el cliente: rotarlo evade el contador. La cabecera no falsificable en Vercel es `x-vercel-forwarded-for`. **No se cambió**: alterar la derivación de la clave es un cambio de comportamiento de seguridad y le corresponde a Rodrigo decidirlo, no a la remediación de una auditoría |

Sin protección anti-bot: **sigue ausente**, y no se añade porque requeriría una dependencia o un servicio.

### P2 — Clases de Tailwind muertas (bug visual real)
`@theme` define `brand-primary` y `brand-accent`, pero **no** `primary-blue` ni `accent-teal`: esos viven en `:root`, y Tailwind v4 no genera utilidades a partir de variables declaradas ahí. El blog usaba `text-primary-blue`, `text-accent-teal`, `bg-accent-teal` y `border-l-accent-teal`, que **no generaban CSS**. `prose-blue` tampoco existe en `@tailwindcss/typography` v0.5.

El alcance era mayor de lo aparente: `components/ui/SectionHeader.tsx` tambien usaba `text-accent-teal`, y ese componente aparece en **todas** las secciones de la landing. Los eyebrows del sitio entero estaban sin color. El mismo archivo tenia un ternario redundante (`light ? "text-accent-teal" : "text-accent-teal"`), sintoma de que el valor nunca se vio renderizado.
**Estado: corregido en Sprint 0** (migrado a `text-brand-accent` y `text-brand-primary`, que si existen).

### P2 — Capa de tokens sombreada por sí misma
`@theme` declaraba `--color-highlight: var(--color-highlight)` y `--color-cta-bg: var(--color-cta-bg)`. `@theme` y `:root` emiten en el mismo scope, así que el token solo funcionaba por orden de declaración. El mismo patrón en las fuentes. Además `.text-brand-primary` y `.bg-brand-primary` se escribían a mano, duplicando utilidades que `@theme` ya genera.

**Estado: corregido en Sprint 0 solo en los colores.** Los valores crudos pasaron a `--color-highlight-yellow` y `--color-cta-dark`, y las utilidades escritas a mano se eliminaron.

**En las fuentes NO está corregido: la deuda queda REABIERTA por decisión de alcance (2026-08-24).** `--font-display`, `--font-heading`, `--font-body` y `--font-quote` siguen repitiendo en `@theme` el nombre que inyecta `next/font`, así que siguen resolviéndose por orden de declaración y scope en lugar de por la capa de tokens.

Qué pasó, porque el estado importa más que el resultado: la remediación del review de Codex **sí** renombró las cuatro variables y movió sus clases de `<body>` a `<html>`. Eso es un cambio tipográfico, y la tipografía estaba explícitamente fuera de alcance por la decisión de deuda #9 del 2026-08-20. Fue el finding **P1-SCOPE-01**, y **se revirtió el 2026-08-24**: `app/layout.tsx` vuelve a inyectar las cuatro variables en `<body>` con sus nombres originales, y `app/globals.css` conserva los tokens `--font-*` tal como estaban. Verificado con `git diff`: `app/layout.tsx` no tiene diferencias contra `efe108c`, y en `globals.css` las líneas `--font-*` son contexto, no cambios.

Estado, con el vocabulario de arriba: **DEUDA**, no corregido y no mitigado. Se registra como deuda #12 en §4, separada de la #9 para que no se pierda dentro de ella: son el mismo trabajo visual, pero #9 es el rendering (`font-sans` vs `--font-body`) y #12 es la capa de tokens. Corregir #12 sin tocar #9 es posible y sigue siendo un cambio tipográfico, que es justo lo que aquí se decidió no hacer. Queda anotado también en el propio CSS.

### P2 — Dos dialectos de color coexistiendo
La landing usa tokens semánticos (`bg-bg-section`, `text-ink-default`); el blog usaba la paleta cruda de Tailwind (`bg-gray-50`, `text-gray-900`). Sin una capa de tokens estable, las futuras páginas de proyectos y evidencia nacerían con un tercer dialecto.
**Estado: no corregido.** En Sprint 0 solo se arreglaron las clases que no generaban CSS. Las utilidades `gray-*` y `blue-*` de la paleta por defecto de Tailwind si funcionan, asi que migrarlas a tokens semanticos es un cambio de diseno, no una correccion de defecto. Queda como deuda #7.

### P2 — Sin gate mecánico para Spec-Driven Development
Sin CI, sin tests, `lint` era `eslint` a secas (sin `--max-warnings 0`), sin script `typecheck`. Un workflow de dos agentes (Builder y Reviewer) **no es aplicable** sin un gate automático: el Reviewer no tendría nada objetivo contra lo que fallar.

**Estado: CORREGIDO en Sprint 0** para `typecheck` / `lint --max-warnings 0` / `build`, que son comprobaciones completas de lo que miden.

**Tests: ya no son cero, pero tampoco son cobertura.** Existe `npm test` (`node --test`, sin dependencias nuevas) sobre `app/api/subscribe/policy.ts`, que es la única lógica de decisión del sitio. Cubre las ramas de la ruta de PII y nada más: el resto del sitio es composición estática sin lógica que un test pudiera falsar hoy. El alcance exacto está en `docs/04-architecture.md` §4.1.

**Los guards de privacidad y de desacoplamiento son MITIGACIÓN, no garantía.** Nacieron como `grep` de literales: `console.log`, y las palabras `proof`/`evidence` en ocho archivos. Un logger equivalente o un import indirecto los evadía sin esfuerzo. Se endurecieron en la remediación del review de Codex — ESLint AST en lugar de grep para el logging, cierre transitivo de imports en lugar de grep para el funnel — y el alcance exacto de lo que garantizan y lo que no está tabulado en `docs/04-architecture.md` §4.1. Ese es el documento a leer antes de confiar en un guard verde.

### P3 — `lib/posts.ts` sin validación ni manejo de errores
`getPostData(slug)` construye la ruta con el slug sin sanitizar y sin `try/catch`: un slug inexistente produce 500 en lugar de 404 (hoy mitigado solo porque `generateStaticParams` enumera los válidos). El frontmatter se castea con `as` sin validar. El campo `slug` del frontmatter **se ignora**, porque el id viene del nombre de archivo: dos fuentes de verdad para el slug.
**Estado: deuda.** Se aborda cuando el sitio consuma el feed, porque la validación con zod que necesita el feed sirve igual para el frontmatter.

### P3 — Deriva documental
`README.md` era el boilerplate de `create-next-app` y afirmaba usar la fuente Geist, cuando el sitio usa cuatro Google Fonts. `app/blog/README.md` describía el blog como "futuro" cuando ya estaba construido, con un typo (`ap/`). Cero documentación de variables de entorno, deploy o arquitectura.
**Estado: corregido en Sprint 0.**

### P3 — Postura de runtime obsoleta
`app/opengraph-image.tsx` declara `runtime = "edge"`, cuando en Vercel el default recomendado es Node sobre Fluid Compute. Contiene además un comentario residual sobre un artifact.
**Estado: deuda.** Cambio de bajo riesgo pero sin urgencia; no bloquea nada.

### P3 — Otros
- Sin `not-found.tsx`, sin `error.tsx`, sin `app/blog/layout.tsx`.
- URL de Calendly hardcodeada en 6 componentes; redes sociales hardcodeadas en `Footer`. Falta un módulo de configuración del sitio.
- `<Image unoptimized>` en `components/About.tsx` sin razón documentada.
- Google Analytics se carga sin gate de consentimiento.
- Sin security headers (CSP, Referrer-Policy, X-Frame-Options): `next.config.ts` está vacío.
- Sin datos estructurados JSON-LD, pese a que el último commit menciona mejoras de semántica en FAQ.
- Sin Dependabot ni Renovate. Pinning mixto: `next` exacto, el resto con caret.
- **La regla `body { font-family: var(--font-body) }` de `globals.css` es codigo muerto.** La clase `font-sans` en `<body>` (de la plantilla de create-next-app) gana en especificidad, asi que el texto sin clase usa la pila sans por defecto de Tailwind y no Open Sans. Es la razon por la que los componentes rocian `font-body` a mano. Corregirlo alteraria la tipografia de todo el sitio: es una decision de diseno, no un fix. Anotado en el propio CSS.

**Estado: deuda,** priorizada en §4.

## 3. Supuestos que estaban implícitos

Quedan declarados en `docs/04-architecture.md` §7. Los más relevantes:

1. **Hosting = Vercel**, nunca declarado en el repo.
2. **Contenido solo en build-time** con `fs`: incompatible con edge y con contenido traído en runtime.
3. **`NEXT_PUBLIC_SITE_URL` seteado en producción.** Si falta, el fallback es el ápex `https://rodrigobermejo.com` mientras el sitio vive en `www.`, divergiendo canonical, OG y sitemap.
4. Un solo locale (`lang="es"`, aunque `llms.txt` está en inglés), un solo autor, slugs iguales a nombres de archivo.
5. Buttondown acoplado directo en el route handler, sin puerto ni abstracción.
6. **El posicionamiento actual es de consultor de automatización, no de ingeniero de producto.** ~~Decisión de marca pendiente.~~ **Resuelto el 2026-08-20:** no son opciones excluyentes. La marca se modela en tres dimensiones no excluyentes — BUILD, LEAD, TEACH — y Proof of Work demuestra principalmente BUILD sin borrar las otras dos. Ver `docs/00-product-brief.md` y `decisions/0007`. **El copy público del sitio no cambia por ahora.**

## 4. Deuda técnica priorizada

Nada de esto entra en Sprint 0. Orden sugerido:

| # | Deuda | Cuándo |
|---|---|---|
| 1 | Validación con zod del feed **y** del frontmatter (`lib/posts.ts`) | Sprint 5, mismo trabajo |
| 2 | `not-found.tsx` y `error.tsx` | Sprint 5, las rutas nuevas los necesitan |
| 3 | Módulo `lib/site-config.ts` para Calendly y redes | Antes de añadir más rutas |
| 4 | Security headers en `next.config.ts` | Cuando el sitio sirva el feed |
| 5 | Gate de consentimiento para GA | Independiente, valor propio |
| 6 | Quitar el runtime edge del OG image | Oportunista |
| 7 | Unificar los dos dialectos de color | Oportunista, por archivo tocado |
| 8 | Dependabot | Oportunista |
| 9 | Tipografía base: `font-sans` en `<body>` vs `--font-body` | **Decidido el 2026-08-20: no se toca durante este proyecto.** Ver abajo |
| 10 | Rate limit de `/api/subscribe` con store compartido, en lugar de en memoria por instancia | Requiere decisión de Rodrigo: añadir un data store lo escala `docs/03` §7 |
| 11 | Clave de rate limit desde `x-vercel-forwarded-for` en lugar del primer valor de `x-forwarded-for` | Cambio de comportamiento de seguridad. Decisión de Rodrigo; sin dependencias nuevas |
| 12 | Tokens `--font-*` de `@theme` sombreados por las variables de `next/font` | **Reabierta el 2026-08-24** al revertir P1-SCOPE-01. Con la #9, en la misma tarea visual con revisión de diseño |

### Deuda #9 — decisión registrada (2026-08-20)

**No se modifica la tipografía durante este proyecto.** Se conserva el rendering actual: no se elimina `font-sans` de `<body>`, no se generaliza `font-body`, y no se hace ningún cambio tipográfico global.

Cualquier modificación se tratará después como **tarea visual independiente, con revisión de diseño específica**. La deuda queda documentada, no resuelta, y eso es deliberado: mezclar un cambio de tipografía global con la introducción de un sistema de evidencia haría ilegible el diff de ambos.

**Confirmada y ampliada el 2026-08-24.** La remediación del review de Codex se saltó esta decisión y renombró los tokens `--font-*` moviéndolos a `<html>`. Se revirtió (P1-SCOPE-01) y el alcance vuelve a ser el acordado. La consecuencia se acepta con nombre y número: la capa de tokens tipográficos sigue sombreada y queda como **deuda #12, reabierta**. Es el resultado correcto: un diff de gobernanza y privacidad no es el sitio donde cambia la tipografía del sitio entero, aunque el cambio en sí fuera pequeño.

## 5. Consecuencia para el sistema de evidencia

Este repo tiene hoy **cero pull requests y cero reviews**. La evidencia recolectable sobre él, en V1, será delgada, y eso es un dato honesto, no un problema a maquillar.

Adoptar el workflow de `AGENTS.md` (rama, PR, review adversarial, CI) es lo que **genera** la evidencia. La propiedad recursiva es deseable y hay que dejarla explícita: construir el sistema produce su primer dataset, y cada publicación del feed añade un PR real a un repo público.
