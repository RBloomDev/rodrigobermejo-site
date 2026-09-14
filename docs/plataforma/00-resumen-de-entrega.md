# 00 — Resumen de entrega

> **Estado: BORRADOR — para revisión.** Nada está publicado ni desplegado. No se mergeó
> ningún PR, no se tocó ningún perfil social, no se envió ningún mensaje y no se contrató
> ningún servicio.

Fecha: 2026-09-13 · Rama: `feat/plataforma-editorial-y-actividad`

---

## Qué funciona de verdad

Cosas con comando detrás, salida pegada y verificación en navegador.

| | Evidencia |
|---|---|
| **El canal editorial es idempotente** | Dos corridas sobre las mismas entradas: la primera produce 1 pieza, la segunda `0 nuevos, 50 ya vistos`. Exit 0 en ambas. |
| **Un error de acceso no fabrica una noticia** | El Economista 403 y Anthropic 404 quedan en `errores.jsonl` con código y consecuencia. Cero piezas generadas de esas fuentes. Exit 2, éxito parcial. |
| **La verificación de hechos puede fallar** | Control negativo ejecutado: una cifra inventada da `cifras que no existen en ninguna fuente: 47`; una URL rota da `[404]`; una fecha falsa da `2020-01-01 no aparece; el documento declara 2026-06-18`. Un gate que nunca ha fallado puede estar desconectado. |
| **Una pieza real, de detección real** | `marco-ailit-alfabetizacion-ia-educacion`, detectada en el feed del Observatorio del Tec, corroborada con dos fuentes primarias (OCDE y Comisión Europea) que resuelven 200. |
| **Los filtros filtran** | «Formo» → 2 de 12 proyectos; «Dirijo» → 4; por periodo → 2 y 4; limpiar → 12. Con `aria-pressed` y recuento actualizado. |
| **Accesibilidad medida, no estimada** | 0 fallos de contraste en las cuatro pantallas, mínimo 4.67:1. Recorrido de teclado completo con foco visible en las 35 paradas. Sin scroll horizontal a 320, 400, 768 y 1280 px. |
| **La sonda de contraste puede fallar** | Se le inyectó a propósito un par de 1.64:1 y se puso roja. |

### Las cuatro pantallas

`portada.html` · `noticias.html` · `noticia.html` · `proyectos.html` · `proyecto.html`,
todas en `docs/plataforma/prototipo/`, navegables entre sí con la misma cabecera.

Dirección visual nueva: **«Redacción»**. Un sistema de **regla y columna** —la gramática
común del periódico y de la tabla— porque la misma superficie tiene que sostener una
redacción y un tablero de datos sin partirse en dos productos. **Sin tarjetas**, que es lo
que pediste evitar. Conserva la paleta y las familias tipográficas de la marca, con dos
valores derivados declarados y medidos.

---

## Qué es demostrativo

Marcado en pantalla, no escondido.

- **Cuatro de las cinco piezas de la portada editorial** son ilustrativas y llevan la
  marca amarilla `.simulado`. La quinta —la del marco AILit— es real y no la lleva.
- **Las dos capturas de producto** de `proyecto.html` las generé yo del sitio publicado.
  No existía ninguna captura en el repo: `public/` tiene seis archivos y ninguno es una
  pantalla. Nada las regenera automáticamente, y la pantalla lo dice.
- **La tira de barras mensual** cubre solo el repositorio público del sitio. Trece meses,
  de los cuales nueve tienen fuente. Los meses sin dato no se dibujan como cero.

---

## Qué requiere una decisión tuya

### 1. La enmienda de contrato — `decisions/0015`, en PROPUESTA

De las siete cosas que pediste ver en proyectos, **tres chocaban con prohibiciones
declaradas permanentes**, escritas además en el JSON Schema ejecutable: `hours`,
`agent_sessions`, `tool_calls`.

La salida no fue levantarlas. `00-product-brief.md:65` las prohíbe **«como indicador de
nada»** — el objeto es el uso, no el número. El ADR introduce una tercera clase,
**declaración de proceso**, con seis condiciones, generalizando una decisión que `02` §8
ya había tomado para la IA: *«anotación de procedencia, no métrica de productividad»*.

Conserva íntegros: score, rank, niveles, «ningún número que resuma a una persona»,
tokens, prompts, y **toda** la política de privacidad.

**Mientras siga en PROPUESTA, nada de `docs/plataforma/` es autoridad.**

### 2. La decisión de privacidad que tomé por ti, y que deberías ratificar

Medido: **1,459 PRs creados en 2026, 1,423 mergeados, 1,319 en Inadaptados**.

- **El agregado de 1,459 se publica.** Cubre Inadaptados, RBloomDev y personal: cumple los
  dos sujetos independientes que exige `docs/03` §3 regla 2.
- **El desglose por organización NO se publica.** Aísla a un sujeto único y es atribuible
  por construcción. El umbral k no lo salva: k cuenta eventos, no sujetos.
- **La serie mensual tampoco.** Un bucket mensual es un corte más fino que deja de cubrir
  con holgura los dos sujetos. Se midió y se decidió no publicarla.
- **Ni los cortes que se restan.** Publicar el total y el de RBloomDev despeja el de
  Inadaptados por diferencia, y eso es el cruce reidentificante de la regla 8.

La pantalla **dice que no lo publica y por qué**. Es más creíble que esconderlo.

### 3. Tres huecos que el permiso no llena

1. **Tiempo humano registrado: no existe fuente.** Sin Toggl, sin hoja de horas. Tu Trello
   tiene 81 tarjetas y ni un campo de tiempo. Es el único irrecuperable hacia atrás. Y
   deducirlo de los commits está prohibido — lo pediste tú.
2. **Ejecuciones de agentes: el ledger está vacío.** `proof-engine/ledger/` contiene un
   `.gitkeep` de 0 bytes. `rbloom-os` tiene siete agentes definidos y **una** línea de
   heartbeat, del 2026-04-03.
3. **Participación de IA más allá del trailer de commit.** Lo que sí es medible: 23 de 28
   commits de este repo llevan `Co-Authored-By`. Pero **la serie no es comparable entre
   repos**: el 0% de `rbloom-os` es un artefacto de cuándo se activó el trailer, no una
   medida de método.

### 4. El detalle detrás de cada cifra llega hasta donde permita `decisions/0013`

Sigue en PROPUESTA. Nadie ha autorizado publicar registros individuales de `Evidence`, y
mientras tanto el motor aborta si llega evidencia al artefacto.

---

## Sobre la operación: qué es real y qué no

Lo pediste explícitamente y la respuesta es incómoda.

**No existe un runtime de orquestación funcionando.** Medido:

- Las 37 «ejecuciones» de `rbloom-automation` son **todas de Copilot code review**, un
  workflow dinámico de GitHub. Cero workflows propios.
- `rbloom-os/orchestrator/` contiene **solo archivos `.md`**. `agents/dev-agent` son ocho
  `.md` y un `memory/` vacío: son personas de agentes, no agentes.
- Existe `setup-cron.sh` apuntando a un VPS, y trae su propia prueba negativa: incluye un
  auto-commit diario a git. Si estuviera corriendo, `rbloom-os` tendría commits diarios.
  **No se actualiza desde abril.**

**Lo entregado es ejecución local.** `node scripts/editorial/ejecutar.mjs` corre a mano y
termina. No hay proceso persistente, ni programador, ni recuperación de errores más allá
del registro. **No se declara operación 24/7 porque no la hay.**

La dependencia concreta para pasar de local a programado: un proceso persistente con
registro consultable. Ni se contrató nada, ni se activó publicación automática.

---

## Un hallazgo que cambia el alcance

**Tu universo son 218 repositorios en cuatro organizaciones** —`ISC-UPA`, `Inadaptados`,
`RBloomDev`, `TerracotaFloreria`— de los que **163 son privados**. Solo `Inadaptados`
tiene 96, con actividad de hoy.

El Registry del feed declara **12 proyectos**. No es un error: un proyecto no es un
repositorio. Pero la correlación entre los 12 proyectos y los 218 repos es donde está el
trabajo real, y hoy **no existe**: el ledger está vacío y no hay tabla de alias de autor.
En `indptdos-lms` solo el 70% de los commits son tuyos, y en SSP el 67%.

Entre esos repos privados hay `curricula-software-developer`,
`curricula-maestria-ia-online`, `indptdos-lms` e `inadaptados-certs`: **evidencia real de
las dimensiones LEAD y TEACH que el feed declara y hoy no puede probar**.

---

## Cuatro errores míos que corrigieron los agentes

Se registran porque el proceso importa tanto como el resultado.

1. Escribí que el **DOF** tenía el certificado TLS roto y `datos.gob.mx` caído. **Falso**:
   probé la URL equivocada. El DOF tiene API JSON sin llave y es la única fuente oficial
   mexicana con cadencia diaria. Por poco descarto la pieza clave de la cobertura
   regulatoria.
2. Escribí que **El Economista** daba 403 «en todas las rutas». Falso: `/rss/tecnologia`
   da 403, `/rss/ultimas-noticias` da 200.
3. Di **24 PRs** como cifra de actividad. El real es **1,459**: medí un solo repositorio.
4. Introduje en `sistema.css` un `.btn:hover` con blanco sobre `#0e8f93` — **3.91:1,
   falla AA**. Lo escaló el agente que construía las noticias, que hizo bien en no tocar
   un archivo ajeno. Corregido cambiando de familia de color en lugar de oscurecer.

---

## Lo que no bloquea esta propuesta

Pediste que los pendientes de titular, localidad y Facebook no la detuvieran. No lo hacen:
el titular se mantiene como en la Fase 1, la localidad sigue retirada a la espera de tu
decisión, y el kit social de la entrega anterior no se tocó.

---

## Archivos

```
docs/decisions/0015-actividad-proceso-y-editorial.md   la enmienda, en PROPUESTA
docs/plataforma/00-resumen-de-entrega.md               este documento
docs/plataforma/02-editorial.md                        spec del canal y fuentes verificadas
docs/plataforma/03-catalogo-de-metricas.md             25 métricas con sus 7 columnas
docs/plataforma/prototipo/                             las cinco pantallas + sistema.css
docs/plataforma/prototipo/datos/                       la pieza real y su adaptación social
scripts/editorial/                                     el canal, Node puro, sin dependencias
```
