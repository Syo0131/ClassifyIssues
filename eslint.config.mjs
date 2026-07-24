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
    // Artefactos JS compilados de módulos que existen como .ts (la fuente).
    "src/lib/db.js",
    "src/lib/types.js",
  ]),
  {
    // Scripts CLI de Node (seed, alta de usuarios): CommonJS a propósito, no
    // forman parte del bundle de Next, así que require() es legítimo.
    files: ["*.js", "scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
