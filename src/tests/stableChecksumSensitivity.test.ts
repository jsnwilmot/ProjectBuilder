import { describe, expect, it } from "vitest";
import { checksumFailures, reviewBoundaryFailures } from "./checksumCompatibility/assertions";
import { CHECKSUM_CORRUPTIONS, REVIEW_CORRUPTIONS } from "./checksumCompatibility/sensitivity";

describe("independent checksum oracle sensitivity", () => {
  it.each(CHECKSUM_CORRUPTIONS)("$id rejects $label at the specified fields", (control) => {
    expect(checksumFailures(control.expected, control.expected)).toEqual([]);
    expect(checksumFailures(control.expected, control.wrong)).toEqual(control.failures);
  });

  it.each(REVIEW_CORRUPTIONS)("$id rejects $label without authority transfer", (control) => {
    expect(reviewBoundaryFailures(control.expected, control.expected)).toEqual([]);
    expect(reviewBoundaryFailures(control.expected, control.wrong)).toEqual(control.failures);
  });
});
