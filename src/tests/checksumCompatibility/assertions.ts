// Bounded test-only comparisons. No production values construct expectations.
export interface ChecksumExpectation {
  readonly id: string;
  readonly serialized?: string;
  readonly checksum: string;
}

export function checksumFailures(
  expected: ChecksumExpectation,
  observed: { readonly serialized?: unknown; readonly checksum: unknown }
): string[] {
  const failures: string[] = [];
  if (expected.serialized !== undefined && observed.serialized !== expected.serialized) {
    failures.push(`${expected.id}.serialized`);
  }
  if (observed.checksum !== expected.checksum) failures.push(`${expected.id}.checksum`);
  return failures;
}

export const CURRENT_REVIEW_EXPECTATION = {
  reviewReferenceStatus: "Current",
  reviewState: "Review Required",
  assetStatus: "Review Required",
  approvalStatus: "Review required"
} as const;

export const STALE_REVIEW_EXPECTATION = { ...CURRENT_REVIEW_EXPECTATION, reviewReferenceStatus: "Stale" } as const;

export function reviewBoundaryFailures(
  expected: typeof CURRENT_REVIEW_EXPECTATION | typeof STALE_REVIEW_EXPECTATION,
  observed: Record<keyof typeof CURRENT_REVIEW_EXPECTATION, unknown>
): string[] {
  return (Object.keys(CURRENT_REVIEW_EXPECTATION) as Array<keyof typeof CURRENT_REVIEW_EXPECTATION>)
    .filter((key) => observed[key] !== expected[key])
    .map((key) => `review.${key}`);
}
