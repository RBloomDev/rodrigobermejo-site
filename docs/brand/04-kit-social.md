# 04 — Kit de redes sociales

> **Estado: Autoridad desde 2026-09-15 (ADR 0014 ACEPTADA).** Gobierna identidad,
> posicionamiento, tipografía, color, arquitectura de información y copy público del sitio.
> **Cláusula de precedencia:** en `/evidencia`, `/proyectos`, `/proyectos/[slug]` y
> `components/proof/**`, `docs/05-feed-contract.md` § Contrato de presentación y
> `docs/02-domain-and-evidence-model.md` §6–§7
> ganan sobre la marca, y la divergencia es **FAIL, no deuda**.
> Esta autoridad no afirma que lo aquí descrito ya esté implementado ni publicado.

> Todo lo que hay aquí está pendiente de la interpretación de Rodrigo. Nada se publica sin
> que él lo lea. El estado pieza por pieza está en §9.
>
> **Autoridad.** El texto sale de `docs/brand/03-copy-deck.md`; aquí no se inventa copy
> nuevo, se recorta al límite de cada plataforma. Las reglas visuales salen de
> `docs/brand/01-design-system.md` (Dirección A, la recomendada). El par de etiquetas de
> una afirmación se rige por `docs/05-feed-contract.md`, que gana sobre este documento.
> El material de los ejemplos sale de `public/proof/v1/claims.json` y `projects.json`, que
> ya son públicos.
>
> **Cero cifras sin fuente.** No hay número de alumnos, clientes, años, seguidores ni
> resultados. No existen medidas publicables y no se fabrican.
>
> Fecha de verificación de todo lo que este documento afirma: **2026-09-12**.

---

## 0. Antes de nada: el estado real de la identidad, medido

Esto no es contexto decorativo. Son cinco defectos vivos que este kit existe para cerrar,
y cada uno está medido hoy, no recordado.

### 0.1 Cuatro descriptores distintos circulando a la vez

| Dónde | Qué dice | Fuente |
|---|---|---|
| Sitio web | «Consultor Técnico en Automatización» | `app/layout.tsx:39,60,67` |
| `public/llms.txt` | «Technical Consultant» / «Consultor Técnico en Automatización» | `public/llms.txt:4,22` |
| YouTube | «Implementador técnico» | Título del canal `@rodrigolbermejo`, leído el 2026-09-12 |
| Bio de GitHub | «.NET and SharePoint» | API de GitHub, campo `bio`, leído el 2026-09-12 |

Ninguno de los cuatro coincide con otro. Un lector que llegue por dos vías distintas ve
dos personas distintas.

**Propuesta de descriptor único**, la que ya abre `03-copy-deck.md` §10:

> **CTO en Inadaptados · Construyo y opero sistemas**

Es el descriptor del que derivan todas las bios de §2. **Decidirlo es de Rodrigo**, no de
este documento: aquí solo se propone y se aplica de forma consistente para que se pueda
ver el efecto completo antes de aprobarlo.

### 0.2 Los handles no concuerdan entre plataformas

| Plataforma | URL | Handle | ¿Verificado? |
|---|---|---|---|
| GitHub | `github.com/rodrigobermejo` | `rodrigobermejo` | **Sí** — API pública, 2026-09-12 |
| X | `x.com/rodrigobermejo` | `rodrigoBermejo` | **Sí** — campo `twitter_username` de la API de GitHub + perfil |
| YouTube | `youtube.com/@rodrigolbermejo` | `rodrigolbermejo` | **Sí** — leído el 2026-09-12 |
| LinkedIn | `linkedin.com/in/rodrigolbermejo` | `rodrigolbermejo` | **No** — LinkedIn responde HTTP 999 sin sesión |
| Instagram | `instagram.com/rodrigolbermejo` | `rodrigolbermejo` | **No** — requiere sesión |
| Threads | `threads.com/@rodrigolbermejo` | `rodrigolbermejo` | **No** — requiere sesión |
| Facebook | `facebook.com/RodrigoBermejoIA` | `RodrigoBermejoIA` | **No** — lecturas inconsistentes según el user-agent |

URLs tomadas de `components/Footer.tsx`, que es la lista canónica de enlaces del sitio.

Tres formas del mismo nombre: `rodrigobermejo`, `rodrigolbermejo`, `RodrigoBermejoIA`.
**Unificar handles no es una tarea de diseño**: cambiar un handle rompe enlaces existentes
y en algunas plataformas no se puede recuperar. Este documento **no propone unificarlos**.
Propone que el nombre visible sea idéntico en las siete —«Rodrigo Bermejo»— y que la bio
sea la misma en todas, que es lo que sí se puede hacer sin romper nada.

### 0.3 ⚠️ Riesgo de confusión de marca: el handle de YouTube

**Medido el 2026-09-12, leyendo las dos páginas de canal:**

| Handle | Nombre del canal | Descripción |
|---|---|---|
| `youtube.com/@rodrigolbermejo` | **Rodrigo Bermejo - Implementador técnico** | «Automatización e IA aplicada en operación real. Sistemas que contestan leads y no pierden ventas.» |
| `youtube.com/@rodrigobermejo` | **Rodrigo Bermejo Trainer** | «💪 Bienvenido al canal de Rodrigo Bermejo Trainer. Aquí aprenderás a entrenar, comer bien y transformar tu físico…» |

**El handle sin la `l` es otra persona: un canal de fitness.** No es una variante
disponible, no es un perfil viejo, no es un error tipográfico que se pueda corregir
registrándolo. Es una cuenta ajena, activa, que se llama igual.

Consecuencias que hay que asumir:

1. **Cualquier enlace a `@rodrigobermejo` en YouTube manda tráfico a un tercero.**
2. Una búsqueda de «Rodrigo Bermejo» en YouTube va a devolver los dos canales.
3. El descriptor del canal propio —«Implementador técnico»— es hoy lo único que los
   distingue de un vistazo, y es además el descriptor que §0.1 propone retirar. **Si se
   cambia, hay que sustituirlo por otro igual de distintivo**, no por «Rodrigo Bermejo» a
   secas, que sería indistinguible del canal de fitness.

**Este defecto ya está publicado.** Ver §0.4.

### 0.4 El README del perfil de GitHub enlaza al canal equivocado

Leído de `raw.githubusercontent.com/rodrigoBermejo/rodrigoBermejo/main/README.md` el
2026-09-12:

```markdown
[![YouTube](…)](https://youtube.com/@rodrigobermejo)
[![Instagram](…)](https://instagram.com/rodrigobermejo)
```

- El enlace de **YouTube apunta al canal de fitness de otra persona** (§0.3).
- El enlace de **Instagram usa `rodrigobermejo`**, mientras `components/Footer.tsx` usa
  `instagram.com/rodrigolbermejo`. Uno de los dos está mal y no se puede saber cuál sin
  sesión.

### 0.5 Los seis «Featured Projects» del README están rotos — los seis

Medido el 2026-09-12 contra la lista pública de repositorios de la API de GitHub:

| Posición en «Featured Projects» | Estado |
|---|---|
| 1 | **404** |
| 2 | **404** |
| 3 | **404** |
| 4 | **404** |
| 5 | **404** |
| 6 | **404** |

**Los seis se identifican por su posición y no por su nombre.** Este documento se publica
en un repositorio público, y solo nombra repositorios que ya lo son.

Ninguno de los seis aparece en la lista de repos públicos, y una consulta directa a cada
uno devuelve 404. **La sección más visible del README es una lista de seis enlaces
muertos.** O los repos se hicieron privados, o se renombraron, o se borraron: desde fuera
no se puede distinguir, y para un visitante el efecto es el mismo.

Esto es exactamente el problema que `proof-of-work` existe para resolver —«respaldar
afirmaciones profesionales con evidencia verificable, en lugar de con narrativa»— y hoy
está ocurriendo en el perfil desde el que se enuncia.

**Escalación:** la propuesta de README de §4 sustituye esa sección por los proyectos del
feed, que sí están respaldados. Pero **si alguno de esos seis repos debe volver a ser
público, esa decisión es de Rodrigo**, no de este documento.

### 0.6 «CTO en Inadaptados» es una autodeclaración

Sale del README del perfil de GitHub de Rodrigo. **No hay verificación de terceros**, y
este kit no la presenta como si la hubiera. Se usa porque es lo que Rodrigo afirma de sí
mismo, con el mismo estatus que cualquier otro claim `declared` del feed: lo afirma él, y
no puedes comprobarlo sin confiar en él.

---

## 1. Presentación profesional común

**El párrafo maestro.** Todas las bios de §2, el «Acerca de» de §3, el README de §4 y las
publicaciones fijadas de §7 son recortes de este texto. Ninguna añade un hecho que no esté
aquí.

> Soy CTO en Inadaptados, una escuela donde se aprende construyendo. Dirijo la plataforma
> que sostiene su operación educativa —LMS, web, certificados y contenido—, construyo y
> opero sistemas de software, IA y automatización, y doy clase. No solo escribo software:
> lo opero. Los sistemas que construyo están en producción, y cuando algo falla el que
> responde soy yo. Inadaptados es un equipo; lo que aquí se describe es mi parte.

**Fuente de cada fragmento** — ninguna afirmación sin respaldo:

| Fragmento | Fuente |
|---|---|
| «CTO en Inadaptados» | README del perfil de GitHub. **Autodeclaración** (§0.6) |
| «una escuela donde se aprende construyendo» | Página pública de la academia de Inadaptados: *«Aprende construyendo, no memorizando»*, vía `03-copy-deck.md` |
| «la plataforma que sostiene su operación educativa —LMS, web, certificados y contenido—» | `projects.json`, `plataforma-inadaptados`, tesis literal |
| «construyo y opero sistemas de software, IA y automatización» | `claims.json`, `construyo-sistemas` + tesis de `infra-interna`, `contenido-ia`, `ssp` |
| «y doy clase» | `claims.json`, `ensino-y-mentoreo`, literal |
| «No solo escribo software: lo opero. […] el que responde soy yo» | `claims.json`, `construyo-sistemas`, **statement literal** |
| «Inadaptados es un equipo; lo que aquí se describe es mi parte» | `03-copy-deck.md` §5, regla 3 de crédito al equipo |

**Lo que este párrafo deliberadamente no dice:** cuántos años, cuántos alumnos, cuántos
clientes, cuántos proyectos, qué resultados. No hay fuente para ninguno.

---

## 2. Bios por plataforma

**Los límites están verificados el 2026-09-12, no recordados.** La fuente de cada uno está
en la última columna. El conteo es de **puntos de código Unicode**, medido con
`[...texto].length` en Node, no estimado.

| Plataforma | Campo | Conteo | Límite | Uso | Fuente del límite |
|---|---|---|---|---|---|
| LinkedIn | Titular | **135** | 220 | 61 % | [LinkedIn Character Limits 2026](https://howmanywords.app/blog/linkedin-character-limits) · [AuthoredUp](https://authoredup.com/blog/linkedin-character-limit) |
| LinkedIn | Acerca de | **1 439** | 2 600 | 55 % | mismas fuentes |
| X | Bio | **119** | 160 | 74 % | [Bundle.social 2026](https://bundle.social/blog/twitter-character-counter-guide) · [TypeCount](https://typecount.com/blog/twitter-character-limit) |
| Instagram | Bio | **88** | 150 | 59 % | [Character Limits 2026](https://wordscountertool.com/character-limits-2026-list-for-instagram-x-twitter-and-linkedin/) |
| Threads | Bio | **85** | 150 | 57 % | [Limitora 2026](https://www.limitora.com/blog/social-media-character-limits-2026.html) |
| YouTube | Descripción del canal | **644** | 1 000 | 64 % | [Influencer Marketing Hub](https://influencermarketinghub.com/youtube-character-limits/) · [CharCount 2026](https://charcount.tools/platforms/youtube-description-length) |
| GitHub | Bio del perfil | **91** | 160 | 57 % | [github-limits](https://github.com/dead-claudia/github-limits) — *«Max length: 160 characters»* |

**Ninguna bio pasa del 90 % de su límite.** Es deliberado: los contadores de las
plataformas no siempre cuentan igual que Node —emoji, caracteres compuestos y saltos de
línea se cuentan distinto según la plataforma— y un texto al 98 % se trunca sin avisar. El
margen es la mitigación.

### 2.1 LinkedIn — titular · 135/220

```
CTO en Inadaptados · Construyo y opero sistemas de software, IA y automatización · Doy clase de ingeniería de software y bases de datos
```

**Lo visible en resultados de búsqueda y solicitudes de conexión son ~60-70 caracteres.**
Los primeros 60 de este titular son:

```
CTO en Inadaptados · Construyo y opero sistemas de software,
```

Es decir: el rol y el verbo entran completos en el corte. Eso es lo que el orden de las
frases está optimizando, y es la razón de no abrir con «Doy clase».

### 2.2 LinkedIn — Acerca de · 1 439/2 600

Texto completo en §3.

### 2.3 X — bio · 119/160

```
CTO en Inadaptados. Construyo y opero sistemas de software, IA y automatización. Doy clase. Escribo sobre lo que opero.
```

«Escribo sobre lo que opero» es el pie del retrato de la portada
(`03-copy-deck.md` §2), reusado literal. El campo de sitio web de X es aparte: ahí va
`rodrigobermejo.com`, no dentro de la bio.

### 2.4 Instagram — bio · 88/150

```
CTO en Inadaptados
Construyo y opero sistemas de software, IA y automatización
Doy clase
```

Cuatro líneas, sin emoji y sin iconos. El enlace va en el campo de enlace, no en el texto.

### 2.5 Threads — bio · 85/150

```
CTO en Inadaptados
Construyo y opero sistemas: software, IA, automatización
Doy clase
```

Idéntica a la de Instagram salvo la segunda línea, acortada porque Threads dispone de
menos ancho visible antes del corte. **Que las dos sean casi idénticas es intencional**:
son la misma persona y comparten lector.

### 2.6 YouTube — descripción del canal · 644/1 000

```
Soy Rodrigo Bermejo. CTO en Inadaptados, una escuela donde se aprende construyendo.

Aquí publico lo que aprendo operando: automatización e IA aplicadas a operación real, las
decisiones de arquitectura de los sistemas que construyo, y material de ingeniería de
software y bases de datos.

No solo escribo software: lo opero. Los sistemas que construyo están en producción, y
cuando algo falla el que responde soy yo. Lo que cuento en este canal sale de ahí, no de
un caso de estudio ajeno.

Inadaptados es un equipo. Lo que describo es mi parte.

Publico mis afirmaciones con su procedencia y su verificabilidad en
rodrigobermejo.com/evidencia.

```

**El nombre del canal es decisión aparte y urgente.** Hoy es «Rodrigo Bermejo -
Implementador técnico», y es lo único que lo distingue de «Rodrigo Bermejo Trainer»
(§0.3). Si el descriptor único de §0.1 sustituye a «Implementador técnico», el nombre del
canal debe pasar a algo igual de distintivo —**«Rodrigo Bermejo · CTO en Inadaptados»** es
la propuesta— y **nunca** a «Rodrigo Bermejo» a secas.

### 2.7 GitHub — bio del perfil · 91/160

```
CTO en Inadaptados. Construyo y opero sistemas de software, IA y automatización. Doy clase.
```

> ### ⚠️ Esto NO es el README. Es otro campo, y el que está mal hoy.
>
> La **bio corta del perfil** de GitHub dice hoy, literal (API de GitHub, campo `bio`,
> leído el 2026-09-12):
>
> ```
> Being a qualified .NET and SharePoint with several years of experience in Software Development, focus on collaboration and content managment
> ```
>
> 140 caracteres. Tres problemas, y ninguno es de estilo:
>
> 1. **Describe un perfil profesional que ya no es el suyo.** «.NET and SharePoint» es el
>    cuarto descriptor de §0.1, y el más lejano de los otros tres.
> 2. **Está en inglés**, mientras el sitio, el feed y las demás bios están en español.
> 3. **Tiene dos erratas.** «a qualified .NET and SharePoint» no tiene sustantivo
>    —falta «developer» o equivalente—, y «managment» está mal escrito: es «management».
>
> **Es un campo distinto del README**, se edita en `github.com/settings/profile` y no en
> el repositorio `rodrigoBermejo/rodrigoBermejo`. Cambiar el README no cambia la bio.
> Un visitante ve la bio antes que el README, porque aparece en la columna izquierda del
> perfil, en la tarjeta de búsqueda y junto a cada comentario.
>
> **Otros dos campos del mismo formulario, medidos hoy:**
>
> - `blog` dice `http://rodrigobermejo.com` — **`http://`, no `https://`**. Debe
>   corregirse.
> - `company` dice `@Inadaptados @RBloomDev @ISC-UPA ` — con un espacio final sobrante.

---

## 3. LinkedIn: titular y «Acerca de», listos para pegar

### 3.1 Titular — 135/220

```
CTO en Inadaptados · Construyo y opero sistemas de software, IA y automatización · Doy clase de ingeniería de software y bases de datos
```

### 3.2 «Acerca de» — 1 439/2 600

**Solo los primeros ~300 caracteres se ven antes del «ver más».** Este texto está
construido para que ese corte caiga después de la frase que más importa: el párrafo de
apertura entra completo y el corte ocurre a mitad del claim `construyo-sistemas`, que es
precisamente el gancho para desplegar.

```
Soy CTO en Inadaptados, una escuela donde se aprende construyendo. Dirijo la plataforma que sostiene su operación educativa —LMS, web, certificados y contenido—, diseño la currícula con la que se forman desarrolladores, y doy clase.

No solo escribo software: lo opero. Los sistemas que construyo están en producción, y cuando algo falla el que responde soy yo.

Tres dimensiones, ninguna sustituye a las otras.

Dirijo. Arquitectura y dirección tecnológica en Inadaptados: la plataforma que sostiene la operación educativa, la infraestructura interna que la mantiene de pie, y el sistema que automatiza la captación y el seguimiento comercial.

Construyo. Software, IA y automatización en producción. Diseño la arquitectura de los sistemas que construyo, y los opero yo mismo.

Formo. Diseño la currícula y los materiales con los que se forman desarrolladores en Inadaptados, e imparto ingeniería de software y bases de datos a nivel universitario desde 2024.

Inadaptados es un equipo. Lo que aquí se describe es mi parte.

Publico mis afirmaciones con su procedencia y su verificabilidad, y digo explícitamente qué no puede comprobar un tercero. Hoy casi todo es material declarado: lo afirmo yo, y no hay forma de que alguien lo compruebe sin confiar en mí. Eso también está dicho, en rodrigobermejo.com/evidencia.

Trabajo con negocios que ya tienen operación y la están sosteniendo a mano. Diseño el sistema, lo construyo y lo opero.

```

**Trazabilidad de las afirmaciones no obvias:**

| Frase | Fuente |
|---|---|
| «Tres dimensiones, ninguna sustituye a las otras» | Rótulo de `03-copy-deck.md` §2, literal |
| «desde 2024» | `projects.json`, `docencia-universitaria`, `timeframe.start: "2024-08-01"` |
| «el sistema que automatiza la captación y el seguimiento comercial» | `projects.json`, `ssp`, tesis literal |
| «la infraestructura interna» | `projects.json`, `infra-interna`: *«Operar VPS, contenedores y asistentes internos sin depender de terceros»* |
| «Trabajo con negocios que ya tienen operación…» | `03-copy-deck.md` §4, entradilla de `/colaborar` |

**Nota de redacción, no de estilo:** el texto dice «no hay forma de que alguien lo
compruebe», **no** «todavía no hay forma». La palabra «todavía» está prohibida en las
rutas de evidencia por `docs/05-feed-contract.md` porque convierte una condición del
mundo en un retraso del proyecto. La prohibición se respeta también fuera del sitio.

---

## 4. README del perfil de GitHub

**Parte del README que ya existe** (leído el 2026-09-12), no de cero. Lo que se conserva,
lo que se cambia y por qué:

### 4.1 Qué se conserva

- **La estructura bilingüe EN/ES en `<details open>`.** Funciona y es la decisión más
  acertada del README actual: un perfil de GitHub tiene lector internacional.
- **La tabla «What I Do / Lo que hago».** Es concreta y verificable por el stack.
- **La sección de contacto con una sola vía**, la del sitio.

### 4.2 Qué se cambia, y por qué cada cosa

| Qué | Por qué |
|---|---|
| **Fuera la cabecera y el pie de `capsule-render`** | Son degradados (`0EA5E9 → 2563EB → 7C3AED`). Ni uno de esos tres hex existe en la paleta, y `01-design-system.md` §2.1 prohíbe el degradado como superficie de marca. Además dependen de un servicio de terceros para que el perfil se vea entero |
| **Fuera los emoji de encabezado** | Regla visual del kit: sin iconos genéricos ni emoji |
| **Fuera «AI Expert» y «Automation Expert»** | Son superlativos autoadjudicados sin fuente. `03-copy-deck.md` §0 regla 4 los prohíbe |
| **Los seis «Featured Projects» se sustituyen** | Los seis dan **404** (§0.5) |
| **El enlace de YouTube se corrige a `@rodrigolbermejo`** | Hoy manda al canal de otra persona (§0.3) |
| **El enlace de Instagram se alinea con `Footer.tsx`** | Hoy divergen (§0.4) |
| **Fuera las dos tarjetas de estadísticas de GitHub** | Publican conteo de commits, stars, PRs, followers y porcentajes de lenguaje. `docs/02-domain-and-evidence-model.md:467` §7 y `docs/05-feed-contract.md:304` los prohíben **de forma permanente**, y levantarlo exige cambiar antes `docs/00-product-brief.md`. No es una preferencia de diseño ni una duda de disponibilidad del servicio: el perfil consume el mismo feed que el sitio (`docs/00-product-brief.md:78`). Detalle completo tras §4.3 |
| **Se añade la sección de evidencia** | Es lo que distingue este perfil de cualquier otro, y hoy no aparece |

### 4.3 Propuesta completa

````markdown
# Rodrigo Bermejo

<details open>
<summary><strong>Español</strong></summary>

Soy CTO en **Inadaptados**, una escuela donde se aprende
construyendo. Dirijo la plataforma que sostiene su operación educativa —LMS, web,
certificados y contenido—, construyo y opero sistemas de software, IA y automatización,
y doy clase.

No solo escribo software: lo opero. Los sistemas que construyo están en producción, y
cuando algo falla el que responde soy yo.

Inadaptados es un equipo. Lo que aquí se describe es mi parte.

- **CTO** en **Inadaptados**
- **Fundador** de **rbloom dev** — estudio de producto digital
- **Docente** — ingeniería de software y bases de datos a nivel universitario, desde 2024
- [**rodrigobermejo.com**](https://rodrigobermejo.com)

</details>

<details open>
<summary><strong>English</strong></summary>

I'm CTO at **Inadaptados**, a school where you learn by building.
I lead the platform that runs its education operation — LMS, web, certificates and
content — I build and operate software, AI and automation systems, and I teach.

I don't just write software: I operate it. The systems I build are in production, and
when something breaks I'm the one who answers.

Inadaptados is a team. What's described here is my part.

- **CTO** at **Inadaptados**
- **Founder** of **rbloom dev** — digital product studio
- **Lecturer** — software engineering and databases at university level, since 2024
- [**rodrigobermejo.com**](https://rodrigobermejo.com)

</details>

---

## Cómo respaldo lo que afirmo / How I back what I claim

Publico mis afirmaciones con su **procedencia** y su **verificabilidad**, y digo
explícitamente qué no puede comprobar un tercero. Hoy casi todo es material declarado:
lo afirmo yo, y no hay forma de que alguien lo compruebe sin confiar en mí. Eso también
está dicho.

**→ [rodrigobermejo.com/evidencia](https://rodrigobermejo.com/evidencia)**

Hay trabajo bajo acuerdo de confidencialidad que no aparece ahí en ninguna forma, ni
siquiera contado.

---

## Lo que hago / What I do

| Área | Herramientas |
|---|---|
| **Dirección tecnológica** | Arquitectura de sistemas, definición de stack, operación |
| **IA aplicada** | OpenAI API, Anthropic Claude, integración de LLMs, prompt engineering |
| **Automatización** | n8n, Make, diseño e implementación de flujos |
| **Desarrollo web** | Next.js, React, TypeScript, Node.js, Tailwind CSS |
| **Docencia** | Currícula, materiales, ingeniería de software y bases de datos |

---

## Proyectos / Projects

Un proyecto es una unidad de trabajo con dueño e intención; un repositorio es un
artefacto suyo, no el proyecto. Buena parte del mío vive en repos privados y por eso no
aparece entero aquí.

| Proyecto | Tesis | Repo |
|---|---|---|
| **Proof of Work** | Respaldar afirmaciones profesionales con evidencia verificable, en lugar de con narrativa | [RBloomDev/rodrigobermejo-site](https://github.com/RBloomDev/rodrigobermejo-site) |
| **Habit Tracker** | Registrar y dar seguimiento a hábitos personales | [rodrigoBermejo/habit-tracker](https://github.com/rodrigoBermejo/habit-tracker) |
| **Plataforma Inadaptados** | Sostener la operación educativa de Inadaptados: LMS, web, certificados y contenido | privado |
| **SSP** | Automatizar la captación y el seguimiento comercial de Inadaptados | privado |
| **Infraestructura interna** | Operar VPS, contenedores y asistentes internos sin depender de terceros | privado |

La lista completa, con su estado real, está en
[rodrigobermejo.com/proyectos](https://rodrigobermejo.com/proyectos).

---

## Conecta / Connect

- Sitio — [rodrigobermejo.com](https://rodrigobermejo.com)
- LinkedIn — [in/rodrigolbermejo](https://www.linkedin.com/in/rodrigolbermejo)
- X — [@rodrigobermejo](https://x.com/rodrigobermejo)
- YouTube — [@rodrigolbermejo](https://www.youtube.com/@rodrigolbermejo)
- Instagram — [@rodrigolbermejo](https://www.instagram.com/rodrigolbermejo)
- Threads — [@rodrigolbermejo](https://www.threads.com/@rodrigolbermejo)
````

**Nota sobre los enlaces:** donde el README dice **Inadaptados** en negrita va enlazado el
sitio público de la escuela; la URL se completa al pegar.

**Nota sobre las tablas de proyectos:** los cinco proyectos y sus tesis son **literales**
de `public/proof/v1/projects.json`. Los tres marcados «privado» tienen
`visibility: private`, que según `docs/03-privacy-and-publication-policy.md` §2
(«Publicación de lo privado») publica el *registro* —`id`, `title`, `thesis`,
`timeframe`, `context`, `role`, `has_private_sources`— pero no la fuente. Por eso aparecen
con su tesis y sin enlace. **Ningún proyecto `confidential` aparece aquí en ninguna forma,
ni contado.**

**Por qué este README no lleva sección de estadísticas.** Una versión anterior de esta
propuesta incluía dos tarjetas de estadísticas de GitHub, generadas por un servicio de
terceros: conteo de commits, stars, PRs, followers y porcentajes de lenguaje. **Están retiradas, y no como criterio estético.**
`docs/02-domain-and-evidence-model.md:467` («Prohibido en el schema») enumera
*«conteo de commits como habilidad · líneas de código · streaks · stars · forks ·
followers · … · porcentajes de lenguaje · … · score · rank»*, y
`docs/05-feed-contract.md:304` repite la lista bajo el encabezado **«Prohibido en el
contrato, permanentemente»** — `commit_count`, `stars`, `forks`, `followers`,
`language_percentages`, `score`, `rank`. Ambos documentos añaden que levantar la
prohibición exige cambiar antes `docs/00-product-brief.md`.

No es una regla que aplique solo al feed. `docs/00-product-brief.md:78` lista
`rodrigoBermejo/rodrigobermejo` —el README de perfil— como uno de los tres repos del
sistema, con la nota «consume el feed». Publicar en él un tablero de métricas de vanidad
diría exactamente lo contrario que el producto: que el volumen de actividad es la prueba.
El mismo argumento ya está publicado en la lámina 5 de `social/carrusel.html`: «No hay
puntaje. Ni porcentaje de completitud, ni nivel, ni barra de progreso.»
Lo que las tarjetas pretendían decir —en qué trabaja y con qué madurez— ya lo dice el
README sin una sola cifra: la tabla de proyectos con su tesis y el enlace a
`/proyectos`.

**Lo que queda pendiente de Rodrigo en este README:**

1. ¿Los seis repos de «Featured Projects» vuelven a ser públicos, o la sección se sustituye
   por la del feed como se propone? (§0.5)
2. ¿Se conserva «Fundador de rbloom dev»? Está en el README actual pero **no aparece en
   `claims.json` ni en `03-copy-deck.md`**. Es la única afirmación de la propuesta sin
   respaldo en el feed, y se conserva solo porque ya está publicada.
3. **Aviso, no pregunta:** las dos tarjetas de estadísticas de GitHub que hoy están en el perfil
   **se retiran**, porque publican conteo de commits, stars, followers y porcentajes de
   lenguaje —prohibidos de forma permanente por `docs/02` §7 y `docs/05`—. No se pregunta
   si conservarlas: conservarlas sería publicar lo prohibido con aprobación humana
   registrada, que es peor que publicarlo por descuido. Si Rodrigo quiere revertirlo, el
   camino es cambiar `docs/00-product-brief.md` primero, como exigen los dos documentos.

---

## 5. Dimensiones y zonas seguras verificadas

**Todas verificadas el 2026-09-12.** Lo que no pude verificar está en §8 y no aparece
inventado aquí.

| Plataforma | Pieza | px exactos | Zona segura | Fuente consultada |
|---|---|---|---|---|
| **LinkedIn** | Banner de perfil personal | **1584 × 396** | **Los 568 × 264 px de la esquina inferior izquierda quedan cubiertos por la foto de perfil.** Nada legible ahí | [Buffer, *Social Media Image Sizes in 2026*](https://buffer.com/resources/social-media-image-sizes/) · [usevisuals, safe zones](https://usevisuals.com/blog/linkedin-banner-size-safe-zones-guide) |
| **LinkedIn** | Portada de página de empresa | 1128 × 191 | — | [Buffer 2026](https://buffer.com/resources/social-media-image-sizes/) |
| **X** | Cabecera de perfil | **1500 × 500** (3:1) | ~1500 × 360 útiles. El avatar y el nombre cubren el borde inferior izquierdo | [Buffer 2026](https://buffer.com/resources/social-media-image-sizes/) · [Neal Schaffer, *X Banner Size 2026*](https://nealschaffer.com/twitter-banner-size/) |
| **YouTube** | Banner de canal | Subir a **2560 × 1440**; mínimo 2048 × 1152 | **1546 × 423 centrados** (equivale a 1235 × 338 al tamaño mínimo). Es el único rectángulo visible en televisión, móvil y escritorio a la vez | [Buffer 2026](https://buffer.com/resources/social-media-image-sizes/) · [postfa.st](https://postfa.st/sizes/youtube/banner) |
| **Facebook** | Portada de página | Subir **851 × 315**; mínimo 400 × 150 | Recorte **16:9 alineado a la izquierda en escritorio** y **2.4:1 en móvil**. Centro ~640 × 312 seguro | [Centro de ayuda de Facebook](https://www.facebook.com/help/125379114252045) — leído el 2026-09-12 |
| **LinkedIn** | Carrusel (documento PDF) | **1080 × 1350** vertical (alternativas 1080 × 1080 y 2048 × 1152) | Máx. 300 páginas, 100 MB | [Contentdrips 2026](https://contentdrips.com/blog/2026/03/ultimate-guide-to-linkedin-carousel-sizes-for-2026/) · [Oktopost](https://www.oktopost.com/blog/linkedin-carousel-pdf-best-practices/) |
| **Instagram** | Carrusel | **1080 × 1350** vertical (o 1080 × 1080) | Hasta 10 láminas; **la orientación elegida se aplica a todas** | [Contentdrips 2026](https://contentdrips.com/blog/2026/05/instagram-carousel-size-format/) · [Buffer 2026](https://buffer.com/resources/social-media-image-sizes/) |
| **YouTube** | Miniatura | **1280 × 720** (16:9) | Máx. 2 MB. El sello de duración cubre la **esquina inferior derecha** | [postfa.st](https://postfa.st/sizes/youtube/thumbnail) · [Buffer 2026](https://buffer.com/resources/social-media-image-sizes/) |
| **Vertical** (Reels, Shorts, Stories) | Pieza a pantalla completa | **1080 × 1920** (9:16) | La interfaz cubre los bordes: mantener el contenido dentro del centro | [Buffer 2026](https://buffer.com/resources/social-media-image-sizes/) |

### 5.1 Dónde las fuentes no se ponen de acuerdo, y qué se hizo

**LinkedIn, zona del avatar.** Las fuentes dan cifras distintas: unas dicen «~200 × 200 px
inferior izquierda», otras «568 × 264 px». **Se adopta 568 × 264, la más conservadora**, y
está marcada con rectángulo discontinuo en `social/banners.html`. Un banner diseñado para
la cifra grande funciona con la pequeña; al revés no.

**Facebook, portada.** Aquí las lecturas son **francamente inconsistentes**: 820 × 312,
851 × 315, 1200 × 628 y 640 × 360 aparecen todas en fuentes de 2026, y no dicen lo mismo.
La razón es que mezclan tres cosas distintas: el tamaño de **subida** recomendado, el de
**visualización en escritorio** y el de **visualización en móvil**. El Centro de ayuda de
Facebook, que es la única fuente de primera mano, dice **851 × 315 para subir**, mínimo
400 × 150, y describe el recorte como 16:9 en escritorio y 2.4:1 en móvil. **La pieza se
construye a 851 × 315 y todo lo legible vive en el centro.** Esta inconsistencia se
declara, no se esconde.

**YouTube.** No pude obtener la especificación del Centro de ayuda oficial de Google: la
página `support.google.com/youtube/answer/2972003` no devuelve las cifras en su contenido
recuperable. Las cifras de la tabla vienen de fuentes secundarias que coinciden entre sí
(2560 × 1440 de subida, 1546 × 423 de área segura). **Coincidencia entre secundarias no es
verificación de primera mano**, y así queda dicho en §8.

---

## 6. Plantillas editables

Tres géneros. Cada uno con su estructura, su longitud objetivo y un ejemplo real
construido con material de `public/proof/v1/`. Las piezas visuales correspondientes están
en `social/plantillas.html`, con los huecos marcados.

**Regla común a los tres, y no es negociable:** si la publicación muestra una afirmación
del feed, **el par de etiquetas va como una sola oración**, con el mismo peso y color en
los dos valores:

> Procedencia: lo afirmo yo · Verificabilidad: no puedes comprobarlo sin confiar en mí

Sin iconos, sin check, sin color de estado, sin rampa entre valores. Lo impone
`docs/05-feed-contract.md`, y **aplica igual fuera del sitio**: si en LinkedIn el par se
ve como un badge verde de «verificado», el sistema entero deja de significar lo que dice.
Los cuatro valores de cada eje, para referencia:

| `provenance` | Copy | | `verifiability` | Copy |
|---|---|---|---|---|
| `declared` | lo afirmo yo | | `unverifiable` | no puedes comprobarlo sin confiar en mí |
| `collected` | leído de la fuente | | `self_link` | enlaza a algo que alojo yo |
| `derived` | calculado a partir de lo leído | | `third_party_public` | cualquiera puede abrirlo y comprobarlo |
| `correlated` | unido entre fuentes | | `cryptographic` | comprobable sin confiar en nadie |

---

### 6.1 Género A — Caso de trabajo

**Para qué:** contar un sistema que existe y está operando, sin convertirlo en un caso de
éxito.

**Estructura:**

1. **La situación operativa** — qué se estaba sosteniendo a mano. 1-2 frases. Sin cifras.
2. **Qué construí** — verbo primero, concreto.
3. **Qué decidí y qué descarté** — la decisión es lo que aporta, no el resultado.
4. **Qué se puede comprobar y qué no** — el par de etiquetas como una oración.
5. **Adónde ir** — `rodrigobermejo.com/proyectos`.

**Longitud objetivo:** LinkedIn 900-1 400 caracteres (límite 3 000). X: hilo de 3-5
publicaciones de ≤ 280 cada una. La pieza visual acompaña, no sustituye al texto.

**Prohibido en este género:** «logramos», «aumentamos un X %», «en tiempo récord», y
cualquier número que no salga de `public/proof/v1/`.

**Ejemplo real — proyecto `ssp`:**

> Inadaptados captaba y seguía prospectos a mano. Cada persona interesada era un mensaje
> que alguien tenía que ver, clasificar y contestar, y el sistema era la memoria de quien
> estuviera de turno.
>
> Construí SSP: automatiza la captación y el seguimiento comercial de Inadaptados. Está en
> producción desde agosto de 2026.
>
> La decisión que lo definió fue no comprar un CRM. Un CRM te da el registro, pero el
> trabajo que hacía falta no era registrar: era contestar. Lo que construimos empieza en
> la conversación, no en la ficha.
>
> No solo escribo software: lo opero. SSP está en producción y cuando algo falla el que
> responde soy yo.
>
> Procedencia: lo afirmo yo · Verificabilidad: no puedes comprobarlo sin confiar en mí.
> El repositorio es privado, así que esto es material declarado y así está publicado.
>
> Los doce proyectos, con lo que cada uno se propone: rodrigobermejo.com/proyectos

**Trazabilidad:** «Automatizar la captación y el seguimiento comercial de Inadaptados» es
la tesis literal de `ssp`. «desde agosto de 2026» es `timeframe.start: "2026-08-01"`. «No
solo escribo software: lo opero…» es el statement literal de `construyo-sistemas`. «Doce
proyectos» es el conteo real de `projects.json`. **«La decisión que lo definió fue no
comprar un CRM» no está en el feed**: es narrativa que solo Rodrigo puede confirmar, y por
eso el ejemplo entero está marcado BORRADOR en §9.

---

### 6.2 Género B — Decisión técnica

**Para qué:** mostrar el criterio, que es lo que no se puede copiar.

**Estructura:**

1. **La decisión, en una frase**, en presente.
2. **La alternativa obvia** y por qué se descartó.
3. **Lo que cuesta** la decisión tomada. Si no tiene costo, no era una decisión.
4. **Dónde vive escrita** — ADR, spec, repo.

**Longitud objetivo:** LinkedIn 700-1 200 caracteres. X: publicación única de ≤ 280 con la
decisión y el costo, o hilo de 3. Es el género más corto: una decisión que necesita 2 000
caracteres no está decidida.

**Prohibido en este género:** presentar la decisión como obvia. Si no había tensión, no
hay publicación.

**Ejemplo real — proyecto `proof-of-work`:**

> En mi sitio, un proyecto confidencial no aparece. Ni contado.
>
> Lo obvio era decir cuántos hay bajo acuerdo de confidencialidad. Suena honesto y da
> volumen. Lo descarté: ese número también dice algo sobre quién los encargó. Un conteo
> es un dato.
>
> Lo que cuesta: mi portafolio se ve más pequeño de lo que es, y no tengo forma de
> demostrar que no. Ese es el precio, y lo pago.
>
> Está escrito en la política de publicación del sistema, no en mi criterio del día:
> confidencial ⇒ ninguna salida pública. Sin excepción en código.
>
> rodrigobermejo.com/evidencia

**Trazabilidad:** «Hay trabajo bajo acuerdo de confidencialidad que no aparece aquí en
ninguna forma, ni siquiera contado. No hay un número de proyectos ocultos porque ese
número también diría algo sobre quién los encargó» es copy **normativo e intocable** de
`app/evidencia/page.tsx:51-54`, citado en `03-copy-deck.md` §6. La regla
«`confidential` ⇒ `publish: none`» es
`docs/03-privacy-and-publication-policy.md` §2 («Default cerrado para lo confidencial») y
§3 regla 1 («Confidencial no se agrega»).

---

### 6.3 Género C — Contenido docente

**Para qué:** enseñar algo completo y pequeño. No es un adelanto de nada.

**Estructura:**

1. **El error concreto**, en el lenguaje de quien lo comete.
2. **Por qué se comete** — el modelo mental equivocado, no la regla olvidada.
3. **Qué hacer en su lugar**, con el caso mínimo.
4. **Cómo saber que lo entendiste** — una comprobación que el lector puede correr.

**Longitud objetivo:** LinkedIn 800-1 300 caracteres. Carrusel de 5-7 láminas si el paso 3
necesita código. YouTube: 4-8 minutos.

**Prohibido en este género:** el gancho de curiosidad sin resolución («el 90 % de los devs
no sabe esto»), y prometer una parte 2.

**Ejemplo real — proyecto `docencia-universitaria`:**

> «Le puse índice y sigue lenta.»
>
> Es lo que más escucho cuando doy bases de datos. Y casi siempre el índice está bien
> creado: lo que está mal es la idea de que un índice acelera una tabla. No acelera una
> tabla. Acelera **una consulta concreta** sobre unas columnas concretas, en un orden
> concreto.
>
> Un índice sobre (a, b) sirve para filtrar por a, y para filtrar por a y b. No sirve para
> filtrar solo por b. Es una guía telefónica: ordenada por apellido y nombre, encuentras a
> todos los García en un segundo, y para encontrar a todos los que se llaman Ana tienes
> que leerla entera.
>
> Cómo saber que lo entendiste: antes de crear el índice, escribe el WHERE de la consulta
> que quieres acelerar. Si no puedes escribirlo, el índice es un deseo, no una decisión.
>
> Imparto ingeniería de software y bases de datos a nivel universitario desde 2024.

**Trazabilidad:** «Impartir asignaturas de ingeniería de software y bases de datos a nivel
universitario» es la tesis literal de `docencia-universitaria`; «desde 2024» es su
`timeframe.start`. **El contenido técnico del ejemplo —el índice compuesto— no sale del
feed**: es material didáctico ilustrativo. Es correcto, pero es mío, no de Rodrigo, y por
eso está marcado BORRADOR en §9.

**Nota que este género debe respetar:** «Enseñar no deja artefacto público, así que esta es
la dimensión de la que menos evidencia comprobable existe»
(`03-copy-deck.md` §5). Una publicación docente **no** convierte la docencia en algo
verificable. No se presenta como si lo hiciera.

---

## 7. Publicaciones fijadas

Una por plataforma. Responden tres preguntas: **quién es, qué construye, qué enseña.**

### 7.1 LinkedIn — publicación fijada · 1 231 caracteres de 3 000

*Conteo medido sobre el texto sin los asteriscos de negrita, que LinkedIn no interpreta.*

> Llevo años en la intersección entre tecnología y negocio. Hoy dirijo tecnología en una
> escuela, construyo sistemas que opero yo mismo, y doy clase.
>
> **Quién soy.** CTO en Inadaptados, una escuela donde se aprende construyendo. Dirijo la
> plataforma que sostiene su operación educativa: LMS, web, certificados y contenido.
> Inadaptados es un equipo; esto es mi parte.
>
> **Qué construyo.** Software, IA y automatización en producción. La infraestructura
> interna —VPS, contenedores, asistentes— y el sistema que automatiza la captación y el
> seguimiento comercial. No solo escribo software: lo opero. Cuando algo falla, el que
> responde soy yo.
>
> **Qué enseño.** Diseño la currícula con la que se forman desarrolladores en Inadaptados,
> e imparto ingeniería de software y bases de datos a nivel universitario desde 2024.
>
> **Y una cosa más.** Publico mis afirmaciones con su procedencia y su verificabilidad.
> Hoy casi todo es material declarado: lo afirmo yo, y no hay forma de que alguien lo
> compruebe sin confiar en mí. Eso está dicho en mi sitio, con esas palabras, en vez de
> escondido detrás de un sello de verificado.
>
> Hay trabajo bajo acuerdo de confidencialidad que no aparece ahí en ninguna forma, ni
> siquiera contado.
>
> → rodrigobermejo.com/evidencia

**Pieza visual que la acompaña:** la lámina 1 del carrusel (`social/carrusel.html`), o el
carrusel completo como documento PDF de 6 páginas.

### 7.2 X — publicación fijada · hilo de 4

> **1/** Soy CTO en Inadaptados, una escuela donde se aprende construyendo. Dirijo la
> plataforma que sostiene su operación educativa, construyo y opero sistemas, y doy clase.
> Tres dimensiones, ninguna sustituye a las otras.
>
> **2/** Construyo: software, IA y automatización en producción. No solo escribo software,
> lo opero. Los sistemas que construyo están en producción y cuando algo falla el que
> responde soy yo.
>
> **3/** Enseño: diseño la currícula con la que se forman desarrolladores, e imparto
> ingeniería de software y bases de datos a nivel universitario desde 2024.
>
> **4/** Y publico mis afirmaciones con su procedencia y su verificabilidad. Hoy casi todo
> es material declarado: lo afirmo yo, y no puedes comprobarlo sin confiar en mí. Prefiero
> decirlo a ponerme una palomita de verificado.
> rodrigobermejo.com/evidencia

**Conteos medidos:** 217, 185, 152 y 248 caracteres. Las cuatro dentro de 280.
**Verificar igualmente en el compositor antes de publicar**: X cuenta algunos caracteres
distinto de como los cuenta un editor, y trata las URL de forma especial. El conteo de
arriba es el de texto plano, no el de X. No lo di por bueno: hay que mirarlo en el
compositor.

### 7.3 GitHub — el README es la publicación fijada

En GitHub no hay «publicación fijada» en el sentido de las otras dos: **el README del
perfil es esa pieza**, y la propuesta completa está en §4.3. Lo que sí existe y hay que
usar son los **repositorios fijados** (hasta 6, en `github.com/settings/profile`).

**Propuesta de los fijados**, con los repos que existen hoy y son públicos:

| Orden | Repo | Por qué |
|---|---|---|
| 1 | `RBloomDev/rodrigobermejo-site` | Es el proyecto `proof-of-work`, y es la única pieza donde el método se puede leer entero |
| 2 | `rodrigoBermejo/habit-tracker` | Es el único otro proyecto del feed con `public_sources` |
| 3 | `rodrigoBermejo/rodrigobermejo` | El propio README del perfil |

**Solo hay tres candidatos respaldados, y es un hecho, no un descuido.** De los 12
proyectos de `projects.json`, únicamente 2 tienen fuente pública. Rellenar los otros tres
huecos con repos de práctica sería fabricar volumen — exactamente lo que
`proof-of-work` existe para no hacer. Los seis «Featured Projects» del README actual no
son candidatos: dan 404 (§0.5).

---

## 8. Qué no pude verificar

Esta sección es parte del entregable, no un descargo. Cada línea es algo que este
documento **no** sabe.

### 8.1 Perfiles que no pude leer

| Plataforma | Qué pasó | Consecuencia |
|---|---|---|
| **LinkedIn** | Devuelve **HTTP 999** a cualquier lectura sin sesión. Es su bloqueo antiautomatización, no un error | **No pude confirmar que `linkedin.com/in/rodrigolbermejo` exista, ni leer su titular ni su «Acerca de» actuales.** Las propuestas de §3 son texto nuevo, no una reescritura de algo que haya leído |
| **Instagram** | Requiere sesión | No pude confirmar que `rodrigolbermejo` sea el handle correcto ni leer la bio actual. §0.4 detecta que el README usa `rodrigobermejo` y el `Footer.tsx` usa `rodrigolbermejo`, y **no puedo decir cuál está bien** |
| **Threads** | Requiere sesión | Igual que Instagram |
| **Facebook** | **Lecturas inconsistentes según el user-agent.** La misma URL devuelve contenidos distintos según cómo se pida | **No puedo afirmar que `facebook.com/RodrigoBermejoIA` sea de Rodrigo ni que esté activa.** La portada de `social/banners.html` se construye igual, con las dimensiones oficiales, pero **no se publica hasta que Rodrigo confirme que la cuenta es suya** |

**Lo que esto significa en la práctica:** los conteos de caracteres de §2 para LinkedIn,
Instagram y Threads son correctos contra el **límite publicado** de cada plataforma, pero
no están comprobados contra el contador real de la plataforma, que es lo único definitivo.
**Pegar y mirar el contador antes de guardar.**

### 8.2 Dimensiones que no pude verificar de primera mano

- **El banner de canal de YouTube.** La página oficial de ayuda de Google no devuelve las
  cifras en su contenido recuperable. Las de §5 (2560 × 1440 de subida, área segura
  1546 × 423) vienen de varias fuentes secundarias **que coinciden entre sí**, lo cual es
  mejor que una sola fuente pero **no es verificación de primera mano**.
- **La zona del avatar de LinkedIn.** El valor 568 × 264 está corroborado por fuentes de
  2026, pero otras dan «~200 × 200». Se adoptó el conservador (§5.1). **No lo he medido
  yo en un perfil real**, que sería la única comprobación definitiva: subir el banner y
  mirar.
- **La portada de Facebook.** Las fuentes son abiertamente inconsistentes; se adoptó el
  Centro de ayuda oficial (851 × 315). Ver §5.1.
- **La zona segura del formato vertical (1080 × 1920).** El lienzo está verificado; **el
  margen no**. Reels, Shorts, TikTok y Stories cubren los bordes del 9:16 con su propia
  interfaz y cada uno lo hace distinto, y no encontré una cifra de primera mano válida para
  los cuatro. `social/video-y-vertical.html` adopta un rectángulo central de **900 × 1120**
  —margen superior 320, inferior 480, laterales 90— y **lo declara en la pieza como margen
  adoptado, no medido**. Si alguna vez se mide la cifra real por plataforma, se sustituye
  ahí y se corrige esta línea.
- **El sello de duración de la miniatura de YouTube.** Que ocupa la esquina inferior derecha
  es observable en cualquier reproductor, pero **su tamaño exacto no está verificado**: los
  200 × 84 px marcados en la pieza son una estimación conservadora, y por eso en esa mitad
  vive el retrato y no el texto.

### 8.3 El riesgo de marca que no puedo cerrar

**El canal `youtube.com/@rodrigobermejo` es de otra persona y seguirá siéndolo.** No hay
acción técnica que lo resuelva. Lo que sí se puede hacer, y este documento propone:

1. **Corregir el enlace del README** (§4.2), que hoy manda tráfico propio al canal ajeno.
2. **Auditar todos los enlaces a YouTube** en el sitio, el `llms.txt`, las firmas de correo
   y cualquier material impreso. `components/Footer.tsx` ya usa el correcto; el README no.
3. **Mantener un nombre de canal distintivo** (§2.6). Nunca «Rodrigo Bermejo» a secas.
4. **No intentar registrar variantes.** Registrar `@rodrigobermejo2` o similar multiplica
   la confusión en vez de reducirla.

### 8.4 Lo que no está medido porque no existe

No hay número de seguidores, de reproducciones, de impresiones, de suscriptores ni de tasa
de interacción en ninguna plataforma **en este documento**, y no es un olvido: no se
recogieron, y recogerlos requiere sesión en cada una. Si alguna versión futura de este kit
trae una de esas cifras, tiene que venir con su fecha y su método de lectura.

---

## 9. Estado de cada pieza

**Nada de lo que sigue está aprobado.** La columna «Bloquea» dice qué decisión de Rodrigo
falta para que la pieza deje de ser borrador.

| # | Pieza | Estado | Bloquea |
|---|---|---|---|
| 1 | Párrafo maestro (§1) | **BORRADOR** | Aprobar el descriptor único «CTO en Inadaptados · Construyo y opero sistemas» (§0.1) y el titular «Formo talento» vs «Doy clase» (`03-copy-deck.md` §10) |
| 2 | Titular de LinkedIn (§3.1) | **BORRADOR** | Lo mismo que #1. Además, no pude leer el titular actual (§8.1) |
| 3 | «Acerca de» de LinkedIn (§3.2) | **BORRADOR** | Lo mismo que #2 |
| 4 | Bio de X (§2.3) | **BORRADOR** | #1 |
| 5 | Bio de Instagram (§2.4) | **BORRADOR** | #1 + confirmar que el handle es `rodrigolbermejo` (§8.1) |
| 6 | Bio de Threads (§2.5) | **BORRADOR** | Igual que #5 |
| 7 | Descripción del canal de YouTube (§2.6) | **BORRADOR** | #1 + **decidir el nuevo nombre del canal**, que es lo único que lo distingue del canal ajeno (§0.3) |
| 8 | **Bio corta del perfil de GitHub (§2.7)** | **BORRADOR — listo para aplicar** | #1. Es el cambio de menor riesgo y mayor retorno: hoy dice «.NET and SharePoint» con dos erratas |
| 9 | README del perfil de GitHub (§4.3) | **BORRADOR** | ¿Vuelven a ser públicos los seis repos (§0.5)? ¿Se conserva «Fundador de rbloom dev», que no está en el feed? **Las tarjetas de estadísticas de GitHub no se preguntan: se retiran por regla del producto (§4.2)** |
| 10 | `banners.html` — LinkedIn, X, YouTube, Facebook | **BORRADOR** | #1. **La portada de Facebook además no se publica** hasta confirmar que la cuenta es de Rodrigo (§8.1) |
| 11 | `carrusel.html` — 6 láminas | **BORRADOR** | #1. El contenido es literal del feed, así que el riesgo de contenido es bajo; lo que falta es la lectura de Rodrigo |
| 12 | `plantillas.html` — tres géneros | **BORRADOR** | #1. **Los tres ejemplos contienen narrativa que no está en el feed** —la decisión del CRM, el ejemplo del índice compuesto— y solo Rodrigo puede confirmarla o sustituirla |
| 13 | `video-y-vertical.html` | **BORRADOR** | #1 |
| 14 | Publicación fijada de LinkedIn (§7.1) | **BORRADOR** | #1 |
| 15 | Hilo fijado de X (§7.2) | **BORRADOR** | #1 + verificar el conteo de 280 en el compositor de X |
| 16 | Repos fijados de GitHub (§7.3) | **BORRADOR** | ¿Se acepta fijar solo 3 de 6 huecos? (§7.3) |

### 9.1 Lo que no depende de aprobar el descriptor

Tres correcciones son **defectos, no decisiones de marca**, y se pueden aplicar sin esperar
a nada de lo anterior:

1. **El enlace de YouTube del README manda al canal de otra persona** (§0.4).
2. **`blog` en el perfil de GitHub dice `http://`, no `https://`** (§2.7).
3. **Los seis enlaces de «Featured Projects» dan 404** (§0.5). Aunque la sección se
   rediseñe después, seis enlaces muertos son peor que ninguno.

---

## 10. Archivos de este kit

| Archivo | Qué contiene |
|---|---|
| `docs/brand/04-kit-social.md` | Este documento |
| `docs/brand/social/banners.html` | Banner de LinkedIn (1584 × 396, zona del avatar marcada), cabecera de X (1500 × 500), banner de canal de YouTube (2560 × 1440, área segura marcada), portada de Facebook (851 × 315) |
| `docs/brand/social/carrusel.html` | Carrusel de 6 láminas a 1080 × 1350, una por `.lienzo-marco` para exportarlas por separado. Explica el sistema de Proof of Work con material literal del feed |
| `docs/brand/social/plantillas.html` | Las tres plantillas de §6, cada una rellena con su ejemplo real y con los huecos marcados como editables |
| `docs/brand/social/video-y-vertical.html` | Miniatura de YouTube (1280 × 720) y pieza vertical (1080 × 1920) |

Los cuatro HTML enlazan `../prototipos/base.css` y `../prototipos/a-expediente/tokens.css`,
declaran su lienzo en píxeles reales y lo escalan con `transform: scale()`, igual que
`prototipos/a-expediente/social.html`. **Lo que se ve en pantalla es el mismo píxel que se
exporta, solo reducido.** Cada archivo trae un interruptor **«Modo exportación»** que oculta
las guías —zonas seguras, marcas de hueco editable— para capturar la pieza limpia.

### 10.1 Reglas visuales que cumplen las cuatro piezas

- **Ni un hexadecimal nuevo.** Todo color sale de `prototipos/a-expediente/tokens.css`.
- **Yellowtail solo en la firma `rb`**, vía la clase `.firma`. Nunca en un titular.
- **Sin sombras. Sin degradados. Sin iconos genéricos ni emoji.**
- **El teal `#11abb0` en un solo rol**: la firma, la numeración de lámina y el marcador de
  regla. No rellena, no jerarquiza, no indica estado.
- **El azul `#14537e` es tinta, no superficie.** Titula; no hace de fondo.
- **El par de etiquetas, una sola oración**, mismo peso y mismo color en los dos valores.
- Todas se previsualizan sin desbordamiento horizontal a **400 px de ancho de ventana**.
