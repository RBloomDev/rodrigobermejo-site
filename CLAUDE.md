# CLAUDE.md

## Lee esto primero

**`AGENTS.md`** contiene el contrato de trabajo completo: roles Builder y Reviewer, reglas duras, commits, ramas, PR, y qué escalar a un humano. Es canónico para Claude Code y Codex por igual, y no se duplica aquí.

**`docs/`** es la única fuente de verdad del producto. El índice de qué documento responde a qué está en `AGENTS.md`.

## Qué es este repo

Sitio público de Rodrigo Bermejo (Next.js 16, App Router, Tailwind v4, 100% estático) **y** hogar de dos cosas más:

- `docs/` — la especificación canónica del sistema de Proof of Work
- `public/proof/` — los artefactos de evidencia publicados por `rodrigoBermejo/proof-engine`

El motor de evidencia **no vive aquí**. Este repo solo lee y renderiza.

## Comandos

```
npm run dev          # desarrollo
npm run typecheck    # tsc --noEmit
npm run lint         # eslint, cero warnings tolerados
npm test             # node --test, 273 tests, sin dependencias y sin red
npm run build        # build de producción
npm run guard:funnel # el funnel no alcanza el feed (cierre transitivo de imports)

npm run guard:estado-editorial  # git no rastrea el estado del canal editorial
npm run guard:canal             # canal determinista, sin red y sin inferencia

PROOF_FEED_DIR=<ruta> npm run build   # construir contra un feed que no sea public/proof/v1/
```

El canal editorial necesita **`EDITORIAL_ESTADO_DIR` y `EDITORIAL_REDACCIONES_DIR`**, las dos
obligatorias y **sin valor por defecto**: sin ellas aborta y no escribe un byte
(`docs/plataforma/02-editorial.md` §8.3). Para desarrollar o probar, apúntalas a un directorio
propio fuera de git — igual que `PROOF_FEED_DIR` con el feed. No inventes un default dentro del
repo: así es exactamente como el estado del canal acabó publicado aquí.

«Fuera de git» tampoco es una recomendación: el canal resuelve la ruta al arrancar y **aborta**
si cae dentro de un árbol de trabajo de git, sea este repositorio u otro. Apuntarlas a
`scripts/editorial/estado` para salir del paso no funciona, y es a propósito — con el
`.gitignore` nuevo ese atajo habría vuelto a escribir dentro del repo sin aparecer en `git status`.

### Correr un solo test

No hay script de npm para esto, y `npm test -- <archivo>` **no funciona**: el glob ya esta
dentro del script, asi que el argumento se suma en vez de sustituir. Invoca `node` directo:

```
node --test --conditions=react-server tests/proof-feed.test.ts
node --test --conditions=react-server --test-name-pattern="CARDINALIDAD" tests/proof-feed.test.ts
```

`--conditions=react-server` no es decorativo. `lib/proof/feed.ts` importa `server-only`, cuyo
export por defecto **lanza** fuera de ese condition: sin la bandera los tests del feed fallan
con un error que no habla del feed, y se persigue el bug equivocado.

Requiere **Node >= 22.18** --- el type stripping es nativo, no hay transpilacion ni runner.
CI corre **Node 24**. Si `npm test` falla con un error de sintaxis en TypeScript, la version
de Node es la causa antes que el codigo.

## Antes de tocar código

1. ¿Existe la spec en `docs/` para lo que vas a hacer? Si no, escríbela y para.
2. ¿Eres Builder o Reviewer en esta feature? Si es Reviewer, **no commitees**.
3. ¿Toca `public/proof/v1/**`? **Zona prohibida.** Corrige la causa en el motor o en el Registry.
   - `public/proof/schemas/**` sí lo escribe el Builder, derivándolo de `docs/05` y nunca del artefacto (`decisions/0009`).
   - ¿Necesitas un feed para desarrollar o para probar? **`PROOF_FEED_DIR`**. El lector resuelve su raíz desde esa variable, así que los tests construyen su feed en `tmpdir` y nadie escribe en `v1/`. Escribir ahí «solo para probar» es la forma en que esta regla se rompe.
   - ¿Quién lo escribe entonces? Hoy, Rodrigo a mano: `npm run feed:build` en el motor genera en `out/`, `npm run feed:diff` dice qué cambiaría, y él commitea. El PR automatizado necesita el PAT de escritura, que no existe todavía (`decisions/0011`).
4. ¿Cambia qué se vuelve público? Escala a un humano.
5. Antes de decir "listo": corre el comando y lee la salida. No declares corregido lo que no verificaste, y si una corrección prevista no ocurrió, dilo. Detalle en el principio de verificación de `AGENTS.md`.

## Trampas conocidas de este repo

- Los tokens de color viven en `@theme` en `app/globals.css`. Las variables de `:root` **no** generan utilidades de Tailwind: `text-primary-blue` no existe, `text-brand-primary` sí. Ver `docs/audits/2026-08-19-site-baseline.md`.
- El funnel comercial (`Hero`, `Offers`, `FinalCTA`, `Navbar`, `Footer`, `FAQ`, `Problems`, `HowItWorks`) **no puede importar nada del feed**. La ruta de conversión no se rompe por evidencia.
- `app/api/subscribe/route.ts` maneja PII. No loguees payloads ahí, nunca.
- `docs/` es autoridad **sobre** `public/proof/schemas/` y sobre el código, no al revés. Si el schema y la spec divergen, el schema está mal. Divergencia = FAIL, no deuda.
- El umbral k **no anonimiza**: cuenta eventos, no sujetos. Un proyecto `confidential` no aparece en el feed en ninguna forma sin un `release` humano. Ver `docs/03-privacy-and-publication-policy.md` §2–§3.
- Los guards de CI son mitigaciones acotadas, no garantías. Antes de confiar en un verde, lee qué cubre cada uno en `docs/04-architecture.md` §4.1.
- Ningún agente mergea a `main`, ni usa el botón de aprobación de GitHub. Esa decisión es de Rodrigo. **A `develop` sí se mergea**, con CI en verde: las ramas de trabajo salen de `develop` y de ahí sale un solo PR a `main` (`docs/decisions/0010`).
- No le pidas a Rodrigo trabajo operativo. Si un agente puede hacerlo de forma segura, lo hace el agente. Ver el reparto de trabajo en `AGENTS.md`.
