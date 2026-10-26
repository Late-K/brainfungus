import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/app/lib/utils";

describe("safeRedirectPath", () => {
  it("keeps paths on this site", () => {
    expect(safeRedirectPath("/bands/123?tab=chat")).toBe("/bands/123?tab=chat");
  });

  it("sends anything that could leave the site to the home page", () => {
    expect(safeRedirectPath("https://evil.example")).toBe("/");
    expect(safeRedirectPath("//evil.example")).toBe("/");
    expect(safeRedirectPath("/\\evil.example")).toBe("/");
    expect(safeRedirectPath("/\t/evil.example")).toBe("/");
    expect(safeRedirectPath("/\n/evil.example")).toBe("/");
    expect(safeRedirectPath("/a\\..\\/evil.example")).toBe("/");
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/");
    expect(safeRedirectPath(undefined)).toBe("/");
  });
});
