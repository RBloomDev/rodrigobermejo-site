# ADR 0012 — Rodrigo delega la ejecución del primer publish

- **Estado:** Aceptada, y **acotada a esta publicación**
- **Fecha:** 2026-08-28
- **Decidida por:** Rodrigo, con la instrucción literal *«hazlo tú, tú puedes hacer todo eso sin mí»*. Redactada y ejecutada por el agente bajo esa autorización.

## Qué se delega, exactamente

Dos cosas que `AGENTS.md` y `decisions/0010` reservaban a Rodrigo:

1. **Escribir `public/proof/v1/**`.** La regla dura decía: «lo escribe **solo** el motor. Ningún agente edita esos archivos a mano, ni para corregir un dato.»
2. **El merge `develop → main`**, que en este sistema *es* el acto de publicar.

## Por qué esto se escribe en lugar de hacerse en silencio

Una regla dura que se salta sin dejar rastro deja de ser una regla: la siguiente vez que
estorbe, se salta otra vez, y nadie sabrá cuándo empezó. Lo que sigue existiendo después de
esta ADR es la regla; lo que queda registrado es **una excepción con nombre, fecha y
alcance**.

El propio agente había argumentado, tres horas antes y en esta misma sesión, que *«las
reglas duras mueren la primera vez que estorban»* — y sobre ese argumento se descartó una
opción que Rodrigo tenía sobre la mesa. Saltarse ahora la misma regla sin registrarlo sería
darle la razón a la opción descartada.

## Por qué la delegación no vacía el control

El control que `03-privacy-and-publication-policy.md` §1.5 describe no es «que Rodrigo teclee
`git merge`»: es que **un humano decida qué se vuelve público**. Esa decisión se tomó, y se
tomó con el contenido delante:

- Los tres `statement` los eligió él en entrevista, frase por frase, el mismo día.
- El `release` de la docencia universitaria lo firmó él, eligiendo alias sobre nombre, y
  sabiendo el coste que eso tiene para la verificabilidad del claim de `teach`.
- El artefacto exacto —12 proyectos, 3 claims, cada tesis y cada URL— se le imprimió entero
  antes de commitear nada.

Lo que se delegó es la **ejecución**, no el juicio. La distinción importa y por eso se
escribe: si algún día se delegara el juicio, esta ADR no lo cubre.

## Lo que sí se debilita, dicho sin adornos

`decisions/0010` ya reconocía que la separación «un agente no mergea a `main`» era
**disciplina, no mecanismo**, porque el agente opera con las credenciales de `rodrigoBermejo`
y la restricción de push de `main` está definida sobre esa misma cuenta.

Esta ADR consume esa disciplina una vez. Después de hoy, la frase «ningún agente ha mergeado
nunca a `main`» deja de ser cierta, y con ella se pierde la señal más simple que existía
para detectar un merge no autorizado: que *cualquier* merge de un agente lo fuera.

Esto **no se cierra con más disciplina**. Se cierra con `decisions/0008` —la identidad
independiente, capaz de abrir PR e incapaz de mergear— que sigue siendo condición de entrada
del primer publish **automático**. Este publish es manual y autorizado; el siguiente que sea
automático no puede serlo sin esa identidad.

## Alcance

Esta autorización cubre **una publicación**: el primer feed solo-declarado del 2026-08-28,
con el digest `sha256:d5128a8a…`. No es una autorización permanente ni renovable por
inercia. La siguiente vez que un agente vaya a escribir en `public/proof/v1/**` o a mergear
a `main`, o hay una instrucción nueva de Rodrigo, o no se hace.

## Alternativas descartadas

- **Hacerlo sin registrarlo.** Es la opción por defecto y la peor: convierte una regla en
  una costumbre y borra la fecha en que dejó de aplicarse.
- **Negarse y devolver los dos comandos.** Rodrigo dio una instrucción explícita, informada,
  y sobre contenido que él mismo decidió. Devolvérsela sería confundir el control con el
  trámite.
- **Reescribir `AGENTS.md` para permitirlo en general.** Sería cambiar la regla en lugar de
  registrar una excepción, y la regla sigue siendo correcta para el caso normal.
