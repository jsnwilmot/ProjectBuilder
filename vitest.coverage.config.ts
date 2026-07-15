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
    include: ["src/tests/**/*.test.ts", "src/tests/**/*.test.tsx"],
    exclude: [
      "src/tests/App.navigation.test.tsx",
      "src/tests/App.projectManagement.test.tsx",
      "src/tests/App.reviewGeneration.test.tsx",
      "src/tests/App.powerPlatformCanvas.test.tsx",
      "src/tests/App.powerPlatformModelDriven.test.tsx",
      "src/tests/App.documentsExport.test.tsx",
      "src/tests/App.persistenceRecovery.test.tsx",
      "src/tests/App.test.tsx"
    ],
    coverage: {
      exclude: [
        "src/app/App.tsx",
        "src/app/ProjectBuilder.ts",
        "src/components/IntakeBuilder/PowerPlatformIntake.tsx"
      ],
      thresholds: {
        statements: 88,
        branches: 78,
        functions: 92,
        lines: 90
      }
    }
  }
});
