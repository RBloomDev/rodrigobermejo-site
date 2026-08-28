# Los tres `statement`: versiones para que Rodrigo elija

> **Este archivo es material de trabajo, no spec.** Se borra cuando los tres
> statements estén elegidos y escritos en `registry/claims/*.yaml`.
>
> `02-domain-and-evidence-model.md` §1: **un claim lo escribe un humano.** Lo que
> sigue no son claims: son borradores para que elijas, corrijas o descartes.
> Mientras los archivos del Registry lleven la marca de BORRADOR, el sistema tiene
> **cero claims declarados**.

## Contra qué están calibrados

Al publicar el feed solo-declarado, el lector va a ver **11 proyectos** (los otros 2
son `publish: none` y no aparecen en ninguna forma). De esos 11:

| `lifecycle` | Proyectos |
|---|---|
| `production` | `plataforma-inadaptados`, `curricula-inadaptados`, `ssp`, `infra-interna` |
| `maintenance` | `sitio-rbloom` |
| `beta` / `alpha` | `habit-tracker`, `proof-of-work`, `mathgym`, `contenido-ia` |
| `prototype` | `punto-de-venta`, `exploraciones` |

Un statement que afirme menos que eso se queda corto. Uno que afirme más queda
desmentido por su propio feed, que es el peor resultado posible para este producto.

---

## 1 · `construyo-sistemas` — dimensión `build`

**Actual (borrador mío):** «Construyo sistemas de software e IA que operan en
producción para usuarios reales.»

**El problema:** «producción» y «usuarios reales» son dos afirmaciones distintas y el
feed solo sostiene la primera. Cuatro proyectos declaran `lifecycle: production`;
ninguno declara usuarios, porque el modelo no tiene ese campo. Estás afirmando algo
que tu propio sistema no puede ni siquiera declarar.

| | Versión | Qué gana / qué cede |
|---|---|---|
| **A** | «Construyo software y lo mantengo funcionando. Cuatro de los sistemas que sostengo están en producción hoy.» | El número sale del feed y se puede contar ahí mismo. Cede ambición: no dice *qué* son |
| **B** | «Construyo y opero los sistemas que diseño: una plataforma educativa, automatización comercial, la infraestructura sobre la que corren.» | Nombra categorías sin nombrar clientes, y las tres se pueden señalar en el feed. **Recomendada** |
| **C** | «Lo que construyo lo opero yo. Si falla a las tres de la mañana, el que se levanta soy yo.» | Es la frase más difícil de fingir y la que más te distingue de un portafolio. Cede precisión: no es enumerable |

---

## 2 · `decido-arquitectura` — dimensión `lead`

**Actual (borrador mío):** «Diseño la arquitectura de los sistemas que construyo y dejo
por escrito el porqué de cada decisión.»

**Hallazgo que cambia esta card.** Las dos reviews dieron por hecho que `lead` está
condenado a `declared`/`unverifiable` porque «GitHub no produce evidencia de
liderazgo». **Es falso en tu caso.** En `RBloomDev/rodrigobermejo-site`, que es
**público**, hay **10 ADRs** en `docs/decisions/`, cada uno con su PR mergeado. Un PR
público que introduce una decisión de arquitectura razonada *es* evidencia
`collected`/`third_party_public`: cualquiera abre la URL y la lee.

Este claim es el que mejor evidencia tiene disponible de los tres, y está declarado
sin `evidence_scope`. Eso hay que corregirlo cuando llegue la ingestión.

| | Versión | Qué gana / qué cede |
|---|---|---|
| **A** | «Diseño la arquitectura de lo que construyo y dejo por escrito el porqué de cada decisión.» *(la actual)* | Correcta y sostenible. Cede: «dejo por escrito» no dice *dónde*, y el dónde es lo comprobable |
| **B** | «Cada decisión de arquitectura que tomo queda escrita, con sus alternativas descartadas y su coste. Se pueden leer.» | «Se pueden leer» es una invitación a comprobar, que es exactamente lo que este producto persigue. **Recomendada** |
| **C** | «Decido arquitectura y me hago responsable de la decisión: escribo qué elegí, qué descarté y qué me va a doler dentro de un año.» | La más honesta y la más tuya. Cede: es larga |

---

## 3 · `ensino-y-mentoreo` — dimensión `teach`

**Actual (borrador mío):** «Enseño a programar y mentoreo a quien empieza: diseño la
currícula y acompaño el proceso.»

**El problema, y es de privacidad, no de redacción.** Este claim apunta a dos
proyectos y **uno de ellos no va a aparecer en el feed**: `docencia-isc-upa` es
`context: client` con `publish: none`. Sobrevive solo con `curricula-inadaptados`.
Un lector verá el claim de enseñanza respaldado por un único proyecto privado, sin
rastro de que diste clase en una universidad — porque decidiste, correctamente, no
publicar nada de un cliente sin `release`.

Hay dos salidas, y las dos son tuyas: firmar un `release` acotado para la docencia
universitaria, o redactar el statement para que lo que afirma sea lo que el feed
muestra.

| | Versión | Qué gana / qué cede |
|---|---|---|
| **A** | «Diseño currícula y formo desarrolladores.» | Se ciñe exactamente a lo que el feed mostrará. Cede toda la docencia universitaria, que es la parte más verificable por un tercero |
| **B** | «Enseño a programar: diseño la currícula, doy la clase y acompaño el proceso.» | Mantiene el alcance real. Cede: parte queda declarada y sin respaldo visible hasta que firmes el `release`. **Recomendada si vas a firmarlo** |
| **C** | «Formo desarrolladores desde cero, en aula y en equipo.» | Corta y cubre las dos vías sin prometer evidencia de ninguna. **Recomendada si NO vas a firmar el release** |

---

## Lo que hace falta de ti

1. Elegir o corregir las tres frases.
2. Decidir sobre el `release` de `docencia-isc-upa`. Es tuyo y no es delegable
   (`03-privacy-and-publication-policy.md` §7).

Con eso, se quita la marca de BORRADOR de los tres archivos del Registry y el sistema
pasa a tener claims de verdad.
