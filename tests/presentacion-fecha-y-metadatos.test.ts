import { test } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { leer } from "./navegacion-helpers.ts";
import { fechaEnProsa } from "../lib/proof/proyectos-filtros.ts";

function metadatos(fuente: string): Record<string, string> {
  const ast = ts.createSourceFile("page.tsx", fuente, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const valores: Record<string, string> = {};
  function visitar(n: ts.Node) {
    if (ts.isVariableDeclaration(n) && n.name.getText(ast) === "metadata" &&
        n.initializer && ts.isObjectLiteralExpression(n.initializer)) {
      for (const p of n.initializer.properties) {
        if (ts.isPropertyAssignment(p) && ts.isStringLiteral(p.initializer)) {
          valores[p.name.getText(ast)] = p.initializer.text;
        }
      }
    }
    ts.forEachChild(n, visitar);
  }
  visitar(ast);
  return valores;
}

test("F-PRY-18: las cinco rutas usan los metadatos del deck sin duplicar el nombre", () => {
  const tabla = leer("docs/brand/03-copy-deck.md");
  for (const ruta of ["/proyectos", "/evidencia", "/sobre-mi", "/colaborar", "/blog"]) {
    const fila = tabla.split("\n").find((l) => l.startsWith(`| \`${ruta}\` |`));
    assert.ok(fila, `Falta la fila normativa de ${ruta}`);
    const celdas = fila.split("|").map((c) => c.trim());
    const actual = metadatos(leer(`app${ruta}/page.tsx`));
    assert.equal(actual.title, celdas[2], ruta);
    assert.equal(actual.description, celdas[3], ruta);
  }
  assert.match(leer("app/layout.tsx"), /template: "%s \| Rodrigo Bermejo"/);
});

function comprobarPie(fuente: string) {
  const pie = fuente.match(/<footer\b[\s\S]*?<\/footer>/)?.[0];
  assert.ok(pie);
  assert.match(pie, /Publicado el \{fechaEnProsa\(estado\.feed\.meta\.generated_at\)\}/);
  assert.doesNotMatch(pie, /generated_at\.slice/);
}

test("F-PRY-16: el pie de evidencia conecta la fecha con el formato absoluto en prosa", () => {
  comprobarPie(leer("app/evidencia/page.tsx"));
  assert.equal(fechaEnProsa("2026-08-28T23:00:00Z"), "28 de agosto de 2026");
});

test("F-PRY-16: la sonda rechaza el pie anterior en ISO", () => {
  assert.throws(() => comprobarPie('<footer>Publicado el {estado.feed.meta.generated_at.slice(0, 10)}</footer>'));
});
