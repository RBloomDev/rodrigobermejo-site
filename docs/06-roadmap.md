# 06 — Roadmap

> Incremental por diseño. Cada sprint tiene un **gate de salida verificable**: sin él, no se avanza.
> El valor se entrega desde el **Sprint D** (una afirmación declarada, publicada y explicada ya es útil), no al final.

> **Reordenado el 2026-08-28 — `decisions/0011`.** Este documento decía que «el valor se
> entrega desde el Sprint 1», y era falso: el Sprint 1 entregó un Registry en un repositorio
> **privado**, y con el orden anterior la primera superficie que un humano podía abrir
> llegaba en el Sprint 5. Cuatro sprints sin salida pública, con la afirmación contraria
> escrita aquí y sin que nadie la hubiera falsado. El **Sprint D** se antepone a la
> ingestión y convierte esa frase en verdad. La ADR explica por qué publicar lo declarado
> es entrega de valor y no un adelanto cosmético: `00-product-brief.md` define el éxito como
> comprobar la afirmación **o entender exactamente por qué no se puede**, y esa segunda
> mitad no necesita motor.

---

| Sprint | Entregable | Gate de salida |
|---|---|---|
| **0** | `docs/`, `CLAUDE.md`, `AGENTS.md`, CI en el sitio, remediación mínima | CI corre `typecheck`/`lint`/`test`/`build` en cada PR y **falla** ante un error de tipo introducido a propósito |
| **1** ✅ | `rodrigoBermejo/proof-engine` (privado). Registry: schema, validador, **3 claims y 3 proyectos reales**. `public/proof/schemas/*.json` | `validate` falla ante un registry inválido y ante las combinaciones prohibidas de `02` §2. Tests sin red — **CERRADO 2026-08-27**, ver `audits/2026-08-27-gate-sprint-1.md` |
| **D** ✅ | **Corte vertical solo-declarado.** `public/proof/v1/*.json` con `evidence: []`, `/proyectos`, `/proyectos/[slug]`, `/evidencia` | Feed borrado → build verde. Feed corrupto → build rojo. Denylist en verde y falsada. Ningún `publish: none` en el artefacto — **CERRADO 2026-08-28**, ver `audits/2026-08-28-gate-corte-vertical.md` |
| **2** | Ingestión GitHub con fixtures grabados. **Recalibrado por `decisions/0011`**: tres `kind`, sin repos de terceros, redacción de privados diferida | Snapshot tests offline. PAT fine-grained read-only verificado y documentado. **El PAT es prerrequisito de entrada, no bloqueo a media carrera** |
| **3** | Correlación + ledger JSONL + reporte `unassigned` | Reingestar dos veces no cambia el ledger (idempotencia probada por test) |
| **4** | Redacción + publicación vía PR + `publish-diff` | Test de denylist en verde. Branch protection activa. El bot **no puede** mergear |
| **5** | *(absorbido por el Sprint D — `decisions/0011`)* Ampliaciones del consumo una vez exista evidencia real | — |
| **6** | README de perfil generado desde `/proof/v1/*.json` | Cero lógica de evidencia en ese repo (verificable por inspección) |
| **7** | Firma de commits de publicación + digest. Evaluar separar `proof-feed` | Un tercero reproduce la verificación siguiendo solo la documentación pública |
| **V2** | Adaptadores Claude Code / Codex | **El cambio de contrato es aditivo**: un campo opcional nuevo, compatible por la regla 2 de `05-feed-contract.md`. V1 no reserva el campo; reservarlo habría sido contrato anticipado sin consumidor (`02` §8) |

**Gate del Sprint 0 — estado (2026-08-26): CERRADO.**

*Primera mitad, en local (2026-08-24).* Los cuatro gates mecánicos (`typecheck`, `lint`, `test`, `build`) y el guard `guard:funnel` se rompieron a propósito uno por uno, fallaron con su salida y su exit code, y se restauraron. Cada uno tiene al menos un experimento propio; ninguno se da por demostrado por inferencia desde otro — en particular, la mutación de `build` es una que `typecheck` no detecta, para que la señal sea independiente. Salidas literales en `audits/2026-08-24-gate-falsability.md` (finding P1-GATE-01).

*Segunda mitad, en CI sobre un PR (2026-08-26).* Existe el PR de Sprint 0 (#1) y sus dos checks obligatorios corrieron en verde: cierra **P1-PROC-01**. Y sobre el PR #2 se provocó el rojo: un **error de tipo introducido a propósito** —el criterio literal de la tabla de arriba— tumbó el job `typecheck / lint / test / build` con `TS2322` y exit 2, mientras `privacy guard` seguía verde; un segundo probe aislado tumbó `privacy guard` con exit 1 mientras el otro job volvía a verde solo. Los dos status checks quedan demostrados como señales independientes y cableadas al PR. Salidas literales, IDs de corrida y SHAs en `audits/2026-08-26-ci-gate-wiring.md`.

Local rojo prueba que el gate no está desconectado; CI rojo prueba que además está cableado al PR. Ahora hay evidencia de las dos cosas. **Lo que sigue sin demostrarse en CI**, y se nombra en lugar de darse por cubierto: los pasos `Lint`, `Test` y `Build` solo tienen falsabilidad local. Que su fallo produzca el mismo check rojo ya demostrado es una inferencia razonable, no un hecho observado.

---

## Estado de implementación, medido el 2026-09-28

Sobre `9a9f883`, rama `docs/estado-de-implementacion`. Tres etiquetas, las de `AGENTS.md`
→ *Principio de verificación* punto 2: **HECHO** lleva su comando y su salida; **INFERENCIA**
es lectura sin ejecutar; **DEUDA** es lo que falta. El detalle completo, con salidas, está
en `plataforma/00-resumen-de-entrega.md` → *Estado de implementación*.

**Antes de leer nada más: construido ≠ desplegado.** Son **dos mediciones**, y una no
sustituye a la otra. La del repositorio: `git rev-list --count origin/main..origin/develop`
devuelve **8**. La del despliegue, que es la que de verdad contesta qué sirve el sitio:

```
$ gh api "repos/RBloomDev/rodrigobermejo-site/deployments?environment=Production&per_page=1" \
    --jq '.[] | "\(.id) \(.sha[0:7]) \(.created_at)"'
6649364084 916bedb 2026-09-24T22:21:11Z

$ gh api "repos/RBloomDev/rodrigobermejo-site/deployments/6649364084/statuses?per_page=1" \
    --jq '.[] | "\(.state) \(.created_at)"'
success 2026-09-24T22:21:11Z
```

El despliegue de producción vigente es **`916bedb`** (merge del PR #43), con estado
`success`. Todo lo que esta sección mide de #44 a #51 existe en `develop` y **no está
desplegado**. Un sprint marcado como cerrado aquí lo está en el repositorio, no
necesariamente en el sitio que un tercero abre. El límite de esta medición —mide el registro
de despliegue de GitHub, no el HTML del dominio— está declarado en
`plataforma/00-resumen-de-entrega.md` → *HECHO (2/2)*, con su pendiente.

### HECHO — los cinco gates, en verde

De cada uno va aquí el **fragmento decisivo** de su salida, literal. Las salidas completas,
sin recortar, están en `plataforma/00-resumen-de-entrega.md` → *HECHO — los gates, con su
comando y su salida*.

| Comando | Fragmento literal de su salida |
|---|---|
| `npm run typecheck` | `tsc --noEmit` sin una sola línea de diagnóstico y sin bloque `npm error` |
| `npm run lint` | `[exited with code 0]` |
| `npm test` | `ℹ tests 409` · `ℹ pass 409` · `ℹ fail 0` · `[exited with code 0]` |
| `npm run build` | `✓ Generating static pages using 7 workers (29/29) in 1265.4ms` · `[exited with code 0]` |
| `npm run guard:funnel` | `OK: funnel desacoplado. 11 entradas, 41 modulos en el cierre transitivo.` |

Y los otros tres guards, con el hueco que cada uno declara en su propia salida:

```
$ npm run guard:canal
OK: canal determinista (2a corrida = 0 nuevos), lo interrumpido se recupera sin duplicar,
y tres fallos descartan con motivo. Los dos comandos, sin red y sin inferencia.

$ npm run guard:estado-editorial
OK: git no rastrea nada bajo scripts/editorial/estado ni scripts/editorial/redacciones.
NO MEDIDA: la ausencia en disco de las rutas historicas no se comprueba todavia. No hay
senal de que la migracion haya corrido.

$ npm run guard:exposicion
OK: sin exposicion detectada.
NOTA: sin --lista, no se comprobaron nombres de repositorios privados.
```

Un verde aquí significa «no rompí lo que ese gate mira». §4.1 de `04-architecture.md`
tabula el alcance de cada uno, y hay que leerlo antes de confiar en el verde.

### HECHO — dónde está cada sprint de verdad

| Sprint | Lo que dice la tabla | Lo medido hoy |
|---|---|---|
| **0** | CERRADO | CERRADO. Los cinco gates corren y están falsados (`audits/2026-08-24`, `audits/2026-08-26`). |
| **1** | CERRADO 2026-08-27 | CERRADO. `public/proof/v1/projects.json` → **12 proyectos**; `claims.json` → **3 claims**. |
| **D** | CERRADO 2026-08-28 | CERRADO en lo declarado, y **ampliado en `develop`**: además de `/proyectos`, `/proyectos/[slug]` y `/evidencia`, el árbol construye `/`, `/sobre-mi`, `/colaborar`, `/actividad`, `/noticias`, `/noticias/[slug]`, `/blog` y `/blog/[slug]` — 29 páginas en `npm run build`. **Construir no es publicar:** `/actividad` y `/noticias` renderizan su rama de ausencia (ver la sección DEUDA de abajo), y `/noticias`, `/actividad` y los fixes de navegador no están en `main`. |
| **2** | sin marca | **NO EMPEZADO.** `evidence.json` tiene `evidence: []` y `meta.counts.evidence: 0`; `meta.unassigned_events: 0`; `generated_at: 2026-08-28`. No hay ingestión. El PAT sigue siendo prerrequisito de entrada. |
| **3–7, V2** | sin marca | NO EMPEZADOS. Sin ledger no hay correlación, y sin ingestión no hay ledger. |

### HECHO — el tramo de construcción del sitio, que esta tabla no contemplaba

Entre el 2026-09-17 y el 2026-09-26 se construyó la superficie pública. No son sprints del
motor y por eso no están en la tabla de arriba, pero son lo que un humano abre:

```
$ git log --format="%h %ad %s" --date=short 3408c6e~1..HEAD
9a9f883 2026-09-26 S-E: cerrar las divergencias documentales cruzadas (#51)
dc04edc 2026-09-25 T-E4: Partir ejecutar en generar y verificar — tres etapas, tres invocaciones (#50)
787f9ae 2026-09-25 T-E3: Programacion preparada y DESACTIVADA (#49)
2d20654 2026-09-24 feat(T-S6): la pasada de navegador, con su evidencia atada al SHA (#48)
21194ef 2026-09-24 fix(navegador): tres defectos que solo aparecen operando el sitio, no leyendolo (#47)
66f5bc5 2026-09-24 feat(t-s4): /actividad: WakaTime con cobertura, sin ratios ni rachas (#46)
a8678fb 2026-09-24 T-S5: /noticias y /noticias/[slug] leyendo el corpus real (#45)
f1b6cf3 2026-09-24 T-E2: Autorizacion editorial y corpus publicado (#44)
88aac43 2026-09-24 fix(blog): la unica ruta sin h1, y el copy de la plantilla que sobrevivio al reposicionamiento (#42)
cbb2c8b 2026-09-24 T-E1: Sacar el estado editorial del repo publico, con guard falsable (#41)
5835247 2026-09-23 T-S3: Proyectos con artefactos, contribucion y filtros (#40)
4a51dbf 2026-09-21 T-S2: Portada de identidad, /colaborar y /sobre-mi (#39)
3e60103 2026-09-21 T-S1: Navbar, Footer y menu movil: la navegacion que hoy no existe (#38)
6b28555 2026-09-18 S-D: Tres etapas del canal y donde vive su estado (#37)
e9d0e78 2026-09-18 feat(s-d): Tres etapas del canal y donde vive su estado (#36)
33c60a2 2026-09-17 feat(s-d): Tres etapas del canal y donde vive su estado (#35)
a6a219d 2026-09-17 feat(s-c): Contrato del registro de proceso y su schema (#34)
b7b6d40 2026-09-17 feat(s-b): Spec de /noticias y /actividad, que hoy no existe (#33)
3408c6e 2026-09-17 feat(s-a): Sincronizar la autoridad de docs con las ADR ya aceptadas (#32)
```

**La implementación vive en `app/` y `components/`.** `docs/plataforma/prototipo/**` es
**HISTÓRICO**: informó el diseño y no es la entrega. Si el prototipo y el sitio divergen,
el desactualizado es el prototipo.

### DEUDA — dos superficies construidas que esperan dato, no código

```
$ ls public/proof/v1
claims.json  evidence.json  meta.json  projects.json     # falta activity.json y proceso.json

$ test -d content/noticias && echo SI || echo NO
NO
```

- `/actividad` compila y renderiza, pero su artefacto no existe: lo que muestra es su rama
  de ausencia.
- `/noticias` igual: en `npm run build`, `● /noticias/[slug]` **no lista ninguna ruta
  hija**, mientras `/proyectos/[slug]` lista doce y `/blog/[slug]` tres.

Ninguna de las dos la cierra un agente de este repositorio: la primera la escribe el motor
(`public/proof/v1/**` es zona prohibida), la segunda la escribe Rodrigo con
`npm run editorial:autorizar`, que es una decisión de publicación.

### DEUDA — la marca SATISFIED de 41 criterios, y lo que sigue sin verificarse

**41 criterios de tipo «reviewer», en las 10 tareas cerradas antes del 2026-09-22, se
marcaron SATISFIED por el veredicto global del Reviewer**, sin comprobarse uno por uno. La
compuerta del orquestador ya está corregida; las tareas cerradas antes conservan la marca.
Lo que sí se puede afirmar de esas 10 —revisión independiente, hallazgos reales, entregas
bloqueadas— y lo que no, está separado en
`plataforma/00-resumen-de-entrega.md` → *HECHO INCÓMODO*. Los registros de run del
orquestador no viven en este repositorio, así que ese número no se recontó aquí.

Lo que ningún run puede cubrir —lo que exige mirar una pantalla renderizada— lo cubre la
pasada de navegador de T-S6, **que sí ocurrió** el 2026-09-24 y dejó 20 capturas y un
manifiesto en `docs/plataforma/verificacion/2026-09-24/`. Pero está atada a `21194ef`, y:

```
$ git diff --stat 21194ef..HEAD -- app components lib
 app/actividad/page.tsx |  2 +-
 lib/navegacion.ts      | 11 +++++++++--
 lib/proof/actividad.ts | 11 +++++++----
```

El cambio de `app/actividad/page.tsx` altera el texto que se pinta, así que **la evidencia
de navegador de `/actividad` no corresponde a HEAD**. Y el manifiesto mide forma —viewport,
desbordamiento, `h1`, jerarquía de encabezados—: **contraste, recorrido de teclado y los
filtros operados de verdad siguen sin medirse sobre el sitio real.**

### Los pendientes humanos

Once, cada uno con su acción concreta y qué desbloquea, en
`plataforma/00-resumen-de-entrega.md` → *Pendientes humanos*. Los cuatro que bloquean este
roadmap:

| Pendiente | ACCIÓN CONCRETA | QUÉ DESBLOQUEA |
|---|---|---|
| El PAT de ingestión no existe (`audits/2026-09-10-promocion-y-bloqueo-sprint-2.md` §3: «El prerrequisito del Sprint 2: el PAT no existe») | Rodrigo crea un PAT fine-grained read-only y lo documenta | **El Sprint 2 entero, y con él el 3, 4 y 6.** Es prerrequisito de entrada, no bloqueo a media carrera (`decisions/0011:126`). |
| El PAT de escritura para el publish automatizado no existe (`decisions/0011`) | Rodrigo crea el PAT con permiso de escritura, o sigue corriendo `feed:build` / `feed:diff` a mano y commiteando él | Que el motor publique por PR en vez de a mano. **No verificado:** `feed:build` y `feed:diff` viven en el motor, que es otro repositorio; `package.json` de este repo no declara ningún script `feed:*`, así que no se pudieron correr desde aquí ni pegar su salida. Lo prescrito está en `decisions/0011` y en `CLAUDE.md` → *Antes de tocar código* §3; que el procedimiento manual funcione **hoy** no se midió. |
| El token del agente no tiene alcance `workflow` (medido: `gist, read:org, repo`) | Rodrigo amplía el alcance, o instala él `docs/plataforma/programacion/canal-editorial.yml` en `.github/workflows/` | Que el canal editorial pase de documento a servicio. |
| `develop` va 8 commits por delante de `main`, y el despliegue de producción vigente es `916bedb` | Rodrigo abre el PR `develop → main` con CI en verde y lo mergea él (`decisions/0010`) | Que las ocho entregas de #44 a #51 lleguen al sitio publicado. Hoy están construidas y **no desplegadas**, medido contra el registro de despliegues, no supuesto. |

---

## Orden y sus razones

**Por qué el Registry antes de la ingestión (1 antes de 2).** La verdad declarada es la que da sentido a la recolectada. Ingerir primero produciría un montón de eventos sin proyecto al que pertenecer, y la tentación sería inferirlo — exactamente lo que `02-domain-and-evidence-model.md` §3 prohíbe.

**Por qué los claims antes que la evidencia.** `Claim` es la raíz del grafo (`decisions/0007`). Recolectar evidencia sin claims escritos deja un montón de datos buscando una afirmación, que es la dirección `Source → Metric → Dashboard` que el sistema existe para no tomar.

**Por qué el Sprint D antes que la ingestión (D antes de 2).** Añadido con `decisions/0011`.
La mitad del criterio de éxito —«entender exactamente por qué no puede comprobarla»— no
necesita evidencia recolectada: necesita una afirmación declarada, publicada, y la
explicación honesta de su límite. Esperar tres sprints para publicarla no la mejoraba.

Y hay una razón de calibración, además de una de valor: **la primera vez que se ve la
página de evidencia propia se cambia de opinión sobre qué claims valen la pena.** Hacerlo
después de instrumentar la ingestión significa descubrirlo con tres sprints ya invertidos
en los claims equivocados.

**Por qué la redacción antes del consumo de evidencia (4 antes de que el feed lleve
`evidence[]`).** Si el sitio consumiera evidencia sin redactar, aunque fuera una vez en
local, la disciplina ya estaría rota. El artefacto público nace redactado o no nace. El
Sprint D no rompe esto: publica **cero evidencia**, y su filtro de publicación sobre los
proyectos es la misma función que el Sprint 4 amplía.

**Por qué el README de perfil al final (6).** Es el consumidor más visible y el de menor valor estructural. Hacerlo antes crearía presión por publicar métricas antes de que el modelo de privacidad esté probado.

**Por qué la firma al final (7).** La historia de git pública ya da tamper-evidence. La firma es un refuerzo, no un requisito para que el sistema sea honesto.

## Criterios de reevaluación

Estas decisiones se revisan con datos, no en fecha fija:

| Decisión | Se revisa cuando |
|---|---|
| Sin base de datos | Se cumple un criterio de `04-architecture.md` §5 |
| Feed dentro del repo del sitio | Se cumple un criterio de `decisions/0002` |
| PAT en lugar de GitHub App | Aparece una segunda cuenta o una organización de terceros |
| Sin API viva | Aparece un caso de uso interactivo real, no hipotético |

## Lo que este roadmap no hará nunca

Añadir scoring, niveles, ranking o cualquier número que pretenda resumir a una persona. No es una prioridad baja: está fuera del producto (`00-product-brief.md`).
