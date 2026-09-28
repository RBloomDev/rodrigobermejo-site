/**
 * LA PRUEBA NEGATIVA de la separacion: si `generar` volviera a sellar —o sea, si siguiera
 * haciendo las dos etapas—, la comprobacion de `tres-comandos.test.mjs` se pone ROJA.
 *
 * **Por que esto es un archivo aparte y no un caso mas.** Una comprobacion verde no dice si
 * mide algo o si no puede fallar, y las dos cosas se ven igual desde fuera. La unica manera
 * de distinguirlas es romper a proposito lo que la comprobacion afirma y exigir el rojo. Ese
 * rojo vive aqui, con su propio nombre, para que se pueda correr y leer solo:
 *
 *     node --test --conditions=react-server scripts/editorial/pruebas/tres-comandos-falsable.test.mjs
 *
 * **Y es LA MISMA comprobacion**, importada de `separacion-de-etapas.mjs`, no una copia. Si
 * fuera una copia, este archivo podria estar poniendo roja una comprobacion que ya no es la
 * que el otro usa para declarar verde, y entonces no demostraria nada sobre aquella. Por eso
 * el primer caso de abajo es el control: la misma funcion, con el `generar` real, tiene que
 * PASAR. Una sonda que sale roja con todo no distingue nada.
 *
 * Sin red y sin inferencia: todas las etapas se inyectan como dobles (`ayuda.mjs`).
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { exigirQueGenerarNoSelle, FALLO_ESPERADO } from './separacion-de-etapas.mjs';
import { generar } from '../generar.mjs';
import { verificarPendientes } from '../verificar-canal.mjs';

/**
 * EL MUTANTE: `generar` y, a continuacion, la etapa de verificacion. Es exactamente el
 * comando de antes de partirlo —detectar, redactar, verificar y sellar de un tiron—
 * envuelto en el nombre nuevo, que es el atajo que §8.1 prohibe: «dos scripts que llamaran
 * al mismo comando con una bandera distinta serian dos puertas al mismo comando».
 */
const generarQueTambienSella = async (banderas, inyeccion) => {
  const r = await generar(banderas, inyeccion);
  await verificarPendientes(banderas, inyeccion);
  return r;
};

test('CONTROL: con el `generar` real, la comprobacion PASA', async () => {
  // Sin esto, un rojo abajo no probaria la separacion: probaria que la comprobacion falla
  // siempre. Los dos casos juntos son los que dicen que discrimina.
  await exigirQueGenerarNoSelle(generar, 'falsable-control');
});

test('PRUEBA NEGATIVA: un `generar` que ademas sella pone ROJA la comprobacion', async () => {
  await assert.rejects(
    () => exigirQueGenerarNoSelle(generarQueTambienSella, 'falsable-mutante'),
    (e) => {
      assert.match(
        e.message,
        FALLO_ESPERADO,
        `la comprobacion tenia que fallar por la separacion, fallo por: ${e.message}`,
      );
      return true;
    },
    'con un `generar` que sella, la comprobacion TIENE que ponerse roja',
  );
});
