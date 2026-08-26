// PROBE TEMPORAL del experimento de falsabilidad del gate de CI (S0-02).
// Escritura directa al stream en la frontera de PII: la detecta el paso
// "No direct stdout/stderr writes in PII routes" del job privacy guard.
// NO la detecta la regla no-console (es AST sobre `console`), asi que este
// probe aisla al job de privacidad sin tocar al job verify.
// Se revierte en el commit siguiente.
export function gateProbe(): void {
  process.stdout.write("probe");
}
