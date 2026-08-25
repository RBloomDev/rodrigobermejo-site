# 04 — Arquitectura

> Documento normativo. Las alternativas descartadas y su razón viven en `decisions/`.

---

## 1. ¿Necesitamos otro repositorio?

**Sí, uno — por clasificación de datos, no por escala.**

El argumento de escala no aplica: el volumen de V1 cabe cómodamente en archivos de texto. El argumento válido es otro:

> El motor sostiene un token con lectura de repositorios privados y almacena evidencia sin redactar. Eso no puede vivir en el repositorio desde el cual Vercel construye un sitio público.

Razones concretas, no teóricas: variables de entorno expuestas a deployments de preview; superficie de build ampliada; historia de git pública para siempre; colaboradores futuros del sitio heredando acceso a datos de clientes.

Es una frontera de control de acceso, y basta para justificar la separación.

**Un solo repo nuevo, no dos.** El feed publicado vive dentro del repo del sitio (§3). Un tercer repo `proof-feed` se separa solo si se cumple un criterio de salida (`decisions/0002`).

## 2. Topología

```
rodrigoBermejo/proof-engine                            PRIVADO
  registry/claims/*.yaml      ← verdad DECLARADA: las afirmaciones (raíz del grafo)
  registry/projects/*.yaml    ← verdad DECLARADA: los proyectos que las sostienen
  ingest/sources/github/      → normalize/ → ledger/*.jsonl (append-only)
  → correlate/ → redact/ → publish/
  .github/workflows/          cron + manual. Único poseedor de tokens.
        │
        │  abre un PULL REQUEST con el subconjunto redactado
        │  (nunca push directo a main)
        ▼
RBloomDev/rodrigobermejo-site                          PÚBLICO
  docs/                                       ← spec canónica (este directorio)
  public/proof/v1/*.json                      ← artefactos publicados
  public/proof/schemas/*.json                 ← contrato ejecutable
  app/proyectos, app/evidencia                ← leen del filesystem en build, validan con zod
        │
        ▼
rodrigoBermejo/rodrigobermejo                          PÚBLICO
  Action que renderiza el README desde /proof/v1/*.json · cero lógica de evidencia
```

## 3. Qué vive dentro del sitio y qué vive fuera

### Dentro del sitio

- La **spec** (`docs/`) — canónica, pública, auditable
- Los **artefactos publicados** (`public/proof/v1/`) — ya redactados
- El **contrato ejecutable** (`public/proof/schemas/`) — **derivado** de `docs/05-feed-contract.md`, nunca autoridad sobre él. Si divergen, el schema está mal (`05` §cabecera)
- El **rendering**: `/proyectos`, `/proyectos/[slug]`, `/evidencia`, `/actividad`
- Un cliente tipado delgado que lee del filesystem y valida con zod

### Fuera del sitio, sin excepción

- Tokens de cualquier tipo
- Llamadas a la API de GitHub
- El Registry (claims y projects: la fuente declarada)
- El ledger crudo
- Lógica de correlación, redacción, agregación o cualquier cómputo de métricas

### Por qué el feed vive *dentro* del repo del sitio

1. **El sitio no necesita red para consumir la evidencia publicada.** Lee JSON del filesystem, exactamente como ya lee `content/posts/` en `lib/posts.ts`. Determinista y reproducible respecto del feed: el mismo commit produce el mismo render, sin depender de que ningún servicio esté arriba.

   Enunciado con precisión porque la versión anterior decía **"cero red en el build"** y era falso: `app/layout.tsx` usa `next/font` con cuatro familias de Google Fonts, que se descargan durante el build. La invariante correcta es la de arriba, acotada al feed, y esa sí se sostiene. La tipografía **no se toca** — es deuda #9 de `audits/2026-08-19-site-baseline.md`, decidida el 2026-08-20 como tarea visual independiente. Lo que se corrige aquí es la afirmación, no el código.
2. **Auditabilidad por la historia de git pública.** Un cambio retroactivo en cualquier métrica queda visible en el diff, para siempre. Tamper-evidence sin criptografía extra y sin blockchain.
3. **El PR es el gate de privacidad.** Lo que se vuelve público se revisa antes de publicarse.
4. **Verificable con `curl`.** Servido en el dominio propio, mismo origen, sin CORS.
5. **Recursión útil.** Cada publicación es un PR en un repo público: el sistema genera evidencia real de PR y review en el repo que hoy tiene cero.

## 4. Invariantes del sitio

El Reviewer los comprueba en cada PR que toque el consumo del feed. **No todos son mecánicamente verificables**, y cuáles sí y cuáles no está en la tabla de §4.1: decir que los cinco lo son sería el mismo error que declarar corregido lo mitigado.

Los cinco invariantes se citan como **`§4` invariante N** desde el resto del repo. `§4.1` es la tabla de abajo, no el primer invariante.

1. El sitio **no** tiene tokens, **no** llama a la API de GitHub, **no** contiene lógica de correlación ni de scoring. Solo lee y renderiza.
2. El sitio valida el feed con zod en build. **Feed inválido → build rojo.** Nunca se renderizan datos que no cumplen el contrato.
3. **Feed ausente → build verde** con la vista solo-declarada, y el sitio lo dice. El sitio siempre muestra `meta.generated_at`, porque un artefacto en repo puede quedar viejo sin que nada falle.
4. Las rutas de evidencia están **aisladas del funnel comercial**. Ningún componente del funnel (`Hero`, `Offers`, `FinalCTA`, `Navbar`, `Footer`, `FAQ`, `Problems`, `HowItWorks`) importa nada del feed. La ruta de conversión no puede romperse por un problema de evidencia.
5. Ninguna afirmación se renderiza sin su par de etiquetas (procedencia, verificabilidad). El schema lo hace imposible.

## 4.1 Qué garantiza el gate mecánico, y qué no

Los guards de `.github/workflows/ci.yml` son controles **acotados**. Declararlos equivalentes al invariante que protegen sería exactamente el defecto que este documento acaba de corregir en §3.

Las cinco primeras filas son los invariantes 1–5 de §4, en ese orden. Las dos últimas no son invariantes de §4: son la frontera de PII de `03-privacy-and-publication-policy.md` §4, y se tabulan aquí porque sus guards tienen el mismo problema de sobredeclaración.

| Invariante | Control mecánico | Qué se le escapa |
|---|---|---|
| §4 · 1 — sin tokens ni red hacia GitHub | Ninguno hoy | Nada lo comprueba. Depende de la revisión |
| §4 · 2 — feed inválido → build rojo | `npm run build` con validación zod (Sprint 5) | No existe hasta que exista el consumidor |
| §4 · 3 — feed ausente → build verde | Ninguno hoy | Nada lo comprueba hasta que exista el consumidor del feed |
| §4 · 4 — funnel desacoplado del feed | `scripts/check-funnel-isolation.mjs`: cierre **transitivo** de imports desde los 8 componentes del funnel hacia rutas de evidencia | Imports dinámicos (`import()` con expresión no literal), re-exports vía alias no resolubles estáticamente, y acoplamiento por copia de código en lugar de import |
| §4 · 5 — etiquetas siempre presentes | El schema del feed (Sprint 1) | Que estén en los datos no garantiza que la UI las renderice. Es revisión visual |
| `03` §4 — sin logging de PII en `app/api/**` | ESLint `no-console` (solo `console.error` permitido), que es AST y cubre `console["log"]` y llamadas multilínea + grep de escrituras directas a stdout/stderr | Desestructurar o aliasar el global (`const { log } = console`), un logger propio o de terceros, un `console.error` cuyo argumento sí contenga PII, o el envío del payload a un tercero. Ninguna la detecta un chequeo estático de este tamaño |
| `03` §4 — la ruta de PII no devuelve éxito por un fallo del proveedor, ni distingue una dirección ya suscrita de un alta nueva | `npm test` (`node --test`) sobre `app/api/subscribe/policy.ts`: clasificación de la respuesta upstream, validación de entrada, origen y rate limit | **No ejecuta la ruta**. No cubre el cableado de `route.ts`, la lectura real del cuerpo upstream, ni el comportamiento del rate limit entre instancias de serverless. Y los códigos de error del proveedor son un supuesto sobre su API, no un contrato verificado en CI: si Buttondown renombra el suyo, el test sigue verde y el comportamiento cambia |

La conclusión operativa, y es la razón de que exista esta tabla: **un guard verde no es evidencia de que el invariante se cumpla, solo de que no se rompió por la vía que el guard cubre.** Un guard que se presenta como más de lo que es produce falsa confianza, que es peor que no tenerlo.

Corolario, y es la otra mitad del mismo argumento: un guard que nunca ha fallado tampoco prueba que esté conectado. Los cuatro se rompieron a propósito el 2026-08-24 y se comprobó que fallan; las salidas están en `audits/2026-08-24-gate-falsability.md`. Eso los hace falsables, no los convierte en garantías: lo que cada uno no cubre sigue siendo exactamente lo que dice esta tabla.

## 5. Persistencia: ninguna base de datos en V1

El ledger es **JSONL append-only versionado en git**. Git aporta durabilidad, historia, diffs y revisión sin operar nada.

Si consultar duele antes de necesitar una base de datos, se deriva un **SQLite como build artifact** (regenerable desde el JSONL, nunca fuente de verdad).

### Criterios de salida hacia Postgres

Se adopta una base de datos relacional cuando se cumpla **al menos uno**, demostrado con datos y no con intuición:

- Escritores concurrentes reales (más de una corrida de ingestión simultánea)
- Más de ~10⁵ eventos en el ledger
- Consultas que genuinamente requieran joins relacionales, no filtros en memoria
- Multi-tenant o más de un sujeto de evidencia

Hasta entonces, añadir una base de datos es coste sin beneficio. Esta decisión se revisa con datos, no por preferencia (`decisions/0003`).

## 6. Superficie de escritura

El motor necesita `contents:write` + `pull_requests:write` sobre el repo del sitio. Es la **única** superficie de escritura del sistema, y está acotada por cinco controles (`decisions/0005`):

1. El motor abre PRs; **nunca** hace push a `main`.
2. **Restricción de push en `main`: solo Rodrigo puede mergear.** Es el control que impide que el bot mergee su propio PR — con los permisos que necesita para abrirlo, podría mergearlo en cuanto el CI pasara a verde.
3. PAT separado del de lectura, scopeado a un solo repo y dos permisos, con expiración. **Hoy se emite desde la cuenta personal de Rodrigo**, lo que significa que el control 2 no lo excluiría: la restricción de push está definida sobre `rodrigoBermejo`. No es explotable mientras no haya publicación automática. `decisions/0008` decide la identidad independiente que lo cierra —capaz de abrir PR, incapaz de mergear— y la sitúa como condición de entrada del primer publish automático. No implementada en V1.
4. `public/proof/**` es zona de escritura exclusiva del bot. Ningún agente edita esos archivos a mano.
5. CI valida el feed contra `schemas/*.json` en cada PR; feed inválido bloquea el merge.

## 6.1 Gobernanza de `main`

**Estado: APLICADA en GitHub y verificada por Rodrigo el 2026-08-24.** La distinción importa y por eso encabeza la sección: hasta esa fecha esto era una *configuración acordada* —un acuerdo escrito en un documento— y una regla acordada que no está activa en la plataforma no protege nada. Era el finding P0-GOV-01 del review de Codex, y lo que lo cierra no es este párrafo sino el ruleset activo sobre `main`.

**No hay reglas especiales para PRs automáticos o de publicación** en V1: todos pasan por lo mismo.

| Regla | Acordada | Aplicada en GitHub (verificado 2026-08-24) |
|---|---|---|
| Pull request obligatorio | **Sí** | **Sí** |
| Aprobaciones formales de GitHub requeridas | **No** — Rodrigo es el único maintainer humano; exigir una aprobación que él mismo se daría sería teatro de proceso | **0 aprobaciones requeridas** |
| Status checks obligatorios en verde | **Sí** | **Sí**: `typecheck / lint / test / build` y `privacy guard` (los dos jobs de `.github/workflows/ci.yml`) |
| Conversaciones resueltas antes de mergear | **Sí** | **Sí** |
| Quién puede mergear a `main` | **Solo Rodrigo** (restricción de push) | **Sí**: push a `main` restringido a `rodrigoBermejo` |
| Push directo a `main` | **No**, para nadie | **Sí, bloqueado**, y el ruleset **incluye a los administradores**: Rodrigo tampoco se lo salta |
| Force-push e historia reescrita | **No** | **Sí, bloqueado** |

Dos detalles de la configuración aplicada que no son decorativos:

- **Los administradores están incluidos.** Un ruleset con bypass para admins deja el control como una convención voluntaria para la única persona que podría saltárselo. Incluirlos es lo que lo convierte en un control.
- **Los nombres de los checks obligatorios son los nombres de los jobs**, no los de los scripts de npm. Si se renombra un job en `ci.yml` sin renombrarlo en el ruleset, GitHub esperará indefinidamente un check que ya no se publica, o —peor— dejará de exigir el que sí corre. Renombrar un job de CI obliga a tocar el ruleset en el mismo cambio.

**De dónde sale este estado, y cómo se vuelve a comprobar.** La evidencia es la verificación de Rodrigo sobre la configuración del repositorio el 2026-08-24, no una inspección del árbol de trabajo: **la configuración de GitHub no vive en el repo y ningún agente puede confirmarla leyendo archivos.** Esta tabla es por tanto un hecho reportado por un humano, y la forma de re-verificarlo es la interfaz de rulesets del repositorio (o `gh api repos/RBloomDev/rodrigobermejo-site/rulesets`). Si la configuración deriva, este documento se vuelve falso sin que ningún gate lo detecte: es el límite estructural de documentar una propiedad de la plataforma, y por eso se registra la fecha junto al estado.

Consecuencia de diseño, y es la razón por la que la restricción de push es obligatoria y no opcional: sin aprobaciones requeridas, "CI verde" es el único gate automático, y el bot de publicación puede satisfacerlo por sí mismo. La restricción de push es lo que traduce "la decisión final de merge es de Rodrigo" en un control real en lugar de una convención.

**El review de un agente no es una aprobación humana.** Claude y Codex emiten veredictos como parte de la gobernanza del proyecto (ver `AGENTS.md`), pero un agente no debe usar el botón de aprobación de GitHub para simular una revisión humana. Su veredicto va en comentarios.

## 7. Supuestos de deployment (declarados)

Hasta hoy estaban implícitos en el código. Quedan explícitos:

| Supuesto | Estado |
|---|---|
| Hosting = Vercel | Asumido por el código (`ImageResponse`, `.vercel` en `.gitignore`). Sin `vercel.json`; configuración por defecto del framework |
| Rendering = 100% estático | Cierto hoy y **deseado**: el feed en repo lo mantiene así. Ninguna ruta de evidencia introduce rendering dinámico |
| Contenido leído en build-time con `fs` | Patrón establecido en `lib/posts.ts`; el feed lo reutiliza |
| `NEXT_PUBLIC_SITE_URL` seteado en producción | Debe estarlo. Si falta, el fallback es el ápex mientras el sitio vive en `www.`, divergiendo canonical/OG/sitemap |
| Un solo locale (`es`) y un solo autor | Cierto. Si cambia, es una decisión, no una deriva |
| `/proof/` es rastreable | Deliberado: `robots.ts` bloquea `/api/` pero no `/proof/`. Un feed no rastreable no es verificable por terceros |
