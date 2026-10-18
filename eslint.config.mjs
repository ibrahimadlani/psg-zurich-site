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
  {
    // Toasts go through `notify` (src/lib/notify.ts): same durations and behaviour everywhere.
    ignores: ["src/lib/notify.ts", "src/components/ui/toaster.tsx"],
    rules: {
      "no-restricted-imports": ["error", { paths: [{ name: "sonner", message: "Use `notify` from @/lib/notify." }] }],
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
