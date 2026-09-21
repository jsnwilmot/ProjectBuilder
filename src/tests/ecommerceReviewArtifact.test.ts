// @ts-expect-error -- test-only Node I/O; app compilation excludes Node ambient types.
import { mkdirSync, writeFileSync } from "node:fs";
import { generateProjectPackage } from "../lib/generateProjectPackage";
import { createEcommerceFixture } from "./helpers/ecommerce";
import { evaluateGeneratedPackageReadiness } from "../lib/generatedPackageReadiness";
import { createExportManifest } from "../lib/exportManifest";
import { validateExportPackage } from "../lib/exportIntegrity";
import { ecommerceDecisionState } from "../lib/ecommerceDecisions";
declare const process: { env: Record<string, string | undefined> };

it("produces a complete, traceable ecommerce Architect-review package", () => {
  const p = createEcommerceFixture();
  p.generatedDocuments = generateProjectPackage(p).documents;
  p.generatedFileCount = p.generatedDocuments.length;
  const readiness = evaluateGeneratedPackageReadiness(p);
  const manifest = createExportManifest(p, validateExportPackage(p));
  expect(p.generatedDocuments).toHaveLength(19);
  expect(readiness.prohibitedContentCount).toBe(0);
  expect(readiness.orphanMarkerCount).toBe(0);
  expect(readiness.missingDocumentCount).toBe(0);
  expect(manifest.readiness).toBe("Draft");
  const output = process.env.ECOMMERCE_REVIEW_OUTPUT;
  if (!output) return;
  for (const doc of p.generatedDocuments) {
    mkdirSync(`${output}/${doc.folder}`, {recursive:true});
    writeFileSync(`${output}/${doc.folder}/${doc.fileName}`, doc.content, "utf8");
  }
  writeFileSync(`${output}/project-manifest.json`, JSON.stringify(manifest,null,2), "utf8");
  writeFileSync(`${output}/review-diagnostics.json`, JSON.stringify({readiness, decisions:ecommerceDecisionState(p)},null,2), "utf8");
});
