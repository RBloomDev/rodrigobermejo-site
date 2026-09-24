# Migrar el estado editorial fuera del repositorio

**Qué es esto.** El procedimiento operativo para mover a su directorio privado los
archivos de estado del canal editorial que estuvieron versionados en este repositorio
**público**. No es especificación: la norma está en `02-editorial.md` §8.3 y §8.6, y este
documento solo dice cómo ejecutarla sin perder nada.

**Por qué existe por separado.** Las rutas privadas no se pueden escribir en un archivo
versionado —una ruta escrita aquí es una ruta publicada, y volvería a fabricar el default
que acabamos de quitar—. Así que el comando va parametrizado por las dos variables, y los
valores los pone quien lo corre.

---

## Qué pasó ya, y qué falta

| Paso | Estado |
|---|---|
| Los cinco archivos dejan de estar rastreados por git | **Hecho** en este cambio, con `git rm --cached`: el índice ya no los lleva |
| Las dos rutas quedan en `.gitignore` | **Hecho**: un `git add` normal ya no los devuelve |
| `npm run guard:estado-editorial` falla si vuelven al índice | **Hecho**: cubre incluso el `git add -f` |
| Los archivos se mueven al directorio privado | **Falta**, y es lo que hace este documento. Siguen en disco, sin rastrear, en `scripts/editorial/estado/` y `scripts/editorial/redacciones/` |

**Desrastrear no es borrar, y no moverlos todavía es deliberado.** Un `git rm --cached`
que dejara a Rodrigo sin bitácora sería un defecto, no una limpieza: la bitácora es donde
vive el nivel 3 de deduplicación (§5.2), y perderla hace que todo hecho ya visto vuelva a
entrar como nuevo. Los archivos siguen exactamente donde estaban, con su contenido
intacto; lo único que cambió es que git ya no los mira.

**Lo que este cambio NO deshace.** Los cinco archivos siguen en el historial público del
repositorio. Desrastrearlos impide que sigan publicándose; no despublica lo ya publicado.
Eso es una decisión aparte —reescribir historia de un repo público— y no se toma aquí.

---

## Antes de mover: elegir el directorio

Dos requisitos, los dos duros (§8.3):

1. **Fuera de todo árbol de trabajo de git.** Ni este repositorio ni otro. Un directorio
   privado dentro de un repo privado tampoco vale: la regla es que el estado no está
   versionado, no que el repositorio sea discreto. Comprobación:
   `git -C <dir> rev-parse --is-inside-work-tree` tiene que **fallar**.

   **Esto ya no depende de que te acuerdes.** El canal comprueba la ruta resuelta al
   arrancar y **aborta** si cae dentro de un árbol de git, nombrando la variable y el árbol
   que encontró (`comun.mjs`, `DirectorioVersionado`). Si eliges mal, no descubres el
   defecto meses después leyendo un `git status`: no arranca. Y por eso mismo, la ruta que
   pongas tiene que cumplirlo de verdad — quitar el valor por defecto cerró el camino
   silencioso, pero `EDITORIAL_ESTADO_DIR=./scripts/editorial/estado` habría vuelto a
   escribir dentro del repositorio con el `.gitignore` nuevo tapándolo.
2. **Persistente entre corridas.** Nada de `tmpdir`. Perder el estado en silencio no es
   mejor que publicarlo en silencio: rompe la deduplicación sin decirlo.

Y una advertencia que §8.5 desarrolla: **un directorio local fuera de git da persistencia
local y NO es un respaldo.** No sobrevive a la máquina. Sacar el estado del repositorio
resuelve la exposición, no la durabilidad.

## El comando

Se corre **una vez**. Mueve, no copia: dejar una copia en la ruta histórica es dejar el
problema a medias.

### PowerShell (Windows)

```powershell
$env:EDITORIAL_ESTADO_DIR      = '<tu ruta privada>\editorial\estado'
$env:EDITORIAL_REDACCIONES_DIR = '<tu ruta privada>\editorial\redacciones'

New-Item -ItemType Directory -Force -Path $env:EDITORIAL_ESTADO_DIR, $env:EDITORIAL_REDACCIONES_DIR | Out-Null

Move-Item scripts\editorial\estado\*.jsonl      $env:EDITORIAL_ESTADO_DIR
Move-Item scripts\editorial\redacciones\*.json  $env:EDITORIAL_REDACCIONES_DIR

Remove-Item scripts\editorial\estado, scripts\editorial\redacciones -Force
```

### bash

```bash
export EDITORIAL_ESTADO_DIR="<tu ruta privada>/editorial/estado"
export EDITORIAL_REDACCIONES_DIR="<tu ruta privada>/editorial/redacciones"

mkdir -p "$EDITORIAL_ESTADO_DIR" "$EDITORIAL_REDACCIONES_DIR"

mv scripts/editorial/estado/*.jsonl     "$EDITORIAL_ESTADO_DIR"/
mv scripts/editorial/redacciones/*.json "$EDITORIAL_REDACCIONES_DIR"/

rmdir scripts/editorial/estado scripts/editorial/redacciones
```

Los cinco archivos que se mueven, que son los que `git ls-files scripts/editorial`
devolvía el 2026-09-17:

```
scripts/editorial/estado/bitacora.jsonl
scripts/editorial/estado/errores.jsonl
scripts/editorial/estado/fallos.jsonl
scripts/editorial/estado/vistos.jsonl
scripts/editorial/redacciones/marco-ailit-alfabetizacion-ia-educacion.json
```

Después, las dos variables van al `.env` de la máquina —no a un archivo del repositorio—
para que el canal las encuentre en cada corrida.

## Comprobar que salió bien

Cuatro comprobaciones, y cada una mide algo distinto:

```bash
# 1. git no rastrea nada de estado. Sale 0.
npm run guard:estado-editorial

# 2. El canal aborta si las variables no están. Sale != 0 y no escribe nada.
env -u EDITORIAL_ESTADO_DIR -u EDITORIAL_REDACCIONES_DIR node scripts/editorial/ejecutar.mjs

# 3. Las rutas históricas ya no existen en disco. Las dos salen 1 (no existe).
test -e scripts/editorial/estado ; echo $?
test -e scripts/editorial/redacciones ; echo $?

# 4. La bitácora llegó entera: el conteo tiene que coincidir con el de antes de mover.
wc -l "$EDITORIAL_ESTADO_DIR"/bitacora.jsonl
```

La 4 es la que importa para no perder trabajo. Antes de mover, el conteo era:
`bitacora.jsonl` 107 líneas, `errores.jsonl` 28, `fallos.jsonl` 30, `vistos.jsonl` 50.

## Si algo sale mal

El estado es **append-only** y ningún paso de aquí reescribe una línea, así que la
reversión es mover los archivos de vuelta. Lo único irreversible sería borrarlos, y por
eso el comando usa `mv`/`Move-Item` y nunca `rm` sobre los archivos —el `rmdir` final
solo quita directorios ya vacíos, y falla si no lo están, que es justo lo que se quiere—.
