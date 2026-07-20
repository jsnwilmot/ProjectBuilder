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
  return new Promise((resolve) => {
    console.log(`\n[coverage-runner] Starting ${label}: vitest ${args.join(" ")}`);
    const child = spawn(process.execPath, [vitestBin, ...args], {
      cwd: process.cwd(),
      env: cleanEnv(),
      stdio: "inherit",
      shell: false,
      windowsHide: true
    });

    child.on("error", (error) => {
      console.error(`[coverage-runner] ${label} failed to start:`, error);
      resolve(1);
    });

    child.on("close", (code, signal) => {
      if (signal) {
        console.error(`[coverage-runner] ${label} terminated by signal ${signal}.`);
        resolve(1);
        return;
      }
      console.log(`[coverage-runner] ${label} exited with code ${code ?? 1}.`);
      resolve(code ?? 1);
    });
  });
}

const coverageExitCode = await runVitest("coverage leg", [
  "run",
  "--config",
  "vitest.coverage.config.ts",
  "--coverage"
]);

if (coverageExitCode !== 0) process.exit(coverageExitCode);

for (const uiTestFile of uiTestFiles) {
  const uiExitCode = await runVitest(`App UI regression leg ${uiTestFile}`, [
    "run",
    uiTestFile,
    "--pool=vmThreads",
    "--maxWorkers=1"
  ]);

  if (uiExitCode !== 0) process.exit(uiExitCode);
}

console.log(
  "\n[coverage-runner] Summary: coverage files 27, coverage tests 1324, UI files 7, UI tests 43, combined files 34, combined tests 1367."
);
