# Estado de promocion y bloqueo del Sprint 2 --- 2026-09-10

`AGENTS.md` -> *Principio de verificacion*: no se declara corregido lo que no se verifico, y
se distingue hecho de inferencia. Lo que sigue es salida de comando salvo donde se marca lo
contrario.

> Nota de fecha: el documento de estrategia que origino este trabajo fecha sus consultas el
> **11 de septiembre**. El reloj de la maquina donde se ejecuto esto dice **2026-09-10**. Se usa
> la fecha verificable. La discrepancia no afecta a ningun hallazgo.

---

## 1 - Referencias revalidadas

Las cuatro referencias remotas del documento se confirman exactas:

```
sitio   develop  41bbad6   (local == origin)
sitio   main     534ed49   (local == origin)
motor   develop  7dade31   (local == origin)
origin/main..origin/develop   sitio: 2 commits
```

**Hallazgo que el documento no registra:** el motor tiene **16 commits** en `develop` sin
promover a `main` (`origin/main` del motor esta en `3286552`). Todo el trabajo del Sprint D del
lado del motor --- `feed:build`, `feed:diff`, la allowlist de mundo cerrado, `feed:stage`, los
statements y el release --- vive solo en `develop`. No es urgente: el motor no despliega nada.
Pero la frase «el siguiente encargo es preparar la promocion pendiente» se refiere a una sola
promocion cuando hay dos.

## 2 - Que sirve produccion hoy

```
/                         HTTP 200
/evidencia                HTTP 200
/proyectos                HTTP 200
/proyectos/proof-of-work  HTTP 200
/proof/v1/meta.json       HTTP 200
/sitemap.xml              HTTP 200   (5 URLs)
```

Consecuencia para el alcance de la promocion: **las paginas de evidencia y el feed ya son
publicos** desde el PR #17. El cambio de `app/sitemap.ts` no publica nada nuevo; hace
descubrible lo ya publicado. Es una distincion que importa para `docs/03`: no hay decision de
publicacion nueva que escalar.

### Defecto preexistente encontrado al comprobarlo: `NEXT_PUBLIC_SITE_URL`

```
sitemap.xml de produccion   ->  https://rodrigobermejo.com/...    (apex)
https://rodrigobermejo.com  ->  HTTP 307 a https://www.rodrigobermejo.com/
robots.txt                  ->  Sitemap: https://rodrigobermejo.com/sitemap.xml
```

La variable no esta definida en el proyecto de Vercel, asi que `app/sitemap.ts:6`,
`app/robots.ts:4` y `app/layout.tsx:36` caen al fallback del apex, que redirige. `.env.example:6`
documenta el valor correcto y `ci.yml` lo define para el build de CI; lo que falta es
produccion.

**No lo introdujo la promocion, pero la promocion lo amplifica**: hoy son 5 URLs redirigidas,
con el cambio serian 19, y `metadataBase` ademas afecta a canonicas y OpenGraph. Es variable de
entorno, no codigo, y esta fuera del acceso de un agente.

## 3 - El prerrequisito del Sprint 2: el PAT no existe

| Donde | Resultado |
|---|---|
| Secrets de Actions, motor | `total_count: 0` |
| Secrets de Actions, sitio | `[]`, exit 0 |
| Environment `copilot` del motor | sin secrets |
| `.env*` en el arbol del motor | ninguno |
| Variables del ejecutor | ninguna de las esperadas |
| Workflows del motor | ninguno referencia `secrets.` |

La lista vacia se distinguio de un fallo de lectura: `gh secret list --json name` devolvio `[]`
con **exit 0**, que es una lectura correcta de un conjunto vacio y no un 403. Sin esa
comprobacion, «no hay secrets» y «no pude leerlos» serian indistinguibles.

El token del `gh` CLI de la sesion **no cuenta**: es la credencial del agente para operar
GitHub, no la del proceso del motor.

Registrado como dependencia unica en `rodrigoBermejo/proof-engine#16`.

## 4 - Coordinacion

Trello --- donde vive el backlog de este proyecto --- **no conecto en esta sesion** (el servidor
MCP devolvio 404). No es que el backlog no exista; es que no se pudo leer ni actualizar. Este
audit y el issue #16 son el registro sustituto, en ubicaciones del propio repo.

### Resuelto

- Nivel A completo: las 8 divergencias entre spec y repo, en `develop` via PR #18 (sitio) y
  PR #15 (motor). Retirado de pendientes.

### Ejecutable ahora

- **Definir `NEXT_PUBLIC_SITE_URL` en produccion.** Decision de Rodrigo por acceso, no por
  riesgo. Preparado y documentado en el PR #19.
- **Promover el sitio a `main`.** PR #19 en borrador, con alcance publico descrito y gates
  reejecutados. Requiere autorizacion: mergear despliega.
- **Promover el motor a `main`** (16 commits). No preparado todavia; nadie lo habia registrado.

### Bloqueado

- **Sprint 2, y con el 3, 4 y 6.** Falta el PAT fine-grained read-only. `proof-engine#16`.
- **Publicacion automatica.** Necesita ademas `decisions/0008`.
- **Sprint 7.** Necesita claves de firma.
- **Deudas #10 y #11** del baseline, marcadas «decision de Rodrigo» desde el 2026-08-19.

## 5 - Lo que este audit NO demuestra

- **Que la promocion sea segura de desplegar.** Los gates verdes prueban que el codigo compila y
  pasa sus tests, no que el resultado en produccion sea el deseado. El PR #19 esta en borrador
  precisamente porque esa decision no es de un agente.
- **Que no exista un PAT en algun otro sitio.** Se comprobaron los lugares que la politica del
  repo declara (`secrets` de Actions) mas los obvios. Un PAT en un gestor de credenciales
  externo, en la consola de Vercel o en otra maquina no seria visible desde aqui. Lo que se
  demuestra es que **el ejecutor de esta sesion no lo tiene**, que es la pregunta operativa.
- **Que el sitemap corregido mejore el posicionamiento.** Eso es una expectativa, no una
  medicion, y `00-product-brief.md` es explicito en no confundir las dos cosas.
- **Nada sobre el estado de n8n, la cuenta institucional ni los repos de Inadaptados.** Fuera del
  alcance de este frente.
