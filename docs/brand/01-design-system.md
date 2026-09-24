# 01 — Sistema de diseño

> **Estado: Autoridad desde 2026-09-15 (ADR 0014 ACEPTADA).** Gobierna identidad,
> posicionamiento, tipografía, color, arquitectura de información y copy público del sitio.
> **Cláusula de precedencia:** en `/evidencia`, `/proyectos`, `/proyectos/[slug]` y
> `components/proof/**`, `docs/05-feed-contract.md` § Contrato de presentación y
> `docs/02-domain-and-evidence-model.md` §6–§7
> ganan sobre la marca, y la divergencia es **FAIL, no deuda**.
> Esta autoridad no afirma que lo aquí descrito ya esté implementado ni publicado.

> Documento normativo del sitio. Autoridad sobre `app/globals.css` y sobre las clases
> de los componentes. **Excepción, y es la regla que gobierna a todas las demás:** en
> `/evidencia`, `/proyectos`, `/proyectos/[slug]` y `components/proof/**`, el contrato
> de presentación de `docs/05-feed-contract.md` gana sobre este documento. Ver
> `docs/decisions/0014-el-sitio-tiene-spec-de-marca-propia.md`.

---

## 0. La base que no se toca

Está confirmada y no se somete a revisión:

| | |
|---|---|
| Azul de marca | `#14537e` |
| Teal de acento | `#11abb0` |
| Neutros | Blanco y la escala de grises ya declarada en `:root` |
| Familias | Josefin Sans, Open Sans, Libre Baskerville, Yellowtail |
| Wordmark | `rb` |
| Prohibición | **Sin sombras duras** |

**Lo que cambia no es la paleta: es qué trabajo hace cada color.** Hoy el azul es fondo
masivo y el teal decora; aquí el azul titula y el teal ocupa un rol único.

**Dos excepciones, declaradas.** La dirección B introduce dos valores derivados que no
existen en el repo, y esconderlos sería peor que tenerlos:

| Token | Valor | Para qué | Medido |
|---|---|---|---|
| `--on-deep-soft` | `#cfe0ea` | Texto secundario sobre el azul de marca | 5.95:1 sobre `#14537e` |
| `--rule-deep` | `#2f6a93` | Regla sobre el azul de marca | elemento no textual |

No son colores de marca nuevos: son lo que hace falta para que B pueda usar el azul
**como superficie** sin romper WCAG AA. La paleta oficial no trae ningún tono claro apto
para texto secundario sobre azul, porque hasta hoy el azul no era fondo de texto largo.
**La dirección A no necesita ninguno de los dos**, y eso es un argumento más a su favor:
se sostiene entera con la paleta que ya existe.

---

## 1. La deuda tipográfica, y por qué este documento puede cerrarla

`docs/audits/2026-08-19-site-baseline.md` congeló la tipografía el 2026-08-20 y lo
dejó escrito:

> **No se modifica la tipografía durante este proyecto.** [...] Cualquier modificación
> se tratará después como **tarea visual independiente, con revisión de diseño
> específica**.

Este trabajo **es** esa tarea. Por tanto está autorizado a cerrar las deudas **#9**
(qué fuente gana en `<body>`) y **#12** (los tokens `--font-*` sombreados). No las
cierra de paso dentro de otro diff: las cierra como su propio hito, aislado y
desplegable solo.

### 1.1 Lo que está roto hoy, medido

**Deuda #12 — los tokens se sombrean a sí mismos.** `app/globals.css:55-58` declara:

```css
--font-display: var(--font-display);
--font-heading: var(--font-heading);
--font-body:    var(--font-body);
--font-quote:   var(--font-quote);
```

Son auto-referencias. `@theme` emite en el mismo scope que `:root`, y `next/font`
inyecta **esas mismas variables** en `<body>` (`app/layout.tsx:88`). El resultado es que
la capa de tokens no resuelve nada: gana el orden de declaración. El propio CSS lo
admite en su cabecera.

**Deuda #9 — el cuerpo no se renderiza en Open Sans.** `<body>` lleva la clase
`font-sans` (`app/layout.tsx:88`), heredada de la plantilla de `create-next-app`.
`@theme` **no redefine `--font-sans`**, así que esa clase resuelve a la pila por
defecto de Tailwind —`ui-sans-serif, system-ui, …`— y **gana por especificidad** sobre
`body { font-family: var(--font-body) }` (`globals.css:101`), que queda como código
muerto. Consecuencia: todo el texto sin clase explícita se ve en la fuente del
sistema, no en Open Sans. Por eso los componentes rocían `font-body` a mano.

**Efecto colateral nunca decidido.** `globals.css:106` dice:

```css
h1, .font-display { font-family: var(--font-display); }
```

Es decir: **todos los `<h1>` del sitio son Yellowtail por regla de elemento.** El Hero
se salva solo porque sobreescribe con `font-heading`. Los que no sobreescriben —los
títulos de `/evidencia` y `/proyectos`— salen en tipografía script. Eso **no fue una
decisión de diseño**: es una herencia. Y es justo donde el contrato de presentación
pide sobriedad documental.

### 1.2 Decisión — se arregla por redefinición, no por amputación

Tres cambios, en orden de riesgo creciente:

**(a) Romper la auto-referencia.** `next/font` deja de inyectar `--font-*` y pasa a
inyectar `--ff-*`. `@theme` mapea los tokens a esas variables:

```css
@theme {
  --font-display:   var(--ff-signature);  /* Yellowtail */
  --font-heading:   var(--ff-heading);    /* Josefin Sans */
  --font-body:      var(--ff-body);       /* Open Sans */
  --font-quote:     var(--ff-quote);      /* Libre Baskerville */
}
```

Un nombre no existe en dos capas. Cierra **#12**.

**(b) Redefinir `font-sans` en lugar de quitarlo.** Esta es la parte que evita el
riesgo. La corrección obvia sería borrar `font-sans` de `<body>`, pero eso cambia el
rendering de todo el sitio de golpe y deja huérfanas las decenas de `font-body`
escritas a mano. En su lugar:

```css
@theme {
  --font-sans: var(--ff-body);   /* font-sans = Open Sans */
}
```

La clase se queda donde está y **pasa a significar lo correcto**. Cada `font-sans` y
cada `font-body` del repo convergen en la misma familia, y `body { font-family:
var(--font-body) }` deja de ser código muerto sin que haya que tocarlo. Cierra **#9**
con un cambio de una línea en vez de con una migración. La limpieza de los `font-body`
redundantes es posterior y cosmética.

**(c) Yellowtail deja de titular.** Se retira `h1` del selector de `--font-display`:

```css
h1, h2, h3, h4, h5, h6 { font-family: var(--font-heading); }
.firma { font-family: var(--font-display); }
```

Yellowtail queda reservado a **la firma y el monograma**, que es su único uso legítimo
en una identidad profesional. Los titulares editoriales se unifican en Josefin Sans.
Ver §3.

**Falsación obligatoria.** Estos tres cambios no los protege ningún test. Antes de dar
el hito por cerrado se comprueba en navegador con `getComputedStyle` sobre `<body>`,
un `<h1>` y un `<p>` sin clase, en las seis rutas. El CSS no es evidencia de lo que se
renderiza; solo lo es el navegador.

---

## 2. Roles de color

Un color, un trabajo. La regla que los ordena: **el azul es tinta, no superficie** (en
la dirección A; ver §7 para B), y **el teal tiene exactamente un rol**.

| Rol | Valor | Para qué | Qué NO es |
|---|---|---|---|
| `ink-title` | `#14537e` | Titulares y numeración | No es fondo de sección |
| `ink-default` | `#212121` | Cuerpo | |
| `ink-muted` | `#6e757c` | Rótulos, metadatos, pies | |
| `bg-page` | `#fff` | Superficie principal | |
| `bg-inset` | `#ebeeee` | Bloques embutidos, poco frecuentes | |
| `rule` | `#e8e8e8` | Regla hairline: la jerarquía se construye aquí | |
| `rule-strong` | `#ccc` | Separación de bloque mayor | |
| `mark` / `focus-ring` | `#11abb0` | **Un solo rol**: subrayado de enlace y anillo de foco | No decora, no rellena, no jerarquiza |

### 2.1 Prohibiciones de color

- **Sin sombras.** Ni `shadow-sm`. La elevación se sustituye por aire y regla fina. Hoy
  el repo usa `shadow-sm`, `shadow-lg`, `shadow-xl` y `shadow-2xl` inline.
- **Sin degradados como superficie de marca.** El `bg-clip-text` degradado del Hero y
  los blobs `blur-3xl` desaparecen: son el vocabulario visual genérico que este
  rediseño existe para abandonar.
- **Prohibido el color de estado en las rutas de evidencia.** Ni ámbar de advertencia,
  ni verde de validado, ni rampa cromática entre valores de un eje. Lo impone
  `docs/05-feed-contract.md`, no este documento.
- **Se retira la escala cruda de Tailwind.** `blue-*`, `gray-*`, `green-*` y `red-*`
  desaparecen de los componentes: son el segundo dialecto de color de la deuda #7.
  Única excepción admitida: los estados de formulario de `SubscriptionBlock`, que
  pasan a tokens propios en el mismo hito.
- **Se retiran los hex sueltos.** `#104366` y `#0e8f93` (los hover de `ui/Button.tsx`)
  pasan a tokens.

### 2.2 Contraste

Objetivo **WCAG 2.2 AA**: 4.5:1 en texto normal, 3:1 en texto grande y en los bordes
de los controles.

**Medido en navegador el 2026-09-12**, con `getComputedStyle` y la fórmula WCAG. No son
estimaciones:

| Par | Ratio | ¿Pasa AA? |
|---|---|---|
| `#212121` sobre blanco | 16.1:1 | Sí |
| Blanco sobre `#14537e` | 8.59:1 | Sí |
| `#6e757c` sobre blanco | **4.67:1** | Sí |
| `#cfe0ea` sobre `#14537e` | 5.95:1 | Sí |
| `#212121` sobre `#11abb0` | 5.73:1 | Sí |
| **`#11abb0` sobre blanco** | **2.81:1** | **No** |
| **Blanco sobre `#11abb0`** | **2.81:1** | **No** |
| **`#11abb0` sobre `#14537e`** | **2.87:1** | **No** |

### La regla que sale de esa medición

**El teal `#11abb0` no puede ser texto.** Ni sobre blanco, ni sobre el azul de marca, ni
con texto blanco encima. Falla AA en las tres combinaciones por un margen grande, no por
un pelo.

Y aquí estaba la contradicción que este documento tenía que resolver: §0 declara el teal
como base de marca que **no se toca**, mientras esta sección decía «si una falla, se
corrige oscureciendo el rol». Las dos no podían ser ciertas a la vez. **Se resuelve a
favor de §0**, porque el hex es identidad y el rol es diseño:

- El teal se queda **exactamente como está**.
- Deja de usarse para texto. Su sitio son los elementos **no textuales**: barras, reglas,
  subrayado de enlace y anillo de foco. Que es, literalmente, el rol que la tabla de §2 ya
  le asignaba.
- Cuando el teal sea **fondo** de un control, el texto encima va en `#212121` (5.73:1), no
  en blanco.

**El fallo de accesibilidad era el síntoma de haber roto la regla de roles, no una
limitación de la paleta.** Los prototipos lo violaban numerando secciones en teal;
devolver la numeración al azul lo corrigió sin tocar un solo valor de marca.

Nunca se corrige agrandando la tipografía para entrar en la excepción de «texto grande»:
eso es cambiar la prueba, no el defecto.

---

## 3. Tipografía

### 3.1 Roles

| Familia | Rol | Dónde |
|---|---|---|
| **Josefin Sans** | Titulares, rótulos, navegación, botones | Todo `h1`–`h6`, eyebrows, CTAs |
| **Open Sans** | Cuerpo y lectura | Párrafos, listas, metadatos |
| **Libre Baskerville** | Entradillas y citas | **Dirección A únicamente.** En B no se usa |
| **Yellowtail** | **Firma y monograma, y nada más** | `rb` en Navbar, Footer y piezas sociales |

Josefin Sans es geométrica y de caja alta pequeña: funciona en titular y falla en
lectura larga. Por eso no se generaliza al cuerpo, ni siquiera en la dirección B.

### 3.2 Escala

Fluida con `clamp()`, razón 1.25 (A) y 1.333 en los pasos altos (B). Seis pasos, sin
tamaños sueltos fuera de la escala:

```
--step--1   0.82 → 0.88rem     rótulos, pies, metadatos
--step-0    1.00 → 1.08rem     cuerpo
--step-1    1.25 → 1.45rem     entradilla, h3
--step-2    1.56 → 2.00rem     h2
--step-3    1.95 → 2.85rem     h1 de interior
--step-4    2.44 → 4.00rem     display de portada
```

Medida de lectura: **63ch** en A, **60ch** en B. Ningún párrafo a ancho completo.

### 3.3 Reglas duras

- **Un solo `<h1>` por ruta.** Hoy no está garantizado.
- Jerarquía sin saltos: no se pasa de `h2` a `h4` por estética.
- `text-wrap: balance` en titulares, para que ninguno deje una palabra viuda.
- Interlineado: 1.02–1.2 en display, 1.5–1.65 en cuerpo.
- **Los `<abbr>` del par de etiquetas conservan `title`** con el término técnico. Es
  requisito del contrato, no un detalle.

---

## 4. Espacio y ritmo

No existe hoy: `@theme` no define un solo token de espaciado y los componentes usan
`py-24`, `py-28`, `py-32`, `py-36` sin criterio. Se fija una serie:

```
--space-1  0.5rem     --space-4  3rem
--space-2  1rem       --space-5  5rem
--space-3  1.75rem    --space-6  7.5rem
```

Separación entre secciones mayores: `--space-5`. Dentro de una sección: `--space-3`.
**Ningún valor de espaciado fuera de esta serie.**

`--radius: 2px` (A) y `3px` (B). Casi recto: es un documento, no una tarjeta. Se
retiran `rounded-2xl` y `rounded-xl` de los bloques de contenido; el radio grande queda
solo en controles.

---

## 5. Movimiento

Un solo gesto en todo el sitio: un desvelado de **8px y 500ms** al entrar, con hasta
tres retardos escalonados de 70ms. Nada más. Sin parallax, sin `animate-pulse`, sin
blobs animados —hoy el Hero tiene dos.

```css
@media (prefers-reduced-motion: no-preference) { /* … */ }
```

El movimiento vive **entero** dentro de esa consulta. Bajo `prefers-reduced-motion:
reduce` no se degrada: no existe. Se verifica activando la preferencia en el navegador,
no leyendo el CSS.

---

## 6. Foco y accesibilidad

Hoy el sitio depende del `outline` por defecto del navegador, que se pierde sobre los
fondos azules. Se fija uno propio:

```css
:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 3px; }
```

- Anillo **visible sobre las dos superficies**, clara y azul.
- Objetivo táctil mínimo **44×44 px**. El botón hamburguesa actual ya lo cumple en
  tamaño; lo que no tiene es función (ver `docs/brand/02-arquitectura-y-urls.md`).
- Orden de tabulación igual al orden visual, comprobado recorriendo cada ruta.
- Ningún significado transmitido solo por color — regla que además ya impone el
  contrato de presentación para los ejes.

---

## 7. Las dos direcciones comparten este sistema

A y B no son dos sistemas: son **dos configuraciones de roles sobre los mismos
tokens**. A se sostiene entera con la paleta que ya existe en el repo; B necesita los
dos valores derivados declarados en §0, y solo porque usa el azul como superficie.

| | **A — Expediente** | **B — Señal** |
|---|---|---|
| Azul `#14537e` | Tinta: titula | Superficie: bloques a sangre |
| Teal `#11abb0` | Un rol: subrayado de enlace y anillo de foco | Marcador estructural: barras y reglas |
| Teal como texto | **Nunca** (2.81:1, falla AA) | **Nunca**. Cuando es fondo de un control, el texto va en `#212121` |
| Libre Baskerville | Entradillas y citas | **No se usa** |
| Titula | Josefin Sans en azul | Josefin Sans en negro |
| Composición | Columnas desiguales de texto | Rejilla desplazada de revista |
| Retrato | Integrado en el bloque de texto | A gran escala, sangrado por un borde |
| Escala display | Hasta 4rem | Hasta 5.6rem |

**Recomendación: A.** Las tres razones están en el plan, y la que decide es la tercera:
el contrato de presentación prohíbe color de estado, rampas e iconos, y exige que los
cuatro valores de cada eje se vean idénticos. A es ese lenguaje de serie. B tendría que
**desactivarse** en las rutas de evidencia, creando un segundo dialecto visual — que es
exactamente la deuda #7 que el repo ya arrastra entre la landing y el blog. Elegir B es
reabrir esa deuda a propósito.

---

## 8. Lo que este documento no decide

- **La fotografía.** Hay un solo retrato (`public/images/profile.jpg`, 571×1024, B/N) y
  Rodrigo decidió el 2026-09-12 trabajar solo con él. El sistema se sostiene en
  tipografía y color. Lo único que cambia: deja de recortarse a círculo y se usa en su
  proporción vertical real.
- **El wordmark definitivo.** Hoy hay **tres versiones que no concuerdan**: el texto
  `rb` en Yellowtail, los PNG `icon-192/512` sin referenciar, y `public/icon.svg` con
  `RB` en mayúsculas y `font-family="cursive"` genérico — que es el único activo, y por
  tanto el que ve un navegador en la pestaña. Se unifica en una sola forma: minúsculas
  `rb`, Yellowtail real, **exportado a SVG con el glifo trazado**, para que deje de
  depender de la cursiva del sistema. El trazado se hace en el hito 1.
- **El modo oscuro.** Fuera de alcance: el sitio no lo tiene hoy y añadirlo duplicaría
  la superficie de revisión visual sin que nadie lo haya pedido.
