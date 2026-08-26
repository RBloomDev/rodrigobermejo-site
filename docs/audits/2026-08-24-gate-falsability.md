# Demostración de falsabilidad de los gates — 2026-08-24

`AGENTS.md` → *Principio de verificación* #4: **«Un gate debe demostrar que puede fallar. Verde no prueba nada por sí solo: rompe el gate a propósito una vez, comprueba que falla, y restaura. Un gate que nunca ha fallado puede estar desconectado.»**

Este documento existe porque hasta hoy solo había ejecuciones verdes. Un verde es compatible con dos mundos: el gate funciona y el código está bien, o el gate no está conectado a nada. Solo una ejecución en rojo distingue uno del otro. Cierra los findings **P1-GATE-01** y la parte de mutación de **P1-TEST-01**.

Ejecutado en local (Node `v24.18.0`, Windows), rama `chore/proof-sprint-0`. Los seis experimentos son mutaciones **temporales**, revertidas inmediatamente; ninguna sobrevive en el árbol de trabajo.

**Cobertura.** Los **cuatro** gates mecánicos (`typecheck`, `lint`, `test`, `build`) más el guard `guard:funnel` tienen aquí al menos un fallo provocado y observado. En la versión anterior de este documento `build` y `guard:funnel` no la tenían, y eso era el finding P1-GATE-01 reabierto por el Reviewer.

> **Corrección (2026-08-26).** Este párrafo decía además «no queda ningún gate sin demostración», y era **inexacto**. Los seis experimentos de abajo cubren `typecheck`, `lint`, `test`, `build`, `guard:funnel` y la regla ESLint `no-console`, pero **ninguno provoca el `exit 1` del paso `No direct stdout/stderr writes in PII routes`** del job `privacy guard`, que es parte de un status check obligatorio. Ese hueco quedó cubierto por el probe B de `2026-08-26-ci-gate-wiring.md`. La frase se retira en lugar de matizarse: declarar cobertura total teniendo un paso sin falsar es el mismo defecto que este documento existe para corregir.

| Gate | Experimento | Falló |
|---|---|---|
| `npm test` | 1, 1b, 2 | sí |
| `npm run typecheck` | 3 | sí |
| `npm run lint` | 4 | sí |
| `npm run build` | 5 | sí (exit 66) |
| `npm run guard:funnel` | 6 | sí (exit 1) |

---

## Estado de partida: los cinco comandos en verde

```
$ npm run typecheck
> tsc --noEmit
                                    (sin salida, exit 0)

$ npm run lint
> eslint --max-warnings 0
                                    (sin salida, exit 0)

$ npm test
ℹ tests 26
ℹ pass 26
ℹ fail 0

$ npm run guard:funnel
OK: funnel desacoplado. 8 entradas, 18 modulos en el cierre transitivo.

$ npm run build
✓ Compiled successfully in 7.0s
✓ Generating static pages using 7 workers (11/11) in 459.5ms
                                    (11 rutas, exit 0)
```

---

## 1 · `npm test` detecta la reintroducción de P1-SUB-01

El defecto original: **todo 400 del proveedor se devolvía como suscripción correcta**. Mutación aplicada en `app/api/subscribe/policy.ts`, en `classifyUpstream`:

```diff
   if (status >= 200 && status < 300) return "created";
-  if (status === 400 && providerCode.toLowerCase() === DUPLICATE_CODE) {
-    return "duplicate";
-  }
+  if (status === 400) return "duplicate"; // MUTACION TEMPORAL: P1-SUB-01 reintroducido
   return "failed";
```

Resultado — **el gate falla**:

```
✖ ningun otro codigo con forma de duplicado se acepta como exito (1.2889ms)
    actual: 'duplicate',
    expected: 'failed',
✖ cuota diaria: un 400 de limite NO es exito (0.2285ms)
    actual: 'duplicate',
    expected: 'failed',
✖ email invalido: un 400 de validez usa el error generico (0.1438ms)
    actual: 'duplicate',
    expected: 'failed',
✖ un 400 con codigo desconocido falla, no miente (0.1306ms)
    actual: 'duplicate',
    expected: 'failed',
✖ todo fallo del proveedor tiene la misma forma para el cliente (0.8555ms)
    actual: { status: 200, body: { success: true } },
    expected: { status: 502, body: { error: 'Error al suscribir' } },

ℹ tests 26
ℹ pass 21
ℹ fail 5
```

Lo que esto demuestra, con precisión: si alguien vuelve a colapsar los 400 a éxito, el límite diario de creación de Buttondown, un `email_invalid` y un código desconocido dejan de pasar. No demuestra que la clasificación sea correcta frente a la API real de Buttondown — el nombre del código del proveedor sigue siendo un supuesto, tabulado como tal en `04-architecture.md` §4.1.

## 1b · `npm test` detecta el reconocimiento «por parecido» del duplicado

Esta es la versión debilitada que el Reviewer marcó como P1-SUB-01 todavía abierto: aceptar como éxito cualquier código que *se parezca* a un duplicado, más un 409 incondicional. Mutación:

```diff
-  if (status === 400 && providerCode.toLowerCase() === DUPLICATE_CODE) {
-    return "duplicate";
-  }
+  // MUTACION TEMPORAL: reconocimiento "por parecido" del codigo de duplicado
+  if (status === 409) return "duplicate";
+  if (status === 400 && /already[_ -]?(exists|subscribed)/.test(providerCode)) {
+    return "duplicate";
+  }
```

Resultado — **el gate falla**:

```
✖ colision: solo 400 con email_already_exists es exito (1.5409ms)
    actual: 'failed',
    expected: 'duplicate',
✖ ningun otro codigo con forma de duplicado se acepta como exito (0.4753ms)
    actual: 'duplicate',
    expected: 'failed',
✖ un 409 no es exito (0.272ms)
    actual: 'duplicate',
    expected: 'failed',

ℹ tests 26
ℹ pass 23
ℹ fail 3
```

Los tests cubren las dos direcciones del error: el código autorizado tiene que seguir siendo éxito (primer fallo, provocado de paso porque la mutación pierde el `toLowerCase`), y ningún otro puede serlo (segundo y tercero).

## 2 · `npm test` detecta la regresión de la validación de entrada

El defecto original: `email.includes("@")`. Mutación en `isValidEmail`:

```diff
-  return (
-    typeof value === "string" &&
-    value.length <= EMAIL_MAX_LENGTH &&
-    EMAIL_PATTERN.test(value)
-  );
+  // MUTACION TEMPORAL: la validacion original del baseline.
+  return typeof value === "string" && value.includes("@");
```

Resultado — **el gate falla**:

```
✖ isValidEmail rechaza lo que includes("@") aceptaba (0.8911ms)
    actual: true,
    expected: false,

✖ isValidEmail tiene techo de longitud (0.1925ms)
    actual: true,
    expected: false,

ℹ tests 26
ℹ pass 24
ℹ fail 2
```

Caen las dos ramas: la forma de la dirección y el techo de longitud (254).

## 3 · `npm run typecheck` falla con un error de tipo deliberado

Mutación en `app/api/subscribe/policy.ts`:

```diff
-export const EMAIL_MAX_LENGTH = 254;
+export const EMAIL_MAX_LENGTH: number = "254"; // MUTACION TEMPORAL: error de tipo
```

Resultado — **el gate falla**:

```
$ npm run typecheck
> tsc --noEmit

app/api/subscribe/policy.ts(19,14): error TS2322: Type 'string' is not assignable to type 'number'.
```

`tsc` reporta el error y termina con código distinto de cero, que es lo que hace fallar el step `Typecheck` del job `typecheck / lint / test / build`.

## 4 · El guard de PII falla ante el `console.log` que existe para impedir

Protege el invariante de `03-privacy-and-publication-policy.md` §4. Mutación en `app/api/subscribe/route.ts`, reintroduciendo el defecto P1 del baseline:

```diff
+  console.log("MUTACION TEMPORAL: fuga de PII", email); // el defecto P1 del baseline
+
   const { status, body } = clientResponseFor(outcome);
```

Resultado — **el gate falla**:

```
$ npm run lint
> eslint --max-warnings 0

C:\Users\Admin\Desktop\rodrigobermejo-site\app\api\subscribe\route.ts
  134:3  error  Unexpected console statement. Only these console methods are allowed: error  no-console

✖ 1 problem (1 error, 0 warnings)
```

**Y lo que esta demostración no prueba.** Que el guard detecte `console.log(email)` no significa que detecte una fuga de PII: la regla es sintáctica. Sigue sin cubrir la desestructuración del global (`const { log } = console`), un logger propio o de terceros, un `console.error` cuyo argumento sí contenga la dirección, y el envío del payload a un tercero. El alcance exacto está tabulado en `04-architecture.md` §4.1 y hay que leerlo antes de confiar en este verde. Un gate falsable sigue siendo una mitigación acotada, no una garantía.

## 5 · `npm run build` falla por una causa que `typecheck` no ve

El experimento tenía que elegir una mutación **independiente** de la del experimento 3. Un error de tipo hace fallar `build` también, pero entonces `build` no aportaría señal propia: solo estaría repitiendo `typecheck`. La mutación elegida es un fallo en tiempo de *prerender*, invisible para `tsc` porque el tipo (`string`) es correcto y solo el valor está mal. Mutación en `lib/posts.ts`:

```diff
-const postsDirectory = path.join(process.cwd(), 'content/posts');
+const postsDirectory = path.join(process.cwd(), 'content/articulos'); // MUTACION TEMPORAL
```

Primero, la comprobación de que la señal es independiente — **`typecheck` pasa**:

```
$ npm run typecheck
> tsc --noEmit
                                    (sin salida, exit 0)
```

Y **el gate `build` falla**:

```
$ npm run build
> next build

▲ Next.js 16.1.1 (Turbopack)

  Creating an optimized production build ...
✓ Compiled successfully in 6.1s
  Running TypeScript ...
  Collecting page data using 7 workers ...
Error: ENOENT: no such file or directory, scandir 'C:\Users\Admin\Desktop\rodrigobermejo-site\content\articulos'
    at Object.l [as generateStaticParams] (...)
  errno: -4058,
  code: 'ENOENT',
  syscall: 'scandir',
  path: 'C:\\Users\\Admin\\Desktop\\rodrigobermejo-site\\content\\articulos'

> Build error occurred
Error: Failed to collect page data for /blog/[slug]
```

Exit code observado: **66**. Esto es lo que `typecheck` estructuralmente no puede detectar: el contenido del sitio se lee del disco en build-time (`lib/posts.ts` usa `fs`), así que un contenido que desaparece o se mueve solo se manifiesta al generar las páginas. `build` no es un `typecheck` más lento.

**Nota operativa, y merece registrarse porque costó una ejecución.** Revertir el fuente no bastó: el `npm run build` siguiente terminó en *segmentation fault*, no en verde, por el `.next/` que dejó el build fallido. Hubo que borrar `.next/` para recuperar el verde. Un fallo de build deja caché envenenada; si alguien repite este experimento y ve un crash tras restaurar, es esto y no una regresión.

## 6 · `guard:funnel` falla ante un acoplamiento **transitivo**

El guard existe porque su versión anterior era un grep sobre ocho archivos, que un import indirecto evadía. La mutación se diseña para atacar exactamente eso: el funnel **no** importa el módulo de evidencia directamente, lo alcanza a través de un componente compartido. Dos cambios temporales — un módulo nuevo `lib/proof/feed.ts`:

```ts
export const FEED_VERSION = "v1";
```

y un import en `components/ui/Button.tsx`, que `Hero` ya usaba:

```diff
 import { clsx } from "clsx";
+import { FEED_VERSION } from "@/lib/proof/feed"; // MUTACION TEMPORAL
```

Resultado — **el gate falla**, y nombra la cadena completa:

```
$ npm run guard:funnel
> node scripts/check-funnel-isolation.mjs

::error::El funnel alcanza el sistema de evidencia (lib/proof): components/Hero.tsx -> components/ui/Button.tsx -> lib/proof/feed.ts
::error::El funnel alcanza el sistema de evidencia (lib/proof): components/Offers.tsx -> components/ui/Button.tsx -> lib/proof/feed.ts
::error::El funnel alcanza el sistema de evidencia (lib/proof): components/FinalCTA.tsx -> components/ui/Button.tsx -> lib/proof/feed.ts
::error::El funnel alcanza el sistema de evidencia (lib/proof): components/Navbar.tsx -> components/ui/Button.tsx -> lib/proof/feed.ts
::error::El funnel alcanza el sistema de evidencia (lib/proof): components/Footer.tsx -> components/ui/Button.tsx -> lib/proof/feed.ts
::error::El funnel alcanza el sistema de evidencia (lib/proof): components/HowItWorks.tsx -> components/ui/Button.tsx -> lib/proof/feed.ts
::error::Ver docs/04-architecture.md §4, invariante 4. La ruta de conversion no puede romperse por evidencia.
```

Exit code observado: **1**. Seis de las ocho entradas del funnel quedan contaminadas por un solo import a dos saltos de distancia, que es justo lo que el grep anterior dejaba pasar.

**Y lo que este experimento no prueba.** Que el guard detecte un import estático con especificador literal. Sigue sin cubrir `import()` dinámico con argumento calculado, re-exports vía alias no resolubles estáticamente, y acoplamiento por copia de código en vez de import. Está tabulado en `04-architecture.md` §4.1.

---

## Restauración verificada

Las seis mutaciones se revirtieron: `app/api/subscribe/policy.ts`, `app/api/subscribe/route.ts`, `lib/posts.ts` y `components/ui/Button.tsx` vuelven a su contenido previo, y `lib/proof/` se borró entero. `git status` no lista ninguno de los cuatro archivos como modificado respecto al estado con el que empezó el ejercicio, y no queda ninguna cadena `MUTACION TEMPORAL` en el repo fuera de este documento.

Estado final del árbol de trabajo:

```
$ npm run typecheck
                                    (sin salida, exit 0)
$ npm run lint
                                    (sin salida, exit 0)
$ npm run guard:funnel
OK: funnel desacoplado. 8 entradas, 18 modulos en el cierre transitivo.
$ npm test
ℹ tests 26
ℹ pass 26
ℹ fail 0
$ npm run build
✓ Generating static pages using 7 workers (11/11) in 426.3ms
                                    (11 rutas, exit 0)
```

Los gates mecánicos definitivos los ejecuta el Orchestrator, y su exit code es la única autoridad sobre AC01–AC03: lo de aquí es evidencia de **falsabilidad**, no la declaración de que el gate pasa.

## Lo que sigue faltando

Todo lo anterior ocurrió **en local**. Un rojo en local prueba que el gate no está desconectado de su comando; **no** prueba que el workflow de CI ejecute ese comando sobre un PR ni que un rojo bloquee el merge. Esa mitad requiere que exista el PR, que es trabajo pendiente del Sprint 0 (finding **P1-PROC-01**). Hasta entonces el gate del Sprint 0 está demostrado a medias, y así se declara en `06-roadmap.md`.
