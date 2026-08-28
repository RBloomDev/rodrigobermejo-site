# Gate de salida del Sprint 1 — 2026-08-27

`docs/06-roadmap.md`, fila Sprint 1:

> `validate` falla ante un registry inválido y ante las **combinaciones prohibidas** de `02` §2. Tests sin red.

Y `AGENTS.md` → *Principio de verificación* #4: **«Un gate debe demostrar que puede fallar.»** Lo que sigue es la salida de comando, no la afirmación.

---

## Estado de partida: el Registry real valida

```
$ npm run validate
Registry válido: 13 proyecto(s), 3 claim(s).
  11 publicable(s), 2 con 'publish: none'.
  Ledger vacío: la evidencia llega en Sprint 2, así que todos los claims
  derivan a declared/unverifiable.

EXIT=0
```

13 proyectos agrupados desde 100 repositorios de cuatro organizaciones, y 3 claims —uno por dimensión de marca—. Los proyectos **no se infirieron**: el barrido produjo candidatos y la agrupación la eligió Rodrigo. Un repositorio es un *artefacto de* un proyecto, no el proyecto.

## Las nueve mutaciones, sobre el Registry REAL

No sobre fixtures sintéticas: sobre los archivos que van a producción. Cada una se aplicó, se observó su salida, y se restauró.

| Mutación | Regla que disparó | Exit |
|---|---|---|
| `kind: experiment` + `lifecycle: production` | `combinacion:experiment-en-produccion` | 1 |
| `nda: true` con `visibility: public` | `combinacion:nda-implica-confidential` | 1 |
| `kind: client_project` | `enum:kind`, con la explicación de por qué desapareció | 1 |
| `context: client` publicando sin `release` | `release:requerido` | 1 |
| `visibility: confidential` con `publish: aggregate` | `combinacion:confidential-no-agrega` | 1 |
| `provenance` declarado a mano en un claim | `derivado:provenance` | 1 |
| `evidence_ids` declarado a mano en un claim | `derivado:evidence_ids` | 1 |
| Claim reclamando un proyecto inexistente | `G2` | 1 |
| YAML sintácticamente inválido | `carga` | 1 |
| *(restaurado)* | — | **0** |

Una fixture **por combinación prohibida**, en plural, que es lo que la fila del roadmap exige. Comprobar que «alguna falla» no demuestra que cada regla esté conectada.

## «Tests sin red»: la evidencia es estructural, y es más fuerte

```
$ grep -rnE "fetch\(|https?://|octokit|axios|node:https|node:http" --include=*.ts domain/ registry/ validate/ cli/
                                    (sin resultados)

$ node -e "console.log(Object.keys(require('./package.json').dependencies))"
[ 'yaml' ]
```

**Cero llamadas de red en el código y una sola dependencia runtime.** El motor no puede hablar con GitHub porque no tiene con qué: no hay cliente HTTP instalado, ni `fetch`, ni una URL en el código fuera de los comentarios.

Esto es **más fuerte** que correr la suite desconectado. Una corrida sin red prueba que *esa* corrida no la necesitó; la ausencia de cualquier cliente prueba que **no puede** necesitarla. Cuando llegue la ingestión (Sprint 2) esta propiedad cambia, y entonces la evidencia tendrá que volver a ser una corrida real sin conectividad.

**Límite honesto:** «sin red» se refiere a la *ejecución* de los tests. `npm ci` sí necesita red, como en cualquier proyecto.

## La corrida completa

```
$ npm run typecheck   → EXIT=0
$ npm run lint        → EXIT=0
$ npm test
ℹ tests 81
ℹ pass 81
ℹ fail 0
ℹ duration_ms 1097.2239
$ npm run validate    → EXIT=0
```

El paso `Registry validates` está ahora cableado en CI. **Estuvo ausente a propósito** hasta el PR que trajo el CLI: cablearlo antes habría dado un check verde llamando a un stub, y un check que no comprueba nada es peor que no tenerlo (`04-architecture.md` §4.1).

---

## Dos defectos propios que salieron de este ejercicio

Se registran porque el valor del gate no es el verde final, sino lo que encuentra por el camino.

**1. El validador cazó un error en su propio Registry, en la primera corrida.** Los dos puntos dentro de `thesis` y `statement` —«Sostener la operación educativa de Inadaptados: LMS, web…»— convertían el escalar YAML en un mapa anidado. Es exactamente para lo que existe.

**2. G2 mentía, y eso es peor que callar.** Cuando un proyecto fallaba su validación no entraba en la lista de válidos, así que el grafo reportaba «el claim reclama un proyecto que no existe» sobre un proyecto que **sí existe** y solo estaba mal escrito. Ese mensaje manda a arreglar el archivo equivocado.

Corregido: el grafo no se evalúa hasta que todas las entradas sean válidas por separado —mismo orden que un compilador, sintaxis antes que tipos— y la salida lo dice explícitamente en lugar de dejar el hueco sin explicar. Comprobado en las dos direcciones: con un proyecto inválido G2 ya no aparece, y con un proyecto genuinamente inexistente sí.

---

## Lo que este gate NO demuestra

- **No hay evidencia real.** El ledger está vacío hasta el Sprint 2, así que **G3, G4 y G5 son vacuamente ciertas** y los tres claims derivan a `declared` / `unverifiable`. Las reglas están implementadas y tienen sus tests con fixtures propias, pero sobre el Registry real todavía no se ejercen.
- **Los tres `statement` están en borrador.** Redactados a partir de las palabras de Rodrigo en la entrevista del 2026-08-27, marcados como tales en cada archivo. `02-domain-and-evidence-model.md` §1: un claim lo escribe un humano. Mientras lleven esa marca, el claim no está declarado del todo, y el gate se cierra **con esa deuda anotada**, no con ella disimulada.
- **Nada se ha publicado.** `public/proof/v1/**` sigue vacío: el primer artefacto es Sprint 4.
