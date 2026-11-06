import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// eslint-config-next 15 still ships legacy (eslintrc) configs, so we load them
// through FlatCompat. When the project moves to Next 16 this can import the
// flat configs from eslint-config-next directly.
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".next-e2e/**",
      ".next-dev-e2e/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "public/sw.js",
      "public/workbox-*.js",
      "public/worker-*.js",
      "next-env.d.ts",
      "_referencias/**",
      "design/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
