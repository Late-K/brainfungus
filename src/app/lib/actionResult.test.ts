import { describe, expect, it, vi } from "vitest";
import { runAction, unwrapAction, UserError } from "@/app/lib/actionResult";

describe("runAction", () => {
  it("wraps the return value", async () => {
    expect(await runAction("Failed", async () => 42)).toEqual({
      ok: true,
      data: 42,
    });
  });

  it("passes user facing errors through", async () => {
    const result = await runAction("Failed to save", async () => {
      throw new UserError("Only admins can do this");
    });
    expect(result).toEqual({ ok: false, error: "Only admins can do this" });
  });

  it("hides unexpected errors behind the failure message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await runAction("Failed to save", async () => {
      throw new Error("E11000 duplicate key error collection: db.users");
    });
    expect(result).toEqual({ ok: false, error: "Failed to save" });
  });
});

describe("unwrapAction", () => {
  it("returns the data or throws the error message", () => {
    expect(unwrapAction({ ok: true, data: "x" })).toBe("x");
    expect(() => unwrapAction({ ok: false, error: "Nope" })).toThrow("Nope");
  });
});
