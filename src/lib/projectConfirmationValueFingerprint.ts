import { computePlanningSha256Fingerprint } from "./planningClarificationFingerprints";
import {
  PROJECT_CONFIRMATION_SERIALIZATION_VERSION,
  isProjectConfirmationValueFingerprint
} from "./projectConfirmationProvenance";

export type ProjectConfirmationFingerprintResult =
  | { readonly outcome: "fingerprinted"; readonly fingerprint: string }
  | { readonly outcome: "blocked"; readonly issueCode: "fingerprintUnavailable" | "fingerprintInvalid" };

export function serializeProjectConfirmationTextValue(value: string): string {
  return JSON.stringify({
    version: PROJECT_CONFIRMATION_SERIALIZATION_VERSION,
    kind: "text",
    value
  });
}

export async function computeProjectConfirmationValueFingerprint(
  normalizedValue: string
): Promise<ProjectConfirmationFingerprintResult> {
  if (typeof globalThis.crypto?.subtle?.digest !== "function") {
    return { outcome: "blocked", issueCode: "fingerprintUnavailable" };
  }

  let fingerprint: string;
  try {
    fingerprint = await computePlanningSha256Fingerprint(
      serializeProjectConfirmationTextValue(normalizedValue)
    );
  } catch {
    return { outcome: "blocked", issueCode: "fingerprintUnavailable" };
  }
  return isProjectConfirmationValueFingerprint(fingerprint)
    ? { outcome: "fingerprinted", fingerprint }
    : { outcome: "blocked", issueCode: "fingerprintInvalid" };
}
