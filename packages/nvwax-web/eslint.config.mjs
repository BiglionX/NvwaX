import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import eslint from "@eslint/js";

const eslintConfig = defineConfig([
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  // Override default ignores.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
