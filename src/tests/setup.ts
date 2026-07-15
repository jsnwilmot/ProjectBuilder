import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { clearPersistenceWarning } from "../lib/projectRepository";

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  clearPersistenceWarning();
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  clearPersistenceWarning();
  Reflect.deleteProperty(document, "execCommand");
  Reflect.deleteProperty(document, "getSelection");
  Reflect.deleteProperty(navigator, "clipboard");
  window.getSelection()?.removeAllRanges();
  document.body.innerHTML = "";
});
