import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { join } from "node:path";

test("ACT-PRE-01: sin gh disponible informa comprobación no realizada y sale con 2", () => {
  const fuente = readFileSync("scripts/auditoria-exposicion.mjs", "utf8")
    .replace(/^#!.*\n/, "").replace(/^import .*;\r?\n/gm, "");
  for (const json of [false, true]) {
    const mensajes: string[] = [];
    const salida = new Error("salida controlada");
    let codigo: number | undefined;
    assert.throws(() => runInNewContext(fuente, {
      process: { cwd: () => ".", argv: ["node", "guard", "--gh", ...(json ? ["--json"] : [])],
        exit: (valor: number) => { codigo = valor; throw salida; } },
      console: { log: (s: string) => mensajes.push(s), error: (s: string) => mensajes.push(s) },
      join, existsSync: () => false, readdirSync: () => [],
      execFileSync: () => { throw new Error("gh no disponible"); },
    }), (error: unknown) => error === salida);
    assert.equal(codigo, 2);
    assert.match(mensajes.join("\n"), /NO REALIZADA/);
    if (json) assert.equal(JSON.parse(mensajes[0]).estado, "no_realizada");
  }
});
