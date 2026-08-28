# Gate del corte vertical solo-declarado — 2026-08-28

`docs/06-roadmap.md`, fila **Sprint D**:

> Feed borrado → build verde. Feed corrupto → build rojo. Denylist en verde y
> falsada. Ningún `publish: none` en el artefacto.

Y `AGENTS.md` → *Principio de verificación* #4: **«Un gate debe demostrar que puede
fallar.»** Lo que sigue es salida de comando, no afirmación.

---

## Estado de partida: el artefacto real se genera y valida

```
$ npm run feed:build                                    # en el motor
Feed generado en C:\Users\Admin\Desktop\proof-engine\out\proof\v1
  11 proyecto(s), 3 claim(s), 0 evidencia(s).
  2 proyecto(s) no publicable(s), fuera del artefacto.
  digest: sha256:cc5f0637991ada6c505ff02c9f1d719f47e8aa65ade137c02a7369989f2441b0

  Esto NO ha publicado nada. Publicar es el merge a main, y lo hace Rodrigo.
EXIT=0
```

Y el artefacto **real** del motor contra los schemas **reales** publicados en el sitio —
los dos lados son los archivos que van a producción, no fixtures:

```
  OK   meta.json
  OK   projects.json
  OK   claims.json
  OK   evidence.json

  fuga de identificadores que no deben salir:
    limpio   docencia-isc-upa      limpio   TerracotaFloreria
    limpio   pos-terracota          limpio   proof-engine
    limpio   ISC-UPA                limpio   indptdos-lms
    limpio   camila-torres

  meta.counts cuadra: true
  G2 sobre el artefacto (referencias colgantes): 0
```

---

## Los cuatro criterios del gate

### 1 · Feed borrado → build **verde**

```
$ PROOF_FEED_DIR=<directorio-inexistente> npm run build
  ✓ Compiled successfully in 9.3s
  ├ ○ /evidencia
  ├ ○ /proyectos
  ├ ● /proyectos/[slug]
EXIT=0
```

Las rutas existen y renderizan una superficie editorial **sin afirmaciones**. No la
«vista solo-declarada» del plan original: eso era **lógicamente imposible**, porque las
declaraciones viven en `claims.json`. Sin feed no hay claims que mostrar salvo
duplicándolos en el código — la segunda fuente de verdad que el contrato existe para
evitar. Corregido en `decisions/0011`.

### 2 · Feed corrupto → build **rojo**

```
$ CORRUPCION: meta.counts.projects = 99, projects.json tiene 11
$ PROOF_FEED_DIR=<feed-corrupto> npm run build
  Error [FeedInvalidoError]: E_FEED_COUNTS projects
  > Build error occurred
EXIT=1
```

Este caso concreto importa más que los otros: un `meta.counts` que miente es
**sintácticamente perfecto** y valida contra todos los schemas por separado. Ningún JSON
Schema puede detectarlo, porque es una relación **entre archivos**.

Los otros nueve casos rojos están cubiertos por `tests/proof-feed.test.ts` y cada uno tiene
su propio test, no uno agregado:

| Caso | Regla |
|---|---|
| Directorio existe pero vacío | `E_FEED_DIR_VACIO` |
| `meta.json` de 0 bytes | `E_FEED_VACIO` |
| `meta.json` truncado | `E_FEED_JSON` |
| `meta.json` sin los otros tres | `E_FEED_INCOMPLETO` |
| Los otros tres sin `meta.json` | `E_FEED_PARCIAL` |
| `meta.counts` no cuadra | `E_FEED_COUNTS` |
| Claim que referencia un proyecto ausente | `E_FEED_G2` |
| Valor fuera del enum del contrato | `E_FEED_SCHEMA` |
| Fecha que no es fecha | `E_FEED_SCHEMA` |

**Se captura solo `ENOENT`.** El patrón cómodo —`try { } catch { return null }`— colapsa
todos esos casos en «ausente», y con él un JSON truncado da **build verde indistinguible
del estado legítimo**, que `docs/05` declara peor que fallar.

### 3 · El guard de fuga, falsado reproduciendo el bug real

No una denylist: **allowlist de mundo cerrado**. La mutación arrastra `sources[].ref` en la
proyección, que es la forma exacta del fallo que el guard existe para cazar:

```
$ python mutar-fuga.py romper
  MUTACION APLICADA: la proyeccion arrastra sources[].ref
$ npm run feed:build
  No se escribe nada: 43 valor(es) del artefacto no se derivan del Registry.
    [projects] "rodrigoBermejo/heygen-project"
    [projects] "Inadaptados/curricula-software-developer"
    [projects] "rodrigoBermejo/camila-torres-project"
    ...
EXIT=1
$ python mutar-fuga.py restaurar
$ npm run feed:build   EXIT=0
```

**43 refs de repositorios privados**, cazadas antes de escribir un solo byte. Los schemas
las habrían dejado pasar: la regla 3 del contrato prohíbe `additionalProperties: false`,
así que un campo filtrado valida perfecto.

Por qué no una denylist, y son tres razones **independientes**:

1. **La lista *es* el secreto.** Commitear `TerracotaFloreria`, `ISC-UPA`,
   `indptdos-lms` en el repositorio **público** del sitio publica la lista de clientes en
   texto plano, más legible que el propio feed.
2. **Pasa vacuamente** cuando no hay artefacto — justo en el primer publish.
3. **No cubre el vector real**, por lo del `additionalProperties`.

### 4 · Ningún `publish: none` en el artefacto

Sobre el Registry **real**, no una fixture:

```
$ python mutar.py romper        # se quita `public` de proof-of-work sources[1]
$ npm run validate
  [requerido:sources[1].public] falta 'sources[1].public'...
EXIT=1
$ python mutar.py restaurar     EXIT=0
```

Y en el artefacto generado: `docencia-isc-upa` y `pos-terracota` **no aparecen en ninguna
forma**, ni siquiera como texto. `ensino-y-mentoreo` sobrevive recortado a
`curricula-inadaptados` — sin marca, sin conteo, sin rastro del recorte, porque un
«2 proyectos ocultos» sería un dato atribuible en cuanto el conjunto fuera pequeño.

---

## Guards adicionales, todos falsados

### `guard:funnel` — ahora con dos entradas más

```
$ npm run guard:funnel
  OK: funnel desacoplado. 10 entradas, 34 modulos en el cierre transitivo.
```

`app/page.tsx` y `app/layout.tsx` entran como entradas: son lo que un visitante carga de
verdad, y hasta ahora el guard solo miraba los ocho componentes. Un import del feed en
`app/page.tsx` —que es donde más tentador resulta ponerlo, para «enseñar unos proyectos en
la home»— no lo veía nadie.

```
$ MUTACION: Hero.tsx importa lib/proof/feed
$ npm run guard:funnel
  ::error::El funnel alcanza el sistema de evidencia (lib/proof):
           app/page.tsx -> components/Hero.tsx -> lib/proof/feed.ts
  ::error::El funnel alcanza el sistema de evidencia (lib/proof):
           components/Hero.tsx -> lib/proof/feed.ts
EXIT=1
$ RESTAURADO   EXIT=0
```

La primera línea es la cobertura nueva funcionando: esa cadena antes no se reportaba.

### Paridad zod ↔ JSON Schema

Es la contrapartida de haber elegido `zod` sobre `ajv`. `ajv` contra los schemas publicados
eliminaba la divergencia por construcción; `zod` **puede** divergir, y se eligió igualmente
porque `ajv` no da tipos —`ajv.compile<Feed>()` es un cast que TypeScript se cree sin
comprobar, y ese fallo es **invisible** porque `typecheck` pasa igual.

Elegir la opción con un riesgo conocido obliga a cubrirlo, y no con disciplina:

```
$ MUTACION: zod gana un valor de enum que el JSON Schema no tiene
  ✖ los enums cerrados coinciden valor a valor
    claims.dimension diverge entre zod y el JSON Schema
  pass 72, fail 1
$ RESTAURADO   pass 73, fail 0
```

### Las fechas se comprueban de verdad

`format` en JSON Schema es una **anotación**, no una aserción, y este repositorio compila
con `strict: false` a propósito. Hasta este sprint, `format: "date-time"` no rechazaba
nada: un `start: "ayer"` validaba, y publicar **congela** el contrato `v1`.

```
$ MUTACION: quitado el pattern de timeframe.start
  ✖ timeframe RECHAZA lo que no es una fecha
  ✖ timeframe RECHAZA un instante
  pass 51, fail 2, EXIT=1
$ RESTAURADO   pass 53, fail 0, EXIT=0
```

### Determinismo

```
$ dos corridas identicas          -> diff -r: IDENTICAS
$ relojes distintos (2026 vs 2030) -> mismo digest, projects.json identico
```

Sin esto, el `publish-diff` arrancaría con una línea de ruido garantizada en `meta.json`,
que es el archivo que un humano lee primero. Ahí es donde se aprende a ignorar el diff, y
con él muere la revisión humana sobre la que descansa el modelo de privacidad
(`docs/03` §1.5).

### Registry vacío

```
$ mkdir -p /tmp/x/projects /tmp/x/claims && npm run feed:build /tmp/x
  Cero proyectos publicables: no se escribe nada.
    Causa: se leyo el Registry en '/tmp/x', con 0 proyecto(s) validos...
EXIT=1
```

Antes de este cambio, un Registry vacío **validaba en verde** (`0 proyecto(s), exit 0`).
Con `feed:build` encima, un `cwd` equivocado habría producido cuatro artefactos
**perfectamente válidos** que borran los once proyectos, con todo el pipeline en verde — y
la allowlist tampoco lo ve, porque comprueba que no aparezca lo que no debe, no que
aparezca algo.

---

## La corrida completa

```
motor:  typecheck  lint  test (119)  validate     -> EXIT=0
sitio:  typecheck  lint  test (73)   build  guard:funnel -> EXIT=0
```

---

## Lo que este gate NO demuestra

- **No hay evidencia.** `evidence.json` va vacío y los tres claims derivan a
  `declared`/`unverifiable`. Las reglas G3, G4 y G5 son **vacuamente ciertas** sobre este
  artefacto. Tienen tests con fixtures propias; sobre el feed real no se ejercen.
- **Los tres `statement` siguen en borrador.** `docs/02` §1: un claim lo escribe un humano.
  Mientras lleven esa marca, el sistema no tiene claims declarados del todo, y **este gate
  se cierra con esa deuda anotada, no disimulada**. El material para cerrarla está en
  `docs/statements-borrador.md`.
- **Nada se ha publicado.** `public/proof/v1/**` sigue vacío en este repositorio. El
  artefacto vive en `out/` del motor, que está en `.gitignore`. Publicar es el merge a
  `main`, y lo hace Rodrigo (`decisions/0010` y `0011`).
- **Los previews de Vercel siguen siendo públicos.** Verificado: HTTP 200 sin autenticar.
  Hasta que se active Deployment Protection, un PR que añada `public/proof/v1/**` expone
  esos archivos **antes** del merge, y el PR no es el control que `docs/03` §1.5 dice que
  es. Es el bloqueante `G1`, y es de Rodrigo.
