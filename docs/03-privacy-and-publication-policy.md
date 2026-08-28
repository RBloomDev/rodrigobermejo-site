# 03 — Política de Privacidad y Publicación

> Documento normativo y de cumplimiento. **Cualquier cambio aquí lo decide Rodrigo explícitamente**, nunca un agente. (No confundir con aprobaciones de GitHub, que no se exigen: ver `04-architecture.md` §6.1.)
> Privacidad y publicación son un solo documento porque toda regla de publicación *es* una decisión de privacidad.

---

## 1. Principios

1. **Una sola vía de egreso.** El único camino por el que un dato sale del sistema es `public/proof/v1/*.json`. No hay otro: sin API, sin logs públicos, sin webhooks, sin exportaciones manuales.
2. **La redacción ocurre antes de escribir.** El motor redacta *antes* de generar el artefacto. El feed no puede contener un secreto porque el secreto nunca entra al archivo, no porque lo filtremos después.
3. **Allowlist, nunca denylist.** Un campo se publica porque está explícitamente permitido. Un campo nuevo, por defecto, no se publica.
4. **Metadata sobre contenido.** Ante la duda entre publicar un hecho estructurado y publicar texto, gana el hecho estructurado.
5. **El PR es el control.** Toda publicación pasa por un pull request revisable antes del merge. Nada llega al sitio sin ese paso.

---

## 2. Repos privados

De un repositorio privado se ingiere **solo metadata**. Nunca:

- contenidos de archivos
- diffs, patches, hunks
- mensajes de commit completos (solo el hecho de que existe un commit y su timestamp)
- títulos ni cuerpos de PR
- nombres de rama (pueden codificar nombres de clientes: `feat/acme-corp-billing`)
- nombres de repositorio, salvo alias
- identidades de otros colaboradores

Cada registro derivado de un repo privado lleva `visibility: private`, que es pegajoso: cualquier agregado que lo incluya hereda la restricción.

### Publicación de lo privado

Un repo privado produce salida pública **solo si** su entrada en el Registry lo autoriza explícitamente:

```
publish: none | record | aggregate  # default: record   si visibility: private
                                    #          none     si visibility: confidential
#   none      → el proyecto no aparece en el feed, en ninguna forma
#   record    → aparece el registro declarado (id, title, thesis, timeframe,
#               context, role, has_private_sources). Sin agregados.
#   aggregate → record + buckets de activity.json, sujetos a §3

nda: true | false                   # nda: true  ⇒  visibility: confidential
                                    #            ⇒  publish: none

release?: {                         # ÚNICA vía para publicar algo de un proyecto
  approved_by: "rodrigo",           # confidential o de context: client
  date: ISO,
  scope: "qué exactamente queda liberado, enumerado"
}
```

`visibility` y `nda` no son ortogonales y es deliberado: `visibility` es la regla de publicación, `nda` es un hecho legal que la restringe. El validador impone la implicación. Ver `02-domain-and-evidence-model.md` §2.

### Default cerrado para lo confidencial

**Un proyecto `confidential` no produce salida pública de ningún tipo.** No un registro redactado: ningún registro. Sin `id`, sin `title`, sin `thesis`, sin `timeframe`, sin conteos y sin buckets de actividad (`05-feed-contract.md`, `projects.json`).

Esto **cambia** la regla anterior, que decía que `nda: true` "fuerza `aggregate`". Forzar agregado era tratar la agregación como si anonimizara, y no lo hace cuando hay un solo sujeto detrás: cinco commits de un único cliente siguen describiendo a ese cliente. El default correcto es no publicar.

La única excepción es un `release` humano explícito, registrado en el Registry con fecha y con el alcance enumerado. Consecuencias del mecanismo:

- El `release` vive en el **Registry (repo privado)**, no en el feed. No añade ningún campo a la superficie pública.
- Un `release` enumera *qué* se libera. No existe el release genérico "este proyecto es publicable".
- **Un proyecto con `context: client` requiere `release` incluso con `visibility: private`.** El contexto de cliente es lo que hace atribuible al agregado, independientemente de la visibilidad declarada. Esto extiende a `private` la confirmación humana que `02-domain-and-evidence-model.md` §2 ya exigía para `context: client` + `visibility: public`.
- Sin `release`, el motor no tiene rama de código que pueda publicarlo. No es una comprobación que se pueda saltar: es la ausencia de la vía.

Un alias (`"Cliente A — retail, 40–80 empleados"`) puede sustituir la identidad **dentro de un `release`**, nunca como sustituto de uno, y siempre que el alias no sea reidentificable por combinación con otros datos publicados.

---

## 3. Reglas de publicación de métricas

Aplican a todo dato con procedencia en fuente privada o confidencial.

**Lo primero es lo que estas reglas no hacen: el umbral k no anonimiza.** Cuenta eventos, no sujetos. Cinco commits de un único cliente son cinco eventos y **un** sujeto, y el bucket sigue siendo atribuible a ese cliente. Tratar k como anonimización fue el defecto de la versión anterior de esta tabla. Es un piso mínimo contra buckets triviales, nada más, y la protección real viene de las dos reglas que van antes.

| # | Regla | Detalle |
|---|---|---|
| 1 | **Confidencial no se agrega** | Un proyecto `confidential` (o `nda: true`) no produce agregado, bucket ni conteo. Ningún umbral lo habilita. Solo un `release` humano (§2). |
| 2 | **Sujetos independientes ≥ 2** | Un agregado que incluya fuentes privadas se publica solo si cubre **al menos dos sujetos independientes** — clientes distintos, o proyectos de `context` distinto. Un agregado de un solo sujeto es atribuible por construcción, con cualquier número de eventos. |
| 3 | **Umbral k = 5 eventos** | Piso mínimo, **no anonimización**. Un bucket con menos de 5 eventos no se publica. Se aplica *después* de 1 y 2, nunca en su lugar. |
| 4 | **Coarsening temporal** | Fuentes privadas se agregan por **mes o trimestre**, nunca por día ni por timestamp. |
| 5 | **Vocabulario controlado** | Cero texto libre proveniente de fuentes privadas. Solo valores de enumeraciones definidas en el schema. |
| 6 | **Sin URLs** | Un registro `private` nunca lleva `public_url`. |
| 7 | **Sin conteos exactos cercanos al umbral** | **Techo de divulgación**, no obligación de publicar: entre 5 y 10 eventos **nunca** se publica el número exacto. Un rango es *una* forma de respetar el techo; **omitir el bucket es otra, y es la que rige en V1** (§3.1). |
| 8 | **Sin cruces reidentificantes** | No se publican dos agregados cuya intersección reduzca un bucket por debajo de k, o por debajo de dos sujetos independientes. |

Cómo se cuenta un **sujeto independiente**: un cliente distinto cuenta uno; varios proyectos del mismo cliente cuentan **uno**; varios repos del mismo proyecto cuentan **uno**. La unidad es la persona u organización a la que el dato podría atribuirse, no el artefacto técnico. Contar artefactos en lugar de sujetos es exactamente el error que k cometía.

### 3.1 Cómo se lee la regla 7 (decisión de Rodrigo, 2026-08-24)

La regla 7 es un **techo de divulgación**: acota cuánto puede decirse, no obliga a decir nada. La formulación anterior —«entre 5 y 10 se publica el rango»— se leía como un mandato de publicar un rango, y eso contradecía a `05-feed-contract.md`, donde `counts` son enteros y no existe representación de rango. Un bucket privado de 7 eventos no podía cumplir los dos documentos a la vez (finding P0-PRIV-02).

Queda resuelto así, y no es provisional:

1. Lo prohibido es **el número exacto** en la banda 5–10 para datos de procedencia privada. Eso no cambia y no se debilita.
2. Cualquier salida que respete ese techo cumple la regla. Publicar un rango la cumple. **Omitir el bucket también la cumple, y con más margen**: no divulgar nunca puede divulgar de más.
3. **En V1 rige la omisión.** Es el comportamiento definitivo del contrato mientras `counts` sean enteros, no un parche a la espera de una representación mejor. Ver `05-feed-contract.md` → *Reglas de privacidad del bucket*.

Consecuencia de la asimetría entre las dos salidas legales: publicar un rango **añadiría** una representación a la superficie pública, y eso es un cambio de schema que escala a Rodrigo (§7). Omitir no añade nada. Por eso la lectura conservadora es también la que no requiere decidir nada más para ser correcta.

Lo que esta lectura **no** autoriza: omitir no sustituye a las reglas 1, 2 y 3. Un bucket se omite por la regla 7 *después* de haber pasado las anteriores, nunca en su lugar.

### Gate `publish-diff`

Cada PR de publicación incluye, en su cuerpo, un diff legible de **qué cambia en la superficie pública**:

- campos nuevos que aparecen por primera vez
- valores nuevos en campos enumerados
- proyectos que pasan de no publicados a publicados
- cualquier cambio de `visibility`, `provenance` o `verifiability` *(decía «tier», que no existe en el contrato: corregido el 2026-08-27, finding ESC-07)*

**Un cambio en la superficie pública requiere una decisión humana de merge**, no solo CI verde.

Precisión importante sobre el mecanismo: la protección de `main` **no exige aprobaciones formales de GitHub** (Rodrigo es el único maintainer humano, y auto-aprobarse sería teatro). El control real es la **restricción de push**: solo Rodrigo puede mergear a `main`, así que ningún PR de publicación entra sin que él lo mergee. Está **aplicada en GitHub y verificada el 2026-08-24**, no solo acordada; el detalle de qué se comprobó está en `04-architecture.md` §6.1.

Un review de Claude o de Codex forma parte de la gobernanza del proyecto, pero **no cuenta como aprobación humana** y no debe presentarse como tal.

### Test de barrera

CI corre un test que **falla** si el artefacto público contiene cualquier string de la denylist: nombres de clientes, nombres de repos privados, dominios internos, nombres de rama conocidos. La denylist vive en el repo privado; el test corre en el motor antes de abrir el PR.

Esto es una red, no la defensa principal. La defensa principal es §1.2.

---

## 4. Fronteras que nunca se cruzan

| A | B | Por qué están separados |
|---|---|---|
| Analítica de visitantes (GA) | Evidencia de trabajo | Son telemetrías de sujetos distintos: visitantes vs. autor. Cruzarlas no aporta nada y crea un perfil que nadie pidió. Viven en sistemas distintos y **nunca** se unen. |
| PII de suscriptores (`/api/subscribe`) | Cualquier parte del sistema de evidencia | No comparten runtime, secreto ni stream de logs. |
| Ledger crudo (repo privado) | Feed publicado (repo público) | Solo cruza lo que pasó por redacción. |
| Contenido editorial (`content/`) | Evidencia | El blog puede *enlazar* a evidencia; jamás derivarse de ella ni alimentarla. |

---

## 5. Secretos y tokens

Dos tokens, con propósitos que no se solapan:

| Token | Scope | Ubicación |
|---|---|---|
| Lectura | Fine-grained PAT, **read-only**, repos allowlisted explícitamente, expiración ≤ 90 días | Secret de Actions en `proof-engine` |
| Escritura | Fine-grained PAT, **solo** `rodrigobermejo-site`, **solo** `contents:write` + `pull_requests:write`, expiración ≤ 90 días | Secret de Actions en `proof-engine` |

Reglas:

- El motor **abre pull requests; nunca hace push a `main`**. Es la única superficie de escritura del sistema.
- El token de escritura **no puede mergear**: la restricción de push en `main` deja el merge en manos de Rodrigo. Sin esa restricción, un PAT con `contents:write` + `pull_requests:write` podría mergear su propio PR en cuanto el CI pasara a verde. Es el control que sustituye a la aprobación obligatoria.
- Prohibido loguear respuestas de API en el motor. Un `console.log` de un payload de GitHub puede volcar metadata privada a los logs de CI.
- El sitio **no tiene ningún token** relacionado con evidencia.
- Rotación documentada; la expiración es una característica, no una molestia.

**Los dos tokens se emiten hoy desde la cuenta personal de Rodrigo, y eso tiene fecha de caducidad.** Un PAT personal *es* Rodrigo para GitHub: no separa la atribución, no se revoca de forma independiente y —lo que importa para el control que sostiene esta sección— tampoco queda fuera de la restricción de push de `main` (`04-architecture.md` §6.1), que está definida sobre `rodrigoBermejo`. Hoy no es explotable porque el motor no publica de forma automática todavía. `decisions/0008` decide que la automatización usará una identidad independiente, capaz de abrir PR e incapaz de mergear, y fija que se implementa **antes del primer publish automático**. No está implementada en V1, deliberadamente: es el finding P0-GOV-02 y se cierra con la decisión registrada, no con una credencial creada meses antes de tener uso.

---

## 6. Registro de riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| 1 | Scope creep del token de lectura | Fine-grained, read-only, repos allowlisted uno por uno, expiración corta |
| 2 | Token de escritura sobre el repo del sitio | PAT separado, un solo repo, dos permisos, solo PRs. **La restricción de push en `main` impide que el bot mergee su propio PR**, que es el riesgo real: los permisos que necesita para abrirlo le bastarían para mergearlo |
| 3 | Secreto o metadata privada en logs de CI | Prohibición de loguear payloads; regla de lint en el motor |
| 4 | Publicación accidental de nombres privados | `publish-diff` + test de denylist + allowlist por defecto |
| 5 | Reidentificación por agregados finos o timestamps | Confidencial no se agrega; **mínimo 2 sujetos independientes**; k = 5 como piso, no como anonimización; coarsening mensual; sin cruces reidentificantes (§3) |
| 6 | Violación de NDA | `nda: true` ⇒ `visibility: confidential` ⇒ `publish: none`. Solo un `release` humano con alcance enumerado lo abre; sin bypass en código (§2) |
| 7 | Cross-join analítica × evidencia | Separación arquitectónica: sistemas y repos distintos |
| 8 | Integridad del feed | Historia de git pública; firma de commits de publicación (Sprint 7); digest en `meta.json` |
| 9 | Cadena de suministro del motor | Dependencias pinneadas; sin red en el paso de publish más allá de GitHub |
| 10 | Agente edita artefactos a mano | `public/proof/v1/**` es zona prohibida para Builder y Reviewer (ver `AGENTS.md`). El acotamiento a `v1/` **no debilita este riesgo**: los artefactos viven ahí. `schemas/**` no son artefactos, y su régimen está en `decisions/0009` |

---

## 7. Decisiones que requieren un humano

Un agente **debe detenerse y escalar** ante cualquiera de estas. No hay caso en que las tome por su cuenta:

- Cambiar cualquier regla de este documento
- Cambiar el schema del feed público
- Cambiar el scope de un token
- Publicar un campo o un valor nuevo en la superficie pública
- Cambiar `publish` o `nda` de un proyecto
- **Firmar un `release`** (§2): liberar cualquier cosa de un proyecto `confidential` o de `context: client`. Es la definición del acto humano, no un trámite delegable
- Bajar el umbral k, bajar el mínimo de sujetos independientes, o afinar la granularidad temporal
- Añadir un data store o una dependencia nueva
