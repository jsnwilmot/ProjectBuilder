import "@testing-library/jest-dom/vitest";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, "execCommand");
});
