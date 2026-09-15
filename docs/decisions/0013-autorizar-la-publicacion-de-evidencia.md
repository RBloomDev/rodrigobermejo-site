# ADR 0013 — Autorizar la publicación de evidencia

- **Estado:** **PROPUESTA.** No autoriza nada. Redactada por un agente para que Rodrigo decida.
- **Fecha de redacción:** 2026-09-11
- **Decide:** Rodrigo. `03-privacy-and-publication-policy.md` reserva sus cambios a él, y esto cambia qué se vuelve público.

## El hueco

Se descubrió al conectar el ledger (`proof-engine#17`). Con un ledger sintético,
`feed:build` emitía evidencia de un proyecto `visibility: private` /
`publish: record` **con su `public_url`**, y ningún guard lo veía. No era
alcanzable antes porque el ledger siempre estaba vacío.

La causa no es un bug de implementación: **ningún valor de `publish` autoriza
publicar registros individuales de `Evidence`.** `03` §2 define el enum entero:

```
none      → el proyecto no aparece en el feed, en ninguna forma
record    → aparece el registro declarado (id, title, thesis, timeframe,
            context, role, has_private_sources). Sin agregados.
aggregate → record + buckets de activity.json, sujetos a §3
```

Un registro de `Evidence` no es «el registro declarado del proyecto» ni «buckets
de `activity.json`». No está en el enum, y `05-feed-contract.md` sí define un
`evidence.json`. Los dos documentos no se contradicen: hay un archivo cuyo
permiso nadie declaró.

Mientras esto no se decida, `buildFeed` **aborta** si llega evidencia al
artefacto. Es una medida provisional, no la respuesta.

## Lo que se propone, y es lo mínimo

### 1. Un campo nuevo, explícito y opt-in

En `03` §2, junto a `publish`:

```
publish_evidence: true | false      # default: false
```

`true` exige, y el validador lo comprueba:

- `publish` distinto de `none`
- `visibility` distinto de `confidential`
- si `context: client`, un `release` firmado

### 2. Por qué un campo nuevo y no un cuarto valor de `publish`

Se evaluaron las tres alternativas:

**Extender el significado de `aggregate`.** Descartada, y es la peor: hoy hay
**dos** proyectos declarados `aggregate` —`habit-tracker` y `proof-of-work`—, así
que su evidencia empezaría a publicarse **sin que nadie tomara una decisión
nueva**. Una declaración escrita para otra cosa pasaría a autorizar algo que su
autor no consideró. Es exactamente el modo de fallo que `02` §1 rechaza para
`evidence_scope`.

**Un cuarto valor `publish: evidence`.** Descartada por una razón estructural: el
enum actual es una escala donde cada nivel incluye al anterior, y la evidencia no
encaja en esa escala. Publicar registros individuales **no implica** querer
buckets de actividad, ni al contrario. Meterlo en la escala obligaría a elegir un
orden que no existe.

**Un booleano aparte.** Es lo propuesto. `03` §1 pide «allowlist, nunca
denylist: un campo nuevo, por defecto, no se publica», y un booleano con default
`false` es la forma literal de eso. Y no se puede activar por inercia: hay que
escribirlo, proyecto por proyecto.

### 3. La privacidad se comprueba POR FUENTE, no por proyecto

Es la parte que más fácil sería implementar mal. **Un proyecto público puede
apoyarse en repositorios privados** — `proof-of-work` es el caso real, con el
sitio público y el motor privado (`02` §3, `decisions/0011`).

Así que `publish_evidence: true` **no** basta. Cada registro exige además:

```
la fuente de la que proviene el evento tiene sources[].public == true
```

Y por defecto cerrado: si no se puede determinar de qué fuente vino un registro,
**no se publica**. En la práctica eso significa que un `Evidence` sin
`subject.repo` no es publicable, porque no hay forma de atarlo a una fuente
declarada.

Sin esta regla, `publish_evidence: true` en `proof-of-work` publicaría evidencia
del motor privado. Con ella, publica solo la del sitio.

### 4. Campos permitidos: los que ya proyecta el motor

**No hace falta cambiar nada aquí, y conviene decirlo**: `publish/feed.ts` →
`aRegistroEvidencia` ya emite una allowlist, y ya es la correcta:

```
id, project_id, source, kind, occurred_at, actor_role, provenance, verifiability
public_url        (si y solo si verifiability lo permite)
```

Y ya **excluye** `subject`, `observed_at`, `source_event_id`, `digest`,
`visibility` y `redactions`. La exclusión de `subject` es la que más importa: ahí
viven los nombres de repositorio, que `03` §2 prohíbe publicar salvo alias.

La propuesta es **dejarlo como está** y declararlo en `05` como el contrato que
ya es de hecho.

### 5. Qué pasa cuando falta la autorización

**Se omite del artefacto. No aborta.**

Es el comportamiento que ya tiene la cascada: la evidencia de un proyecto no
publicable se descarta, los `claim.evidence_ids` se recortan, y la derivación de
`provenance`/`verifiability` corre **después** del recorte (`05`, orden de 7
pasos).

**El recorte es por proyecto, no por claim**, y la diferencia importa porque `Claim`
es muchos-a-muchos con `Project` (§1). Un claim sostenido por dos proyectos, uno
autorizado y otro no, **sigue publicando la evidencia del autorizado**: se le
quitan las aristas hacia el que no lo está, y la derivación corre sobre lo que
sobrevive. Solo cuando no sobrevive ninguna evidencia el claim deriva a
`declared`/`unverifiable`, que es entonces la afirmación honesta.

Decirlo al revés —«el claim deriva a `declared`/`unverifiable`»— sería declarar
menos verificabilidad de la que la evidencia publicada sostiene. Es el error opuesto
al que §1.1 prohíbe, y también hace mentir al artefacto.

El aborto actual de `buildFeed` existe solo porque **nada** está autorizado. En
cuanto exista el campo, se sustituye por la omisión.

Y como en el recorte de claims: **la omisión no se anuncia**. No hay contador de
evidencia oculta, por la misma razón que no hay contador de proyectos
confidenciales (`05`).

## Alcance de la primera entrega, si se aprueba

Lo que Rodrigo planteó como recomendación de trabajo, y que esta ADR recoge sin
ampliarlo:

**Entra:** evidencia de fuentes declaradas `public: true`, de proyectos propios,
vinculada a claims que ya existen.

**Queda fuera:** todo registro de una fuente `public: false`, cualquier proyecto
`confidential`, y cualquier proyecto de `context: client` — **incluido
`docencia-universitaria`, que ya tiene un `release` firmado**. El `release` de ese
proyecto se firmó para publicar su registro con alias, no su evidencia; tratarlo
como autorización para lo segundo sería reinterpretar una firma humana, que es lo
que `03` §2 llama la única vía y no una vía para todo.

Con el Registry de hoy eso deja **dos** proyectos candidatos, `habit-tracker` y
`proof-of-work`, y en el segundo solo la evidencia del repo público.

## Lo que esta ADR NO hace

- No cambia `03`. El texto de arriba es la propuesta; aplicarlo es una decisión
  de Rodrigo y un commit suyo o autorizado por él.
- No toca ningún `release` ni ningún `publish` del Registry.
- No cambia `public/proof/v1/**`.
- No implementa nada en el motor. `buildFeed` sigue abortando.

## Criterios de aceptación, si se aprueba

1. `publish_evidence` ausente o `false` ⇒ ninguna evidencia **de ese proyecto** en
   el artefacto. **El recorte es por proyecto, no por claim:** un claim que
   atraviesa varios proyectos conserva la evidencia autorizada de los demás, y la
   derivación de `provenance`/`verifiability` corre sobre **toda la que sobreviva**.
   Solo si no sobrevive ninguna, el claim deriva a `declared`/`unverifiable`.

   Es el error más fácil de cometer implementándolo, porque `Claim` es
   muchos-a-muchos con `Project` (§1) y la intuición de «recortar el claim» llega
   antes que la de «recortar sus aristas». Un claim sostenido por un proyecto
   autorizado y otro que no **sí publica evidencia**, la del primero, y su
   verificabilidad es el máximo sobre ese subconjunto — no `unverifiable`.

1b. Con dos proyectos en un claim, uno con `publish_evidence: true` y otro sin él:
   el artefacto contiene la evidencia del primero, `claim.evidence_ids` cita solo
   esa, y la verificabilidad derivada es la que corresponde a ese subconjunto. Test
   explícito, porque el caso correcto y el incorrecto se distinguen solo mirando
   `verifiability`.
2. `publish_evidence: true` en un proyecto `confidential` ⇒ el validador falla.
3. `publish_evidence: true` con `publish: none` ⇒ el validador falla.
4. `publish_evidence: true` en `context: client` sin `release` ⇒ el validador falla.
5. Evidencia de una fuente `public: false` ⇒ **no** se publica, aunque el proyecto
   tenga `publish_evidence: true`.
6. Evidencia sin `subject.repo` ⇒ no se publica (default cerrado).
7. El artefacto **nunca** contiene `subject`, `observed_at`, `source_event_id`,
   `digest`, `visibility` ni `redactions`.
8. La omisión no deja rastro: ningún contador de evidencia excluida.
9. El guard de allowlist de mundo cerrado sigue en verde, y se falsa metiendo una
   URL de un repo privado.
10. Un fixture con las dos mitades: un proyecto que **sí** publica evidencia y
    otro que no, en la misma corrida.

## Alternativas descartadas

- **Publicar evidencia sin campo nuevo, apoyándose en `aggregate`.** Ver §2: dos
  proyectos existentes cambiarían de comportamiento sin decisión.
- **Autorizar por claim en vez de por proyecto.** El `evidence_scope` del claim ya
  decide *qué* evidencia adhiere; mezclar ahí el permiso de publicación juntaría
  dos preguntas distintas —qué la sostiene y qué puede verse— en un solo campo.
- **Dejar el aborto como comportamiento definitivo.** Cerraría el Sprint 4 por la
  vía de no entregarlo.
