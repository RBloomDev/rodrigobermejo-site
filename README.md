# rodrigobermejo.com

Sitio público de Rodrigo Bermejo — consultor técnico en automatización.
Next.js 16 (App Router), React 19, Tailwind v4, TypeScript strict. Estático por completo.

Este repositorio aloja tres cosas:

| Qué | Dónde |
|---|---|
| El sitio público | `app/`, `components/`, `content/` |
| La especificación del sistema de Proof of Work | `docs/` |
| Los schemas del feed publico | `public/proof/schemas/` |
| Los artefactos de evidencia publicados | `public/proof/v1/` (aun vacio: lo escribe el motor) |

El motor que produce esa evidencia **no vive aquí**: es `rodrigoBermejo/proof-engine` (privado).
Este repo solo lee los artefactos y los renderiza. Ver `docs/04-architecture.md`.

## Desarrollo

```bash
npm ci
cp .env.example .env.local     # y rellena los valores
npm run dev                    # http://localhost:3000
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, cero warnings tolerados |
| `npm test` | `node --test` sobre la política de `/api/subscribe`. Sin runner externo ni dependencias: Node ≥ 22.18 ejecuta TypeScript directamente |
| `npm run build` | Build de producción |
| `npm run guard:funnel` | Comprueba que el funnel comercial no alcanza el sistema de evidencia por el cierre transitivo de imports |

Los cinco últimos son el gate de CI. Si fallan en local, fallan en el PR.
Qué garantiza cada guard —y qué no— está en `docs/04-architecture.md` §4.1. Un verde no es prueba del invariante, solo de que no se rompió por la vía que el guard cubre.

## Variables de entorno

Ver `.env.example`. Resumen:

| Variable | Requerida | Nota |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | En producción | Sin ella, metadata, OG, sitemap y robots caen al ápex mientras el sitio vive en `www.` |
| `NEXT_PUBLIC_GA_ID` | No | Si falta, `components/Analytics.tsx` no renderiza nada |
| `BUTTONDOWN_API_KEY` | Para el newsletter | Solo servidor. **Nunca** prefijar con `NEXT_PUBLIC_` |

## Estructura

```
app/
  page.tsx              landing: composición de las secciones de components/
  blog/                 índice y artículo (estático, desde content/posts/)
  api/subscribe/        newsletter (Buttondown). Frontera de PII.
                        route.ts hace E/S; policy.ts decide y es puro
                        (por eso se puede probar sin bundler)
  layout.tsx            fuentes, metadata, analytics
  globals.css           tokens (@theme) y paleta (:root) — leer el comentario de cabecera
components/             secciones de la landing + ui/ (Button, SectionHeader)
content/posts/*.md      artículos con frontmatter (gray-matter + remark)
lib/posts.ts            lectura de contenido en build-time con fs
scripts/                guards de CI (Node puro, sin dependencias)
tests/                  `node --test`, sin dependencias
docs/                   especificación del sistema de evidencia
public/                 estáticos, llms.txt, y (futuro) proof/
```

## Contenido

Un artículo es un `.md` en `content/posts/` con frontmatter:

```yaml
---
title: "Título"
date: "2026-01-15"
excerpt: "Una frase."
---
```

El slug sale del **nombre del archivo**, no del campo `slug` del frontmatter (que hoy se ignora — ver la deuda #1 en `docs/audits/`).

## Deploy

Vercel, conectado a `main`. Sin `vercel.json`: configuración por defecto del framework.
No hay push directo a `main`; todo entra por PR con CI verde.

## Si eres un agente

Lee **`AGENTS.md`** antes de tocar nada. Contiene el contrato de trabajo: roles Builder y
Reviewer, reglas duras, y qué decisiones requieren un humano.

Tres reglas que rompen cosas si se ignoran:

1. `public/proof/v1/**` lo escribe solo el motor. No lo edites a mano --- ni para corregir un dato.
   `public/proof/schemas/**` SI lo escribe el Builder, derivandolo de `docs/05` y nunca del
   artefacto (`decisions/0009`). Para desarrollar contra un feed, apunta `PROOF_FEED_DIR` a
   otro directorio en vez de escribir en `v1/`.
2. Los tokens de color viven en `@theme`. Las variables de `:root` no generan clases:
   `text-brand-primary` existe, `text-primary-blue` no.
3. `app/api/subscribe/route.ts` maneja PII. No loguees payloads ahí. CI lo verifica.
