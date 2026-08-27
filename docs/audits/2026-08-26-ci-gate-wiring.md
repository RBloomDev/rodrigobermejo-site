# Cableado del gate a CI: demostración sobre un pull request — 2026-08-26

`AGENTS.md` → *Principio de verificación* #4: **«Un gate debe demostrar que puede fallar.»**

`audits/2026-08-24-gate-falsability.md` demostró esa propiedad **en local**. Este documento demuestra la otra mitad, que es una afirmación distinta y no se sigue de la primera:

> Local rojo prueba que el gate **no está desconectado**. Solo CI rojo prueba que además está **cableado al pull request**.

Cierra la parte de CI del finding **P1-GATE-01** y el finding **P1-PROC-01** (`docs/06-roadmap.md`).

Ejecutado el 2026-08-26 sobre el **PR #2** (`chore/ci-gate-falsability` → `main`), rama cortada de `chore/proof-sprint-0` en `90cd88c`. El PR se **cerró sin mergear**: su valor es la historia, no el contenido.

## Por qué en una rama aparte y no en el PR de Sprint 0

Deliberado, y es una desviación de la formulación original de la tarea. Si el experimento se interrumpe a mitad, el entregable de Sprint 0 queda intacto. El workflow se dispara con `pull_request: branches: [main]`, así que el PR #2 ejerce **el mismo trigger y los mismos dos checks requeridos** que el PR #1. Lo que se demuestra es idéntico; lo que se arriesga, no.

---

## Qué exige el gate, literalmente

`docs/06-roadmap.md`, fila Sprint 0:

> CI corre `typecheck`/`lint`/`test`/`build` en cada PR **y falla ante un error de tipo introducido a propósito**

Las dos mitades se demuestran abajo. El probe A es **un error de tipo**, no una mutación cualquiera: la redacción del gate es específica y se respeta al pie de la letra.

## Diseño: dos probes, porque son dos status checks

El ruleset de `main` exige dos checks obligatorios, que son dos **jobs**. Dar uno por probado desde el otro sería inferencia, no evidencia — el mismo criterio de independencia que `audits/2026-08-24` aplicó a `build` frente a `typecheck`.

| Probe | Qué introduce | Job que debe caer | Aislamiento |
|---|---|---|---|
| **A** | `TS2322` en `lib/__gate_probe.ts` | `typecheck / lint / test / build` | El paso `Typecheck` corta antes de `Lint`/`Test`/`Build` |
| **B** | `process.stdout.write` en `app/api/__gate_probe.ts` | `privacy guard` | Pasa `typecheck` (exit 0) y `lint` (exit 0): la regla `no-console` es AST sobre `console` y no ve `process.stdout.write` |

El probe B está elegido para **no contaminar la señal**. Un `console.log` bajo `app/api/**` habría puesto rojos los dos jobs a la vez —la regla `no-console` también corre en el paso `Lint` del job `verify`— y entonces el rojo de `privacy guard` no habría probado nada por sí mismo.

---

## Estado de partida: PR #1 en verde

```
$ gh pr checks 1
privacy guard                      pass  29s
typecheck / lint / test / build    pass  32s

$ gh pr view 1 --json mergeable,mergeStateStatus
mergeable = MERGEABLE   mergeStateStatus = CLEAN
```

---

## Experimento A · un error de tipo deliberado pone rojo el job `verify` en CI

Comprobación local previa, para no gastar una corrida:

```
$ npm run typecheck
> tsc --noEmit
lib/__gate_probe.ts(4,14): error TS2322: Type 'string' is not assignable to type 'number'.
EXIT=2
```

Commit `c096183`, push, run **33023701613**
(https://github.com/RBloomDev/rodrigobermejo-site/actions/runs/33023701613):

```
X typecheck / lint / test / build in 23s (ID 98359968682)
  OK Set up job
  OK Run actions/checkout@v4
  OK Run actions/setup-node@v4
  OK Install
  X  Typecheck
  -  Lint
  -  Test
  -  Build

ANNOTATIONS
X Process completed with exit code 2.
  typecheck / lint / test / build: .github#10
X Type 'string' is not assignable to type 'number'.
  typecheck / lint / test / build: lib/__gate_probe.ts#4
```

```
JOB: typecheck / lint / test / build -> completed/failure
JOB: privacy guard                   -> completed/success
```

**Resultado.** El check requerido se publicó en **rojo sobre el PR**, con el error esperado y su exit code. El job `privacy guard` quedó **verde en la misma corrida**: los dos checks son señales independientes, no un único semáforo.

---

## Experimento B · el paso de escrituras a stdout pone rojo el job `privacy guard`

Comprobación local previa del aislamiento:

```
$ npm run typecheck   -> EXIT=0
$ npm run lint        -> EXIT=0
$ grep -rnE "process\.(stdout|stderr)\.write" app/api/
app/api/__gate_probe.ts:8:  process.stdout.write("probe");
```

Commit `9bc38d5` (revierte A y añade B), run **33023931448**
(https://github.com/RBloomDev/rodrigobermejo-site/actions/runs/33023931448):

```
  OK Install
  OK No console logging in PII routes (AST)
  X  No direct stdout/stderr writes in PII routes
  -  Funnel decoupled from evidence feed (transitive imports)

ANNOTATIONS
X Process completed with exit code 1.
  privacy guard: .github#11
X Escritura directa a stdout/stderr en una ruta que maneja PII.
  Ver docs/03-privacy-and-publication-policy.md
  privacy guard: .github#10
```

```
JOB: typecheck / lint / test / build -> completed/success
JOB: privacy guard                   -> completed/failure
```

**Doble resultado, y el segundo importa tanto como el primero.** El job de privacidad cayó por su propio paso. Y el job `verify` volvió a **verde sin intervención manual**, lo que demuestra que la reversión del probe A restauró el estado: un gate que se queda rojo después de revertir no sería un gate, sería un daño.

### Este experimento cierra un hueco que el audit del 2026-08-24 no cubría

Ese documento afirma en su §Cobertura que «no queda ningún gate sin demostración». Es **inexacto**: sus seis experimentos cubren `typecheck`, `lint`, `test`, `build`, `guard:funnel` y la regla ESLint `no-console`, pero **ninguno provoca el `exit 1` del paso de grep de escrituras a stdout/stderr** (comprobado: buscar `stdout` o `stderr` en ese audit no devuelve ninguna línea). Ese paso vive dentro de un check obligatorio, así que su verde nunca se había distinguido de «no está conectado» — y un `grep` sin match devuelve exit 1, que es justo el tipo de lógica que puede quedar verde por construcción. El probe B lo demuestra por primera vez.

---

## Restauración: los dos jobs en verde

Commit `5125bdc`, run **33024009140**
(https://github.com/RBloomDev/rodrigobermejo-site/actions/runs/33024009140):

```
$ gh run watch 33024009140 --exit-status
EXIT_RUN_WATCH=0

JOB: privacy guard                   -> completed/success
JOB: typecheck / lint / test / build -> completed/success
```

El experimento no deja residuo:

```
$ git diff --stat chore/proof-sprint-0
                                    (sin salida: árboles idénticos)
```

---

## Qué queda demostrado, y qué no

La distinción es el punto de este documento. **Un guard verde no es evidencia de que el invariante se cumpla, solo de que no se rompió por la vía que el guard cubre** (`docs/04-architecture.md` §4.1), y la falsabilidad no cambia eso: prueba que el guard está conectado, no que garantice más de lo tabulado ahí.

| Control | Falsado en local (24-ago) | Falsado en CI sobre un PR (26-ago) |
|---|---|---|
| `typecheck` | sí | **sí** (probe A, exit 2) |
| `lint` | sí | no |
| `test` | sí | no |
| `build` | sí (exit 66) | no |
| `guard:funnel` | sí (exit 1) | no |
| ESLint `no-console` en `app/api/**` | sí | no |
| grep de escrituras a stdout/stderr | **no** | **sí** (probe B, exit 1) |
| Job `typecheck / lint / test / build` como status check | n/a | **sí** |
| Job `privacy guard` como status check | n/a | **sí** |

**Lo que se afirma:** los **dos status checks obligatorios** del ruleset de `main` están cableados a la evaluación de un pull request y pueden publicarse en rojo de forma independiente. Y el gate literal del roadmap —«falla ante un error de tipo introducido a propósito»— está demostrado en CI.

**Lo que NO se afirma:** que cada paso individual dentro del job `verify` haya sido falsado en CI. Solo `Typecheck` lo fue. Los pasos `Lint`, `Test` y `Build` tienen demostración **local** (`audits/2026-08-24`) y ninguna en CI. Es una laguna conocida y acotada: son pasos secuenciales del mismo job, así que su fallo produce el mismo check rojo ya demostrado, pero eso es una **inferencia**, no un hecho observado. Se anota como tal en lugar de presentarla como cobertura.

---

## Hallazgo colateral: el workflow no existe en `main`

HECHO, comprobado con `git ls-tree -r origin/main --name-only` filtrando por `workflow` → sin resultados. `.github/workflows/ci.yml` vive **solo** en `chore/proof-sprint-0` y en las ramas cortadas de ella.

Consecuencia mientras Sprint 0 no se mergee, y es una propiedad del gate que conviene tener escrita: una rama cortada del `main` de hoy **no dispara CI**. Como el ruleset exige esos dos checks para mergear, un PR así quedaría bloqueado indefinidamente esperando checks que nunca se publican. No es un defecto del workflow: es el estado transitorio de un gate que llega en el mismo PR que protege. **Se resuelve al mergear el PR #1**, y es una razón concreta más para mergearlo antes de abrir cualquier otra rama.

Otro detalle observado, útil para quien repita esto: `gh pr checks --watch` terminó **antes** de que Actions registrara su primer check y reportó como completo un estado que solo contenía los checks de Vercel. La verificación fiable es `gh api .../actions/runs` o `gh run watch <id>`, no `gh pr checks` inmediatamente después de un push.
