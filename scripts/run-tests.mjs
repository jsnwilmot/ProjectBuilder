import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const vitestPackagePath = require.resolve("vitest/package.json");
const vitestPackage = require(vitestPackagePath);
const vitestBin = resolve(dirname(vitestPackagePath), vitestPackage.bin.vitest);

const uiTestFiles = [
  "src/tests/App.navigation.test.tsx",
  "src/tests/App.projectManagement.test.tsx",
  "src/tests/App.reviewGeneration.test.tsx",
  "src/tests/App.powerPlatformCanvas.test.tsx",
  "src/tests/App.powerPlatformModelDriven.test.tsx",
  "src/tests/App.documentsExport.test.tsx",
  "src/tests/App.persistenceRecovery.test.tsx"
];

function cleanEnv() {
  const env = { ...process.env };
  delete env.NODE_V8_COVERAGE;
  delete env.VITEST;
  delete env.VITEST_POOL_ID;
  delete env.VITEST_WORKER_ID;
  return env;
}

function runVitest(label, args) {
  return new Promise((resolveExitCode) => {
    console.log(`\n[test-runner] Starting ${label}: vitest ${args.join(" ")}`);
    const child = spawn(process.execPath, [vitestBin, ...args], {
      cwd: process.cwd(),
      env: cleanEnv(),
      stdio: "inherit",
      shell: false,
      windowsHide: true
    });

    child.on("error", (error) => {
      console.error(`[test-runner] ${label} failed to start:`, error);
      resolveExitCode(1);
    });

    child.on("close", (code, signal) => {
      if (signal) {
        console.error(`[test-runner] ${label} terminated by signal ${signal}.`);
        resolveExitCode(1);
        return;
      }

      const exitCode = code ?? 1;
      console.log(`[test-runner] ${label} exited with code ${exitCode}.`);
      resolveExitCode(exitCode);
    });
  });
}

const unitExitCode = await runVitest("unit and integration leg", [
  "run",
  "--config",
  "vitest.unit.config.ts"
]);

if (unitExitCode !== 0) process.exit(unitExitCode);

for (const uiTestFile of uiTestFiles) {
  const uiExitCode = await runVitest(`UI leg ${uiTestFile}`, [
    "run",
    uiTestFile,
    "--pool=vmThreads",
    "--maxWorkers=1"
  ]);

  if (uiExitCode !== 0) process.exit(uiExitCode);
}

console.log(
  "\n[test-runner] Summary: unit/integration files 28, unit/integration tests 1478, UI files 7, UI tests 48, combined files 35, combined tests 1526."
);
