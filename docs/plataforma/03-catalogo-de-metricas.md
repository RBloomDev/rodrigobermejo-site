# 03 — Catálogo de métricas medidas

- **Estado:** **BORRADOR.** No autoriza publicar nada.
- **Fecha de medición:** 2026-09-13 · WakaTime resondeado el 2026-09-14
- **Depende de:** `docs/decisions/0015-actividad-proceso-y-editorial.md` (**ACEPTADA el 2026-09-15**)
- **Gobernado por:** `docs/03-privacy-and-publication-policy.md` §2 y §3 · `public/proof/schemas/activity.schema.json`
- **Autoridad:** este documento **no** es autoridad sobre nada. Mide. Si una cifra de aquí contradice a `docs/03` o al schema, manda el schema.

> **Qué es esto y qué no es.** Es el inventario de lo que hoy se puede medir de verdad para
> sostener una pantalla de actividad, con el comando y la salida real detrás de cada cifra.
> **No es una propuesta de pantalla y no es una autorización de publicación.**

> **Este repositorio es PÚBLICO.** Todo lo que se escriba aquí queda publicado por el hecho
> de escribirlo. Por eso este documento **no reproduce nombres de repositorios privados, ni
> conteos atribuidos a una organización, ni series mensuales de actividad privada, ni el
> reparto público/privado, ni la composición de autoría de ningún repositorio no público.**
> Las cifras que sí aparecen proceden de **repositorios públicos**, del **feed público**, o
> son **agregados que pasan la prueba de dominancia** de §Permiso. Lo retirado se describe
> en §Decisiones pendientes, sin reproducirlo. La compuerta que lo verifica es
> `node scripts/auditoria-exposicion.mjs`.

---

## Resumen

| | Métricas |
|---|---|
| **Total catalogado (M-01 a M-25)** | **25** |
| Con fuente real, medidas hoy | **21** |
| — de esas, **publicables hoy** tal cual (`PUB`) | 15 |
| — de esas, **publicables solo agregadas** (`AGR`) | 1 |
| — de esas, **fuera del permiso de publicación** vigente (`NO` / `DEC`) | 5 |
| Con fuente pero **sin artefacto**: el archivo no existe | **1** |
| **Sin fuente: DATO INEXISTENTE** | **2** |
| No medibles con las herramientas disponibles | **1** |

Las **tres prohibidas por contrato** (% de trabajo hecho por IA, horas ahorradas, tokens
consumidos) **no se cuentan entre las 25**: están fuera de la tabla a propósito, no por
falta de dato. Ver §Lo prohibido.

**Los huecos que importan, en una línea:** no existe registro de ejecuciones de agentes, ni
de su duración, y no existe una sola captura de producto en el repositorio. Ninguno se
puede llenar midiendo mejor; hay que crear el registro.

**Lo que cambió desde la medición anterior:** el tiempo humano **ya no es un hueco.** Hay
una fuente real y con credencial configurada (WakaTime), y eso mueve M-21 de DATO
INEXISTENTE a métrica medida con cobertura parcial. Ver §M-21.

**El hallazgo que más cambia el alcance** no es un hueco sino una cobertura: la mayor parte
de la actividad de GitHub de 2026 ocurre en repositorios no públicos, y la lista de repos
del encargo omitía organizaciones enteras donde vive la mayor parte del trabajo. La
consecuencia es más restrictiva de lo que parecía: **de GitHub, hoy solo son publicables las
cifras que provienen de repositorios públicos.** Ver §Cobertura y §Permiso.

---

## Método

### Fecha y herramientas

Todo se midió el **2026-09-13** desde el worktree
`C:/Users/Admin/Desktop/rodrigobermejo-plataforma`, con `gh` autenticado como
`rodrigoBermejo` (scopes `gist`, `read:org`, `repo`) y `git` local. WakaTime se sondeó el
**2026-09-14** con `scripts/editorial/sonda-wakatime.mjs`. Cada cifra de este documento trae
su comando. **No hay ninguna cifra sin comando.**

Los comandos se conservan íntegros **también donde se retiró la cifra**: un `gh api` sin el
nombre del repositorio sigue siendo metodología reproducible por quien tenga el acceso.

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
4. **La identidad del autor no se da por buena.** `git` no dedupica personas: se midieron
   dos grafías distintas de un mismo colaborador y una configuración de `git config` rota
   que produce un autor fantasma. Cualquier conteo *por autor* necesita una tabla de alias
   que hoy **no existe** en ningún repo. Ver M-02.

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

- **No se deduce tiempo humano de commits, de mensajes ni de sesiones de editor.** Con
  registro explícito el número existe; sin él, el hueco se muestra como hueco. WakaTime es
  registro explícito de actividad en el editor: no es una deducción a partir de commits.
- **No se suman horas humanas con duración de ejecuciones de agentes.** Unidades distintas
  de cosas distintas.
- **Duración acumulada ≠ tiempo transcurrido**, y la unidad va declarada siempre.
- **Prohibido derivar «% de trabajo hecho por IA» y «horas ahorradas».** No hay denominador
  honesto — y que ahora exista una fuente de horas **no** crea uno: ver §Lo prohibido.
- **Los tokens no son resultados.** `tokens_used` sigue prohibido en cualquier clase.
- **Un cero medido y un cero por falta de fuente se separan siempre.** Ver §Cero vs desconocido.

---

## Permiso: la prueba que decide qué se publica

`Permiso` usa cuatro valores: **PUB** (publicable) · **AGR** (publicable solo agregada,
bajo `docs/03` §3) · **NO** (no publicable) · **DEC** (requiere decisión de Rodrigo).

**Corrección de fondo respecto de la entrega anterior.** Aquella sostenía que un agregado
era publicable *«porque combina organizaciones»*. **Eso es falso.** Combinar sujetos no basta:
si **un solo sujeto aporta la mayor parte del total**, el total es un proxy de ese sujeto y
publicarlo es publicarlo a él con ruido encima. La prueba correcta tiene dos partes y hay
que pasar las dos:

1. **≥ 2 sujetos independientes** en el agregado (`docs/03` §3 regla 2), y
2. **ningún sujeto domina el agregado** — si lo domina, el agregado *es* ese sujeto.

Además, un agregado no debe poder **restarse** con otra cifra publicada para despejar el
volumen de un tercero (`docs/03` §3 regla 8).

Aplicada a lo medido, la prueba da dos resultados distintos, y por eso importa medirla en
vez de razonarla:

| Agregado | ≥ 2 sujetos | ¿Domina uno? | Resultado |
|---|---|---|---|
| Commits y PRs de GitHub, todos los contextos | sí | **sí, por mucho** | **NO publicable.** El total es proxy del sujeto dominante |
| Horas de actividad en el editor (M-21) | sí | **no** — el mayor queda por debajo de un cuarto del total, y por debajo de un sexto en la ventana larga | **AGR**, con condiciones (ver M-21) |

**Consecuencia para GitHub:** hoy solo son publicables las cifras que provienen de
**repositorios públicos**. Son las únicas que un tercero puede comprobar por su cuenta y las
únicas que no revelan volumen no publicado. Todo lo demás queda **NO** o **DEC**.

---

## Tabla maestra

Las siete columnas son obligatorias.

| # | Métrica | Significado | Unidad | Periodo | Fuente | Deduplicación | Cobertura | Permiso |
|---|---|---|---|---|---|---|---|---|
| M-01 | Commits, repos públicos | Cambios registrados en repos de proyectos `visibility: public` | commits | mes | GitHub API `/commits` | SHA único · sin merges · patch-id · rama declarada | los 2 repos públicos, al 100 % | **PUB** |
| M-02 | Commits, repos privados | Lo mismo, con procedencia privada | commits | mes o trimestre | GitHub API `/commits` | igual que M-01, **más** filtro por identidad de autor | parcial, varios repos no públicos | **NO** — el agregado no pasa la prueba de dominancia |
| M-03 | Commits en repos de `context: client` | Trabajo en repos de la universidad | commits | mes | GitHub API | igual que M-02 | **0 %** — no se midieron a propósito | **NO** sin `release` |
| M-04 | Pull requests abiertos | PRs creados | PRs | mes | `gh pr list --state all` | número de PR único por repo | los 2 repos públicos | **PUB** solo repos públicos · **NO** el resto |
| M-05 | Pull requests mergeados | PRs con `mergedAt` no nulo | PRs | mes | `gh pr list` | igual que M-04; un PR reabierto y remergeado cuenta una vez | los 2 repos públicos | **PUB** solo repos públicos · **NO** el resto |
| M-06 | Reviews **recibidas** | Reviews emitidas sobre PRs de Rodrigo | reviews | mes | `/pulls/{n}/reviews` | review única por id | repos medidos | **DEC** — ver M-06 |
| M-07 | Reviews **emitidas** por Rodrigo | Reviews que Rodrigo dejó en PRs ajenos | reviews | mes | GraphQL `contributionsCollection` | — | global, todos los repos | **PUB** (vale **cero medido**) |
| M-08 | Releases | Releases publicados en GitHub | releases | mes | `/releases` | id único | repos medidos | **PUB** (vale **cero medido**) |
| M-09 | Tags | Tags de versión | tags | mes | `/tags` | nombre único | repos medidos | **PUB** (vale **cero medido**) |
| M-10 | Deployments | Despliegues registrados por GitHub | deployments | mes | `/deployments` | id único; Preview y Production **no se suman** | 1 repo público, el único con deployments | **PUB** |
| M-11 | Ejecuciones de CI | Corridas de workflow | ejecuciones | mes | `/actions/runs` | `run id` único; un re-run cuenta aparte | repos con CI | **PUB** solo repo público · **NO** el resto |
| M-12 | Duración acumulada de CI | Suma de `updated_at − run_started_at` | **minutos de ejecución** (no tiempo transcurrido) | mes | `/actions/runs` | misma que M-11 | 1 repo público medido | **PUB** con la unidad declarada |
| M-13 | Commits con trailer de procedencia de IA | Commits que **declaran** asistencia con `Co-Authored-By: Claude` | commits | mes | mensajes de commit | subconjunto de M-01/M-02, misma dedup | repos medidos | **PUB** como **procedencia** y solo de repos públicos; nunca como métrica |
| M-14 | Commits con identidad de agente como autor | Commits cuyo `author` es una identidad no humana | commits | mes | campo `author.email` | misma dedup | repos no públicos | **DEC** — ver M-14 |
| M-15 | Piezas editoriales publicadas | Posts en `content/posts/` | piezas | mes | sistema de archivos | ruta única | 100 % de este repo público | **PUB** |
| M-16 | Extensión de las piezas | Palabras por pieza | palabras | por pieza | `wc -w` | — | 100 % de M-15 | **PUB** |
| M-17 | Proyectos en el feed | Registros en `projects.json` | proyectos | estado a la fecha | `public/proof/v1/projects.json` | `id` único | 100 % del feed público | **PUB** |
| M-18 | Claims en el feed | Afirmaciones declaradas | claims | estado a la fecha | `public/proof/v1/claims.json` | `id` único | 100 % del feed público | **PUB** |
| M-19 | Evidencia en el feed | Registros de `Evidence` publicados | registros | estado a la fecha | `public/proof/v1/evidence.json` | `id` único | 100 % del feed público | **NO** — `decisions/0013` ACEPTADA el 2026-09-15, pero sin implementar en el motor y sin ningún proyecto que lo declare |
| M-20 | Buckets de actividad | Agregados de `activity.json` | buckets | mes o trimestre | **no existe el archivo** | — | 0 % | **NO** — no hay artefacto |
| M-21 | **Tiempo con actividad en el editor** | Segundos con actividad registrada en un editor instrumentado | **segundos de actividad**, agregados por día | diario | **API de WakaTime** (`/users/current/summaries`) | la hace WakaTime: heartbeats agrupados con timeout de inactividad | **temporal alta** (28 de 31 días); **fracción del trabajo real: desconocida** | **AGR** — solo agregada, nunca por proyecto |
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

**Salidas reales.** Se midieron doce repositorios con este comando y este criterio. **Aquí
solo se reproducen los dos públicos**, que son los únicos que cualquiera puede recontar sin
credenciales y los únicos cuya publicación no revela volumen no publicado:

| Repo | Proyecto del Registry | Visib. | Sin merges | Reparto por mes |
|---|---|---|---|---|
| `rodrigoBermejo/habit-tracker` | `habit-tracker` | **público** | **43** | 2026-05:26 · 2026-06:17 |
| `RBloomDev/rodrigobermejo-site` | `proof-of-work` | **público** | **28** (`main`) | 2026-01:5 · 2026-08:21 · 2026-09:2 |

De los repositorios no públicos **no se reproduce ni el nombre, ni el conteo, ni el reparto
mensual, ni la suma**. Las cuatro cosas son la misma fuga por caminos distintos: el nombre
revela una línea de trabajo no publicada, y cualquiera de las otras tres revela su volumen.
Qué se hace con ese detalle está en §Decisiones pendientes.

**Interpretación, y tres advertencias que cambian el número:**

1. **El conteo de un repositorio no es «el trabajo de Rodrigo».** Son los commits del repo,
   de todos sus autores. En los repositorios con equipo, la fracción de Rodrigo es una
   **parte** del total, no el total — **y cuál es esa parte no se publica**: es composición
   de equipo de un proyecto no público. Publicar el conteo del repositorio como actividad
   suya le atribuiría trabajo de otras personas. Además choca de frente con `docs/03` §2: de
   un repo privado **nunca** se ingieren «identidades de otros colaboradores», así que el
   filtro por autor tiene que ocurrir en el motor, antes de agregar, y el resultado no puede
   nombrar a nadie más.

   ```bash
   # El comando existe y es reproducible; su salida NO se publica aquí.
   gh api --paginate "repos/{OWNER}/{REPO}/commits?per_page=100" \
     --jq '.[] | select((.parents|length)<2) | .commit.author.name' | sort | uniq -c | sort -rn
   ```

2. **La identidad de autor viene sucia.** En los repositorios con equipo se encontraron dos
   grafías del mismo colaborador contadas por separado y un autor fantasma producido por una
   configuración rota de `git config`. Sin tabla de alias, cualquier conteo por autor está
   mal. La tabla no existe hoy.

3. **Las cifras remotas son de rama por defecto y son un piso.** En el único repo donde se
   pudo medir el conjunto completo, el total real es **56**, no 28: el doble.

**Permiso, desglosado:**

- **M-01, repos públicos** (`rodrigobermejo-site` → `proof-of-work`; `habit-tracker` →
  `habit-tracker`, ambos `visibility: public`): procedencia pública, ya visible en GitHub.
  **PUB.** Las reglas 2 y 3 de `docs/03` §3 no aplican porque aplican «a todo dato con
  procedencia en fuente privada o confidencial».
- **M-02, repos privados: NO.** La entrega anterior lo marcaba **AGR** con el argumento de
  que un agregado que mezcle dos contextos de trabajo cubre «≥ 2 sujetos independientes» y
  cumple la regla 2. **Ese argumento era insuficiente y se retira.** Cubrir dos sujetos es
  necesario, no suficiente: un solo sujeto aporta la mayor parte de este agregado, y un
  agregado dominado por un sujeto es una publicación de ese sujeto con ruido encima. El
  coarsening mensual y el umbral k no lo arreglan — k cuenta eventos, no sujetos. Hasta que
  exista una decisión explícita de Rodrigo, **no se publica en ninguna forma, ni agregada.**
- **M-03, `context: client`: NO.** `docs/03` §2 es explícito: «Un proyecto con
  `context: client` requiere `release` incluso con `visibility: private`». El proyecto
  `docencia-universitaria` tiene `context: client` y **no tiene `release`**. Los repos de esa
  organización quedaron deliberadamente **sin medir** por esa razón.

---

#### M-04 / M-05 — Pull requests

```bash
gh pr list -R {REPO} --state all --limit 200 --json createdAt --jq '.[].createdAt[0:7]' | sort | uniq -c
gh pr list -R {REPO} --state all --limit 200 --json mergedAt \
  --jq '.[]|select(.mergedAt!=null)|.mergedAt[0:7]' | sort | uniq -c
```

Se midieron cinco repositorios. **Se reproducen los públicos:**

| Repo | Total | Abiertos por mes | Mergeados por mes | Estados |
|---|---|---|---|---|
| `RBloomDev/rodrigobermejo-site` | 24 | 2026-08:17 · 2026-09:7 | 2026-08:13 · 2026-09:5 | 18 MERGED · 3 CLOSED · 3 OPEN |
| `rodrigoBermejo/habit-tracker` | 3 | 2026-05:1 · 2026-06:2 | 2026-05:1 · 2026-06:2 | — |

**Interpretación.** Es la métrica más limpia del catálogo: un PR es una unidad natural, con
id estable y con dos fechas distintas bien definidas (creación y merge). Nótese que
**abiertos ≠ mergeados** y no deben mostrarse como si fueran lo mismo: en el sitio, 24
abiertos contra 18 mergeados; los 3 CLOSED son trabajo descartado, y mostrarlos como
entregas sería falso.

**El agregado de PRs de todos los contextos no se publica**, ni su total, ni su serie
mensual, ni su reparto. No porque sea un dato malo, sino porque no pasa la prueba de §Permiso:
un solo sujeto domina el agregado, así que el total lo describe a él. Y publicar el total
junto con la cifra del repositorio público permitiría despejar el resto por resta, que es
exactamente el cruce reidentificante de la regla 8.

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
# Mismo comando por repositorio. Solo se reproduce la salida de los públicos.
gh pr list -R {REPO} --state all --limit 200 --json reviews --jq '.[].reviews[]?.author.login' | sort | uniq -c
# rodrigobermejo-site   7  copilot-pull-request-reviewer
# habit-tracker         3  copilot-pull-request-reviewer
```

```bash
gh api graphql -f query='{ user(login:"rodrigoBermejo") { contributionsCollection(
  from:"2026-01-01T00:00:00Z", to:"2026-09-13T23:59:59Z") {
  totalPullRequestReviewContributions } } }'
# {"totalPullRequestReviewContributions":0}
```

**Interpretación, y es incómoda.** Todas las reviews de todos los repos medidos provienen
de **un solo emisor, y es un bot**: `copilot-pull-request-reviewer`. En el sitio, las siete
son `COMMENTED` — **ninguna es `APPROVED`**. Y las reviews emitidas por Rodrigo en 2026
son **cero**.

Consecuencias directas:

- **M-06 es DEC, no PUB.** Publicar un total de reviews sugiere revisión por pares y no la
  hubo. `docs/03` §3 lo dice para el caso general de gobernanza: «Un review de Claude o de
  Codex forma parte de la gobernanza del proyecto, pero **no cuenta como aprobación humana**
  y no debe presentarse como tal». Si la pantalla muestra reviews, tiene que decir que el
  emisor es automático — y entonces la cifra deja de decir lo que el visitante cree que
  dice. Rodrigo decide si vale la pena mostrarla.
- **M-06 falla también la regla 2 de `docs/03` §3** en cualquier agregado privado: un solo
  emisor es **un** sujeto, no dos. El umbral k=5 no lo arregla, porque k cuenta eventos y
  no sujetos. Es el mismo fallo de dominancia de §Permiso, en su forma más extrema.
- **M-07 vale cero, y es un cero medido.** Es un dato real sobre el modo de trabajo —
  Rodrigo no revisa código ajeno en GitHub —, no un fallo de medición.

---

#### M-08 / M-09 — Releases y tags

```bash
gh api repos/{REPO}/releases --jq 'length'   # 0 en todos los repos medidos
gh api repos/{REPO}/tags     --jq 'length'   # 0 en todos los repos medidos
```

| Repo | Releases | Tags |
|---|---|---|
| `RBloomDev/rodrigobermejo-site` | 0 | 0 |
| `rodrigoBermejo/habit-tracker` | 0 | 0 |
| Resto de repositorios medidos | 0 | 0 |

**Interpretación.** **Cero medido**, en todos. `activity.schema.json` exige `releases`
como entero obligatorio en cada bucket, así que el campo existirá siempre y siempre valdrá
`0` mientras no se etiquete nada. No es un hueco de medición: es que este flujo de trabajo
no usa releases. Decirlo es más honesto que omitir el campo. Un cero no revela volumen, y
por eso este sí se publica aunque cubra también repositorios no públicos.

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
2026-08:3 · 2026-09:2. Todo esto es del repositorio público del sitio.

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

Totales de ejecuciones por repo — el comando corre igual en todos; **se reproduce la salida
de los públicos**:

```bash
gh api "repos/{REPO}/actions/runs?per_page=1" --jq '.total_count'
# rodrigobermejo-site 74 · habit-tracker 3
```

**Interpretación — esta es la única fuente de duración de máquina que existe hoy.**
48.1 minutos de CI acumulados en dos meses, en el repositorio público. Hay que decir con
precisión qué es y qué no es:

- La unidad es **minutos de ejecución de máquina**, no de persona.
- Es **duración acumulada**, no **tiempo transcurrido**: los 26.2 minutos de agosto se
  reparten en 41 corridas a lo largo del mes. Mostrarlos como «26 minutos en agosto» sería
  la confusión exacta que `decisions/0015` §3.3 prohíbe.
- **No se suma con nada más**, y desde luego no con horas humanas ni con M-21.
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

**Interpretación, y el límite hay que decirlo fuerte. Esto es procedencia declarada, no
productividad.** Mide cuántos commits **dicen** haber sido asistidos. No mide cuánto del
código escribió el modelo, no mide calidad, y no autoriza ningún porcentaje de «trabajo
hecho por IA» — `decisions/0015` §3 lo prohíbe por nombre y este catálogo no lo calcula.

La proporción es además **un artefacto de configuración, no de método**. Se midió también en
repositorios no públicos, y ahí la proporción va de **0 % a 100 %** según el repositorio —
no porque en unos se usara IA y en otros no, sino porque el trailer se activó en momentos
distintos. En el que marca 0 %, la convención simplemente no existía todavía en la fecha de
esos commits. Un número que sube cuando cambias un ajuste de la herramienta no describe el
trabajo. La serie es comparable **dentro** de un repo a partir de que el trailer existe, y
no lo es entre repos. (Las proporciones de los repositorios no públicos se describen aquí
sin su base de commits: la base sería su volumen.)

`docs/02` §8 ya había decidido la forma correcta y `decisions/0015` §4-B la adelanta:
`provider_id` como valor, **el vínculo y nunca el contenido**, sin tokens y sin tool calls.
Este conteo cabe ahí. **PUB como procedencia, y solo con cifras de repositorios públicos.
Nunca como métrica de rendimiento.**

---

#### M-14 — Commits con identidad de agente como autor

```bash
gh api --paginate "repos/{OWNER}/{REPO}/commits?per_page=100" \
  --jq '.[] | select(.commit.author.name==$identidad)
        | [.commit.author.date[0:10], (.commit.message|split("\n")[0])] | @tsv'
```

Se encontró **una identidad de git no humana** —una cuenta de automatización, no una
persona— con commits en dos repositorios no públicos, concentrados en dos días de marzo de
2026. **Ni los repositorios, ni la identidad, ni los conteos se reproducen aquí**: los
primeros son nombres privados y los últimos son volumen de repositorios no públicos.

**Interpretación.** Es la aplicación práctica de `decisions/0008 — independent identity for
automation`: hay una identidad de git separada para el trabajo automatizado, y por eso se
puede contar. Es el registro de agentes **más cercano a real** que existe hoy en todo el
sistema.

**Y aun así no es lo que Rodrigo pidió.** Pidió *ejecuciones de agentes*. Esto cuenta
**commits atribuidos a una identidad de agente** — no cuántas veces corrió un agente, no
cuánto duró, no qué hizo cuando no commiteó nada. Un puñado de commits en dos días no son
ese mismo número de ejecuciones. **DEC:** si algún día se muestra, se rotula como «commits
con autoría de agente» y nunca como «ejecuciones».

---

### B. Tiempo humano

#### M-21 — Tiempo con actividad en un editor instrumentado

**Esto cambió.** La medición del 2026-09-13 declaró el tiempo humano como DATO INEXISTENTE
porque buscó hojas de horas, campos de estimación y trackers dentro de los repositorios y en
Trello, y no encontró ninguno (§Qué se buscó y no estaba). **Faltaba mirar fuera del
repositorio:** hay una cuenta de WakaTime con credencial configurada en `~/.wakatime.cfg`.
El hueco era del método de búsqueda, no del mundo. Queda registrado como error de medición.

**Comando:**

```bash
node scripts/editorial/sonda-wakatime.mjs --dias 30
```

La sonda **no imprime la clave** (la lee de `~/.wakatime.cfg` y la pasa por stdin de `curl`,
nunca por línea de comandos) y **seudonimiza los nombres de proyecto** con un hash, porque
los nombres de proyecto de WakaTime **son** nombres de repositorios. Salida del 2026-09-14,
ventana de 30 días:

| Campo | Ventana de 30 días | Ventana de 90 días |
|---|---|---|
| `horas_totales` | **145.7 h** | **516 h** |
| `dias_con_dato` | **28 de 31** | **82 de 91** |
| `unidad` | segundos de actividad, agregados por día | igual |
| `zona_horaria` | `America/Mexico_City` | igual |
| `dominancia_del_mayor` | **24 %** | **15.8 %** |

Las dos ventanas se midieron con el mismo comando, cambiando `--dias`. **El prototipo
publica la de 90 días**; este catálogo conserva las dos porque la dominancia cambia con la
ventana y esa es justamente la cifra que decide el permiso: cuanto más larga la ventana,
más se reparte el total y menos se parece a un solo sujeto.

Los conteos de proyectos, lenguajes y editores distintos **no se reproducen**: el de
proyectos es un proxy del número de repositorios en los que trabaja, y ese número es
justamente una de las cosas que este documento no publica.

**Las siete columnas, explícitas:**

- **Significado:** segundos con actividad registrada en un editor instrumentado.
- **Unidad:** segundos de actividad, agregados por día. Se muestran en horas por legibilidad,
  con la unidad declarada.
- **Periodo:** diario. La API entrega un registro por día natural, en la zona horaria de la
  cuenta.
- **Fuente:** API de WakaTime, `/users/current/summaries`. Registro explícito, no inferencia.
- **Deduplicación:** la hace WakaTime. Agrupa *heartbeats* del editor en intervalos y cierra
  el intervalo con un **timeout de inactividad**; dos editores abiertos a la vez no suman el
  doble del mismo minuto.
- **Cobertura:** ver abajo — son **dos** coberturas distintas y confundirlas es el error.
- **Permiso:** **AGR**, con dos condiciones. Ver abajo.

**Qué mide y qué NO mide. Es fácil exagerarla y por eso va escrito:**

Mide **tiempo con actividad en un editor instrumentado**. Eso **no** es «horas trabajadas» y
**tampoco** es «tiempo con el editor abierto»: el timeout de inactividad corta el intervalo
cuando nadie teclea. Concretamente, **no cubre**:

- reuniones, llamadas, sesiones con alumnos;
- diseño, lectura, investigación, redacción fuera del editor;
- docencia presencial;
- trabajo en una máquina o en un editor sin el plugin instalado;
- el tiempo en que un agente trabaja y no hay actividad humana.

**Cobertura temporal ≠ cobertura del trabajo.** Son dos cosas y solo una está medida:

| | Qué dice | Valor |
|---|---|---|
| **Cobertura temporal** | qué fracción de los días de la ventana tienen registro | **28 de 31 días.** Alta, y medida |
| **Cobertura del trabajo** | qué fracción del trabajo real cae dentro del editor | **Desconocida** |

La segunda **no se puede derivar** de la primera ni de ninguna otra cifra de este documento:
haría falta una referencia externa —un registro independiente del tiempo total— que no
existe. **Y no se estima.** Presentar 145.7 h como «las horas que trabajó» sería exactamente
el salto que este documento existe para no dar.

**Permiso: AGR, y por una razón medida, no por criterio.** A diferencia del agregado de PRs,
este **sí** pasa la prueba de §Permiso: el proyecto mayor aporta **24 %** del total en 30
días y **15.8 %** en 90, muy lejos de dominarlo, así que el agregado no es proxy de un solo
sujeto. Dos condiciones, ambas duras:

1. **Nunca por proyecto.** Los nombres de proyecto de WakaTime **son** nombres de
   repositorios, la mayoría no públicos. Un desglose por proyecto publica esos nombres y su
   volumen. Solo el agregado, y sin etiqueta de proyecto.
2. **Nunca sumada a la duración de ejecuciones de agentes** (M-23, que además no existe).
   Unidades distintas de cosas distintas: `decisions/0015` §3.2.

**Y nada de ratios.** Que ahora exista un denominador de horas hace *más* tentador —no menos
prohibido— derivar horas por commit, «horas ahorradas» o «% de trabajo hecho por IA».
Siguen prohibidos los tres, por `decisions/0015` §3 y por `activity.schema.json`, que
prohíbe `hours` **como métrica de resultado**. M-21 entra como **declaración de proceso**
con su cobertura al lado, o no entra.

**Lo que sigue sin existir:** un registro de tiempo **por proyecto publicable**, y cualquier
registro del tiempo fuera del editor. El primero está bloqueado por privacidad; el segundo,
porque nadie lo anota.

##### Qué se buscó y no estaba (la búsqueda original, que falló)

Se conserva porque explica por qué el hueco se declaró mal:

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
no tiempo trabajado. Derivar horas de ahí sigue prohibido por `decisions/0015` §3.1, y el
hecho de que ahora exista WakaTime no lo permite: son fuentes distintas y no se mezclan.

**La lección, que vale más que la cifra:** la búsqueda cubrió el repositorio y Trello, y
concluyó «no existe». La conclusión correcta era «no existe **aquí**». Un hueco declarado
sin decir dónde se buscó es un hueco a medio medir.

---

### C. Contenido producido

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

**Interpretación honesta.** El canal existe y es público. La página de vídeos devuelve 802 KB
y **cero apariciones de `videoId`**; el feed RSS devuelve 404. Las dos lecturas son
compatibles con «el canal no tiene vídeos públicos», pero también con «YouTube no entrega el
payload inicial a un cliente sin JavaScript».

**No pongo un número.** Poner `0` aquí sería exactamente el error que este documento existe
para no cometer: confundir un cero medido con un cero por falta de fuente. Se resuelve con
una API key de YouTube Data o abriendo el canal en un navegador — **DEC**.

---

### D. El feed de Proof of Work

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
| Evidencia (M-19) | **0** | **cero deliberado**: `decisions/0013` quedó ACEPTADA el 2026-09-15, pero autoriza el **mecanismo**, no una publicación — y el motor aún no lo implementa |
| Buckets de actividad (M-20) | **no existe el archivo** | el schema existe; el artefacto no |
| `source_coverage` | **`[]`** | el motor **no declara haber ingerido ninguna fuente** |
| Antigüedad del feed | **16 días** | `generated_at` 2026-08-28 vs. 2026-09-13 |

Todo lo anterior ya es público: es el contenido del feed publicado. Los tres proyectos
`public`: `docencia-universitaria`, `habit-tracker`, `proof-of-work`. Y
`docencia-universitaria` tiene `context: client`, así que **`public` no significa
publicable sin más**: `docs/03` §2 le exige `release` igual.

**El dato que más pesa: `source_coverage: []` con `counts.evidence: 0`.** El feed de hoy es
**íntegramente declarado**. Los tres claims traen `"provenance": "declared"` y
`"verifiability": "unverifiable"`, y sus `evidence_ids` están vacíos. Es decir: **ninguno de
los commits que este documento midió ha entrado al sistema de evidencia.** No hay un problema
de medición; hay una tubería que no se ha conectado, lo cual es coherente con
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
de privacidad: se midió al menos un repositorio con actividad reciente alta que **no tiene
proyecto en el Registry** y que, por tanto, hoy no puede entrar a ningún bucket — sin
proyecto no hay `claim_ids`, y sin `claim_ids` no hay bucket.

---

## Vacíos

**De las siete cosas que Rodrigo pidió ver en pantalla, dos no tienen fuente en ningún
sistema al que este repositorio tenga acceso, y una tercera no tiene ni un solo archivo
detrás.** No es que estén mal medidas: no existen. Ordenados por gravedad.

### 1. Ejecuciones de agentes y su duración — **DATO INEXISTENTE**

```bash
gh api repos/rodrigoBermejo/proof-engine/contents/ledger --jq '.[] | [.name,.type,.size] | @tsv'
#   .gitkeep   file   0          ← el ledger del motor de evidencia está vacío. Confirmado.
gh api repos/rodrigoBermejo/proof-engine/contents/ingest/sources/github --jq '.[] | [.name,.type,.size] | @tsv'
#   .gitkeep   file   0          ← tampoco hay fuentes de ingesta configuradas
```

Se buscó también en el repositorio de orquestación de agentes (no público, no se nombra). El
mismo patrón de comandos, sobre `contents/agents`, `contents/memory` y `search/code`:

```bash
gh api repos/{OWNER}/{REPO}/contents/agents --jq '.[] | [.name,.type] | @tsv'
gh api repos/{OWNER}/{REPO}/contents/memory --jq '.[] | [.name,.size] | @tsv'
gh api "search/code?q=repo:{OWNER}/{REPO}+filename:*.jsonl" --jq '.total_count'
#   0
```

**Veredicto.** Siete agentes **definidos**, cero corridas registradas. El `.heartbeat-log`
tiene **una entrada, del 2026-04-03**, y unas pocas notas de sesión de dos días de abril. Eso
no es un ledger: es el residuo de una semana de trabajo de hace cinco meses. **Ni el número
de ejecuciones (M-22) ni su duración (M-23) tienen fuente.**

Lo único real y contable en esta dirección es **M-14**, los commits firmados por la identidad
de automatización, y ya se dijo por qué no es lo mismo. **M-21 tampoco lo llena:** WakaTime
mide actividad humana en el editor, y el tiempo en que un agente trabaja sin actividad humana
queda fuera por construcción.

### 2. Capturas y demos de productos — **cero medido, y es un cero real**

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
más barato de cerrar: son capturas, no infraestructura. Pero hoy la petición de «presencia
visual plena» (`decisions/0015` §4-F) **no tiene un solo activo que mostrar**, y hay que
decirlo antes de diseñar la pantalla, no después.

### 3. Detalle detrás de cada cifra — **bloqueado, no vacío**

`evidence.json` está vacío porque el mecanismo autorizado por `decisions/0013`,
**ACEPTADA el 2026-09-15**, todavía no está implementado en el motor, que continúa
abortando si llega evidencia al artefacto. Aquí sí hay fuente potencial —los commits
medidos siguen existiendo— y ya hay permiso para el mecanismo; lo pendiente es
implementarlo, no una publicación concreta.

---

## Lo prohibido: tres cosas que no son vacíos

Distinguirlas de los vacíos importa, porque un vacío se llena creando el registro y esto
no se llena nunca.

| Lo pedido / tentador | Por qué no entra | Dónde está la regla |
|---|---|---|
| **% de trabajo hecho por IA** | No existe denominador honesto. Sería el indicador que `00:65` prohíbe | `decisions/0015` §3, prohibición nueva |
| **Horas ahorradas** | Igual: exige un contrafactual que nadie midió | `decisions/0015` §3 |
| **Tokens consumidos** | Los tokens no son resultados | `activity.schema.json:60` · `decisions/0015` §2 |

**Aviso nuevo, y es el riesgo del día.** Con M-21 ya existe una fuente de horas, y eso hace
**más tentadora** —no menos prohibida— la aritmética de dividir. Horas por commit, horas por
PR, horas «ahorradas», porcentaje de trabajo hecho por IA: los cuatro siguen prohibidos.
Tener numerador y denominador no convierte un cociente en un hecho: M-21 no cubre el trabajo
fuera del editor y los commits no miden esfuerzo, así que cualquier ratio entre ambos mide
sobre todo el sesgo de las dos fuentes.

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
| M-08 Releases | **0** en todos los repos medidos | El flujo no usa releases de GitHub | `/releases` → `length` = 0 |
| M-09 Tags | **0** en todos los repos medidos | No se etiquetan versiones | `/tags` → `length` = 0 |
| M-19 Evidencia en el feed | **0** | Cero **deliberado**: `decisions/0013` ACEPTADA el 2026-09-15 autoriza el mecanismo `publish_evidence`, no una publicación. Ningún proyecto lo declara y el motor aborta si llega evidencia | `evidence.json` = `{"evidence": []}` |
| M-24 Capturas de producto | **0** | No existe ni una. Búsqueda sobre el 100 % del repo | `find` sobre todo el árbol |
| Reviews `APPROVED` en el sitio | **0** de 7 | Las 7 son `COMMENTED`, y del bot | `/pulls/{n}/reviews` |
| Ejecuciones de CI en un repo sin workflows | **0** | El repo no tiene workflows definidos | `actions/runs` → `total_count` = 0 |
| `unassigned_events` en `meta.json` | **0** | Cero trivial: no se ha ingerido ningún evento que asignar | `meta.json` |

### Ceros por falta de fuente — **no son ceros, son huecos**

| Métrica | Se vería como | Pero significa | Por qué |
|---|---|---|---|
| M-22 Ejecuciones de agentes | `0` | **Nadie registra las ejecuciones** | `ledger/` = un `.gitkeep` de 0 bytes |
| M-23 Duración de agentes | `0 min` | **No hay reloj que las mida** | misma causa que M-22 |
| M-20 Buckets de actividad | `0` | **El archivo no existe** | `activity.json` no está en `v1/` |
| M-25 Vídeos de YouTube | `0` | **La medición no concluyó** | Dos métodos sin API; ambos inconclusos |
| `source_coverage` en `meta.json` | `[]` | **El motor no ha ingerido nada** | `ingest/sources/github` = un `.gitkeep` |
| M-21 días sin registro | `0 h` ese día | **Puede ser un día sin editor, no un día sin trabajo** | 28 de 31 días con dato; los otros 3 son desconocido |
| M-13 en el repo de menor adopción | `0 %` asistido | **El trailer no estaba configurado** en esa fecha | Artefacto de ajuste, no de método |

**El caso más peligroso de la tabla es el último**, porque no vale cero de forma obvia:
M-13 va de 0 % a 100 % según el repositorio. Un gráfico de esa serie contaría una historia
de adopción creciente de IA que **no ocurrió**: lo que cambió fue cuándo se activó el
trailer. Es un cero por falta de fuente disfrazado de medición.

**El segundo más peligroso es el de M-21.** Un día sin horas puede ser un día de descanso, un
día de clases presenciales o un día en otra máquina — y los tres se dibujan igual. Una tira
diaria de horas **no** debe pintar esos días como cero.

---

## Cobertura

`docs/03` §3 regla 4 pide coarsening; nada pide declarar cobertura. `decisions/0015` §3.4
sí, y es la regla que más aprieta aquí: *«Un número de proceso sin decir qué fracción del
trabajo cubre miente por omisión. La cobertura se muestra junto al número, no en una nota
al pie.»* Este documento la trata como obligatoria para **toda** métrica, no solo las de
proceso.

### Lo primero que hay que mirar

```bash
gh api graphql -f query='{ user(login:"rodrigoBermejo") { contributionsCollection(
  from:"2026-01-01T00:00:00Z", to:"2026-09-13T23:59:59Z") {
  totalCommitContributions totalPullRequestContributions
  totalPullRequestReviewContributions restrictedContributionsCount
  contributionCalendar { totalContributions } } } }'
```

La consulta separa las contribuciones visibles de las **restringidas**
(`restrictedContributionsCount`), y la mayor parte del trabajo de 2026 cae del lado
restringido. **No se publica el reparto entre las dos, ni su porcentaje, ni ninguno de los
dos sumandos**: conocer dos de esos tres números permite despejar el tercero, y el tercero es
el volumen de trabajo no publicado. Esa es la regla 8 de `docs/03` §3 aplicada al caso más
directo posible. La única cifra que sí se publica de esta consulta es
`totalPullRequestReviewContributions` = **0** (M-07), porque un cero no revela volumen.

Consecuencia para la pantalla: **casi todo lo que se muestre tendría procedencia privada**,
y por tanto pasaría por `docs/03` §3 completo, que hoy no supera. La superficie publicable de
GitHub es la de los repositorios públicos, y nada más.

### Repos medidos contra repos accesibles

```bash
# El comando es reproducible por quien tenga el token; su salida NO se publica aquí,
# porque un conteo de repositorios por organización atribuye volumen a esa organización.
gh repo list {CUENTA} --limit 200 --json nameWithOwner --jq 'length'
gh api user/orgs --jq '.[].login'
gh repo list {CUENTA} --limit 200 --json isArchived --jq '[.[]|select(.isArchived)]|length'
```

| | Repos |
|---|---|
| Medidos en detalle en este documento | **12** |
| — de esos, públicos y por tanto reproducibles aquí | **2** |
| Deliberadamente no medidos, `context: client` | toda una organización, sin medir a propósito |
| No medidos por alcance | el resto |
| Archivados entre los medidos | **0** |

**No se publican:** el número total de repositorios accesibles, el número de repositorios no
públicos, ni el conteo de repositorios de ninguna organización. Los tres son información
sobre trabajo no publicado, y los dos primeros se restan entre sí.

**El encargo nombraba cinco repositorios de dos organizaciones. Hay bastantes más, en más
organizaciones, y las que faltaban concentran la mayor parte del trabajo.** Se descubrió
midiendo, no leyendo la lista:

```bash
gh api "search/commits?q=author:rodrigoBermejo+author-date:2026-01-01..2026-09-13&per_page=100&sort=author-date" \
  --jq '.items[].repository.full_name' | sort | uniq -c | sort -rn
# Salida no reproducida: nombra repositorios no públicos y les atribuye un conteo.
```

De los repositorios con más actividad reciente, **la mayoría no estaba en la lista del
encargo**. Una pantalla construida solo sobre los cinco repositorios originales presentaría
como panorama lo que es una esquina — cuánta esquina exactamente es una cifra que también
queda fuera, porque es un cociente entre volumen medido y volumen total, y el total no se
publica.

### Qué queda fuera y por qué

| Qué | Por qué |
|---|---|
| Los repos de `context: client` | Requieren `release` (`docs/03` §2). **No se midieron a propósito.** |
| Repos sin proyecto en el Registry | Sin proyecto no hay `claim_ids`, y sin `claim_ids` el bucket no existe |
| Trabajo fuera de GitHub y fuera del editor | Docencia presencial, n8n, contenido en Canva/HeyGen. No hay fuente y no se estima. M-21 cubre solo la parte que ocurre en un editor instrumentado |
| Ramas distintas de la de defecto, en repos remotos | El API recorre la rama por defecto. En el único repo donde se midió el total, la diferencia fue **2×** |
| Repos archivados | Ninguno de los medidos está archivado |

---

## Qué haría falta para llenar los vacíos

Sin estimaciones de esfuerzo: solo qué registro tendría que existir. Ninguno de estos es
una decisión de este documento.

| Vacío | Qué crearía el dato | Recuperable hacia atrás |
|---|---|---|
| M-21 fuera del editor | Un registro explícito del tiempo que no pasa por el editor | **No** |
| M-21 historial largo | El plan de WakaTime limita la ventana de historial consultable | **Parcialmente** |
| M-22/M-23 Agentes | Que el motor escriba en `ledger/` al terminar cada corrida | **No** |
| M-20 Actividad | Conectar `ingest/sources/github` y generar `activity.json` | **Sí**: los commits siguen ahí |
| M-24 Capturas | Capturar las pantallas de los productos que ya corren | **Sí** |
| M-25 YouTube | Una API key de YouTube Data, o abrir el canal | **Sí** |
| M-02 dedup por autor | Una tabla de alias de identidades en el Registry | **Sí** |

---

## Decisiones pendientes para Rodrigo

Lo que se midió y **se retiró de este documento**, descrito sin reproducirlo. No se movió a
ningún otro archivo: no hay una ubicación privada autorizada, así que no se generó otra
copia. Si alguna de estas cosas debe conservarse, hace falta decidir **dónde** antes de
volver a escribirla.

1. **El detalle por repositorio de commits y PRs de los repositorios no públicos** — nombre,
   conteo sin merges y reparto mensual de cada uno, más la suma. Retirado por completo.
2. **La composición de autoría de los repositorios con equipo** — qué fracción de los commits
   es de Rodrigo y cuál de cada colaborador. Retirado: es información sobre terceros en un
   proyecto no público.
3. **El agregado de PRs de todos los contextos y su serie mensual.** La entrega anterior lo
   daba por publicable; §Permiso explica por qué no lo es. **Decisión pendiente:** si Rodrigo
   quiere publicar un agregado de GitHub, hace falta o bien una autorización explícita que
   asuma que el total describe sobre todo a un sujeto, o bien un recorte que pase la prueba
   de dominancia.
4. **El reparto entre actividad visible y restringida, y su porcentaje.** Retirado: los dos
   sumandos y el total se despejan entre sí.
5. **Los conteos de repositorios por organización, el total y el número de no públicos.**
   Retirados.
6. **El desglose por proyecto de las horas de M-21** y el número de proyectos distintos.
   Medidos y no publicados: los nombres de proyecto de WakaTime son nombres de repositorios.
7. **La identidad de automatización de M-14 y sus conteos.** Retirados.

---

## Riesgos de este catálogo

1. **Las cifras remotas son de rama por defecto y son un piso, no un total.** El único repo
   donde se midió el conjunto completo dio el doble. No se debe presentar ninguna como
   «total de commits».
2. **El conteo de un repositorio con equipo no es trabajo de Rodrigo**, y el filtro por autor
   todavía no existe en el motor. Cuánto le corresponde no se publica.
3. **M-13 no es comparable entre repos**, por lo dicho arriba. Si se grafica sin ese aviso,
   miente.
4. **M-21 se puede exagerar sin mentir explícitamente.** «145.7 horas de actividad en el
   editor en 30 días» es cierto y «145.7 horas de trabajo en 30 días» es falso. La distancia
   entre las dos frases son dos palabras. La cobertura va pegada al número o el número no
   sale.
5. **Nada de esto está conectado al motor.** `ingest/sources/github` está vacío y
   `source_coverage` es `[]`. Este documento midió con `gh` y con la sonda a mano; el motor
   todavía no mide nada. Que una cifra sea medible **no** significa que el feed pueda
   producirla hoy.
6. **`decisions/0015` fue ACEPTADA el 2026-09-15.** Las autorizaciones A–G rigen desde
   esa fecha y `activity.json` está autorizado en el alcance actual. El archivo todavía no
   existe en el artefacto y el motor no lo emite: alcance no es existencia.
7. **Ningún test protege las seis condiciones de `decisions/0015` §3.** La vía de abuso que
   ese ADR nombra —reetiquetar una métrica de evidencia como declaración de proceso para
   publicarla sin `claim_ids`— se vigila leyendo, no corriendo CI.
8. **La compuerta de exposición sí es automática, y es la única que lo es.**
   `node scripts/auditoria-exposicion.mjs` detecta nombres de repositorios no públicos y las
   seis clases de conteo que este documento no publica. Corre con `--lista` desde un archivo
   **fuera** del árbol: la lista de repositorios privados no vive en un repositorio público.

---

## Fuera de alcance, dicho explícitamente

- **El diseño de la pantalla.** Este documento dice qué hay; no dice cómo se ve.
- **La medición de los repos `context: client`.** Por `docs/03` §2, no por olvido.
- **Cualquier cifra de suscriptores, visitantes o analítica web.** `docs/03` §4 declara esa
  frontera y no se cruza.
- **Los repositorios no medidos.** El catálogo prioriza los repos con proyecto en el Registry.
  Ampliar la cobertura es trabajo, no es una decisión pendiente.
- **La tabla de alias de identidades.** Se identifica como necesaria; construirla es del
  motor.
- **Cualquier desglose de M-21 por proyecto.** Es una decisión de privacidad, no de alcance,
  y está en §Decisiones pendientes.
