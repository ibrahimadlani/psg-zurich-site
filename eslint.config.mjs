import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // `const { secret, ...rest } = input` is the idiomatic way to drop a field.
      "@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true }],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "deploy/**",
    "drizzle/**",
    "next-env.d.ts",
  ]),
]);
