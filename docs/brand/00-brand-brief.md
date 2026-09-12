# 00 — Brief de marca: las tres dimensiones en pantalla

> **Estado: BORRADOR — Fase 1, en revisión.** Este documento no es autoridad sobre nada
> mientras `docs/decisions/0014-el-sitio-tiene-spec-de-marca-propia.md` siga en PROPUESTA.
> Nada de lo que aquí se describe está implementado ni publicado.

> Documento durable. Cambia solo si cambia el posicionamiento. Las decisiones de sistema
> visual y de implementación viven en los documentos siguientes de `docs/brand/`.
>
> Este documento **no** gobierna `/evidencia`, `/proyectos`, `/proyectos/[slug]` ni
> `components/proof/**`. Ahí manda `docs/05-feed-contract.md` § Contrato de presentación y
> `docs/02-domain-and-evidence-model.md` §6–§7. La regla de precedencia está en
> `docs/decisions/0014-el-sitio-tiene-spec-de-marca-propia.md`.

## Tesis

El sitio debe representar las **tres dimensiones profesionales** de Rodrigo. No una con las
otras dos como nota al pie.

Las dimensiones **no se inventan aquí**. Ya son canónicas en `docs/00-product-brief.md:26-38`
y están ancladas por `docs/decisions/0007`. Este documento las traduce a la lengua del
sitio, y esa traducción es todo lo que aporta:

| Dimensión (dominio) | Qué abarca (`docs/00-product-brief.md:30-34`) | Cómo se dice en el sitio |
|---|---|---|
| **LEAD** | Arquitectura, liderazgo tecnológico, estrategia, CTO, producto y ejecución | **CTO / dirección tecnológica** |
| **BUILD** | Sistemas, productos, software, IA, automatización, laboratorios y proyectos que construyo | **Constructor** / software, IA, automatización |
| **TEACH** | Docencia, currícula, educación y transferencia de conocimiento | **Docente** / formación y currícula |

El orden de la tabla no es un ranking. `docs/05-feed-contract.md:413-414` prohíbe que el
orden se lea como tal en las rutas de evidencia, y el mismo criterio aplica aquí por
coherencia, no por obligación contractual.

## El problema medido que este documento existe para cerrar

Medido el 2026-09-12 sobre el árbol de trabajo y sobre las fuentes públicas.

**Uno.** El sitio no menciona ninguna de las dos dimensiones que no son BUILD.
`app/layout.tsx:39` publica como `<title>` por defecto:

> `Rodrigo Bermejo | Consultor Técnico en Automatización`

Una búsqueda de `inadaptados`, `CTO`, `docente` y `profesor` sobre `app/`, `components/` y
`public/llms.txt` no devuelve **ninguna** aparición como posicionamiento. La única mención
de docencia en todo el sitio está en `app/evidencia/page.tsx:157`, y está ahí para decir que
las fuentes del motor **no** la leen. El sitio nombra la dimensión solo para declarar que no
la puede comprobar.

**Dos, y es el problema de marca de verdad.** Hay **cinco descriptores distintos** de
Rodrigo circulando en superficies públicas, sin nada que los una:

| Superficie | Cómo se describe | Fuente |
|---|---|---|
| El sitio | «Consultor Técnico en Automatización» | `app/layout.tsx:39`, y «Consultor Técnico» en `:60` y `:67` |
| `llms.txt` | «Technical Consultant specializing in Business Process Automation and Operation» | `public/llms.txt:4`; `:22` pide que se le cite como «Consultor Técnico en Automatización» |
| Bio de GitHub | «qualified .NET and SharePoint with several years of experience in Software Development, focus on collaboration and content managment» | API pública de GitHub, usuario `rodrigoBermejo`, campo `bio` |
| README de perfil de GitHub | «CTO en Inadaptados, fundador de rbloom dev y consultor de productos digitales» | `rodrigoBermejo/rodrigoBermejo`, `README.md` |
| YouTube | «Rodrigo Bermejo - Implementador técnico» | `youtube.com/@rodrigolbermejo` (enlazado desde `components/Footer.tsx:66`) |
| Instagram y Threads | «Rodrigo Bermejo · Automatización» | nombre público de `@rodrigolbermejo` en ambas plataformas |

Seis filas, cinco descriptores incompatibles. Ninguno es falso por separado. Juntos no
describen a una persona: describen a cinco. La bio de GitHub es el caso extremo —anuncia una
especialidad, .NET y SharePoint, que ninguna otra superficie menciona— y el README del mismo
perfil dice algo distinto a dos clics de distancia.

**La dispersión es el problema, más que el diseño.** Un rediseño que unifique tipografía y
color sobre cinco posicionamientos distintos produce cinco marcas bonitas.

## Qué es real y verificable de cada dimensión, y qué no se afirma

### Fuentes verificadas el 2026-09-12

- **README del perfil de GitHub `rodrigoBermejo/rodrigoBermejo`.** Declara «CTO at
  [Inadaptados](https://inadaptados.mx)» y «Founder of rbloom dev», además de consultor de
  producto digital, IA y automatización. Es una **auto-declaración de Rodrigo**: la fuente es
  el propio sujeto, no un tercero. En el lenguaje de `docs/02-domain-and-evidence-model.md`
  §6 eso es `declared` / `unverifiable`, y se presenta como tal. El campo `company` del
  mismo perfil lista `@Inadaptados @RBloomDev @ISC-UPA`, y también es auto-declarado.
- **`academy.inadaptados.mx`.** La página pública declara la propuesta **«Aprende
  construyendo, no memorizando»** y nombra JavaScript, React, bootcamps, IA y automatización
  entre sus temas. Es verificable por cualquiera abriendo la URL; lo que **no** verifica es
  el rol de Rodrigo dentro de esa operación.

Ninguna de las dos fuentes prueba competencia, calidad ni resultados. Prueban existencia,
autoría declarada y tiempo, que es exactamente el límite que fija
`docs/00-product-brief.md` § Postura epistémica.

### Los tres statement del feed, literales

De `public/proof/v1/claims.json`, sin editar:

| `dimension` | `statement` | Estado |
|---|---|---|
| `build` | «No solo escribo software: lo opero. Los sistemas que construyo están en producción, y cuando algo falla el que responde soy yo.» | `declared` / `unverifiable` |
| `lead` | «Diseño la arquitectura de los sistemas que construyo.» | `declared` / `unverifiable` |
| `teach` | «Diseño la currícula con la que se forman desarrolladores, y doy clase.» | `declared` / `unverifiable` |

Los tres tienen hoy `evidence_ids: []`. El sitio no puede sostener ninguno con evidencia
recolectada, y la ruta `/evidencia` ya existe para decir por qué. El copy de marca **no
puede** afirmar más de lo que dicen estos tres statement: si la portada afirma algo que no
está aquí, hay dos fuentes de verdad sobre la misma persona.

### Lo que NO se afirma

Cero cifras de **alumnos, clientes, ingresos, resultados, testimonios, reconocimientos o
premios**. No existen medidas de ninguna de esas cosas, y no se fabrican. Esto no es
prudencia de copy: `docs/00-product-brief.md` § No-objetivos y
`docs/02-domain-and-evidence-model.md` §7 lo hacen una regla del sistema, y un número
inventado en la portada la rompería con la misma eficacia que un dashboard en `/evidencia`.

Donde el trabajo es **colectivo** —Inadaptados es una organización con equipo— el crédito es
del equipo. Una primera persona del singular sobre trabajo de varios es una afirmación falsa
de autoría, y la autoría es una de las cinco cosas que este proyecto sí dice poder sostener.

### Lo que NO fue verificable el 2026-09-12

Probadas las URLs que el propio sitio enlaza en `components/Footer.tsx:16-66`:

| Superficie | Resultado |
|---|---|
| LinkedIn (`/in/rodrigolbermejo`) | **HTTP 999**, respuesta anti-scraping de LinkedIn. Cero contenido legible |
| Instagram (`@rodrigolbermejo`) | Devuelve el shell de login. Solo fue legible el **nombre público**; la biografía y las publicaciones, no |
| Threads (`@rodrigolbermejo`) | Igual: nombre público legible, contenido detrás del login |
| Facebook (`/RodrigoBermejoIA`) | Devuelve una página cuyo título es el **nombre legal completo más una localidad**, no el nombre de marca. **Requiere revisión de Rodrigo** |

Un hallazgo adicional del mismo barrido, que es un problema de marca y no de verificación:
el sitio enlaza `youtube.com/@rodrigolbermejo`, que es el canal correcto. El handle vecino
**`@rodrigobermejo` —sin la `l`— es el canal de otra persona**, un entrenador físico. La
colisión de handle existe y conviene saberla antes de imprimir un handle en cualquier parte.

## La trampa a evitar

Es la misma que ya nombra `docs/00-product-brief.md:38`, y aquí muerde más fuerte:

> confundir «la dimensión con más evidencia» con «la dimensión más importante».

Proof of Work demuestra sobre todo **BUILD** porque es la única dimensión instrumentable
hoy: la única `Source` de V1 es GitHub, y GitHub no produce evidencia de liderazgo ni de
docencia (`docs/02-domain-and-evidence-model.md` §5–§6). Eso es una propiedad del
instrumento, no una jerarquía de la persona.

**LEAD y TEACH no valen menos, valen distinto.** El sitio debe hacerlo legible **en su
arquitectura, no solo en sus datos**: si las tres dimensiones existen únicamente como una
etiqueta dentro de una tarjeta de `/evidencia`, la portada sigue diciendo que Rodrigo es un
consultor de automatización y las otras dos dimensiones siguen sin existir para quien nunca
llega a `/evidencia`. La corrección es estructural —qué ocupa la portada, en qué orden, con
qué peso— y por eso este documento es el que la registra.

## Decisiones registradas

### La portada es de identidad pura — 2026-09-12

Decidida por Rodrigo el **2026-09-12**.

La portada deja de vender. Pasa a representar quién es Rodrigo en sus tres dimensiones, sin
comercio: sin precios, sin planes, sin CTA de contratación como eje.

**El funnel comercial completo se muda a `/colaborar`**, con precios y compromisos
**intactos**:

| Oferta | Precio | Fuente actual |
|---|---|---|
| Operación mensual (nivel 1) | **$1,800 MXN / mes** + setup inicial **$6,500 MXN** (pago único) | `components/Offers.tsx:75-80` |
| Operación mensual (nivel 2) | **$3,500 MXN / mes** + setup inicial **$6,500 MXN** (pago único) | `components/Offers.tsx:140-144` |

La mudanza es de ubicación, no de contenido: ninguna cifra ni compromiso cambia por este
documento. Hacerlo sería una decisión comercial, y esta no lo es.

Consecuencia que hay que aceptar con nombre: mover el funnel fuera de la portada **puede
costar conversión**, y no hay medición previa contra la cual compararlo. No existe analítica
de conversión en este repositorio. Es una decisión de posicionamiento tomada a sabiendas de
que su efecto comercial no se va a poder atribuir.

La restricción de `docs/04-architecture.md` §4 invariante 4 sigue vigente después de la
mudanza: el funnel comercial no importa nada del feed, y `npm run guard:funnel` lo comprueba
sobre el cierre transitivo de imports. `/colaborar` hereda esa prohibición completa.

### Fotografía: un solo activo, y el sistema no se apoya en él — 2026-09-12

Decidida por Rodrigo el **2026-09-12**.

El único retrato disponible es **`public/images/profile.jpg`**: **571 × 1024 px**, blanco y
negro, vertical. Medido sobre el archivo, no sobre su uso.

Se trabaja **solo con ese activo**. No se encarga sesión nueva, no se generan retratos, no
se usan fotos de terceros como sustituto.

De ahí salen dos consecuencias, y la segunda es la que importa:

1. **Se deja de recortar a círculo.** Hoy `components/About.tsx:10-19` lo mete en un
   contenedor cuadrado con `rounded-full` y `object-cover`: un retrato vertical de 571×1024
   dentro de un círculo pierde la mayor parte de la imagen. Se usa en su **proporción
   vertical real**.
2. **El sistema visual se sostiene en tipografía y color, no en fotografía.** Con un solo
   retrato no hay material para una dirección de arte fotográfica, y fingir que sí lo hay
   produce la misma imagen repetida en cinco tamaños. Esto convierte las deudas **#9 y #12**
   de `docs/audits/2026-08-19-site-baseline.md:146-154` —la tipografía base y los tokens
   `--font-*` sombreados— de deuda oportunista en **trabajo de ruta crítica**: son el sistema
   visual, no un detalle pendiente.
