# ADR 0005 — El motor publica abriendo un pull request

- **Estado:** Aceptada, enmendada el 2026-08-20
- **Fecha:** 2026-08-19

## Contexto

ADR 0002 sitúa el feed dentro del repo público del sitio. Eso obliga a que el motor privado escriba en el repo del sitio, lo que introduce la **única superficie de escritura del sistema**, y el riesgo más concreto de toda la arquitectura.

## Decisión

El motor abre un **pull request** contra `RBloomDev/rodrigobermejo-site` con los artefactos redactados. Nunca hace push a `main`.

## Controles

Cinco, y ninguno es opcional:

1. Solo PRs. Sin excepción en código: el paso de publish no tiene ruta de push directo.
2. Protección de `main`: **restricción de push, de modo que solo Rodrigo puede mergear**, más status checks en verde. Ver la enmienda al final: la versión original de este control decía "revisión requerida" y era incorrecta.
3. PAT fine-grained separado del de lectura, scopeado a **un** repositorio y **dos** permisos (`contents:write`, `pull_requests:write`), con expiración de 90 días o menos.
4. `public/proof/v1/**` es zona de escritura exclusiva del bot. Ningún agente edita esos archivos a mano, ni para corregir un dato: se corrige la causa en el motor o en el Registry. **Acotado a `v1/` por `decisions/0009`**: `schemas/**` lo escribe el Builder, derivándolo de `docs/05` y nunca del artefacto.
5. CI valida el feed contra `public/proof/schemas/*.json` en cada PR. Feed inválido bloquea el merge.

## Razón

El PR no es solo el mecanismo de transporte: **es el gate de privacidad**. El publish-diff en el cuerpo del PR convierte "qué se vuelve público" en una decisión revisada por una persona antes de ocurrir, en lugar de un efecto secundario de un cron.

## Consecuencias

- La publicación requiere una acción humana. Es deliberado: es el punto de control.
- Existe un token con permiso de escritura sobre un repo público. Acotado, con expiración, y sin capacidad de mergear.
- Cada publicación genera un PR real en un repo público, que a su vez es evidencia legítima de actividad.

## Alternativa descartada

**Push directo a `main` con branch protection deshabilitada para el bot.** Elimina el gate de privacidad, que es la razón de ser del diseño. Rechazada.

---

## Enmienda — 2026-08-20

**Qué cambia:** el control 2 pasa de "revisión requerida" a "restricción de push".

**Por qué.** Se decidió no exigir aprobaciones formales de GitHub, porque Rodrigo es el único maintainer humano y una aprobación que él mismo se concede no es un control, es teatro de proceso. Pero al quitar la aprobación obligatoria aparece un agujero que la redacción original de esta ADR no cubría:

> Un PAT con `contents:write` + `pull_requests:write` tiene exactamente los permisos necesarios para **mergear** su propio PR, no solo para abrirlo. Con "CI verde" como único gate, el bot de publicación puede satisfacer el gate por sí mismo y mergear sin intervención humana.

Eso vaciaría de contenido la razón de ser de esta ADR, que es que el PR sea el gate de privacidad.

**Control que lo cierra:** restricción de push en `main` con Rodrigo como único actor permitido. El bot puede abrir el PR y no puede mergearlo. Es el mecanismo que traduce "la decisión final de merge es de Rodrigo" en algo que GitHub impone, en lugar de una convención que depende de que nadie se equivoque.

Disponible en repos públicos sin plan de pago, y este repo es público.

**Sin reglas especiales para PRs automáticos.** En V1 todos los PRs pasan por lo mismo: PR obligatorio, status checks en verde, conversaciones resueltas, merge por Rodrigo. Un carril distinto para el bot sería una excepción que habría que auditar, y no hace falta.

**El review de un agente no es una aprobación humana.** Claude y Codex emiten veredictos como parte de la gobernanza (`AGENTS.md`), y ninguno debe usar el botón de aprobación de GitHub para simular una revisión humana.
