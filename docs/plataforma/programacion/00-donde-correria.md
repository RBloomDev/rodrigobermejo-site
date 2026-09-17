# Ejecución programada del canal editorial — preparada, no activada

> **Estado: PROPUESTA.** Nada de esto corre. El archivo de workflow vive en este
> directorio y **no** en `.github/workflows/`, que es donde GitHub lo buscaría.
> Mientras siga aquí no existe para GitHub: no hay cron, no hay ejecución, no hay
> consumo.

Fecha: 2026-09-15 · Rama: `feat/plataforma-editorial-y-actividad`

---

## Dónde podría correr, con lo que ya existe

Se midieron cinco opciones. Cada fila lleva el comando que la produjo.

| Opción | Qué hay ya | Qué falta | ¿La credencial es el bloqueo? |
|---|---|---|---|
| **GitHub Actions, este repo** | 4 workflows activos (`gh workflow list`), ya sobre **Node 24** (`ci.yml:39`), red saliente, checkout escribible. **Cero `schedule`** hoy | Cerrar T-E1, el archivo de workflow y el secret | **Sí; también falta T-E1** |
| VPS propio | Corre crons hoy (`/etc/cron.d/vps-monitor`, cada 5 min) y tiene secrets de acceso vivos | Runtime de Node —sin evidencia de que exista ahí— y acceso SSH para el agente | Sí, más un segundo hueco |
| n8n autoalojado | Crons corriendo hoy, varios workflows activos | Dispara, **no ejecuta Node**. Habría que reescribir la redacción como nodos | Parcialmente |
| n8n personal | 137 workflows, **todos los listados inactivos** | Todo | Sí |
| Vercel cron | — | **No hay `vercel.json` ni `vercel.ts`**. Invoca una ruta HTTP y no persiste ficheros | Sí, y el modelo no encaja |

**Recomendación: GitHub Actions en este mismo repositorio, condicionada a T-E1.**
El runner es efímero: todavía falta resolver la persistencia externa del estado y los
borradores entre corridas. Declarar variables de entorno no proporciona esa persistencia.

La propuesta no requiere contratar un servicio nuevo para la ejecución. Además de la
credencial de inferencia, queda pendiente resolver la persistencia externa en T-E1.

---

## Los seis requisitos, y cómo los cubre la configuración

| Requisito | Cómo | Dónde |
|---|---|---|
| **Persistencia de pendientes y resultados** | Por política, el estado y los borradores viven **fuera de cualquier repositorio**. `EDITORIAL_ESTADO_DIR` y `EDITORIAL_REDACCIONES_DIR` son obligatorias, no tienen valor por defecto y deben apuntar fuera de todo repositorio | entorno de ejecución |
| **Exclusión de ejecuciones simultáneas** | `concurrency.group` nativo de Actions. `cancel-in-progress: false` a propósito: **se encola, no se mata**. Matar a mitad deja trabajo en un estado que nadie cerró | bloque `concurrency` |
| **Reintentos limitados y recuperación** | `MAX_INTENTOS = 3` por entrada en la máquina de estados; a la tercera se descarta con motivo. La corrida **arranca de la bitácora, no del feed**: lo que quedó a medias vuelve a la cola antes que lo detectado hoy | `estado.mjs`, `ejecutar.mjs` |
| **Límites de duración, piezas y consumo** | `timeout-minutes: 25`; `--limite N` acota piezas por corrida; `EDITORIAL_MAX_LLAMADAS` topa las llamadas al modelo | `env` y paso *corrida* |
| **Registros consultables sin contenido sensible** | `registro-de-corridas.mjs` deriva la bitácora a una tabla **sin títulos, URLs, prompts ni nombres de repositorio**. Se sube como artefacto con retención de 30 días | paso *registro de la corrida* |
| **Credencial y forma segura de suministrarla** | Secret del repositorio, leído del entorno. Nunca en el archivo, nunca en la línea de comandos | `env.ANTHROPIC_API_KEY` |

**Estado real al 2026-09-16:** esta política todavía no se cumple en el árbol. Los archivos
de estado y los borradores **todavía están versionados en este repositorio público**, y el
workflow de referencia todavía contiene el paso *persistir estado y corpus*, que los
commitea y empuja a la rama de trabajo al ejecutarse. Sigue sin estar activado. Sacarlos del repositorio, eliminar ese paso y hacer
obligatorias —sin fallback— `EDITORIAL_ESTADO_DIR` y `EDITORIAL_REDACCIONES_DIR` es trabajo
pendiente de T-E1. Sus valores concretos viven únicamente en el `.env` local de Rodrigo;
este documento no declara rutas. En T-E1, `EDITORIAL_REDACCIONES_DIR` sustituirá a la
actual `EDITORIAL_PIEZAS`, pasando de ruta de archivo a ruta de directorio.

Hay además una compuerta que no estaba en la lista y que corre **antes de
commitear nada**: `auditoria-exposicion.mjs`. Este repositorio es público y la
corrida acaba de escribir en disco; si algo nombra un repositorio privado, se
para ahí.

---

## Qué funciona localmente y qué no se ha probado en el entorno de ejecución

Esta distinción es la que importa, y no se difumina.

**Probado localmente, con salida pegada en el PR:**

- Las cuatro etapas del canal de punta a punta, contra fuentes reales.
- Idempotencia: una segunda corrida sobre las mismas entradas no duplica.
- Recuperación: lo pendiente sobrevive al fallo y vuelve a la cola.
- Reintentos topados: tres fallos descartan con motivo.
- `--limite` acota de verdad, incluido `--limite 0` (arreglado en esta entrega:
  antes significaba «sin límite», que es lo contrario).
- `registro-de-corridas.mjs` produce el registro saneado.
- `auditoria-exposicion.mjs --gh` sale limpio.

**NO probado en GitHub Actions, y no lo voy a presentar como si lo estuviera:**

- Que el CLI de inferencia autentique con una API key dentro de un runner. **Es
  el primer supuesto a comprobar**, y puede obligar a usar
  `CLAUDE_CODE_OAUTH_TOKEN` (que genera `claude setup-token`) en vez de
  `ANTHROPIC_API_KEY`. No se ha podido probar porque el secret no existe:
  medido, `gh secret list` devuelve vacío en los tres repos del núcleo.
- Que el commit de vuelta a la rama funcione con los permisos declarados.
- El comportamiento real del `concurrency` bajo dos corridas solapadas.
- Cuánto tarda una corrida completa en un runner, contra los 25 minutos de tope.

**Una corrida manual (`workflow_dispatch`) con `con_redactor: false` no necesita
credencial y comprobaría casi todo lo anterior** salvo la inferencia. Es el
primer paso de prueba una vez cerrado T-E1; no debe activarse antes.

---

## La decisión concreta que hace falta

Una sola, y es de Rodrigo:

> **Crear una credencial de inferencia utilizable sin sesión interactiva y darla
> de alta como secret del repositorio.**

Detalles para tomarla con la información completa:

- **Qué es:** una llave **nueva**, de la consola de Anthropic (`ANTHROPIC_API_KEY`)
  o un token de CLI generado con `claude setup-token`
  (`CLAUDE_CODE_OAUTH_TOKEN`).
- **De dónde NO sale:** no se reutiliza ninguna credencial de otro servicio ni se
  extrae de ninguna sesión personal. La única llave de Anthropic que existe hoy
  en la infraestructura vive dentro de n8n, pertenece a otra persona y a su
  proyecto, y n8n no devuelve su valor. **No es candidata.**
- **Quién la da de alta:** Rodrigo, en *Settings → Secrets and variables →
  Actions*. El agente no puede: su token tiene alcance `gist, read:org, repo` y
  **no** tiene `workflow`, así que tampoco puede instalar el archivo de workflow.
  Eso no es un obstáculo a rodear: es la restricción funcionando.
- **Coste:** es consumo de API por corrida. Con `--limite 1` es una redacción más
  los juicios de verificación. El tope de `EDITORIAL_MAX_LLAMADAS` existe
  precisamente para que un bucle inesperado no se lo coma.

## Activar, cuando se decida

**Prerrequisito: cerrar T-E1 antes de activar el workflow.** Hasta entonces, activarlo
commitea y empuja el estado y el corpus a este repositorio público.

Tres movimientos, en este orden:

1. Dar de alta el secret.
2. Mover `canal-editorial.yml` a `.github/workflows/`.
3. Correrlo a mano (`workflow_dispatch`) y mirar el registro. **Sólo si esa
   corrida sale bien**, descomentar el bloque `schedule`.

Hasta el paso 3 no hay cron. Y la publicación sigue desactivada en cualquier
caso: las piezas se quedan en borrador y con revisión humana pendiente.
