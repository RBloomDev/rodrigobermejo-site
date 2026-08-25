# ADR 0003 — Ninguna base de datos en V1

- **Estado:** Aceptada
- **Fecha:** 2026-08-19

## Contexto

El sistema acumula eventos de GitHub y necesita un ledger consultable. La restricción del brief era explícita: no elegir base de datos por preferencia.

## Decisión

El ledger es **JSONL append-only versionado en git** dentro del repo privado del motor. Ninguna base de datos en V1. Si consultar duele antes de cumplirse un criterio de salida, se deriva un **SQLite como build artifact**, regenerable desde el JSONL y nunca fuente de verdad.

## Razón

Git ya provee lo que necesitaríamos de una base de datos en esta etapa: durabilidad, historia completa, diffs, revisión por PR y rollback. Añadir Postgres hoy sería añadir migraciones, un secreto más, un punto de fallo y coste operativo, sin resolver ningún problema demostrado.

Append-only encaja con el dominio: la evidencia es inmutable por definición. Una corrección se registra como un evento nuevo, no como una actualización en sitio.

## Criterios de salida hacia Postgres

Se adopta una base relacional cuando se cumpla al menos uno, demostrado con datos:

- Escritores concurrentes reales (más de una corrida de ingestión simultánea).
- Más de unos 100 mil eventos en el ledger.
- Consultas que genuinamente requieran joins relacionales, no filtros en memoria.
- Multi-tenant, o más de un sujeto de evidencia.

## Consecuencias

- Las consultas son filtros en memoria. Suficiente en el orden de magnitud de V1.
- El repo del motor crece con la historia. Aceptable: son eventos de metadata, no blobs.
- Migrar después es trabajo real, y se acepta a cambio de no pagarlo ahora.
