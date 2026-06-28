import { sanitizeProjectName } from "../lib/sanitizeProjectName";

describe("sanitizeProjectName", () => {
  it.each([
    ["Community Services Portal", "community-services-portal"],
    ["../Unsafe / Project?", "unsafe-project"],
    ["Café tools", "cafe-tools"],
    ["   ", "untitled-project"]
  ])("sanitizes %s as %s", (input, expected) => {
    expect(sanitizeProjectName(input)).toBe(expected);
  });
});
