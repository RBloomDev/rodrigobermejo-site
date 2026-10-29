---
title: "Le pedí a Claude una app para que mis hijos inventaran sus calaveritas"
slug: "calaveritas-con-ia"
date: "2026-10-29"
excerpt: "No le pedí a la IA que escribiera las calaveritas. Le pedí una herramienta que les hiciera preguntas a mis hijos. Este es el paso a paso, con el prompt completo."
---

Para el Día de Muertos de 2026 quise hacer las calaveritas con mis hijos: Victoria, Mario y Rodrigo.

Podía resolverlo en dos minutos. Abro un chat, le pido tres poemas y listo. Pero entonces la calaverita iba a ser de la inteligencia artificial, no de ellos.

Así que le pedí a Claude otra cosa: una herramienta que les hiciera preguntas. Qué les gusta, qué comen, qué travesura hacen y cómo quieren que termine la historia. Con sus respuestas, Claude arma la rima.

Aquí va todo el proceso, con lo que funcionó y lo que no, para que lo repitas en tu casa o en tu salón.

## Paso 1: el prompt fueron tres mensajes

No escribí un prompt gigante. Fueron tres mensajes, y los copio tal cual, con todo y faltas de ortografía:

> Ayudame a crear un artefacto para hacerles preguntas a mis hijos que funcionen para hacer su calaverita... la calaverita es una tradicion mexicana literaria para hacer rimas. EL artefacto usalo para la entrevista y luego generar la calaverita completa.
>
> Esto es para niños de 6 años y usa la decoracion de Coco Disney Pixar como el papel picado, las flores de cepazuchil y cosas asi graficas.

> La generacion de la calaverita deberia de ser con sonnet

> utilizando mi cuenta

Lo interesante fue la respuesta al primero. Claude no usó Coco:

> Uso papel picado, cempasúchil, velas y calaveritas de azúcar, que son elementos tradicionales del Día de Muertos. No uso personajes ni marca de Coco, porque son de Disney/Pixar.

No se lo pedí. Lo decidió solo, y tenía razón.

## Paso 2: así funciona la app

![La app Taller de Calaveritas en el celular: la pregunta «¿Quién es para ti?» con opciones para tocar](/images/blog/calaveritas/app-preguntas.jpg)

Se llama Taller de Calaveritas y corre dentro de Claude. Son ocho preguntas, una por pantalla, y casi todas se contestan tocando un botón, porque un niño de seis años todavía no escribe rápido:

1. ¿Cómo se llama la persona de tu calaverita?
2. ¿Quién es para ti?
3. ¿Qué le gusta hacer muchísimo?
4. ¿Cuál es su comida favorita?
5. ¿Qué cosa chistosa hace?
6. ¿En dónde lo encontró la Catrina?
7. ¿Cómo termina la historia?
8. ¿Cómo te llamas tú? Sirve para firmar la calaverita.

Cada respuesta prende una velita. Al final le das escribir y Claude Sonnet arma cuatro estrofas con rima. Lo hace con tu cuenta, así que cada calaverita cuenta como un mensaje de tu plan. La primera vez, la página te pide permiso para usar Claude, y solo funciona dentro de claude.ai o de la app de Claude con tu sesión iniciada.

![Una calaverita generada en la app para un perfil inventado: «Don Beto y la Catrina dormilona»](/images/blog/calaveritas/app-calaverita.jpg)

Para la grabación la probé con un perfil inventado: Don Beto, un abuelito que ronca. Con la calaverita lista quedan cuatro botones:

- **Escuchar**: te la lee en voz alta. Ayuda muchísimo cuando apenas están aprendiendo a leer.
- **Otra versión**: escribe una nueva con las mismas respuestas.
- **Cambiar respuestas**: regresa a la entrevista sin perder lo que ya contestaste.
- **Copiar**: para mandarla por WhatsApp a la abuela.

## Paso 3: el prompt completo para hacerlo desde cero

Mis tres mensajes funcionaron, pero así como estaban no le sirven a nadie más. No dicen cuáles son las preguntas, cómo debe rimar ni qué hacer cuando algo falla. Así que al final le pedí a Claude el prompt para construir la app desde cero.

Una aclaración honesta: este no es el que yo escribí. Es la especificación que Claude reconstruyó a partir de lo que ya habíamos hecho. Pégalo en un chat nuevo de Claude que pueda crear artefactos:

```text
Crea un artefacto web interactivo llamado "Taller de Calaveritas" para que niñas y niños de 6 años, con ayuda de un adulto, hagan una entrevista y al final obtengan una calaverita literaria completa con rima.

## Objetivo
Una entrevista corta y guiada (8 preguntas) cuyas respuestas se mandan a Claude para escribir una calaverita original. La generación debe hacerse con Claude Sonnet usando la cuenta de quien abre el artefacto (capacidad de sampling del artefacto, modelo "claude-sonnet-5-5"; si no está disponible, que caiga al modelo equivalente sin romperse).

## Público y tono
- Niños de 6 años que todavía no leen con fluidez: textos muy cortos, botones grandes (mínimo 56px de alto), opciones para tocar en vez de escribir.
- Español de México, cálido y juguetón.
- Botón de bocina en cada pregunta y en el resultado que lea el texto en voz alta (speechSynthesis, voz es-MX). Si el navegador no lo soporta, ocultarlo.

## Flujo
1. Pantalla de inicio: título, una línea que explique qué van a hacer, un ejemplo corto de calaverita (4 versos), 3 pasos visuales (Contesta → la Catrina escribe → léela en voz alta) y un botón grande "¡Vamos a empezar!".
2. Entrevista, una pregunta por pantalla. Cada una con opciones tipo chip para tocar y un campo para escribir la respuesta propia:
   1. ¿Cómo se llama la persona de tu calaverita? (solo texto)
   2. ¿Quién es para ti? (mamá, papá, abuelita, abuelito, hermano, hermana, maestra, mejor amigo, mascota, ¡soy yo!)
   3. ¿Qué le gusta hacer muchísimo? (fútbol, bailar, cantar, cocinar, siesta, dibujar, caricaturas, cuentos, bici, videojuegos)
   4. ¿Cuál es su comida favorita? (tacos, tamales, pan de muerto, pozole, quesadillas, enchiladas, pizza, helado, chocolate caliente, elotes)
   5. ¿Qué cosa chistosa hace? (ronca fuerte, se ríe a carcajadas, canta en la regadera, pierde sus llaves, baila mientras cocina, hace caras chistosas, se duerme en el sillón, cuenta chistes malos). Ayuda: "algo que te dé risa pero que no lo haga sentir mal".
   6. ¿En dónde lo encontró la Catrina? (cocina, parque, escuela, mercado, patio, fiesta, su cama, el súper)
   7. ¿Cómo termina la historia? (la Catrina se lo lleva a bailar, se escapa corriendo y riendo, comen juntos y se hacen amigos, la Catrina se queda dormida, se van de fiesta al panteón, le gana a la Catrina en un juego)
   8. ¿Cómo te llamas tú? (para firmar como autor; opcional)
   - Progreso con velitas: cada respuesta enciende una vela, y tocar una vela regresa a esa pregunta.
   - Botones Atrás / Siguiente; "Siguiente" se desactiva si la pregunta obligatoria está vacía; Enter avanza.
3. Pantalla de "La Catrina está escribiendo…": una flor de cempasúchil girando, frases que rotan ("Buscando palabras que rimen", "Contando sílabas con los dedos"…) y un botón Cancelar.
4. Resultado: la calaverita en una hoja color papel con título, 4 estrofas (los versos pares con sangría), firma "Escrita por [autor]" y "Día de Muertos [año]". Botones: Escuchar, Copiar (para WhatsApp, con selección del texto como respaldo si el portapapeles falla), Otra versión (sin caché), Cambiar respuestas y Nueva calaverita.
5. Historial de las últimas 12 calaveritas en localStorage (envuelto en try/catch), visible en inicio y en resultado.

## Prompt para Claude Sonnet (dentro del artefacto)
Pedir UNA calaverita original con estas reglas:
- Exactamente 4 cuartetas, versos de 7 a 10 sílabas, fáciles de leer en voz alta.
- Rima clara: el verso 2 con el 4 (consonante de preferencia) y, si se puede, el 1 con el 3.
- Usar TODOS los datos de la entrevista.
- La Catrina (o la Flaca, o la Calaca) llega por la persona. Estrofa 1: llega al lugar. Estrofas 2 y 3: gustos, comida y lo chistoso. Estrofa 4: el final elegido con un remate gracioso.
- Tono tierno y chistoso; la muerte es un juego. Nada de miedo, sangre, dolor, enfermedad ni burlas que lastimen.
- Vocabulario de niño de 6 años; sin marcas, películas ni personajes de caricaturas.
- Responder SOLO con JSON: {"titulo": "...", "estrofas": [["v1","v2","v3","v4"], ...]}
Parsear el JSON de forma tolerante (texto directo, bloque de código o del primer { al último }).

## Errores
Mensajes amigables según el código de error: falta de permiso, límite de uso ("La Catrina necesita un descanso"), sesión expirada, JSON inválido ("salió revuelta, intenta otra vez"), y el caso de abrir la página fuera de Claude. Nunca reintentar en automático.

## Diseño visual: Día de Muertos tradicional
- Fondo azul-morado de noche, con texto claro.
- Paleta: cempasúchil naranja y amarillo, rosa mexicano, turquesa, morado y verde.
- Arriba, una hilera de papel picado en SVG con borde de zigzag y figuras caladas (calaverita, flor, corazón, sol) que se mecen suavemente.
- Abajo, una guirnalda fija de flores de cempasúchil hechas en SVG por capas de pétalos, más unos pocos pétalos cayendo.
- Una calaverita de azúcar decorada (ojos de colores, flor en la frente, nariz de corazón, sonrisa cosida) flotando en el inicio.
- Tipografías de Google Fonts: una display redonda y gruesa para títulos (tipo Lilita One) y una redonda legible para el cuerpo (tipo Fredoka).
- Todo dibujado desde cero: sin personajes, logos ni elementos de películas o marcas.
- Responsivo a 400px de ancho, foco visible en teclado y respeto a prefers-reduced-motion (sin animaciones).
```

Claude le quitó a propósito la referencia a Coco. Si la pides por nombre, no va a reproducir la película; si describes los elementos tradicionales, llegas al mismo resultado sin ese problema.

## Paso 4: la imagen

Con la calaverita escrita me pasé a ChatGPT. Le subí una foto de cada uno de mis hijos y le pegué su calaverita completa para que la pusiera en la ilustración.

Aquí hay algo que tienes que saber. Cuando un generador de imágenes escribe texto, a veces se come una palabra o te cambia una letra. Antes de compartirla, léela verso por verso contra lo que te dio la app. Si algo no cuadra, pídela otra vez.

## Las tres calaveritas

![La calaverita de Victoria: «Victoria y la Catrina juguetona»](/images/blog/calaveritas/victoria.jpg)

La de Victoria: la Catrina la encuentra dormida, se le antoja copiarle sus dibujos y al final juegan lotería. Gana Victoria.

![La calaverita de Mario: «Mario y la Catrina en el parque»](/images/blog/calaveritas/mario.jpg)

La de Mario: la Catrina lo va a buscar al parque, él anda en su bici sin soltar su pan de muerto y terminan pedaleando juntos.

![La calaverita de Rodrigo](/images/blog/calaveritas/rodrigo.jpg)

La de Rodrigo, el más chiquito, la hizo su mamá. La Catrina se asoma a su salón y él, muy curioso, le pregunta por qué está tan flaquita.

Con la misma app salieron dos historias que no se parecen en nada. Eso buscaba: que al leerla se notara quién la había inventado.

## Lo que no salió a la primera

Esto casi nunca sale en los tutoriales de un solo prompt.

**Claude no pudo probar su propia app.** Cuando terminó me dijo: «No pude probar una generación real desde aquí, porque eso requiere tu permiso en el navegador. La primera prueba te toca a ti». Tenía razón. Hasta que la usamos en la casa, yo no sabía si funcionaba.

**Dos herramientas, dos criterios.** Claude se negó a copiar Coco. ChatGPT me dio imágenes que parecen sacadas de la película. Las dos hicieron su parte, y el que decide qué se publica soy yo.

**Mi prompt funcionó, pero no era repetible.** Por eso existe el paso 3.

La IA acelera. Alguien tiene que revisar.
