import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@atlas/types": `${root}/packages/types/src/index.ts`,
      "@atlas/validation": `${root}/packages/validation/src/index.ts`,
      "@atlas/config": `${root}/packages/config/src/index.ts`,
    },
  },
  test: {
    include: ["tests/**/*.test.ts", "apps/web/src/**/*.test.tsx"],
    setupFiles: ["tests/setup.ts"],
    environment: "node",
    testTimeout: 10_000,
  },
});