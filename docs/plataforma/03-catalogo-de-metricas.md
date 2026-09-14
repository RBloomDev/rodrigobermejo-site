# 03 — Catálogo de métricas medidas

- **Estado:** **BORRADOR.** No autoriza publicar nada.
- **Fecha de medición:** 2026-09-13
- **Depende de:** `docs/decisions/0015-actividad-proceso-y-editorial.md` (**PROPUESTA**, no aprobada)
- **Gobernado por:** `docs/03-privacy-and-publication-policy.md` §2 y §3 · `public/proof/schemas/activity.schema.json`
- **Autoridad:** este documento **no** es autoridad sobre nada. Mide. Si una cifra de aquí contradice a `docs/03` o al schema, manda el schema.

> **Qué es esto y qué no es.** Es el inventario de lo que hoy se puede medir de verdad para
> sostener una pantalla de actividad, con el comando y la salida real detrás de cada cifra.
> **No es una propuesta de pantalla y no es una autorización de publicación.** Tres de las
> siete cosas que Rodrigo pidió ver no tienen fuente en ningún sistema al que este repo
> tenga acceso: no se estiman, se marcan como hueco. Ver §Vacíos.

---

## Resumen

| | Métricas |
|---|---|
| Con fuente real, medidas hoy | **15** |
| Con fuente real pero **fuera del permiso de publicación** vigente | 4 de esas 15 |
| **Sin fuente: DATO INEXISTENTE** | **5** |
| **Prohibidas por contrato**, no son un hueco | **3** |
| No medibles con las herramientas disponibles | **1** |

**Los tres huecos que importan, en una línea:** no existe registro de tiempo humano, no
existe registro de ejecuciones de agentes, y no existe una sola captura de producto en el
repositorio. Ninguno de los tres se puede llenar midiendo mejor; hay que crear el registro.

**El hallazgo que más cambia el alcance** no es un hueco sino una cobertura: el **97.2 %**
de la actividad de GitHub de 2026 ocurre en repositorios privados, y la lista de repos del
encargo omitía **dos organizaciones enteras** (`Inadaptados`, 96 repos; `ISC-UPA`, 59
repos) donde vive la mayor parte del trabajo. Ver §Cobertura.

---

## Método

### Fecha y herramientas

Todo se midió el **2026-09-13** desde el worktree
`C:/Users/Admin/Desktop/rodrigobermejo-plataforma`, con `gh` autenticado como
`rodrigoBermejo` (scopes `gist`, `read:org`, `repo`) y `git` local. Cada cifra de este
documento trae su comando. **No hay ninguna cifra sin comando.**

### Criterio de deduplicación

Cuatro reglas, aplicadas en este orden. Se declaran porque cada una cambia el número:

1. **Un commit se cuenta una vez, por SHA.** El endpoint `repos/{r}/commits` recorre la
   rama por defecto y no repite SHAs; `git log` tampoco repite un commit alcanzable desde
   varias ramas. Verificado: en `rodrigobermejo-site` el API devolvió 47 registros y 47
   SHAs distintos.
2. **Los merges no se cuentan.** Un merge no es trabajo nuevo: es la operación de integrar
   trabajo ya contado. Filtro: `select((.parents|length)<2)` en el API, `--no-merges` en
   git. Esto **no** es cosmético — en `rodrigobermejo-site` son 19 de 47 registros (40 %).
3. **Los cherry-picks se detectan por `patch-id`, no por SHA.** Un cherry-pick produce un
   SHA nuevo para el mismo diff y se contaría dos veces. Se midió: **cero duplicados** en
   este repositorio.
4. **La identidad del autor no se da por buena.** `git` no dedupica personas: `ALopezxd` y
   `Alopezxd` son la misma persona con dos grafías, y `-h` es una configuración rota de
   `git config`. Cualquier conteo *por autor* necesita una tabla de alias que hoy **no
   existe** en ningún repo. Ver M-02.

```bash
# Regla 1 — SHAs únicos vs registros devueltos
gh api --paginate "repos/RBloomDev/rodrigobermejo-site/commits?per_page=100" \
  --jq '.[] | [.sha, (.commit.author.date|.[0:7]), (.commit.author.name), ((.parents|length)>1)] | @tsv' > site.tsv
wc -l < site.tsv                          # 47
cut -f1 site.tsv | sort -u | wc -l        # 47
awk -F'\t' '$4=="true"' site.tsv | wc -l  # 19  ← merges
awk -F'\t' '$4=="false"' site.tsv | wc -l # 28  ← trabajo contable
```

```bash
# Regla 3 — cherry-picks por patch-id, en TODAS las ramas
git log --all --no-merges --format=%H -p | git patch-id --stable | wc -l
# 56
git log --all --no-merges --format=%H -p | git patch-id --stable \
  | awk '{print $1}' | sort | uniq -c | awk '$1>1' | wc -l
# 0   ← ningún diff aparece dos veces
```

**Trampa medida, no supuesta:** contar sobre la rama por defecto **no** es contar el
trabajo. En este repo `main` y `develop` tienen los dos 47 commits pero **no son los
mismos 47**, y el conjunto completo es mayor que cualquiera de las dos ramas:

```bash
git rev-list --left-right --count origin/main...origin/develop   # 3   3
git rev-list --count origin/main                                 # 47
git rev-list --count origin/develop                              # 47
git log --all --no-merges --pretty=%H | sort -u | wc -l          # 56
```

Consecuencia para el motor: `commits` debe medirse sobre **el conjunto de ramas declarado**,
y ese conjunto es parte de la definición de la métrica, no un detalle de implementación.
Las cifras de repos remotos de este documento son de **rama por defecto** y por eso son un
**piso**, no un total.

### Reglas que este documento no puede romper

Copiadas de `docs/decisions/0015` §3, porque son las que deciden qué entra al catálogo:

- **No se deduce tiempo humano de commits, de mensajes ni de sesiones de editor.** Sin
  registro explícito, el número no existe y el hueco se muestra como hueco.
- **No se suman horas humanas con duración de ejecuciones de agentes.** Unidades distintas
  de cosas distintas.
- **Duración acumulada ≠ tiempo transcurrido**, y la unidad va declarada siempre.
- **Prohibido derivar «% de trabajo hecho por IA» y «horas ahorradas».** No hay denominador
  honesto.
- **Los tokens no son resultados.** `tokens_used` sigue prohibido en cualquier clase.
- **Un cero medido y un cero por falta de fuente se separan siempre.** Ver §Cero vs desconocido.

---

## Tabla maestra

Las siete columnas son obligatorias. **`Permiso`** usa cuatro valores:
**PUB** (publicable) · **AGR** (publicable solo agregada, bajo `docs/03` §3) ·
**NO** (no publicable) · **DEC** (requiere decisión de Rodrigo).

| # | Métrica | Significado | Unidad | Periodo | Fuente | Deduplicación | Cobertura | Permiso |
|---|---|---|---|---|---|---|---|---|
| M-01 | Commits, repos públicos | Cambios registrados en repos de proyectos `visibility: public` | commits | mes | GitHub API `/commits` | SHA único · sin merges · patch-id · rama declarada | 2 repos de 218 accesibles | **PUB** |
| M-02 | Commits, repos privados | Lo mismo, con procedencia privada | commits | mes o trimestre | GitHub API `/commits` | igual que M-01, **más** filtro por identidad de autor | 10 repos de 218 | **AGR** |
| M-03 | Commits en repos de `context: client` | Trabajo en repos de la universidad (`ISC-UPA`) | commits | mes | GitHub API | igual que M-02 | 0 de 59 medidos | **NO** sin `release` |
| M-04 | Pull requests abiertos | PRs creados | PRs | mes | `gh pr list --state all` | número de PR único por repo | 5 repos | **PUB** públicos / **AGR** privados |
| M-05 | Pull requests mergeados | PRs con `mergedAt` no nulo | PRs | mes | `gh pr list` | igual que M-04; un PR reabierto y remergeado cuenta una vez | 5 repos | **PUB** / **AGR** |
| M-06 | Reviews **recibidas** | Reviews emitidas sobre PRs de Rodrigo | reviews | mes | `/pulls/{n}/reviews` | review única por id | 5 repos | **DEC** — ver M-06 |
| M-07 | Reviews **emitidas** por Rodrigo | Reviews que Rodrigo dejó en PRs ajenos | reviews | mes | GraphQL `contributionsCollection` | — | global, todos los repos | **PUB** (vale **cero medido**) |
| M-08 | Releases | Releases publicados en GitHub | releases | mes | `/releases` | id único | 5 repos | **PUB** (vale **cero medido**) |
| M-09 | Tags | Tags de versión | tags | mes | `/tags` | nombre único | 5 repos | **PUB** (vale **cero medido**) |
| M-10 | Deployments | Despliegues registrados por GitHub | deployments | mes | `/deployments` | id único; Preview y Production **no se suman** | 1 repo (único con deployments) | **PUB** |
| M-11 | Ejecuciones de CI | Corridas de workflow | ejecuciones | mes | `/actions/runs` | `run id` único; un re-run cuenta aparte | 4 repos con CI | **PUB** públicos / **AGR** privados |
| M-12 | Duración acumulada de CI | Suma de `updated_at − run_started_at` | **minutos de ejecución** (no tiempo transcurrido) | mes | `/actions/runs` | misma que M-11 | 1 repo medido | **PUB** con la unidad declarada |
| M-13 | Commits con trailer de procedencia de IA | Commits que **declaran** asistencia con `Co-Authored-By: Claude` | commits | mes | mensajes de commit | subconjunto de M-01/M-02, misma dedup | 5 repos | **PUB** como **procedencia**, nunca como métrica |
| M-14 | Commits con identidad de agente como autor | Commits cuyo `author` es una identidad no humana | commits | mes | campo `author.email` | misma dedup | 2 repos | **DEC** — ver M-14 |
| M-15 | Piezas editoriales publicadas | Posts en `content/posts/` | piezas | mes | sistema de archivos | ruta única | 100 % del repo | **PUB** |
| M-16 | Extensión de las piezas | Palabras por pieza | palabras | por pieza | `wc -w` | — | 100 % de M-15 | **PUB** |
| M-17 | Proyectos en el feed | Registros en `projects.json` | proyectos | estado a la fecha | `public/proof/v1/projects.json` | `id` único | 100 % del feed | **PUB** |
| M-18 | Claims en el feed | Afirmaciones declaradas | claims | estado a la fecha | `public/proof/v1/claims.json` | `id` único | 100 % del feed | **PUB** |
| M-19 | Evidencia en el feed | Registros de `Evidence` publicados | registros | estado a la fecha | `public/proof/v1/evidence.json` | `id` único | 100 % del feed | **NO** — `decisions/0013` en PROPUESTA |
| M-20 | Buckets de actividad | Agregados de `activity.json` | buckets | mes o trimestre | **no existe el archivo** | — | 0 % | **NO** — no hay dato |
| M-21 | **Tiempo humano registrado** | Horas que Rodrigo registró trabajando | — | — | **ninguna** | — | **0 %** | **DATO INEXISTENTE** |
| M-22 | **Ejecuciones de agentes** | Corridas de agente registradas | — | — | **ninguna** | — | **0 %** | **DATO INEXISTENTE** |
| M-23 | **Duración de ejecuciones de agentes** | Tiempo acumulado de esas corridas | — | — | **ninguna** | — | **0 %** | **DATO INEXISTENTE** |
| M-24 | **Capturas y demos de producto** | Imágenes que muestran un producto funcionando | imágenes | — | sistema de archivos | ruta única | 100 % del repo medido | **cero medido** — no hay ninguna |
| M-25 | **Vídeos públicos de YouTube** | Vídeos del canal `@rodrigolbermejo` | vídeos | mes | — | — | **no medible** sin API key | **DEC** |

Fuera de la tabla, por contrato y no por falta de dato: **% de trabajo hecho por IA**,
**horas ahorradas**, **tokens consumidos**. Ver §Lo prohibido.

---

## Métricas con fuente real

### A. Actividad de GitHub

#### M-01 / M-02 / M-03 — Commits

**Comando, por repo:**

```bash
gh api --paginate "repos/{OWNER}/{REPO}/commits?per_page=100" \
  --jq '.[] | select((.parents|length)<2) | .commit.author.date[0:7]' | sort | uniq -c
```

**Salidas reales, 12 repos medidos** (rama por defecto, sin merges):

| Repo | Proyecto del Registry | Visib. repo | Sin merges | Reparto por mes |
|---|---|---|---|---|
| `Inadaptados/indptdos-lms` | `plataforma-inadaptados` | privado | **1 585** | 2025-10:10 · 2025-11:53 · 2025-12:65 · 2026-01:79 · 2026-02:34 · 2026-03:58 · 2026-04:344 · 2026-05:357 · 2026-06:215 · 2026-07:169 · 2026-08:138 · 2026-09:63 |
| `Inadaptados/SSP` | `ssp` | privado | **484** | 2026-02:19 · 2026-03:73 · 2026-04:11 · 2026-06:18 · 2026-07:11 · 2026-08:305 · 2026-09:47 |
| `Inadaptados/curricula-software-developer` | `curricula-inadaptados` | privado | **400** | 2026-07:221 · 2026-08:126 · 2026-09:53 |
| `rodrigoBermejo/POS-Terracota` | `punto-de-venta` | privado | **157** | 2026-01:1 · 2026-02:12 · 2026-03:5 · 2026-07:53 · 2026-08:86 |
| `rodrigoBermejo/claude-config` | *sin proyecto en el Registry* | privado | **85** | 2026-08:2 · 2026-09:83 |
| `rodrigoBermejo/habit-tracker` | `habit-tracker` | **público** | **43** | 2026-05:26 · 2026-06:17 |
| `rodrigoBermejo/diplomado-ia-automatizacion` | `curricula-inadaptados` (probable) | privado | **43** | 2026-03:9 · 2026-05:7 · 2026-06:18 · 2026-07:9 |
| `RBloomDev/rodrigobermejo-site` | `proof-of-work` | **público** | **28** (`main`) | 2026-01:5 · 2026-08:21 · 2026-09:2 |
| `RBloomDev/mathgym` | `mathgym` | privado | **27** | 2026-07:25 · 2026-08:1 · 2026-09:1 |
| `RBloomDev/rbloom-automation` | `infra-interna` | privado | **24** | 2026-03:24 |
| `RBloomDev/rbloom-os` | `infra-interna` | privado | **13** | 2026-04:13 |
| `rodrigoBermejo/proof-engine` | `proof-of-work` (fuente privada) | privado | **12** | 2026-08:12 |
| | | **Suma** | **2 901** | |

**Interpretación, y tres advertencias que cambian el número:**

1. **2 901 no es «el trabajo de Rodrigo».** Son los commits del repo, de todos sus autores.
   En los dos repos grandes, la fracción de Rodrigo es **dos tercios, no el total**:

   ```bash
   gh api --paginate "repos/Inadaptados/indptdos-lms/commits?per_page=100" \
     --jq '.[] | select((.parents|length)<2) | .commit.author.name' | sort | uniq -c | sort -rn
   #  1112 Rodrigo Leaños Bermejo      ← 70 % de 1 585
   #   167 Quique · 104 ALopezxd · 90 yeei-yeei · 30 -h · 26 Alopezxd
   #    21 dependabot[bot] · 12 FNTR3455234 · 10 isai-santiago · 10 Darktortilla · …
   ```
   ```bash
   gh api --paginate "repos/Inadaptados/SSP/commits?per_page=100" \
     --jq '.[] | select((.parents|length)<2) | .commit.author.name' | sort | uniq -c | sort -rn
   #   324 Rodrigo Leaños Bermejo      ← 67 % de 484
   #   129 Quique · 14 Diego Enrique · 14 ALopezxd · 3 Nova (RBloom AI)
   ```

   Publicar 1 585 como actividad de Rodrigo sería atribuirle 473 commits de otras personas.
   Además choca de frente con `docs/03` §2: de un repo privado **nunca** se ingieren
   «identidades de otros colaboradores», así que el filtro por autor tiene que ocurrir en
   el motor, antes de agregar, y el resultado no puede nombrar a nadie más.

2. **`ALopezxd` (104) y `Alopezxd` (26) son la misma persona; `-h` (30) es un `git config`
   roto.** Sin tabla de alias, cualquier conteo por autor está mal. La tabla no existe hoy.

3. **Las cifras remotas son de rama por defecto y son un piso.** En el único repo donde se
   pudo medir el conjunto completo, el total real es **56**, no 28: el doble.

**Permiso, desglosado:**

- **M-01, repos públicos** (`rodrigobermejo-site` → `proof-of-work`; `habit-tracker` →
  `habit-tracker`, ambos `visibility: public`): procedencia pública, ya visible en GitHub.
  **PUB.** Las reglas 2 y 3 de `docs/03` §3 no aplican porque aplican «a todo dato con
  procedencia en fuente privada o confidencial».
- **M-02, repos privados:** **AGR**. Un agregado que mezcle `context: rbloomdev`
  (`rbloom-*`, `proof-engine`, `mathgym`, `punto-de-venta`) con `context: inadaptados`
  (`indptdos-lms`, `SSP`, `curricula-*`) cubre **≥ 2 sujetos independientes** y cumple la
  regla 2. Casi todos los buckets mensuales superan holgadamente k=5 y la banda 5–10 de la
  regla 7; los que no la superan **se omiten** (`docs/03` §3.1). Coarsening mensual: ✓.
  Sin nombres de repo, sin ramas, sin mensajes: ✓ por construcción, el bucket solo lleva
  enteros.
- **M-03, `context: client`:** **NO.** `docs/03` §2 es explícito: «Un proyecto con
  `context: client` requiere `release` incluso con `visibility: private`». El proyecto
  `docencia-universitaria` tiene `context: client` y **no tiene `release`**. Los 59 repos
  de `ISC-UPA` quedaron deliberadamente **sin medir** por esa razón.

---

#### M-04 / M-05 — Pull requests

```bash
gh pr list -R {REPO} --state all --limit 200 --json createdAt --jq '.[].createdAt[0:7]' | sort | uniq -c
gh pr list -R {REPO} --state all --limit 200 --json mergedAt \
  --jq '.[]|select(.mergedAt!=null)|.mergedAt[0:7]' | sort | uniq -c
```

| Repo | Total | Abiertos por mes | Mergeados por mes | Estados |
|---|---|---|---|---|
| `RBloomDev/rodrigobermejo-site` | 24 | 2026-08:17 · 2026-09:7 | 2026-08:13 · 2026-09:5 | 18 MERGED · 3 CLOSED · 3 OPEN |
| `RBloomDev/rbloom-automation` | 37 | 2026-03:28 · 2026-04:9 | 2026-03:28 · 2026-04:8 · 2026-07:1 | — |
| `rodrigoBermejo/proof-engine` | 16 | 2026-08:14 · 2026-09:2 | 2026-08:12 · 2026-09:1 | — |
| `rodrigoBermejo/habit-tracker` | 3 | 2026-05:1 · 2026-06:2 | 2026-05:1 · 2026-06:2 | — |
| `RBloomDev/rbloom-os` | 1 | — | — | — |

**Interpretación.** Es la métrica más limpia del catálogo: un PR es una unidad natural, con
id estable y con dos fechas distintas bien definidas (creación y merge). Nótese que
**abiertos ≠ mergeados** y no deben mostrarse como si fueran lo mismo: en el sitio, 24
abiertos contra 18 mergeados; los 3 CLOSED son trabajo descartado, y mostrarlos como
entregas sería falso.

---

#### M-06 — Reviews recibidas · M-07 — Reviews emitidas

```bash
gh pr list -R RBloomDev/rodrigobermejo-site --state all --limit 200 --json number --jq '.[].number' \
| while read n; do
    gh api "repos/RBloomDev/rodrigobermejo-site/pulls/$n/reviews" \
      --jq '.[] | [.submitted_at[0:7], .user.login, .state] | @tsv'
  done | sort | uniq -c
#       7 2026-09   copilot-pull-request-reviewer[bot]   COMMENTED
```

```bash
gh pr list -R {REPO} --state all --limit 200 --json reviews --jq '.[].reviews[]?.author.login' | sort | uniq -c
# rodrigobermejo-site   7  copilot-pull-request-reviewer
# rbloom-automation    37  copilot-pull-request-reviewer
# habit-tracker         3  copilot-pull-request-reviewer
# proof-engine          2  copilot-pull-request-reviewer
```

```bash
gh api graphql -f query='{ user(login:"rodrigoBermejo") { contributionsCollection(
  from:"2026-01-01T00:00:00Z", to:"2026-09-13T23:59:59Z") {
  totalPullRequestReviewContributions } } }'
# {"totalPullRequestReviewContributions":0}
```

**Interpretación, y es incómoda.** Las **49 reviews** de los cinco repos medidos provienen
de **un solo emisor, y es un bot**: `copilot-pull-request-reviewer`. En el sitio, las siete
son `COMMENTED` — **ninguna es `APPROVED`**. Y las reviews emitidas por Rodrigo en 2026
son **cero**.

Consecuencias directas:

- **M-06 es DEC, no PUB.** Publicar «49 reviews» sugiere revisión por pares y no la hubo.
  `docs/03` §3 lo dice para el caso general de gobernanza: «Un review de Claude o de Codex
  forma parte de la gobernanza del proyecto, pero **no cuenta como aprobación humana** y no
  debe presentarse como tal». Si la pantalla muestra reviews, tiene que decir que el emisor
  es automático — y entonces la cifra deja de decir lo que el visitante cree que dice.
  Rodrigo decide si vale la pena mostrarla.
- **M-06 falla también la regla 2 de `docs/03` §3** en cualquier agregado privado: un solo
  emisor es **un** sujeto, no dos. El umbral k=5 no lo arregla, porque k cuenta eventos y
  no sujetos.
- **M-07 vale cero, y es un cero medido.** Es un dato real sobre el modo de trabajo —
  Rodrigo no revisa código ajeno en GitHub —, no un fallo de medición.

---

#### M-08 / M-09 — Releases y tags

```bash
gh api repos/{REPO}/releases --jq 'length'   # 0 en los 5 repos
gh api repos/{REPO}/tags     --jq 'length'   # 0 en los 5 repos
```

| Repo | Releases | Tags |
|---|---|---|
| `RBloomDev/rodrigobermejo-site` | 0 | 0 |
| `rodrigoBermejo/proof-engine` | 0 | 0 |
| `rodrigoBermejo/habit-tracker` | 0 | 0 |
| `RBloomDev/rbloom-automation` | 0 | 0 |
| `RBloomDev/rbloom-os` | 0 | 0 |

**Interpretación.** **Cero medido**, en los cinco. `activity.schema.json` exige `releases`
como entero obligatorio en cada bucket, así que el campo existirá siempre y siempre valdrá
`0` mientras no se etiquete nada. No es un hueco de medición: es que este flujo de trabajo
no usa releases. Decirlo es más honesto que omitir el campo.

---

#### M-10 — Deployments

```bash
gh api "repos/RBloomDev/rodrigobermejo-site/deployments?per_page=100" \
  --jq '.[] | [.created_at[0:7], .environment] | @tsv' | sort | uniq -c
#   4  2026-01  Production
#  31  2026-08  Preview
#   3  2026-08  Production
#  12  2026-09  Preview
#   2  2026-09  Production
```

**Interpretación.** 52 deployments, de los cuales **9 son Production y 43 son Preview**.
**No se suman.** Un preview de Vercel se crea por cada push a una rama de PR: contarlo como
entrega inflaría el número casi 6×. La métrica publicable es **Production**: 2026-01:4 ·
2026-08:3 · 2026-09:2.

**Trampa medida:** `gh api .../deployments --jq 'length'` devolvió **30**, no 52, porque el
endpoint pagina de 30 en 30 por defecto. Sin `per_page=100` el número sale mal y no avisa.

---

#### M-11 / M-12 — Ejecuciones de CI y su duración

```bash
gh api "repos/RBloomDev/rodrigobermejo-site/actions/runs?per_page=100" \
  --jq '.workflow_runs[] | [.created_at[0:7], .conclusion,
        ((.updated_at|fromdate) - (.run_started_at|fromdate))] | @tsv' > runs.tsv
awk -F'\t' '{n[$1]++; s[$1]+=$3} END {for (m in n) printf "%s n=%d seg=%d min=%.1f\n", m,n[m],s[m],s[m]/60}' runs.tsv | sort
#   2026-08  n=41  seg=1570  min=26.2
#   2026-09  n=33  seg=1315  min=21.9
cut -f2 runs.tsv | sort | uniq -c
#   69 success · 3 skipped · 2 failure
```

Totales de ejecuciones por repo:

```bash
gh api "repos/{REPO}/actions/runs?per_page=1" --jq '.total_count'
# rodrigobermejo-site 74 · rbloom-automation 37 · proof-engine 36 · habit-tracker 3 · rbloom-os 0
```

**Interpretación — esta es la única fuente de duración que existe hoy en todo el sistema.**
48.1 minutos de CI acumulados en dos meses. Hay que decir con precisión qué es y qué no es:

- La unidad es **minutos de ejecución de máquina**, no de persona.
- Es **duración acumulada**, no **tiempo transcurrido**: los 26.2 minutos de agosto se
  reparten en 41 corridas a lo largo del mes. Mostrarlos como «26 minutos en agosto» sería
  la confusión exacta que `decisions/0015` §3.3 prohíbe.
- **No se suma con nada más**, y desde luego no con horas humanas.
- Es un dato del **método**, no del sujeto: es una declaración de proceso en el sentido de
  `decisions/0015`, no una métrica de evidencia.

---

#### M-13 — Procedencia de asistencia de IA, declarada en el commit

**Esto sí es un dato real y medible.** No es una estimación de cuánto trabajo hizo la IA:
es el conteo de commits que **declaran** haber sido asistidos.

```bash
git log --all --no-merges --grep="Co-Authored-By: Claude" -i --date=format:%Y-%m --pretty=%ad | sort | uniq -c
#   41 2026-08
#    9 2026-09
git log --all --no-merges --pretty=%H | sort -u | wc -l
#   56
git log --all --no-merges --grep="Generated with" -i --pretty=%H | wc -l
#   0
```

```bash
gh api --paginate "repos/{REPO}/commits?per_page=100" \
  --jq '.[] | select(.commit.message|test("Co-Authored-By";"i")) | .commit.author.date[0:7]' | sort | uniq -c
```

| Repo | Commits con trailer | Base sin merges | Proporción | Reparto |
|---|---|---|---|---|
| `RBloomDev/rodrigobermejo-site` (todas las ramas) | **50** | 56 | 89 % | 2026-08:41 · 2026-09:9 |
| `rodrigoBermejo/habit-tracker` | **41** | 43 | 95 % | 2026-05:24 · 2026-06:17 |
| `rodrigoBermejo/proof-engine` | **12** | 12 | 100 % | 2026-08:12 |
| `RBloomDev/rbloom-automation` | **5** | 24 | 21 % | 2026-03:5 |
| `RBloomDev/rbloom-os` | **0** | 13 | 0 % | — |

**Interpretación, y el límite hay que decirlo fuerte. Esto es procedencia declarada, no
productividad.** Mide cuántos commits **dicen** haber sido asistidos. No mide cuánto del
código escribió el modelo, no mide calidad, y no autoriza ningún porcentaje de «trabajo
hecho por IA» — `decisions/0015` §3 lo prohíbe por nombre y este catálogo no lo calcula.

La proporción es además **un artefacto de configuración, no de método**: `rbloom-os` marca
0 % no porque ahí no se usara IA, sino porque en abril de 2026 el trailer no estaba
configurado. Un número que sube cuando cambias un ajuste de la herramienta no describe el
trabajo. La serie es comparable **dentro** de un repo a partir de que el trailer existe, y
no lo es entre repos.

`docs/02` §8 ya había decidido la forma correcta y `decisions/0015` §4-B la adelanta:
`provider_id` como valor, **el vínculo y nunca el contenido**, sin tokens y sin tool calls.
Este conteo cabe ahí. **PUB como procedencia. Nunca como métrica de rendimiento.**

---

#### M-14 — Commits con identidad de agente como autor

```bash
gh api --paginate "repos/RBloomDev/rbloom-automation/commits?per_page=100" \
  --jq '.[] | select(.commit.author.name=="Nova (RBloom AI)")
        | [.commit.author.date[0:10], .commit.author.email, (.commit.message|split("\n")[0])] | @tsv'
#   2026-03-10  nova@rbloom.dev  refactor: 03-agendado usa SW-actualizar-contacto …
#   … 16 commits, todos entre 2026-03-09 y 2026-03-10
```

| Repo | Commits de identidad no humana | Identidad | Periodo |
|---|---|---|---|
| `RBloomDev/rbloom-automation` | **16** de 40 registros (24 sin merges) | `Nova (RBloom AI)` · `nova@rbloom.dev` | 2026-03 |
| `Inadaptados/SSP` | **3** de 484 sin merges | `Nova (RBloom AI)` | — |

**Interpretación.** Es la aplicación práctica de `decisions/0008 — independent identity for
automation`: hay una identidad de git separada para el trabajo automatizado, y por eso se
puede contar. Es el registro de agentes **más cercano a real** que existe hoy en todo el
sistema.

**Y aun así no es lo que Rodrigo pidió.** Pidió *ejecuciones de agentes*. Esto cuenta
**commits atribuidos a una identidad de agente** — no cuántas veces corrió un agente, no
cuánto duró, no qué hizo cuando no commiteó nada. Diecinueve commits en dos días de marzo
no son diecinueve ejecuciones. **DEC:** si se muestra, se rotula como «commits con autoría
de agente» y nunca como «ejecuciones».

---

### B. Contenido producido

#### M-15 / M-16 — Piezas editoriales

```bash
ls content/posts/
#   cuando-excel-deja-de-funcionar.md
#   mitos-sobre-automatizacion.md
#   seguimiento-donde-mueren-las-ventas.md
for f in content/posts/*; do echo "$f $(wc -w < "$f") palabras $(wc -c < "$f") bytes"; done
#   content/posts/cuando-excel-deja-de-funcionar.md       283 palabras  1767 bytes
#   content/posts/mitos-sobre-automatizacion.md           295 palabras  1938 bytes
#   content/posts/seguimiento-donde-mueren-las-ventas.md  315 palabras  1985 bytes
ls -d content/*
#   content/posts        ← el único directorio de contenido
```

**Interpretación.** **Tres piezas, de 283 a 315 palabras.** Es el inventario completo: no
hay otro directorio de contenido en el repositorio. Para una «plataforma editorial»
(`decisions/0015` §4-G) esto es el punto de partida, no un acervo. Tres piezas de ~300
palabras llenan una pantalla de índice y nada más.

Las fechas de publicación **no** están en el sistema de archivos (todos los `mtime` son del
checkout del worktree, no de la escritura). Si la pieza no lleva fecha en su frontmatter,
la métrica «piezas por mes» no tiene fuente y no debe inventarse a partir del historial de
git — que es exactamente la inferencia que `decisions/0015` §3.1 prohíbe.

#### M-25 — Vídeos de YouTube: **no medible con lo disponible**

Dos intentos independientes, ambos sin API key:

```bash
curl -sL "https://www.youtube.com/@rodrigolbermejo" | grep -o '"externalId":"[^"]*"'
#   "externalId":"UCN47gPRCqnkxUfZbkLRxXrg"

curl -s "https://www.youtube.com/feeds/videos.xml?channel_id=UCN47gPRCqnkxUfZbkLRxXrg" | grep -c "<entry>"
#   0        ← el feed responde "Error 404 (Not Found)!!1"

curl -sL "https://www.youtube.com/channel/UCN47gPRCqnkxUfZbkLRxXrg/videos" -o ytv.html
wc -c < ytv.html                    # 802421
grep -o 'videoId' ytv.html | wc -l  # 0
grep -o '<title>[^<]*</title>' ytv.html
#   <title>Rodrigo Bermejo - Implementador técnico - YouTube</title>
```

**Interpretación honesta.** El canal existe y su id es `UCN47gPRCqnkxUfZbkLRxXrg`. La
página de vídeos devuelve 802 KB y **cero apariciones de `videoId`**; el feed RSS devuelve
404. Las dos lecturas son compatibles con «el canal no tiene vídeos públicos», pero también
con «YouTube no entrega el payload inicial a un cliente sin JavaScript».

**No pongo un número.** Poner `0` aquí sería exactamente el error que este documento existe
para no cometer: confundir un cero medido con un cero por falta de fuente. Se resuelve con
una API key de YouTube Data o abriendo el canal en un navegador — **DEC**.

---

### C. El feed de Proof of Work

#### M-17 / M-18 / M-19 / M-20 — Estado real hoy

```bash
cat public/proof/v1/meta.json
#   "generated_at": "2026-08-28T23:28:38Z",  "engine_version": "0.1.0",
#   "source_coverage": [],
#   "counts": { "projects": 12, "claims": 3, "evidence": 0 },
#   "unassigned_events": 0
ls public/proof/v1/
#   claims.json  evidence.json  meta.json  projects.json      ← NO hay activity.json
ls public/proof/schemas/
#   activity.schema.json  claims.schema.json  evidence.schema.json  meta.schema.json  projects.schema.json
cat public/proof/v1/evidence.json
#   { "schema_version": "1.0.0", "evidence": [] }
```

| | Valor | Lectura |
|---|---|---|
| Proyectos (M-17) | **12** | 9 `private`, 3 `public`, 0 `confidential` |
| Claims (M-18) | **3** | `construyo-sistemas`, `decido-arquitectura`, `ensino-y-mentoreo` |
| Evidencia (M-19) | **0** | **cero deliberado**: `decisions/0013` sigue en PROPUESTA |
| Buckets de actividad (M-20) | **no existe el archivo** | el schema existe; el artefacto no |
| `source_coverage` | **`[]`** | el motor **no declara haber ingerido ninguna fuente** |
| Antigüedad del feed | **16 días** | `generated_at` 2026-08-28 vs. hoy 2026-09-13 |

Los tres proyectos `public`: `docencia-universitaria`, `habit-tracker`, `proof-of-work`. Y
`docencia-universitaria` tiene `context: client`, así que **`public` no significa
publicable sin más**: `docs/03` §2 le exige `release` igual.

**El dato que más pesa: `source_coverage: []` con `counts.evidence: 0`.** El feed de hoy es
**íntegramente declarado**. Los tres claims traen `"provenance": "declared"` y
`"verifiability": "unverifiable"`, y sus `evidence_ids` están vacíos. Es decir: **ninguna
de las 2 901 commits que este documento midió ha entrado al sistema de evidencia.** No hay
un problema de medición; hay una tubería que no se ha conectado, lo cual es coherente con
`decisions/0011` (publicar lo declarado antes de ingerir).

**`activity.json` no existe, y su schema ya decide casi todo.** `activity.schema.json`
prohíbe explícitamente ocho campos, y cuatro de ellos son justo los que una pantalla de
actividad tiende a inventar:

```json
"allOf": [
  { "not": { "required": ["score"] } },        { "not": { "required": ["rank"] } },
  { "not": { "required": ["streak"] } },       { "not": { "required": ["lines_of_code"] } },
  { "not": { "required": ["tokens_used"] } },  { "not": { "required": ["agent_sessions"] } },
  { "not": { "required": ["tool_calls"] } },   { "not": { "required": ["hours"] } }
]
```

Y exige `claim_ids` **no vacío** en cada bucket. Con 3 claims declarados, **todo bucket de
actividad tiene que colgar de uno de esos tres**. Un mes de trabajo que no sostenga ninguna
de las tres afirmaciones **no se publica**. Esto acota el catálogo más que cualquier regla
de privacidad: `claude-config` (85 commits, el segundo repo más activo de septiembre) **no
tiene proyecto en el Registry** y por tanto hoy no puede entrar a ningún bucket.

---

## Vacíos

**De las siete cosas que Rodrigo pidió ver en pantalla, tres no tienen fuente en ningún
sistema al que este repositorio tenga acceso, y una cuarta no tiene ni un solo archivo
detrás.** No es que estén mal medidas: no existen. Ordenados por gravedad.

### 1. Tiempo humano registrado — **DATO INEXISTENTE**

Es el vacío más grave porque es el único irrecuperable hacia atrás: el tiempo de 2026 ya
pasó y nadie lo registró.

**Qué se buscó, y dónde:**

```bash
grep -ril -E "toggl|clockify|harvest|timesheet|time.?track|horas.?trabajad|hours_logged|time_spent|duration_min" . \
  --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" --include="*.yml" --include="*.yaml" \
  | grep -v node_modules
#   (sin resultados)
```

Tablero de Trello `Proof of Work — Backlog` (81 tarjetas, el backlog vivo del proyecto):

```
Campos expuestos por tarjeta, las 81:
  id · name · desc · url · webUrl · due · dueComplete · complete · startedAt
  lastActivityAt · closed · labels · members · list · checklists · comments
Campos personalizados definidos en el tablero:  ninguno
Ocurrencias de "estimación", "estimate", "horas", "story point", "spent":  0
Ocurrencias de "tiempo":  4, todas en prosa de descripciones, ninguna como campo
```

`due`, `startedAt` y `lastActivityAt` son **marcas de tiempo, no duraciones**. De ellas se
puede derivar cuánto tiempo estuvo abierta una tarjeta — y eso es **tiempo transcurrido**,
no tiempo trabajado. Derivar horas de ahí es precisamente lo que `decisions/0015` §3.1
prohíbe.

**Veredicto.** No hay Toggl, ni Clockify, ni hoja de horas, ni campo de estimación, ni
issue con estimación, ni nada en el repo. **Cualquier cifra de horas humanas que aparezca
en la pantalla sería inventada.** Se muestra como hueco declarado, y el texto dice por qué:
*no se registra*. Llenarlo requiere que Rodrigo empiece a registrar; ninguna medición lo
resuelve.

### 2. Ejecuciones de agentes — **DATO INEXISTENTE**

```bash
gh api repos/rodrigoBermejo/proof-engine/contents/ledger --jq '.[] | [.name,.type,.size] | @tsv'
#   .gitkeep   file   0          ← el ledger está vacío. Confirmado.
gh api repos/rodrigoBermejo/proof-engine/contents/ingest/sources/github --jq '.[] | [.name,.type,.size] | @tsv'
#   .gitkeep   file   0          ← tampoco hay fuentes de ingesta configuradas
```

Búsqueda en `rbloom-os`, el repo de orquestación de agentes:

```bash
gh api repos/RBloomDev/rbloom-os/contents/agents  --jq '.[] | [.name,.type] | @tsv'
#   bd-agent · client-success-agent · code-review-agent · dev-agent
#   marketing-agent · ops-agent · tech-consultant-agent        ← 7 definiciones, 0 corridas
gh api repos/RBloomDev/rbloom-os/contents/memory --jq '.[] | [.name,.size] | @tsv'
#   .heartbeat-log  118      ← UNA línea, de hace cinco meses
#   2026-04-02-onboarding-setup.md  2026-04-02-posible-review.md
#   2026-04-02-session-kickoff.md   2026-04-02.md   2026-04-03.md
gh api repos/RBloomDev/rbloom-os/contents/memory/.heartbeat-log --jq '.content' | base64 -d
#   2026-04-03T18:25:12Z - Heartbeat check: memoria organizada (106 líneas MEMORY.md, …)
gh api "search/code?q=repo:RBloomDev/rbloom-os+filename:*.jsonl" --jq '.total_count'
#   0
```

**Veredicto.** Siete agentes **definidos**, cero corridas registradas. El `.heartbeat-log`
tiene **una entrada, del 2026-04-03**, y cinco notas de sesión de dos días de abril. Eso no
es un ledger: es el residuo de una semana de trabajo de hace cinco meses. **Ni el número de
ejecuciones (M-22) ni su duración (M-23) tienen fuente.**

Lo único real y contable en esta dirección es **M-14**, los 19 commits firmados por
`nova@rbloom.dev`, y ya se dijo por qué no es lo mismo.

### 3. Capturas y demos de productos — **cero medido, y es un cero real**

```bash
find . -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.webp" \
  -o -iname "*.gif" -o -iname "*.avif" -o -iname "*.svg" \) \
  -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./.next/*" | sort
#   ./public/icon.svg
#   ./public/images/icon-192.png
#   ./public/images/icon-512.png
#   ./public/images/placeholder.svg
#   ./public/images/profile.jpg
find . -type f \( -iname "*.mp4" -o -iname "*.webm" -o -iname "*.mov" \) -not -path "./node_modules/*"
#   (sin resultados)
```

**Veredicto.** Cinco imágenes en todo el repositorio: tres iconos de la app, un placeholder
y una foto de perfil. **Cero capturas de producto. Cero vídeos. Cero GIFs de demo.**

Esto es un **cero medido** — la búsqueda cubrió el 100 % del repositorio — y es el vacío
más barato de cerrar de los cuatro: son capturas, no infraestructura. Pero hoy la petición
de «presencia visual plena» (`decisions/0015` §4-F) **no tiene un solo activo que mostrar**,
y hay que decirlo antes de diseñar la pantalla, no después.

### 4. Detalle detrás de cada cifra — **bloqueado, no vacío**

`evidence.json` está vacío por decisión, no por falta de dato: `decisions/0013` sigue en
**PROPUESTA** y, mientras tanto, el motor aborta si llega evidencia al artefacto. Aquí sí
hay fuente potencial (2 901 commits medidos); lo que no hay es permiso.

---

## Lo prohibido: tres cosas que no son vacíos

Distinguirlas de los vacíos importa, porque un vacío se llena creando el registro y esto
no se llena nunca.

| Lo pedido / tentador | Por qué no entra | Dónde está la regla |
|---|---|---|
| **% de trabajo hecho por IA** | No existe denominador honesto. Sería el indicador que `00:65` prohíbe | `decisions/0015` §3, prohibición nueva |
| **Horas ahorradas** | Igual: exige un contrafactual que nadie midió | `decisions/0015` §3 |
| **Tokens consumidos** | Los tokens no son resultados | `activity.schema.json:60` · `decisions/0015` §2 |

También siguen prohibidos, permanentemente: `score`, `rank`, `streak`, `lines_of_code`,
`agent_sessions`, `tool_calls` y `hours` **como métrica** (`activity.schema.json`), y «no
existe un número que resuma a una persona» (`docs/02:482`).

---

## Cero vs desconocido

Un cero medido y un cero por falta de fuente se ven igual en una pantalla y significan lo
opuesto. Esta es la lista completa de lo que hoy vale cero, separada por su causa. **La
pantalla debe distinguirlos visualmente; si no puede, no muestra ninguno de los dos.**

### Ceros medidos — el número es cero y el cero es el dato

| Métrica | Valor | Qué significa realmente | Verificado con |
|---|---|---|---|
| M-07 Reviews emitidas por Rodrigo | **0** en 2026 | No revisa código ajeno en GitHub. Es un hecho sobre su modo de trabajo | GraphQL `totalPullRequestReviewContributions` |
| M-08 Releases | **0** en 5 repos | El flujo no usa releases de GitHub | `/releases` → `length` = 0 |
| M-09 Tags | **0** en 5 repos | No se etiquetan versiones | `/tags` → `length` = 0 |
| M-19 Evidencia en el feed | **0** | Cero **deliberado**: `decisions/0013` en PROPUESTA bloquea publicarla | `evidence.json` = `{"evidence": []}` |
| M-24 Capturas de producto | **0** | No existe ni una. Búsqueda sobre el 100 % del repo | `find` sobre todo el árbol |
| Reviews `APPROVED` en el sitio | **0** de 7 | Las 7 son `COMMENTED`, y del bot | `/pulls/{n}/reviews` |
| Ejecuciones de CI en `rbloom-os` | **0** | El repo no tiene workflows | `actions/runs` → `total_count` = 0 |
| `unassigned_events` en `meta.json` | **0** | Cero trivial: no se ha ingerido ningún evento que asignar | `meta.json` |

### Ceros por falta de fuente — **no son ceros, son huecos**

| Métrica | Se vería como | Pero significa | Por qué |
|---|---|---|---|
| M-21 Tiempo humano | `0 h` | **Nadie registra el tiempo** | Cero sistemas de registro; Trello sin campo |
| M-22 Ejecuciones de agentes | `0` | **Nadie registra las ejecuciones** | `ledger/` = un `.gitkeep` de 0 bytes |
| M-23 Duración de agentes | `0 min` | **No hay reloj que las mida** | misma causa que M-22 |
| M-20 Buckets de actividad | `0` | **El archivo no existe** | `activity.json` no está en `v1/` |
| M-25 Vídeos de YouTube | `0` | **La medición no concluyó** | Dos métodos sin API; ambos inconclusos |
| `source_coverage` en `meta.json` | `[]` | **El motor no ha ingerido nada** | `ingest/sources/github` = un `.gitkeep` |
| M-13 en `rbloom-os` | `0 %` asistido | **El trailer no estaba configurado** en abril | Artefacto de ajuste, no de método |

**El caso más peligroso de la tabla es el último**, porque no vale cero de forma obvia:
M-13 da 0 % en `rbloom-os`, 21 % en `rbloom-automation`, 100 % en `proof-engine`. Un
gráfico de esa serie contaría una historia de adopción creciente de IA que **no ocurrió**:
lo que cambió fue cuándo se activó el trailer. Es un cero por falta de fuente disfrazado de
medición.

---

## Cobertura

`docs/03` §3 regla 4 pide coarsening; nada pide declarar cobertura. `decisions/0015` §3.4
sí, y es la regla que más aprieta aquí: *«Un número de proceso sin decir qué fracción del
trabajo cubre miente por omisión. La cobertura se muestra junto al número, no en una nota
al pie.»* Este documento la trata como obligatoria para **toda** métrica, no solo las de
proceso.

### El número que hay que mirar primero

```bash
gh api graphql -f query='{ user(login:"rodrigoBermejo") { contributionsCollection(
  from:"2026-01-01T00:00:00Z", to:"2026-09-13T23:59:59Z") {
  totalCommitContributions totalPullRequestContributions
  totalPullRequestReviewContributions restrictedContributionsCount
  contributionCalendar { totalContributions } } } }'
#   totalCommitContributions:            137
#   totalPullRequestContributions:        29
#   totalPullRequestReviewContributions:   0
#   restrictedContributionsCount:      5 875
#   contributionCalendar.total:        6 046
```

**137 contribuciones de commit públicas contra 5 875 restringidas.** El **97.2 %** de la
actividad de GitHub de Rodrigo en 2026 ocurre en repositorios privados. (Precisión: el
calendario mezcla tipos de contribución; `totalCommitContributions` cuenta solo commits
públicos. La proporción es de contribuciones, no de commits — pero el orden de magnitud no
depende de esa distinción.)

Consecuencia para la pantalla: **casi todo lo que se muestre tendrá procedencia privada**,
y por tanto pasará por `docs/03` §3 completo. La superficie publicable sin agregación es
una fracción pequeña de lo que existe.

### Repos medidos contra repos accesibles

```bash
gh repo list Inadaptados      --limit 200 --json nameWithOwner --jq 'length'   #  96
gh repo list ISC-UPA          --limit 200 --json nameWithOwner --jq 'length'   #  59
gh repo list rodrigoBermejo   --limit 200 --json nameWithOwner --jq 'length'   #  50
gh repo list RBloomDev        --limit 200 --json nameWithOwner --jq 'length'   #  11
gh repo list TerracotaFloreria --limit 200 --json nameWithOwner --jq 'length'  #   2
gh api user/orgs --jq '.[].login'
#   ISC-UPA · Inadaptados · RBloomDev · TerracotaFloreria

# Archivados, en las cinco cuentas:
gh repo list {CUENTA} --limit 200 --json isArchived --jq '[.[]|select(.isArchived)]|length'
#   Inadaptados 0 · ISC-UPA 0 · rodrigoBermejo 0 · RBloomDev 0 · TerracotaFloreria 0
```

| | Repos |
|---|---|
| Accesibles con el token actual | **218** |
| Medidos en detalle en este documento | **12** (5.5 %) |
| Deliberadamente no medidos, `context: client` | **59** (`ISC-UPA`) |
| No medidos por alcance | **147** |

**El encargo nombraba cinco repos de dos organizaciones. Son 218 repos en cuatro
organizaciones más la cuenta personal, y las dos que faltaban —`Inadaptados` e `ISC-UPA`—
concentran la mayor parte del trabajo.** Se descubrió midiendo, no leyendo la lista:

```bash
gh api "search/commits?q=author:rodrigoBermejo+author-date:2026-01-01..2026-09-13&per_page=100&sort=author-date" \
  --jq '.items[].repository.full_name' | sort | uniq -c | sort -rn
#   41 Inadaptados/curricula-software-developer      ← no estaba en la lista del encargo
#   27 rodrigoBermejo/claude-config                  ← tampoco
#   24 Inadaptados/indptdos-lms                      ← tampoco
#    5 RBloomDev/rodrigobermejo-site
#    3 Inadaptados/diplomado-contenidos              ← tampoco
```

Para dimensionarlo: los cinco repos del encargo suman **120** commits sin merges.
`Inadaptados/indptdos-lms` solo, **1 585**. Una pantalla construida sobre los cinco repos
originales representaría el **4 %** de lo medido y presentaría como panorama lo que es una
esquina.

### Qué queda fuera y por qué

| Qué | Cuántos | Por qué |
|---|---|---|
| `ISC-UPA` | 59 repos | `context: client` → requiere `release` (`docs/03` §2). **No se midieron a propósito.** |
| Repos sin proyecto en el Registry | al menos `claude-config` (85 commits) | Sin proyecto no hay `claim_ids`, y sin `claim_ids` el bucket no existe |
| Trabajo fuera de GitHub | no cuantificable | Docencia presencial, n8n, contenido en Canva/HeyGen. No hay fuente y no se estima |
| Ramas distintas de la de defecto, en repos remotos | no medido | El API recorre la rama por defecto. En el único repo donde se midió el total, la diferencia fue **2×** |
| Repos archivados | 0 | Ninguno de los 218 está archivado |

---

## Qué haría falta para llenar los vacíos

Sin estimaciones de esfuerzo: solo qué registro tendría que existir. Ninguno de estos es
una decisión de este documento.

| Vacío | Qué crearía el dato | Recuperable hacia atrás |
|---|---|---|
| M-21 Tiempo humano | Un registro explícito de tiempo, con entrada manual | **No.** 2026 ya pasó |
| M-22/M-23 Agentes | Que el motor escriba en `ledger/` al terminar cada corrida | **No** |
| M-20 Actividad | Conectar `ingest/sources/github` y generar `activity.json` | **Sí**: los 2 901 commits siguen ahí |
| M-24 Capturas | Capturar las pantallas de los productos que ya corren | **Sí** |
| M-25 YouTube | Una API key de YouTube Data, o abrir el canal | **Sí** |
| M-02 dedup por autor | Una tabla de alias de identidades en el Registry | **Sí** |

---

## Riesgos de este catálogo

1. **Las cifras remotas son de rama por defecto y son un piso, no un total.** El único repo
   donde se midió el conjunto completo dio el doble. No se debe presentar ninguna como
   «total de commits».
2. **2 901 no es trabajo de Rodrigo.** En los dos repos grandes su fracción es ~68 %, y el
   filtro por autor todavía no existe en el motor.
3. **M-13 no es comparable entre repos**, por lo dicho arriba. Si se grafica sin ese aviso,
   miente.
4. **Nada de esto está conectado al motor.** `ingest/sources/github` está vacío y
   `source_coverage` es `[]`. Este documento midió con `gh` a mano; el motor todavía no
   mide nada. Que una cifra sea medible **no** significa que el feed pueda producirla hoy.
5. **`decisions/0015` está en PROPUESTA.** Mientras lo esté, las autorizaciones A–G no
   rigen y `activity.json` sigue siendo V1.1. Este catálogo describe qué se podría medir
   **si** se aprueba; no anticipa la aprobación.
6. **Ningún test protege las seis condiciones de `decisions/0015` §3.** La vía de abuso que
   ese ADR nombra —reetiquetar una métrica de evidencia como declaración de proceso para
   publicarla sin `claim_ids`— se vigila leyendo, no corriendo CI.

---

## Fuera de alcance, dicho explícitamente

- **El diseño de la pantalla.** Este documento dice qué hay; no dice cómo se ve.
- **La medición de `ISC-UPA`.** Por `docs/03` §2, no por olvido.
- **Cualquier cifra de suscriptores, visitantes o analítica web.** `docs/03` §4 declara esa
  frontera y no se cruza.
- **Los 147 repos no medidos.** El catálogo prioriza los repos con proyecto en el Registry.
  Ampliar la cobertura es trabajo, no es una decisión pendiente.
- **La tabla de alias de identidades.** Se identifica como necesaria; construirla es del
  motor.
