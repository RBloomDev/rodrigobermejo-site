#!/usr/bin/env node
/**
 * Imprime la ruta VALIDADA de `$EDITORIAL_ESTADO_DIR`, o aborta sin escribir nada.
 *
 * POR QUE EXISTE. Hallazgo F-01 de la revision del 2026-09-24 sobre el workflow
 * preparado: el registro de la corrida se escribia con `mkdir -p "$EDITORIAL_ESTADO_DIR"`
 * y una redireccion del shell. El shell no sabe nada de `02-editorial.md` §8.3, asi que
 * con `EDITORIAL_ESTADO_DIR` apuntando dentro del checkout la corrida abortaba
 * —`ejecutar.mjs` si valida— pero el paso del registro, que corre con `always()` porque
 * una corrida fallida es justo la que hay que registrar, creaba el directorio dentro del
 * repositorio PUBLICO y escribia ahi. Y como las dos rutas historicas del canal estan en
 * `.gitignore`, el paso que mide el arbol tampoco lo veia: `git status --porcelain` no
 * lista lo ignorado. El defecto quedaba tapado por la mitigacion que deberia detectarlo.
 *
 * La validacion es la CANONICA —`exigirDirectoriosPrivados()` de `comun.mjs`, la misma que
 * corre el canal—, nunca una copia: una segunda implementacion de la regla es un segundo
 * sitio donde equivocarse, y las dos se desincronizan en la primera correccion que solo se
 * aplique a una.
 *
 * SOBRE EL MENSAJE DE ERROR: sale la VARIABLE y el CODIGO, nunca la ruta. El mensaje de
 * `DirectorioVersionado` la lleva, y la salida de una corrida de Actions en un repositorio
 * publico la lee cualquiera. Es la misma razon por la que el workflow lee las rutas de
 * variables del repositorio en vez de escribirlas en el archivo. Quien necesite el detalle
 * lo reproduce en local, donde el canal si imprime el mensaje entero.
 *
 * Uso:
 *   ruta="$(node scripts/editorial/ruta-estado.mjs)"
 */

import { exigirDirectoriosPrivados } from './comun.mjs';

try {
  // Las DOS, no solo la del estado: si las redacciones caen dentro de un arbol de git la
  // corrida no debe ni empezar, y este es el primer paso del workflow que puede decirlo.
  const { estado } = exigirDirectoriosPrivados();
  process.stdout.write(`${estado}\n`);
} catch (error) {
  const variable = error.variable ?? 'EDITORIAL_ESTADO_DIR / EDITORIAL_REDACCIONES_DIR';
  const codigo = error.codigo ?? error.name ?? 'DESCONOCIDO';
  process.stderr.write(
    `::error::${variable}: ${codigo}. La ruta NO se imprime: este registro es publico. ` +
      'Ver docs/plataforma/02-editorial.md §8.3. No se escribio nada.\n',
  );
  process.exit(1);
}
