import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/tests/setup.ts",
    globals: true,
    css: true,
    pool: "vmThreads",
    maxWorkers: 2,
    coverage: {
      exclude: [
        "src/components/IntakeBuilder/PowerPlatformIntake.tsx"
      ],
      thresholds: {
        statements: 89,
        branches: 79,
        functions: 92,
        lines: 90
      }
    }
  }
});
