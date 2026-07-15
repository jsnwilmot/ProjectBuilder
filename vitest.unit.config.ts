import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const appUiTestFiles = [
  "src/tests/App.navigation.test.tsx",
  "src/tests/App.projectManagement.test.tsx",
  "src/tests/App.reviewGeneration.test.tsx",
  "src/tests/App.powerPlatformCanvas.test.tsx",
  "src/tests/App.powerPlatformModelDriven.test.tsx",
  "src/tests/App.documentsExport.test.tsx",
  "src/tests/App.persistenceRecovery.test.tsx",
  "src/tests/App.test.tsx"
];

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
    exclude: appUiTestFiles
  }
});
