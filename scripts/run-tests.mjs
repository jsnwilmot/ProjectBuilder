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

function parseVitestCounts(output) {
  const clean = output.replace(/\u001b\[[0-9;]*m/g, "");
  const fileMatch = clean.match(/Test Files\s+(\d+) passed/);
  const testMatch = clean.match(/Tests\s+(\d+) passed/);
  return {
    files: fileMatch ? Number(fileMatch[1]) : 0,
    tests: testMatch ? Number(testMatch[1]) : 0
  };
}

function runVitest(label, args) {
  return new Promise((resolveExitCode) => {
    console.log(`\n[test-runner] Starting ${label}: vitest ${args.join(" ")}`);
    let output = "";
    const child = spawn(process.execPath, [vitestBin, ...args], {
      cwd: process.cwd(),
      env: cleanEnv(),
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      windowsHide: true
    });

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });

    child.on("error", (error) => {
      console.error(`[test-runner] ${label} failed to start:`, error);
      resolveExitCode({ exitCode: 1, files: 0, tests: 0 });
    });

    child.on("close", (code, signal) => {
      if (signal) {
        console.error(`[test-runner] ${label} terminated by signal ${signal}.`);
        resolveExitCode({ exitCode: 1, files: 0, tests: 0 });
        return;
      }

      const exitCode = code ?? 1;
      console.log(`[test-runner] ${label} exited with code ${exitCode}.`);
      resolveExitCode({ exitCode, ...parseVitestCounts(output) });
    });
  });
}

const unitResult = await runVitest("unit and integration leg", [
  "run",
  "--config",
  "vitest.unit.config.ts"
]);

if (unitResult.exitCode !== 0) process.exit(unitResult.exitCode);

const uiResults = [];
for (const uiTestFile of uiTestFiles) {
  const uiResult = await runVitest(`UI leg ${uiTestFile}`, [
    "run",
    uiTestFile,
    "--pool=vmThreads",
    "--maxWorkers=1"
  ]);

  if (uiResult.exitCode !== 0) process.exit(uiResult.exitCode);
  uiResults.push(uiResult);
}

const uiFileCount = uiResults.reduce((sum, result) => sum + result.files, 0);
const uiTestCount = uiResults.reduce((sum, result) => sum + result.tests, 0);

console.log(
  `\n[test-runner] Summary: unit/integration files ${unitResult.files}, unit/integration tests ${unitResult.tests}, UI files ${uiFileCount}, UI tests ${uiTestCount}, combined files ${unitResult.files + uiFileCount}, combined tests ${unitResult.tests + uiTestCount}.`
);
