import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import { FEED } from "./proyectos-fixture.ts";

// Ejecuta el componente real y recorre sus elementos React, no su código fuente.
export function pantalla(proceso?: unknown, actividad?: unknown) {
  const dir = mkdtempSync(join(tmpdir(), "actividad-"));
  const anterior = process.env.PROOF_FEED_DIR;
  process.env.PROOF_FEED_DIR = dir;
  try {
    if (proceso) writeFileSync(join(dir, "proceso.json"), JSON.stringify(proceso));
    if (actividad) {
      for (const [nombre, doc] of Object.entries(FEED)) writeFileSync(join(dir, `${nombre}.json`), JSON.stringify(doc));
      writeFileSync(join(dir, "activity.json"), JSON.stringify(actividad));
    }
    const ruta = resolve("app/actividad/page.tsx");
    const codigo = ts.transpileModule(readFileSync(ruta, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const modulo = { exports: {} as { default: () => unknown } };
    const requerir = createRequire(ruta);
    // El router cliente no existe bajo react-server. Solo su hoja Link se sustituye
    // por un ancla; el componente y el lector de datos se ejecutan sin sustitutos.
    const requireDePagina = (id: string) => id === "next/link" ? { default: "a" } : requerir(id);
    new Function("require", "module", "exports", codigo)(requireDePagina, modulo, modulo.exports);
    const nodos: { tipo: string; texto: string; props: Record<string, unknown> }[] = [];
    function recorrer(n: unknown): string {
      if (n == null || typeof n === "boolean") return "";
      if (typeof n !== "object") return String(n);
      if (Array.isArray(n)) return n.map(recorrer).join("");
      const e = n as { type: string | ((p: unknown) => unknown); props: Record<string, unknown> };
      if (typeof e.type === "function") return recorrer(e.type(e.props));
      const texto = recorrer(e.props.children);
      nodos.push({ tipo: e.type, texto, props: e.props });
      return texto;
    }
    const texto = recorrer(modulo.exports.default());
    return { texto, nodos };
  } finally {
    if (anterior === undefined) delete process.env.PROOF_FEED_DIR;
    else process.env.PROOF_FEED_DIR = anterior;
    rmSync(dir, { recursive: true, force: true });
  }
}

export const periodos = Array.from({ length: 13 }, (_, i) => i === 12 ? "2026-01" : `2025-${String(i + 1).padStart(2, "0")}`);
const huecos = new Set([0, 4, 8, 12]);
export const fixture = {
  schema_version: "1.0.0",
  records: periodos.filter((_, i) => !huecos.has(i)).map(period => ({
    kind: "human_editor_activity", period, source: "wakatime", seconds: 3600,
    unit: "recorded_activity_seconds",
    coverage: { dias_con_dato: 20, dias_del_periodo: new Date(Number(period.slice(0, 4)), Number(period.slice(5)), 0).getDate(), del_trabajo: "desconocida" },
  })),
  absences: periodos.filter((_, i) => huecos.has(i)).map(period => ({
    period, source: "wakatime", motivo_de_ausencia: "fuente_no_respondio",
  })),
};

