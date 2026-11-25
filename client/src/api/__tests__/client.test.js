import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { api } from "../client";

beforeEach(() => {
  const storage = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear(),
  });
});
afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});
test("an expired request preserves a newer login token", async () => {
  localStorage.setItem("sweety-token", "old-session");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      localStorage.setItem("sweety-token", "new-session");
      return {
        ok: false,
        status: 401,
        json: async () => ({ message: "Expired" }),
      };
    }),
  );
  await expect(api("/auth/me")).rejects.toThrow("Expired");
  expect(localStorage.getItem("sweety-token")).toBe("new-session");
});
test("an expired active session is cleared", async () => {
  localStorage.setItem("sweety-token", "expired-session");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ message: "Expired" }),
    })),
  );
  await expect(api("/auth/me")).rejects.toThrow("Expired");
  expect(localStorage.getItem("sweety-token")).toBeNull();
});
