# Demostración de recuperación — 2026-09-14

> Ejecución real contra las fuentes de verdad. Sin red simulada, sin fixtures.
> Los comandos y sus salidas están pegados tal cual. Nada publicado.

Estado de partida: **41 pendientes de redacción, 3 piezas terminadas, 7 descartadas.**

---

## Prueba 1 — una fuente que falla no descarta los pendientes

```
$ node scripts/editorial/ejecutar.mjs --incluir el-economista --incluir anthropic --limite 0

== corrida be057980 · 2026-09-14T21:27:53Z
piezas en el corpus ANTES: 3
pendientes: 41 de redaccion, 0 de verificacion
corpus: +0 insertadas, 0 omitidas por ya existir
piezas en el corpus DESPUES: 3
estado: {"detectada":0,"pendiente_redaccion":41,"pendiente_verificacion":0,
         "fallida_reintentable":0,"descartada":7,"terminada":3}
== EXITO PARCIAL: se produjo lo que si se pudo; 2 fallo(s) con constancia
EXIT=2
```

Los dos fallos quedan registrados **en su etapa**, con su consecuencia:

```
etapa=detectar codigo=403
  consecuencia: sin items de esta fuente en esta corrida; no se genera pieza a
                partir de ella. La fuente se vuelve a intentar en la corrida siguiente.
etapa=detectar codigo=404
  consecuencia: (idem)
```

**Lo que demuestra:** exit 2, no 1. El corpus no crece, los 41 pendientes siguen ahí, y
**no se fabricó ninguna pieza** a partir de las fuentes caídas.

---

## Prueba 2 — la fuente se recupera y la corrida continúa

```
$ node scripts/editorial/ejecutar.mjs --limite 0

== corrida 9c946511 · 2026-09-14T21:28:09Z
pendientes: 41 de redaccion, 0 de verificacion
estado: {..."pendiente_redaccion":41,..."terminada":3}
== EXITO: sin fallos de acceso, de esquema ni de verificacion
EXIT=0
```

**Lo que demuestra:** sin las fuentes caídas la corrida sale limpia, y **los pendientes
de la corrida fallida siguen disponibles**. Un fallo no los consumió.

---

## Prueba 3 — reprocesar no duplica

```
piezas antes:              3
tras DOS corridas mas:     3 piezas, 3 ids unicos
```

**Lo que demuestra:** idempotencia sobre lo ya terminado, y sin colisión de
identificadores.

---

## Prueba 4 — un proceso muerto conserva el trabajo pendiente

```
$ timeout -s KILL 20 node scripts/editorial/ejecutar.mjs --con-redactor --limite 4

estado ANTES  del corte: {"pendiente_redaccion":41,...,"terminada":3}
senal de salida: 137   (SIGKILL — matado a media corrida, sin oportunidad de limpiar)
estado DESPUES del corte: {"pendiente_redaccion":41,...,"terminada":3}
```

**Lo que demuestra:** matado sin aviso en mitad de una invocación al modelo, el estado
queda intacto. Ninguna entrada se dio por hecha por haber empezado a procesarse. La
bitácora es append-only y el estado se recompone plegándola, así que una corrida
interrumpida no deja nada a medias.

---

## Registro de operación

`scripts/editorial/registro-de-corridas.mjs` deriva el registro de la bitácora — no es un
log paralelo, porque un segundo log se desincroniza del primero en cuanto alguien olvida
una línea.

Sale con: corrida, inicio, fin, duración, estado y **etapas con fallo**. No sale con
títulos, URLs, prompts ni nombres de repositorio: un registro de operación tiene que
poder pegarse en un ticket sin revisarlo antes.

La tabla completa de las doce corridas está en
`docs/plataforma/registros/2026-09-14-corridas.txt`, y se lee como lo que es: el rastro de
una depuración. Las tres primeras fallan en `redactar`, las del medio en `verificar`, y la
última tanda ya cierra piezas.
