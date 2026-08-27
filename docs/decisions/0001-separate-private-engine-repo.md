# ADR 0001 — Repositorio privado separado para el motor

- **Estado:** Aceptada
- **Fecha:** 2026-08-19
- **Decisión de:** humano (Rodrigo)

## Contexto

El sistema necesita leer metadata de repositorios privados y almacenar evidencia sin redactar. La pregunta era si eso puede vivir en `RBloomDev/rodrigobermejo-site` (monorepo) o requiere un repositorio aparte.

## Decisión

Un repositorio privado nuevo, `rodrigoBermejo/proof-engine`, contiene ingestión, Registry, ledger, correlación, redacción y publicación. El sitio no contiene ninguna de esas capas.

## Razón

**Clasificación de datos, no escala.** El volumen de V1 cabe en archivos de texto; la escala no justificaría nada. Lo que sí justifica la separación:

- Un token con lectura de repos privados quedaría expuesto a las variables de entorno de deployments de preview del sitio.
- La superficie de build del sitio público se ampliaría para incluir código que toca datos de clientes.
- La historia de git del sitio es pública y permanente: un `git add` accidental del ledger crudo es irreversible.
- Colaboradores futuros del sitio heredarían acceso a datos que no les corresponden.

Es una frontera de control de acceso, y es suficiente.

## Consecuencias

- Dos repositorios que mantener coherentes a nivel de contrato. Mitigado: la spec es canónica y pública (ADR 0002).
- El motor necesita permiso de escritura sobre el sitio para publicar (ADR 0005).
- Dueño distinto (`rodrigoBermejo` vs `RBloomDev`): deliberado, la identidad que reclama es la persona.

## Alternativa descartada

**Monorepo.** Mezcla el token y la evidencia sin redactar con el build público. Frontera de datos inaceptable. Nota: el *feed publicado* sí vive en el sitio; el *motor* no.
