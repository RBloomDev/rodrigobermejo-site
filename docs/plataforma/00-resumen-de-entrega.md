# 00 — Resumen de entrega

> **Estado: BORRADOR — para revisión.** Nada está publicado ni desplegado. No se mergeó
> ningún PR, no se tocó ningún perfil social, no se envió ningún mensaje y no se contrató
> ningún servicio.

Fecha: 2026-09-13 · WakaTime resondeado el 2026-09-14 · Rama: `feat/plataforma-editorial-y-actividad`

> **Este repositorio es PÚBLICO.** Estos documentos **no** nombran repositorios no públicos,
> ni publican conteos atribuidos a una organización, ni series mensuales de actividad
> privada, ni el reparto público/privado, ni la composición de autoría de ningún repositorio
> no público, ni el número total de repositorios. Lo medido y retirado se describe —sin
> reproducirlo— en `03-catalogo-de-metricas.md` §Decisiones pendientes. La compuerta que lo
> verifica es `node scripts/auditoria-exposicion.mjs`.

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
| **El canal no se deja usar como proxy** | Una revisión de seguridad encontró SSRF: las URLs vienen de feeds de terceros y se seguían redirecciones a ciegas. Guarda en `red-segura.mjs`, aplicada en la única puerta de red del canal. 22 pruebas, incluida la del 302 hacia la IP de metadatos. |
| **Esas pruebas pueden fallar** | Comprobado rompiendo la guarda a propósito, dos veces: desactivar el veto de IPv4 pone 6 en rojo; cambiar `manual` por `follow` pone 1. La primera versión de esa prueba **seguía verde con la guarda rota** —el doble de `fetch` ignoraba la opción `redirect`— y se corrigió. |

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

### 2. La decisión de privacidad que tomé por ti — y que corregí a la baja

**Este repositorio es público.** La entrega anterior sostenía que el agregado de pull
requests de todos tus contextos **sí** era publicable «porque combina organizaciones». **Eso
era falso y lo retiro.** Combinar sujetos es necesario pero no suficiente: si **un solo
sujeto aporta la mayor parte del total**, el total es un proxy de ese sujeto y publicarlo es
publicarlo a él con ruido encima. Lo medí, y eso es exactamente lo que pasa con el agregado
de GitHub.

La conclusión correcta es más restrictiva:

- **De GitHub, hoy solo se publican las cifras que provienen de repositorios públicos.** Son
  las únicas que un tercero puede recontar por su cuenta y las únicas que no revelan volumen
  de trabajo no publicado. En la práctica: el repositorio de este sitio y `habit-tracker`.
- **El agregado total no se publica.** Ni el total, ni su serie mensual, ni el desglose por
  organización, ni ningún par de cortes que se resten entre sí — publicar dos despeja el
  tercero por diferencia, que es el cruce reidentificante de `docs/03` §3 regla 8.
- **El umbral k no lo salva:** k cuenta eventos, no sujetos.
- **La única excepción medida son las horas de M-21** (ver punto 3). Ahí ningún proyecto
  llega a un cuarto del total, así que el agregado no es proxy de nadie y sí pasa la prueba.

Las cifras concretas del agregado y de su reparto **están medidas y retiradas de estos
documentos**; no se copiaron a ningún otro archivo, porque no hay una ubicación privada
autorizada. Están descritas, sin reproducirlas, en `03-catalogo-de-metricas.md`
§Decisiones pendientes. **Si quieres publicar un agregado de GitHub, esa es una decisión
tuya y hace falta tomarla explícitamente.**

La pantalla **dice que no lo publica y por qué, sin decir cuánto**. Explicar la regla da
credibilidad; ilustrarla con el dato real la rompe.

### 3. El tiempo humano ya no es un hueco — y los dos que quedan

1. **Tiempo humano: sí hay fuente, y la entrega anterior se equivocó.** Dije que no existía
   ninguna. Existe: **WakaTime**, con credencial configurada. Sondeado el 2026-09-14 con
   `node scripts/editorial/sonda-wakatime.mjs --dias 30` (no imprime la clave y seudonimiza
   los proyectos): **145.7 h en la ventana de 30 días, con dato en 28 de 31 días** — y
   **516 h con dato en 82 de 91** si la ventana se abre a 90 días, que es la que usa el
   prototipo.
   - **No son «horas trabajadas».** Es tiempo con actividad en un editor instrumentado, con
     timeout de inactividad. No cubre reuniones, diseño, lectura, docencia presencial, ni
     trabajo en una máquina sin el plugin.
   - **Cobertura temporal alta; cobertura del trabajo, desconocida.** 28 de 31 días es lo
     primero. Qué fracción de tu trabajo real cae dentro del editor **no se puede derivar** y
     no se estima.
   - **Publicable con agregación**, con dos condiciones duras: **nunca por proyecto** —los
     nombres de proyecto de WakaTime son nombres de repositorios— y **nunca sumada** a
     duración de ejecuciones de agentes.
   - **Y ningún ratio.** Ahora que hay denominador, dividir es más tentador y sigue igual de
     prohibido: ni horas por commit, ni horas ahorradas, ni % de trabajo hecho por IA.
   - El error de método queda registrado: la búsqueda cubrió el repositorio y Trello, y
     concluyó «no existe» cuando lo correcto era «no existe **aquí**».
2. **Ejecuciones de agentes: el ledger está vacío.** El `ledger/` del motor de evidencia
   contiene un `.gitkeep` de 0 bytes. El repositorio de orquestación de agentes tiene siete
   agentes definidos y **una** línea de heartbeat, del 2026-04-03. Ni las ejecuciones ni su
   duración tienen fuente, y WakaTime no las llena: mide actividad humana, no de agentes.
3. **Participación de IA más allá del trailer de commit.** Lo que sí es medible: 23 de 28
   commits de este repositorio público llevan `Co-Authored-By`. Pero **la serie no es
   comparable entre repos**: donde marca 0 % es un artefacto de cuándo se activó el trailer,
   no una medida de método.

### 4. El detalle detrás de cada cifra llega hasta donde permita `decisions/0013`

Sigue en PROPUESTA. Nadie ha autorizado publicar registros individuales de `Evidence`, y
mientras tanto el motor aborta si llega evidencia al artefacto.

---

## Sobre la operación: qué es real y qué no

Lo pediste explícitamente y la respuesta es incómoda.

**No existe un runtime de orquestación funcionando.** Medido:

- Las «ejecuciones» de CI del repositorio de automatización interna son **todas de Copilot
  code review**, un workflow dinámico de GitHub. Cero workflows propios.
- En el repositorio de orquestación, `orchestrator/` contiene **solo archivos `.md`**, y
  `agents/dev-agent` son ocho `.md` y un `memory/` vacío: son personas de agentes, no
  agentes.
- Existe un `setup-cron.sh` apuntando a un VPS, y trae su propia prueba negativa: incluye un
  auto-commit diario a git. Si estuviera corriendo, ese repositorio tendría commits diarios.
  **No se actualiza desde abril.**

**Lo entregado es ejecución local.** `node scripts/editorial/ejecutar.mjs` corre a mano y
termina. No hay proceso persistente, ni programador, ni recuperación de errores más allá
del registro. **No se declara operación 24/7 porque no la hay.**

La dependencia concreta para pasar de local a programado: un proceso persistente con
registro consultable. Ni se contrató nada, ni se activó publicación automática.

---

## Un hallazgo que cambia el alcance

**Tu universo de repositorios es mucho más grande que la lista del encargo**, se reparte en
varias organizaciones y **la mayor parte no es pública**. El encargo nombraba cinco
repositorios de dos organizaciones; medí bastantes más, en más organizaciones, y las que
faltaban son donde vive la mayor parte del trabajo. Los conteos —cuántos en total, cuántos
no públicos, cuántos por organización— **están medidos y no se publican aquí**: este
repositorio es público y esos números son, en sí mismos, información sobre trabajo no
publicado. Ver `03-catalogo-de-metricas.md` §Cobertura y §Decisiones pendientes.

El Registry del feed declara **12 proyectos**. No es un error: un proyecto no es un
repositorio. Pero la correlación entre esos 12 proyectos y el universo real de repositorios
es donde está el trabajo, y hoy **no existe**: el ledger está vacío y no hay tabla de alias
de autor. En los repositorios con equipo, además, una parte de los commits es de otras
personas — qué parte es composición de equipo de un proyecto no público y tampoco se
publica.

Entre los repositorios no públicos hay varios de **currícula, plataforma educativa y
certificación**: **evidencia real de las dimensiones LEAD y TEACH que el feed declara y hoy
no puede probar**. Nombrarlos aquí sería publicar la línea de trabajo que todavía no está
publicada, así que se describen por su función y no por su nombre.

---

## Cinco errores míos que corrigieron los agentes

Se registran porque el proceso importa tanto como el resultado.

1. Escribí que el **DOF** tenía el certificado TLS roto y `datos.gob.mx` caído. **Falso**:
   probé la URL equivocada. El DOF tiene API JSON sin llave y es la única fuente oficial
   mexicana con cadencia diaria. Por poco descarto la pieza clave de la cobertura
   regulatoria.
2. Escribí que **El Economista** daba 403 «en todas las rutas». Falso: `/rss/tecnologia`
   da 403, `/rss/ultimas-noticias` da 200.
3. Di **24 PRs** como cifra de tu actividad de 2026 midiendo **un solo repositorio**. El
   número real es de otro orden de magnitud — y resultó no ser publicable, así que el error
   se corrige diciendo que la cifra estaba mal, no sustituyéndola por la buena.
4. Declaré el **tiempo humano** como dato inexistente. Existe: la búsqueda cubrió el
   repositorio y Trello, y no miró fuera. Ver el punto 3 de «Qué requiere una decisión
   tuya».
5. Introduje en `sistema.css` un `.btn:hover` con blanco sobre `#0e8f93` — **3.91:1,
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
docs/plataforma/03-catalogo-de-metricas.md             25 métricas (M-01 a M-25) con sus 7 columnas
docs/plataforma/prototipo/                             las cinco pantallas + sistema.css
docs/plataforma/prototipo/datos/                       la pieza real y su adaptación social
scripts/editorial/                                     el canal, Node puro, sin dependencias
scripts/editorial/sonda-wakatime.mjs                   caracteriza la fuente de tiempo humano, sin publicarla
scripts/auditoria-exposicion.mjs                       compuerta: detecta fuga de datos privados en el árbol público
```

**Recuento de métricas, reconciliado:** el catálogo enumera **25** métricas, `M-01` a
`M-25`, y las categorías de su §Resumen suman ahora esas mismas 25. En la entrega anterior
sumaban 24 porque contaban las tres prohibidas por contrato, que están **fuera** de la
tabla a propósito.
