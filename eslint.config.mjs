import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Directorio de trabajo del plugin Remember, no es codigo del proyecto.
    ".remember/**",
  ]),
  {
    // Guards de CI: scripts de Node, no codigo del sitio. Se declaran los
    // globals que usan para no depender de que el preset de Next los aporte
    // en un archivo .mjs. No entran en tsconfig, asi que `typecheck` no los ve.
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: { process: "readonly", console: "readonly" },
    },
  },
  {
    // Frontera de PII: app/api/** maneja datos personales y un log de payload
    // los vuelca a los logs de la plataforma.
    // Ver docs/03-privacy-and-publication-policy.md y AGENTS.md.
    //
    // Esto es un chequeo AST, no un grep. Detecta el acceso a propiedades del
    // global `console` con clave literal (console.log, console["log"]) y la
    // llamada partida en varias lineas, que es lo que un grep de literales no
    // cubre.
    //
    // Lo que NO detecta, y esta tabulado en docs/04-architecture.md §4.1:
    // desestructurar o aliasar el global (`const { log } = console`), un logger
    // propio o de terceros, un console.error cuyo argumento SI contenga PII, y
    // el envio del payload a un tercero.
    //
    // console.error queda permitido a proposito: la ruta necesita reportar
    // fallos de configuracion y el status del proveedor. La disciplina de no
    // pasarle nunca un payload es de revision, no de lint.
    files: ["app/api/**/*.{ts,tsx}"],
    rules: {
      "no-console": ["error", { allow: ["error"] }],
    },
  },
]);

export default eslintConfig;
