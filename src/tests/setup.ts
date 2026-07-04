import "@testing-library/jest-dom/vitest";
import { clearPersistenceWarning } from "../lib/projectRepository";

beforeEach(() => {
  window.localStorage.clear();
  clearPersistenceWarning();
});

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, "execCommand");
});
