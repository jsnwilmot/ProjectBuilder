import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/tests/setup.ts",
    globals: true,
    css: true,
    coverage: {
      thresholds: {
        statements: 90,
        branches: 82,
        functions: 92,
        lines: 90
      }
    }
  }
});
