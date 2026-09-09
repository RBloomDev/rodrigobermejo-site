import type { FeedClaim } from "@/lib/proof/schema";

/**
 * El par procedencia × verificabilidad. Contrato de presentación de `docs/05`.
 *
 * ## Por qué NO son dos chips
 *
 * Dos etiquetas junto a un título es, visualmente, la gramática de un badge de
 * `verified`. `docs/02` §6 lo prohíbe explícitamente. Y un chip gris tampoco es
 * neutro: gris significa *inactivo*, *pendiente*, *degradado*. Con los tres
 * claims en el mismo valor, tres chips idénticos repetidos se leen como error de
 * datos, no como una propiedad del sistema.
 *
 * Es **una oración subordinada al pie del statement**, tipográficamente menor,
 * en la misma tinta que el resto.
 *
 * ## Por qué los cuatro valores se ven igual
 *
 * Ningún eje lleva rampa cromática, ni orden implícito, ni icono. Una escala de
 * color **es** un puntaje aunque nadie lo llame así, y `docs/00` dice que estos
 * ejes no son un puntaje: `unverifiable` no vale menos que `third_party_public`,
 * vale **distinto**.
 *
 * Y la forma no cambia el día que aparezca un claim `third_party_public`. Si
 * cambiara, el lector aprendería que la forma de hoy era la mala.
 */

const PROCEDENCIA: Record<FeedClaim["provenance"], string> = {
  declared: "lo afirmo yo",
  collected: "leído de la fuente",
  derived: "calculado a partir de lo leído",
  correlated: "unido entre fuentes",
};

const VERIFICABILIDAD: Record<FeedClaim["verifiability"], string> = {
  unverifiable: "no puedes comprobarlo sin confiar en mí",
  self_link: "enlaza a algo que alojo yo",
  third_party_public: "cualquiera puede abrirlo y comprobarlo",
  cryptographic: "comprobable sin confiar en nadie",
};

export function ParEtiquetas({
  provenance,
  verifiability,
}: {
  provenance: FeedClaim["provenance"];
  verifiability: FeedClaim["verifiability"];
}) {
  return (
    <p className="mt-4 border-t border-border-subtle pt-3 text-sm text-ink-muted">
      Procedencia:{" "}
      <abbr title={provenance} className="font-medium no-underline">
        {PROCEDENCIA[provenance]}
      </abbr>
      <span aria-hidden="true"> · </span>
      Verificabilidad:{" "}
      <abbr title={verifiability} className="font-medium no-underline">
        {VERIFICABILIDAD[verifiability]}
      </abbr>
    </p>
  );
}
