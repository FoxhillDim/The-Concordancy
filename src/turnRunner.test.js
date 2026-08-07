import { describe, it, expect, vi } from "vitest";
import { runTurn } from "./turnRunner.js";

function validTurnJson(overrides = {}) {
  const base = {
    y: 2027,
    h: "Headline",
    n: "Narrative.",
    nt: "Precedent.",
    ck: 100,
    fl: "",
    bl: {
      A: { m: 50, e: 50, w: 50, c: 50, l: 50, p: 50, t: ["f", "f", "f", "f", "f", "f"], nu: ["US"], ct: 10, pw: 30 },
      B: { m: 50, e: 50, w: 50, c: 50, l: 50, p: 50, t: ["f", "f", "f", "f", "f", "f"], nu: ["RU"], ct: 10, pw: 30 },
      C: { m: 50, e: 50, w: 50, c: 50, l: 50, p: 50, t: ["f", "f", "f", "f", "f", "f"], nu: ["CN", "IN"], ct: 10, pw: 30 },
      D: { m: 50, e: 50, w: 50, c: 50, l: 50, p: 50, t: ["f", "f", "f", "f", "f", "f"], nu: ["PK", "IL", "KP"], ct: 10, pw: 30 },
    },
    to: Array.from({ length: 5 }, (_, i) => ({ x: `T${i}`, y: `W${i}` })),
    po: Array.from({ length: 3 }, (_, i) => ({ x: `P${i}`, y: `W${i}` })),
    ...overrides,
  };
  return JSON.stringify(base);
}

function fetchReturning(text) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ content: [{ type: "text", text }] }),
  });
}

describe("runTurn — atomicity", () => {
  it("a fully valid response resolves ok:true with the validated payload", async () => {
    const fetchImpl = fetchReturning(validTurnJson());
    const result = await runTurn({ system: "s", userPrompt: "u", expectedYear: 2027, fetchImpl });
    expect(result.ok).toBe(true);
    expect(result.payload.y).toBe(2027);
  });

  it("one bad field (out-of-range metric) prevents commit — ok:false, no payload", async () => {
    const fetchImpl = fetchReturning(validTurnJson({}).replace('"m": 50', '"m": 999'));
    // Note: direct string replace to corrupt one field while keeping the rest valid JSON.
    const raw = validTurnJson();
    const corrupted = JSON.parse(raw);
    corrupted.bl.A.m = 999;
    const fetchImpl2 = fetchReturning(JSON.stringify(corrupted));
    const result = await runTurn({ system: "s", userPrompt: "u", expectedYear: 2027, fetchImpl: fetchImpl2 });
    expect(result.ok).toBe(false);
    expect(result.payload).toBeUndefined();
  });

  it("truncated JSON prevents commit — ok:false, no payload", async () => {
    const raw = validTurnJson();
    const truncated = raw.slice(0, Math.floor(raw.length / 2));
    const fetchImpl = fetchReturning(truncated);
    const result = await runTurn({ system: "s", userPrompt: "u", expectedYear: 2027, fetchImpl });
    expect(result.ok).toBe(false);
    expect(result.payload).toBeUndefined();
    expect(result.message).toMatch(/Retry/);
  });

  it("wrong year prevents commit — ok:false", async () => {
    const fetchImpl = fetchReturning(validTurnJson({ y: 1999 }));
    const result = await runTurn({ system: "s", userPrompt: "u", expectedYear: 2027, fetchImpl });
    expect(result.ok).toBe(false);
  });

  it("HTTP failure prevents commit — ok:false, friendly message, no throw", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    });
    const result = await runTurn({ system: "s", userPrompt: "u", expectedYear: 2027, fetchImpl });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Retry/);
  });

  it("network rejection (e.g. offline) prevents commit — ok:false, no throw out of runTurn", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const result = await runTurn({ system: "s", userPrompt: "u", expectedYear: 2027, fetchImpl });
    expect(result.ok).toBe(false);
  });

  it("an aborted request is reported distinctly and does not produce a misleading error", async () => {
    const abortError = new Error("The operation was aborted.");
    abortError.name = "AbortError";
    const fetchImpl = vi.fn().mockRejectedValue(abortError);
    const result = await runTurn({ system: "s", userPrompt: "u", expectedYear: 2027, fetchImpl });
    expect(result.ok).toBe(false);
    expect(result.aborted).toBe(true);
  });
});
