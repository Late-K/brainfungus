import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// unit tests for the plain helper functions in src/app/lib
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
