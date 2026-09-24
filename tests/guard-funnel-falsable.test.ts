import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { RAIZ, leer } from "./navegacion-helpers.ts";

/**
 * AC-POR-02 — la prueba negativa de `guard:funnel`: **todavía puede fallar**.
 *
 * Mover el funnel a `/colaborar` mueve archivos, y `FUNNEL_ENTRYPOINTS`
 * (`scripts/check-funnel-isolation.mjs:33-71`) fija **nombres de archivo
 * literales**. Un guard cuyas entradas ya no existen recorre cero archivos: sale
 * en verde sin haber comprobado nada. Un gate que nunca se ha visto fallar puede
 * estar desconectado, así que aquí se le inyecta a propósito la violación exacta
 * que vigila —un import de `lib/proof/feed` desde un componente del funnel— y se
 * comprueba que sale en rojo.
 *
 * La inyección va sobre una **copia** dentro del repo, nunca sobre el archivo
 * real: mutar `components/Hero.tsx` dejaría el árbol roto si esta prueba muriera
 * a media ejecución. La copia se borra en un `finally`.
 */

const GUARD = "scripts/check-funnel-isolation.mjs";

/** Corre el guard y devuelve `{ status, stdout, stderr }` sin lanzar. */
function correrGuard(entradas: string[] = []) {
  const r = spawnSync(process.execPath, [join(RAIZ, GUARD), ...entradas], {
    cwd: RAIZ,
    encoding: "utf8",
  });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

test("AC-POR-02: el guard vigila las entradas reales, y todas existen", () => {
  // Hoy una entrada inexistente es roja por la comprobación `missing` del propio
  // guard, pero esa defensa hay que respetarla, no descubrirla en CI.
  const fuenteGuard = readFileSync(join(RAIZ, GUARD), "utf8");
  const bloque = fuenteGuard.match(/const FUNNEL_ENTRYPOINTS = \[([\s\S]*?)\];/);
  assert.ok(bloque, "no se encontró FUNNEL_ENTRYPOINTS en el guard");

  // El bloque lleva comentarios que citan frases entrecomilladas —«"ensenar unos
  // proyectos en la home"»—, así que las líneas de comentario se descartan antes
  // de leer los literales. Sin esto la prueba «encuentra» entradas que no lo son
  // y falla por la razón equivocada, que es peor que no fallar.
  const entradas = bloque[1]!
    .split("\n")
    .filter((linea) => !linea.trimStart().startsWith("//"))
    .flatMap((linea) => [...linea.matchAll(/"([^"]+)"/g)].map((m) => m[1]!));

  assert.ok(entradas.length >= 10, `solo se leyeron ${entradas.length} entradas del guard`);

  const inexistentes = entradas.filter((e) => !existsSync(join(RAIZ, e)));
  assert.deepEqual(
    inexistentes,
    [],
    `entradas del guard que ya no existen: ${inexistentes.join(", ")}`,
  );

  // La ruta que recibe el funnel tiene que estar vigilada, y la portada no se
  // saca de la lista «porque ya no es el funnel»: es donde más tienta importar
  // el feed (docs/brand/02 §3).
  for (const obligatoria of ["app/page.tsx", "app/layout.tsx", "app/colaborar/page.tsx"]) {
    assert.ok(
      entradas.includes(obligatoria),
      `${obligatoria} no está en FUNNEL_ENTRYPOINTS (docs/brand/02 §3, tarea obligatoria)`,
    );
  }
});

test("AC-POR-02: sin violación el guard sale 0; con un import del feed inyectado, no", () => {
  const limpio = correrGuard();
  assert.equal(
    limpio.status,
    0,
    `el guard debería estar verde sobre el árbol actual:\n${limpio.stderr}`,
  );

  const contaminado = "components/__prueba-funnel-contaminado.tsx";
  const rutaAbs = join(RAIZ, contaminado);
  try {
    writeFileSync(
      rutaAbs,
      leer("components/Hero.tsx").replace(
        /^/,
        'import { leerFeed } from "@/lib/proof/feed";\n',
      ),
      "utf8",
    );

    const rojo = correrGuard([contaminado]);
    assert.notEqual(
      rojo.status,
      0,
      "el guard salió 0 con un import de lib/proof inyectado en un componente del funnel. " +
        "Está desconectado: no vigila nada",
    );
    assert.match(
      rojo.stderr,
      /lib\/proof/,
      "el guard falló sin nombrar el prefijo de evidencia que se alcanzó",
    );
  } finally {
    rmSync(rutaAbs, { force: true });
  }
});
