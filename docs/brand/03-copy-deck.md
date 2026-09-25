# 03 — Copy deck

> **Estado: Autoridad desde 2026-09-15 (ADR 0014 ACEPTADA).** Gobierna identidad,
> posicionamiento, tipografía, color, arquitectura de información y copy público del sitio.
> **Cláusula de precedencia:** en `/evidencia`, `/proyectos`, `/proyectos/[slug]` y
> `components/proof/**`, `docs/05-feed-contract.md` § Contrato de presentación y
> `docs/02-domain-and-evidence-model.md` §6–§7
> ganan sobre la marca, y la divergencia es **FAIL, no deuda**.
> Esta autoridad no afirma que lo aquí descrito ya esté implementado ni publicado.

> Autoridad única del texto del sitio. Si un componente dice algo distinto, el
> componente está mal. Cubre titulares, entradillas, navegación, CTAs, microcopy,
> metadatos y textos de contacto **como un conjunto**, porque escribirlos por separado
> es como se llega a tener cuatro descripciones distintas de la misma persona.
>
> **Español de México.** Tuteo. Sin voseo. Sin anglicismos donde exista la palabra en
> español (`dashboard` → panel; `insights` → ideas o hallazgos; `stack` se conserva
> porque es término técnico establecido).

---

## 0. Reglas de escritura

1. **Verbo primero.** «Dirijo», «Construyo», «Opero». No «Soy un profesional orientado
   a». El sitio actual ya lo hace bien en el funnel; se conserva ese músculo.
2. **Cero cifras sin fuente.** No hay número de alumnos, de clientes, de ingresos, de
   años ni de proyectos entregados. **No existen medidas y no se fabrican.**
3. **Crédito al equipo.** Inadaptados es una organización con más gente. Se escribe
   «dirijo» y «diseño», nunca «hice yo solo».
4. **Sin superlativos ni adjetivos de venta** en la superficie de identidad. La oferta
   comercial vive en `/colaborar` y ahí conserva su registro actual.
5. **Nada de «todavía», «aún», «pronto», «en construcción»** en las rutas de evidencia.
   Lo prohíbe `docs/05-feed-contract.md`: esas palabras convierten una condición del
   mundo en un retraso del proyecto.
6. Fechas **absolutas**. Nunca «hace 3 días».

---

## 1. El titular

### Propuesto

> **Dirijo tecnología. Construyo sistemas. Formo talento.**

Mapea uno a uno con las tres dimensiones canónicas de `docs/00-product-brief.md:26-38`:
LEAD → BUILD → TEACH. Tres verbos en primera persona, paralelos, sin adjetivos.

### Variante para comparar maquetada

> **Dirijo tecnología. Construyo sistemas. Doy clase.**

**La reserva, dicha sin adornos:** «Formo talento» es la fórmula que usaría cualquier
página corporativa, y ese es su problema. «Doy clase» es más pequeño y más concreto, y
además es **literalmente lo que Rodrigo ya afirma** en el feed: *«Diseño la currícula con
la que se forman desarrolladores, y doy clase.»* Pierde paralelismo —los otros dos verbos
son de mando y construcción, este es de oficio— y eso puede leerse como una caída de
registro, o como el único momento honesto de los tres. Es una decisión de tono que le
toca a Rodrigo, viendo las dos en pantalla.

**Estas dos líneas son propuesta editorial. No se escriben en el Registry** ni se
convierten en un claim. El Registry vive en el repo privado del motor y sus afirmaciones
son otra cosa.

---

## 2. Portada

### Apertura

**Rótulo:** `01 · Ahora`

**Titular:** el de §1.

**Entradilla:**

> Soy CTO en Inadaptados, una escuela donde se aprende construyendo. Dirijo la
> plataforma que sostiene su operación educativa, diseño la currícula con la que se
> forman desarrolladores, y doy clase.

**Fuentes, frase por frase** — ninguna afirmación sin respaldo:

| Fragmento | Fuente |
|---|---|
| «CTO en Inadaptados» | README del perfil de GitHub de `rodrigoBermejo`. Es una autodeclaración de Rodrigo, no una verificación de terceros |
| «una escuela donde se aprende construyendo» | Página pública de la academia de Inadaptados: *«Aprende construyendo, no memorizando»* |
| «la plataforma que sostiene su operación educativa» | `projects.json`, `plataforma-inadaptados`: *«Sostener la operación educativa de Inadaptados: LMS, web, certificados y contenido»* |
| «diseño la currícula con la que se forman desarrolladores» | `claims.json`, `ensino-y-mentoreo`, literal |
| «y doy clase» | `claims.json`, `ensino-y-mentoreo`, literal |

**CTAs:** `Ver mi trabajo` (a `/proyectos`) · `Cómo respaldo lo que afirmo →` (a
`/evidencia`).

**Pie del retrato:**

> Escribo sobre lo que opero.

> ⚠️ **Retirado y escalado a Rodrigo: la localidad.** El borrador de este pie decía
> «Aguascalientes, México». La revisión adversarial midió que **«Aguascalientes» no
> aparece hoy en ninguna parte del repositorio**, así que publicarla es *«publicar un
> campo o un valor nuevo en la superficie pública»* — uno de los casos en los que
> `docs/03-privacy-and-publication-policy.md` §7 obliga a **detenerse y escalar**. El repo
> es público: quedaría publicada en el merge, no en la implementación.
>
> Se retiró de los prototipos y del kit social. **No es un juicio sobre si Rodrigo quiere
> publicarla** —es perfectamente razonable que sí—, sino sobre quién lo decide. Si la
> autoriza, vuelve al pie del retrato y a las bios sociales en una línea.

### Las tres dimensiones

**Rótulo:** `02 · Tres dimensiones, ninguna sustituye a las otras`

Ese rótulo es deliberado y viene de `00-product-brief.md:28`. Evita que la página se lea
como un ranking de facetas.

| Eje | Verbo | Texto |
|---|---|---|
| **Lead** | **Dirijo** | Arquitectura y dirección tecnológica en Inadaptados: la plataforma que sostiene la operación educativa —LMS, web, certificados y contenido— y la infraestructura que la mantiene de pie. |
| **Build** | **Construyo** | Software, IA y automatización en producción. No solo escribo software: lo opero. Cuando algo falla, el que responde soy yo. |
| **Teach** | **Formo** | Diseño la currícula y los materiales con los que se forman desarrolladores en Inadaptados, e imparto ingeniería de software y bases de datos a nivel universitario. |

«No solo escribo software: lo opero. Cuando algo falla, el que responde soy yo» es el
statement literal del claim `construyo-sistemas`. «ingeniería de software y bases de
datos a nivel universitario» es la tesis literal del proyecto `docencia-universitaria`.

### Cierre

**`03 · Trabajo`** — «Doce proyectos, con lo que cada uno se propone.»

> Un proyecto es una unidad de trabajo con dueño e intención; un repositorio es un
> artefacto suyo, no el proyecto. Buena parte del mío vive en repos privados y por eso
> no aparece entero.

**`04 · Método`** — «Puedes comprobar lo que afirmo, o ver por qué no puedes.»

> Publico mis afirmaciones con su procedencia y su verificabilidad. Hoy casi todo es
> material declarado: lo afirmo yo, y todavía no hay forma de que un tercero lo
> compruebe. Eso también está dicho.

> ⚠️ **Revisar en implementación:** esa última frase usa «todavía». En la portada es
> admisible porque describe el estado del sistema en prosa editorial, pero **si este
> bloque se mueve a `/evidencia` hay que reescribirlo**: ahí la palabra está prohibida.
> Alternativa lista: «lo afirmo yo, y no hay forma de que un tercero lo compruebe».

**Nota de arquitectura:** el «trabajo seleccionado» de la portada es **copy editorial
escrito a mano**. `app/page.tsx` es entrada de `guard:funnel` y no puede importar nada
del feed. La lista canónica vive en `/proyectos`.

---

## 3. Navegación

| Etiqueta | Destino |
|---|---|
| Trabajo | `/proyectos` |
| Inadaptados | `/sobre-mi#inadaptados` |
| Docencia | `/sobre-mi#docencia` |
| Escribo | `/blog` |
| Trayectoria | `/sobre-mi` |
| **Trabajar conmigo** | `/colaborar` |

«Escribo» en vez de «Blog»: es un verbo, como el resto del sitio, y dice qué hay ahí.
«Trabajar conmigo» en vez de «Contacto»: nombra la acción, no el buzón.

**Menú móvil** — microcopy: botón `Abrir menú` / `Cerrar menú` (en `aria-label`, con
`aria-expanded`). Hoy ese botón no hace nada.

---

## 4. `/colaborar`

**El funnel se traslada con su copy intacto.** No se reescribe la oferta: lo que cambia
es dónde vive y cómo se ve.

**Inamovible, y se copia literal desde `components/Offers.tsx`:**

- `Sprint de Validación` — **$1,800 MXN / mes** + **Setup inicial: $6,500 MXN (pago único)**
- `Socio Operativo` — **$3,500 MXN / mes** + **Setup inicial: $6,500 MXN (pago único)**
- La nota al pie sobre infraestructura propia y cotización de self-hosted.
- Los CTAs `Iniciar Sprint` y `Agendar Entrevista`.

**Ningún precio, plazo o compromiso cambia por una decisión de diseño.**

Lo único que se toca son **dos erratas vivas**, y se corrigen porque son erratas, no
porque sea rediseño:

| Dónde | Dice | Debe decir |
|---|---|---|
| `Offers.tsx:44` | «1 flujo automatizado crítico funcionado» | «1 flujo automatizado crítico funcionando» |
| `About.tsx` | «Mi enfoque es quirúrgico: entre, diagnostico…» | «…entro, diagnostico…» |

**Entradilla nueva de la ruta**, porque ahora es una página y no una sección:

> Trabajo con negocios que ya tienen operación y la están sosteniendo a mano. Diseño el
> sistema, lo construyo y lo opero.

---

## 5. `/sobre-mi`

**Titular:** «Trayectoria»

**Entradilla:**

> Llevo años en la intersección entre tecnología y negocio. Hoy dirijo tecnología en una
> escuela, construyo sistemas que opero yo mismo, y doy clase.

«Llevo años» sin número es deliberado: no hay una fecha de inicio verificable publicada,
y poner una cifra sería inventarla.

### `#inadaptados`

> **Inadaptados**
> Soy CTO. Dirijo la plataforma que sostiene la operación educativa —LMS, web,
> certificados y contenido—, la infraestructura interna, y el sistema que automatiza la
> captación y el seguimiento comercial. La currícula con la que se forman los
> desarrolladores también sale de ahí.
> Inadaptados es un equipo. Lo que aquí se describe es mi parte.

Fuentes: tesis literales de `plataforma-inadaptados`, `infra-interna`, `ssp` y
`curricula-inadaptados`.

### `#docencia`

> **Docencia**
> Imparto ingeniería de software y bases de datos a nivel universitario desde 2024, y
> diseño la currícula y los materiales con los que se forman desarrolladores en
> Inadaptados.
> Enseñar no deja artefacto público, así que esta es la dimensión de la que menos
> evidencia comprobable existe. Está dicho en `/evidencia` y no se maquilla aquí.

«desde 2024» sale de `timeframe.start: "2024-08-01"` del proyecto
`docencia-universitaria`. La segunda frase reusa el motivo declarado del claim
`ensino-y-mentoreo`.

---

## 6. Rutas de evidencia

**El copy actual de `/evidencia` y `/proyectos` se conserva.** No es texto de relleno:
varias de sus frases son normativas y sustituyen a mecanismos prohibidos. En concreto,
**esta no se puede tocar ni acortar** (`app/evidencia/page.tsx:51-54`):

> Hay trabajo bajo acuerdo de confidencialidad que no aparece aquí en ninguna forma, ni
> siquiera contado. No hay un número de proyectos ocultos porque ese número también
> diría algo sobre quién los encargó.

Es el sustituto declarado del contador de proyectos ocultos (`docs/05-feed-contract.md`).

Tampoco cambian: los ocho valores de los dos ejes, las tres filas de alcance, los tres
motivos declarados de `AlcanceDeLaAfirmacion.tsx`, ni la línea de pie con la fecha
absoluta y los conteos dentro de una oración.

Excepción registrada el 2026-09-23: el motivo de `decido-arquitectura` en `AlcanceDeLaAfirmacion.tsx` se reescribió para cumplir la prohibición de palabras de promesa de futuro de `docs/05-feed-contract.md` §Contrato de presentación, que prevalece sobre este deck por ADR 0014.

Excepción registrada el 2026-09-23 (F-PRY-17): el copy de `/proyectos` y `/proyectos/[slug]` se reescribió bajo la autorización F de ADR 0015; el pie de la ficha pasó a «El feed que sostiene esta ficha se publicó el {fecha en prosa}». Esta excepción cubre el contenido de las páginas, no sustituye los metadatos normativos de §7.

**Lo único que cambia es la envoltura**: jerarquía visual, y que estas rutas por fin
monten navegación y pie —hoy no lo hacen, y se entra en ellas sin forma de volver.

---

## 7. Metadatos

`title.template` se mantiene: `%s | Rodrigo Bermejo`.

| Ruta | `title` | `description` |
|---|---|---|
| `/` | Rodrigo Bermejo — CTO, constructor y docente | Dirijo tecnología en Inadaptados, construyo y opero sistemas de software, IA y automatización, y formo desarrolladores. |
| `/proyectos` | Proyectos | Los proyectos sobre los que se apoyan mis afirmaciones, con su propósito declarado y su estado real. |
| `/evidencia` | Cómo respaldo lo que afirmo | Publico mis afirmaciones con su procedencia y su verificabilidad, y digo explícitamente qué no puede probar este sistema. |
| `/sobre-mi` | Trayectoria | Dirección tecnológica en Inadaptados, sistemas en producción y docencia universitaria. |
| `/colaborar` | Trabajar conmigo | Diseño, construyo y opero sistemas de automatización para negocios que sostienen su operación a mano. |
| `/blog` | Escribo | Notas sobre sistemas, decisiones técnicas y lo que se aprende operando lo que uno construye. |
| `/actividad` | Actividad registrada | Qué volumen de trabajo quedó registrado por periodo, de qué fuente sale y qué parte del trabajo no cubre. |

**`keywords`**: hoy las ocho de `app/layout.tsx` son todas de automatización. Se
reorientan a las tres dimensiones —dirección tecnológica, CTO, arquitectura de software,
automatización, docencia en programación, currícula— y **los términos comerciales se
conservan en `/colaborar`**, que es donde vive la oferta. No se pierde posicionamiento
ganado: se mueve a la ruta que le corresponde.

`public/llms.txt` se reescribe entero. Su contenido es autoridad de
`docs/brand/05-seo-y-llms.md`, no de este documento.

---

## 8. Microcopy

| Situación | Texto |
|---|---|
| Suscripción, encabezado | Notas privadas de operación |
| Suscripción, cuerpo | Escribo ocasionalmente sobre sistemas, decisiones técnicas y lecciones de operar automatizaciones reales. Sin ruido, solo señal. |
| Suscripción, botón | Recibir notas / Guardando… |
| Suscripción, éxito | ¡Listo! Tu correo quedó registrado. |
| Suscripción, error | Hubo un error al registrar. Intenta de nuevo. |
| Suscripción, pie | * Cero spam. Frecuencia baja. Te das de baja cuando quieras. |
| 404 | **Esta página no existe.** Puede que el enlace esté roto o que la haya movido. |
| 404, acción | Volver al inicio · Ver mis proyectos |
| Error | **Algo falló al cargar esta página.** No es culpa tuya. |
| Enlace externo | (sin sufijo visible; se marca con `aria-label` y `rel="noopener noreferrer"`) |

El copy de suscripción se conserva tal cual: funciona y su registro es correcto. `404` y
`error` **no existen hoy** —son la deuda #2 del baseline— y se escriben aquí por primera
vez.

---

## 9. Contacto

No hay formulario de contacto y no se añade. La vía es la que ya existe: la cita de
Calendly, hoy repetida a mano y que pasa a `lib/site-config.ts`. Dónde vive hoy, contado
sobre el árbol el 2026-09-21: `components/Hero.tsx`, `components/HowItWorks.tsx`,
`components/Offers.tsx` **dos veces** y `components/FinalCTA.tsx` —cuatro archivos, cinco
apariciones—. Va enumerado y no como numeral a propósito: el numeral anterior decía
«siete» y dejó de ser cierto en cuanto el funnel se movió a `/colaborar` y `Navbar`,
`Footer` y `MenuMovil` perdieron su botón, sin que nada se pusiera rojo. Una lista de
archivos se desactualiza igual, pero se ve.

| Dónde | Texto |
|---|---|
| Navegación | Trabajar conmigo |
| `/colaborar`, CTA principal | Agendar diagnóstico |
| `/colaborar`, pie del CTA | Respuesta en menos de 24 horas hábiles. |

**La fila «Pie de página | Agendar» se retiró el 2026-09-21, y no es un olvido.**
Esta tabla asigna *qué texto* lleva cada aparición; *qué apariciones existen* lo manda
`docs/brand/02-arquitectura-y-urls.md`, y su §2 (:184-186) mueve el botón de Calendly de
`Navbar` **y de `Footer`** a `/colaborar` —«la portada de identidad no lleva CTA de agenda
en el cromo»—. Los dos documentos estuvieron en contradicción desde que se aceptaron, y
`CLAUDE.md` clasifica eso como FAIL, no como deuda: Rodrigo lo resolvió a favor de `02`,
porque la fila describía una ubicación que la arquitectura del funnel ya había retirado.
Las otras tres filas quedan intactas.

«Respuesta en menos de 24 horas hábiles» se conserva del sitio actual. **Es un compromiso
de servicio, no copy de diseño**: si dejara de ser cierto, lo cambia Rodrigo, no el
rediseño.

---

## 9-bis. Un defecto de copy que ya está en producción

`components/proof/AlcanceDeLaAfirmacion.tsx:18` cita la prohibición del contrato:

> *«Y **sin las palabras «todavía», «aún», «pronto» ni «en construcción»**»*

Y la línea **35 del mismo archivo** usa «todavía» en el texto que se renderiza hoy en
`/evidencia`:

> «Las decisiones de arquitectura de este proyecto están escritas y son públicas, pero el
> motor **todavía** no las recolecta como evidencia: hoy son documentos, no registros.»

El componente documenta la regla y la viola diecisiete líneas después. **Es un defecto del
sitio publicado, no de este rediseño**, y lo encontró la revisión adversarial de la Fase 1.

**Corrección, obligatoria en el hito 4:** eliminar la palabra. El texto no pierde nada.

> Las decisiones de arquitectura de este proyecto están escritas y son públicas, pero el
> motor no las recolecta como evidencia: hoy son documentos, no registros.

Los prototipos ya usan la versión corregida. Que diverjan del componente real es
deliberado y está anotado aquí para que nadie «restaure» la versión defectuosa creyendo
que el prototipo se equivocó.

---

## 10. Lo que este documento deja abierto para Rodrigo

1. ~~**El titular**: «Formo talento» o «Doy clase».~~ **DECIDIDO el 2026-09-21: «Formo
   talento».** Rodrigo eligió viendo las dos maquetadas, como pedía este punto. El titular
   queda «Dirijo tecnología. Construyo sistemas. Formo talento.», que es la propuesta de §1
   y la que concuerda con el verbo «Formo» de la tabla de las tres dimensiones de §2. Vive
   en `app/page.tsx`. **No se reabre**: cambiarlo vuelve a ser una decisión de Rodrigo, no
   una variante a maquetar.
2. **El descriptor corto** que va en las bios sociales y en `Person.jobTitle`. Hoy
   circulan cuatro versiones distintas —«Consultor Técnico», «Implementador técnico»,
   «.NET and SharePoint», «Technical Consultant»— y hay que quedarse con una. La
   propuesta es **«CTO en Inadaptados · Construyo y opero sistemas»**, y vive en
   `docs/brand/04-kit-social.md`.
3. **La localidad.** Ver §2: retirada por `docs/03` §7 hasta que la autorices. Es un
   sí o un no, y con un sí vuelve en una línea.
4. **El retrato.** `public/images/profile.jpg` lleva la marca de agua visible de Google AI
   en su esquina inferior derecha, y el archivo no tiene EXIF, XMP ni C2PA que declaren
   su origen. Rodrigo decidió el 2026-09-12 **usarlo tal cual, con la marca visible**. Se
   registra aquí porque es una decisión de procedencia en un sitio cuyo producto es la
   procedencia, y porque la alternativa —recortar la marca— se descartó explícitamente:
   sería borrar una señal de origen. Queda reabierta si aparece fotografía sin
   intervención generativa.
