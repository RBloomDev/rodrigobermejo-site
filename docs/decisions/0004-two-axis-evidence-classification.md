# ADR 0004 — La evidencia se clasifica en dos ejes, no en cinco tipos

- **Estado:** Aceptada, **enmendada el 2026-08-21** (ver la enmienda al final)
- **Fecha:** 2026-08-19

## Contexto

El brief enumeraba cinco clases de evidencia: declarada, recolectada automáticamente, correlacionada, públicamente verificable y criptográficamente verificable. Tratadas como una sola enumeración, resultan inconsistentes.

## Decisión

Dos ejes ortogonales, ambos obligatorios en cada claim:

- **Procedencia** — cómo obtuvimos el dato: `declared`, `collected`, `derived`, `correlated`, `attested`
- **Verificabilidad** — si un tercero puede comprobarlo: `unverifiable`, `self_link`, `third_party_public`, `cryptographic`

## Razón

Las cinco clases originales mezclan dos preguntas distintas, y la mezcla produce casos que no se pueden expresar:

- El conteo de PRs de un repo privado es **recolectado automáticamente** y a la vez **no verificable por nadie**. En una enumeración plana hay que elegir una etiqueta, y la información que se pierde es precisamente la que importa.
- Un tag firmado que un humano declaró en el Registry es **declarado** y a la vez **criptográficamente verificable**.

Separar los ejes es lo que permite ser honesto: que la recolección sea automática no dice nada sobre si alguien puede comprobarla. Confundir ambas cosas es la vía directa a presentar telemetría como prueba.

## Consecuencias

- Cada claim carga dos etiquetas, siempre. El schema lo hace obligatorio: un claim sin ambas no valida y rompe el build del sitio.
- La UI muestra un par, no una insignia. Cuesta más diseñar, y es el punto entero del sistema.
- Algunas combinaciones carecen de sentido y el schema las rechaza (por ejemplo, `attested` sin atestiguador identificado).

---

## Enmienda — 2026-08-21

Origen: review adversarial de Codex sobre Sprint 0 (finding `P1-CLAIM-02`). Los dos ejes y sus valores **no cambian**. Cambia dónde viven:

- **Los ejes son atributos de `Evidence`, no de `Claim`.** El texto de arriba dice "ambos obligatorios en cada claim" y "cada claim carga dos etiquetas". Sigue siendo cierto que cada claim *muestra* un par, pero el par se **deriva** de su evidencia (`02-domain-and-evidence-model.md` §1.1) en lugar de declararse aparte. Declararlo en los dos sitios permitía que discreparan sin que nada fallara.
- **La combinación inválida de la tercera consecuencia deja de ser alcanzable en V1.** No hay campo `attestor` (se eliminó con `Claim.kind`) y la única fuente de V1, `github`, no produce evidencia `attested`. El valor permanece en el eje porque describe correctamente una clase de hecho; simplemente nada lo produce todavía. Cuando exista la fuente, el atestiguador vivirá en el registro de `Evidence`.
