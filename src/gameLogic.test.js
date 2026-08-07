import { describe, it, expect, vi } from "vitest";
import {
  STARTER_BLOCS, DEFAULT_TACTICAL, DEFAULT_PHIL, STARTING_YEAR, STARTING_CLOCK,
  METRIC_ORDER, LEGAL_TRENDS, NUCLEAR_CODES,
  valueColor, clockColor, trendSymbol,
  parseModelJson, ParseError,
  validateTurnPayload, ValidationError,
  buildHistoryDigest,
  createTurnController,
} from "./gameLogic.js";

// ---------------------------------------------------------------------------
// Prompt 1 — starter state
// ---------------------------------------------------------------------------
describe("starter state", () => {
  it("has exactly 6 starter blocs", () => {
    expect(Object.keys(STARTER_BLOCS).length).toBe(6);
  });

  it("every starter metric is numeric 0-100", () => {
    for (const [name, s] of Object.entries(STARTER_BLOCS)) {
      for (const k of METRIC_ORDER) {
        expect(typeof s[k], `${name}.${k}`).toBe("number");
        expect(s[k]).toBeGreaterThanOrEqual(0);
        expect(s[k]).toBeLessThanOrEqual(100);
      }
    }
  });

  it("every starter trend is flat", () => {
    for (const [name, s] of Object.entries(STARTER_BLOCS)) {
      expect(s.t, name).toEqual(["f", "f", "f", "f", "f", "f"]);
    }
  });

  // NOTE: adapted — current schema has 5 default TACTICAL options and 3
  // default DOCTRINE options (two-decision system), not a single 3-item
  // array as in the older spec.
  it("has 5 default tactical options and 3 default doctrine options", () => {
    expect(DEFAULT_TACTICAL.length).toBe(5);
    expect(DEFAULT_PHIL.length).toBe(3);
    for (const opt of [...DEFAULT_TACTICAL, ...DEFAULT_PHIL]) {
      expect(typeof opt.x).toBe("string");
      expect(opt.x.length).toBeGreaterThan(0);
      expect(typeof opt.y).toBe("string");
      expect(opt.y.length).toBeGreaterThan(0);
    }
  });

  it("starts at year 2026", () => {
    expect(STARTING_YEAR).toBe(2026);
  });

  it("starts with Doomsday Clock at 130", () => {
    expect(STARTING_CLOCK).toBe(130);
  });

  it("every starter bloc's nuclear codes are from the fixed roster", () => {
    for (const [name, s] of Object.entries(STARTER_BLOCS)) {
      for (const code of s.nu) {
        expect(NUCLEAR_CODES, `${name} contains ${code}`).toContain(code);
      }
    }
  });

  it("every one of the 9 nuclear codes appears in exactly one starter bloc", () => {
    const seen = {};
    for (const s of Object.values(STARTER_BLOCS)) {
      for (const code of s.nu) seen[code] = (seen[code] || 0) + 1;
    }
    for (const code of NUCLEAR_CODES) {
      expect(seen[code], `code ${code}`).toBe(1);
    }
  });
});

// ---------------------------------------------------------------------------
// valueColor boundaries
// ---------------------------------------------------------------------------
describe("valueColor", () => {
  const cases = [0, 32, 33, 65, 66, 100];
  it.each(cases)("normal metric at %i", (v) => {
    const c = valueColor(v, false);
    expect(["text-emerald-400", "text-amber-300", "text-rose-400"]).toContain(c);
  });
  it.each(cases)("inverted metric at %i", (v) => {
    const c = valueColor(v, true);
    expect(["text-emerald-400", "text-amber-300", "text-rose-400"]).toContain(c);
  });

  it("normal: low=rose, mid=amber, hot=emerald", () => {
    expect(valueColor(0, false)).toBe("text-rose-400");
    expect(valueColor(32, false)).toBe("text-rose-400");
    expect(valueColor(33, false)).toBe("text-amber-300");
    expect(valueColor(65, false)).toBe("text-amber-300");
    expect(valueColor(66, false)).toBe("text-emerald-400");
    expect(valueColor(100, false)).toBe("text-emerald-400");
  });

  it("inverted: low=emerald, mid=amber, hot=rose (proliferation risk)", () => {
    expect(valueColor(0, true)).toBe("text-emerald-400");
    expect(valueColor(32, true)).toBe("text-emerald-400");
    expect(valueColor(33, true)).toBe("text-amber-300");
    expect(valueColor(65, true)).toBe("text-amber-300");
    expect(valueColor(66, true)).toBe("text-rose-400");
    expect(valueColor(100, true)).toBe("text-rose-400");
  });
});

// ---------------------------------------------------------------------------
// clockColor boundaries
// ---------------------------------------------------------------------------
describe("clockColor", () => {
  it("20 is red (danger zone)", () => expect(clockColor(20)).toBe("#ff3b3b"));
  it("21 is amber", () => expect(clockColor(21)).toBe("#ffb020"));
  it("60 is amber", () => expect(clockColor(60)).toBe("#ffb020"));
  it("61 is cyan", () => expect(clockColor(61)).toBe("#5ee1ff"));
  it("100 is cyan", () => expect(clockColor(100)).toBe("#5ee1ff"));
  it("101 is green (safe)", () => expect(clockColor(101)).toBe("#4af6c3"));
  it("representative high value (170) is green", () => expect(clockColor(170)).toBe("#4af6c3"));
});

// ---------------------------------------------------------------------------
// trendSymbol / TrendArrow mapping
// ---------------------------------------------------------------------------
describe("trendSymbol", () => {
  it.each(["u", "uu", "d", "dd", "f"])("renders a known glyph for %s", (t) => {
    const r = trendSymbol(t);
    expect(r.glyph.length).toBeGreaterThan(0);
  });
  it("unknown value renders flat/default rather than crashing", () => {
    expect(() => trendSymbol("banana")).not.toThrow();
    expect(trendSymbol("banana").glyph).toBe("—");
  });
  it("missing value renders flat/default rather than crashing", () => {
    expect(() => trendSymbol(undefined)).not.toThrow();
    expect(trendSymbol(undefined).glyph).toBe("—");
  });
});

// ---------------------------------------------------------------------------
// Prompt 2 — parseModelJson
// ---------------------------------------------------------------------------
describe("parseModelJson", () => {
  const validObj = { y: 2027, h: "Test" };
  const validStr = JSON.stringify(validObj);

  it("parses plain JSON", () => {
    expect(parseModelJson(validStr)).toEqual(validObj);
  });

  it("parses JSON wrapped in ```json fences", () => {
    expect(parseModelJson("```json\n" + validStr + "\n```")).toEqual(validObj);
  });

  it("parses JSON wrapped in generic ``` fences", () => {
    expect(parseModelJson("```\n" + validStr + "\n```")).toEqual(validObj);
  });

  it("parses JSON with a short accidental preamble", () => {
    expect(parseModelJson("Sure, here is the result:\n" + validStr)).toEqual(validObj);
  });

  it("parses JSON with short accidental trailing text", () => {
    expect(parseModelJson(validStr + "\nLet me know if you need anything else.")).toEqual(validObj);
  });

  it("tolerates surrounding whitespace", () => {
    expect(parseModelJson("   \n\n" + validStr + "\n\n   ")).toEqual(validObj);
  });

  it("handles braces inside quoted string values correctly", () => {
    const tricky = JSON.stringify({ h: "A war of {factions} and worse", y: 1 });
    expect(parseModelJson(tricky)).toEqual({ h: "A war of {factions} and worse", y: 1 });
  });

  it("rejects empty output", () => {
    expect(() => parseModelJson("")).toThrow(ParseError);
    expect(() => parseModelJson("   ")).toThrow(ParseError);
  });

  it("rejects output containing no JSON object", () => {
    expect(() => parseModelJson("I cannot complete this request.")).toThrow(ParseError);
  });

  it("rejects truncated JSON", () => {
    const truncated = validStr.slice(0, -3); // cut off the closing brace
    expect(() => parseModelJson(truncated)).toThrow(ParseError);
  });

  it("rejects mismatched braces", () => {
    expect(() => parseModelJson('{"a": 1}}')).not.toThrow(); // extra trailing brace after a valid object is fine, first object wins
    expect(() => parseModelJson('{"a": {1}')).toThrow(ParseError);
  });

  it("rejects malformed JSON", () => {
    expect(() => parseModelJson("{a: 1,}")).toThrow(ParseError);
  });

  it("rejects a top-level array", () => {
    expect(() => parseModelJson("[1,2,3]")).toThrow(ParseError);
  });
});

// ---------------------------------------------------------------------------
// Prompt 3 — validateTurnPayload
// (adapted: "to"=5 tactical options, "po"=3 doctrine options, instead of a
// single "options" array of 3; bloc entries also carry nu/ct/pw.)
// ---------------------------------------------------------------------------
function validBloc(overrides = {}) {
  return {
    m: 50, e: 50, w: 50, c: 50, l: 50, p: 50,
    t: ["u", "d", "uu", "dd", "f", "u"],
    nu: ["US"], ct: 10, pw: 40,
    ...overrides,
  };
}
function validPayload(overrides = {}) {
  return {
    y: 2027,
    h: "Headline",
    n: "Narrative text.",
    nt: "Precedent.",
    ck: 100,
    fl: "",
    bl: {
      "Bloc A": validBloc({ nu: ["US", "UK"] }),
      "Bloc B": validBloc({ nu: ["RU"] }),
      "Bloc C": validBloc({ nu: ["CN", "IN"] }),
      "Bloc D": validBloc({ nu: ["PK", "IL", "KP"] }),
    },
    to: Array.from({ length: 5 }, (_, i) => ({ x: `Option ${i}`, y: `Why ${i}` })),
    po: Array.from({ length: 3 }, (_, i) => ({ x: `Doctrine ${i}`, y: `Why ${i}` })),
    ...overrides,
  };
}

describe("validateTurnPayload", () => {
  it("accepts a fully valid payload", () => {
    expect(() => validateTurnPayload(validPayload(), 2027)).not.toThrow();
  });

  it("rejects wrong year", () => {
    expect(() => validateTurnPayload(validPayload({ y: 2028 }), 2027)).toThrow(ValidationError);
  });

  it("rejects non-integer year", () => {
    expect(() => validateTurnPayload(validPayload({ y: 2027.5 }), 2027)).toThrow(ValidationError);
  });

  it("rejects invalid clock type", () => {
    expect(() => validateTurnPayload(validPayload({ ck: "85" }), 2027)).toThrow(ValidationError);
  });

  it("rejects clock below 0", () => {
    expect(() => validateTurnPayload(validPayload({ ck: -1 }), 2027)).toThrow(ValidationError);
  });

  it("rejects clock above 180", () => {
    expect(() => validateTurnPayload(validPayload({ ck: 181 }), 2027)).toThrow(ValidationError);
  });

  it("rejects missing blocs", () => {
    const p = validPayload();
    delete p.bl;
    expect(() => validateTurnPayload(p, 2027)).toThrow(ValidationError);
  });

  it("rejects too few blocs", () => {
    const p = validPayload();
    p.bl = { "Only One": validBloc() };
    expect(() => validateTurnPayload(p, 2027)).toThrow(ValidationError);
  });

  it("rejects too many blocs", () => {
    const p = validPayload();
    p.bl = {};
    for (let i = 0; i < 8; i++) p.bl[`Bloc ${i}`] = validBloc();
    expect(() => validateTurnPayload(p, 2027)).toThrow(ValidationError);
  });

  it("rejects a null bloc entry", () => {
    const p = validPayload();
    p.bl["Bloc A"] = null;
    expect(() => validateTurnPayload(p, 2027)).toThrow(ValidationError);
  });

  it("rejects a missing metric", () => {
    const p = validPayload();
    delete p.bl["Bloc A"].m;
    expect(() => validateTurnPayload(p, 2027)).toThrow(ValidationError);
  });

  it("rejects a string metric", () => {
    const p = validPayload();
    p.bl["Bloc A"].m = "78";
    expect(() => validateTurnPayload(p, 2027)).toThrow(ValidationError);
  });

  it("rejects a metric out of range", () => {
    const p = validPayload();
    p.bl["Bloc A"].e = 150;
    expect(() => validateTurnPayload(p, 2027)).toThrow(ValidationError);
  });

  it("rejects a non-integer metric", () => {
    const p = validPayload();
    p.bl["Bloc A"].w = 55.5;
    expect(() => validateTurnPayload(p, 2027)).toThrow(ValidationError);
  });

  it("rejects a missing trend array", () => {
    const p = validPayload();
    delete p.bl["Bloc A"].t;
    expect(() => validateTurnPayload(p, 2027)).toThrow(ValidationError);
  });

  it("rejects an unknown trend code", () => {
    const p = validPayload();
    p.bl["Bloc A"].t = ["u", "d", "uu", "dd", "f", "sideways"];
    expect(() => validateTurnPayload(p, 2027)).toThrow(ValidationError);
  });

  it("rejects a wrong-length trend array", () => {
    const p = validPayload();
    p.bl["Bloc A"].t = ["u", "d"];
    expect(() => validateTurnPayload(p, 2027)).toThrow(ValidationError);
  });

  it("rejects an unknown nuclear code", () => {
    const p = validPayload();
    p.bl["Bloc A"].nu = ["ZZ"];
    expect(() => validateTurnPayload(p, 2027)).toThrow(ValidationError);
  });

  it("rejects ct out of range", () => {
    const p = validPayload();
    p.bl["Bloc A"].ct = 500;
    expect(() => validateTurnPayload(p, 2027)).toThrow(ValidationError);
  });

  it("rejects pw out of range", () => {
    const p = validPayload();
    p.bl["Bloc A"].pw = -5;
    expect(() => validateTurnPayload(p, 2027)).toThrow(ValidationError);
  });

  it("rejects blank headline", () => {
    expect(() => validateTurnPayload(validPayload({ h: "" }), 2027)).toThrow(ValidationError);
  });

  it("rejects blank narrative", () => {
    expect(() => validateTurnPayload(validPayload({ n: "   " }), 2027)).toThrow(ValidationError);
  });

  it("rejects blank note", () => {
    expect(() => validateTurnPayload(validPayload({ nt: "" }), 2027)).toThrow(ValidationError);
  });

  it("accepts an empty flag string", () => {
    expect(() => validateTurnPayload(validPayload({ fl: "" }), 2027)).not.toThrow();
  });

  it("rejects wrong-count tactical options", () => {
    const p = validPayload();
    p.to = p.to.slice(0, 3);
    expect(() => validateTurnPayload(p, 2027)).toThrow(ValidationError);
  });

  it("rejects wrong-count doctrine options", () => {
    const p = validPayload();
    p.po = [...p.po, { x: "extra", y: "extra" }];
    expect(() => validateTurnPayload(p, 2027)).toThrow(ValidationError);
  });

  it("rejects an option with an empty x", () => {
    const p = validPayload();
    p.to[0].x = "";
    expect(() => validateTurnPayload(p, 2027)).toThrow(ValidationError);
  });

  it("one invalid field is enough to reject the entire payload (atomicity)", () => {
    const p = validPayload();
    p.bl["Bloc A"].m = 999; // single bad field
    expect(() => validateTurnPayload(p, 2027)).toThrow(ValidationError);
    // everything else in the payload was otherwise valid — still rejected as a whole
  });
});

// ---------------------------------------------------------------------------
// Prompt 7 — buildHistoryDigest (full campaign, not last-4-only)
// ---------------------------------------------------------------------------
describe("buildHistoryDigest", () => {
  function turn(year, decision, headline) {
    return { year, decision, doctrine: "Doctrine X", headline, note: "Precedent X" };
  }

  it("keeps a decision from turn 1 visible after more than 4 later turns", () => {
    const log = [
      { ...turn(2027, "Very first decision", "First Headline") },
      turn(2028, "d2", "h2"),
      turn(2029, "d3", "h3"),
      turn(2030, "d4", "h4"),
      turn(2031, "d5", "h5"),
      turn(2032, "d6", "h6"),
    ];
    const digest = buildHistoryDigest({ year: 2032, clock: 80, blocs: {}, log });
    expect(digest).toContain("Very first decision");
  });

  it("includes current bloc state", () => {
    const digest = buildHistoryDigest({ year: 2027, clock: 130, blocs: STARTER_BLOCS, log: [] });
    expect(digest).toContain("Concordat West");
  });

  it("includes current year and clock", () => {
    const digest = buildHistoryDigest({ year: 2031, clock: 42, blocs: {}, log: [] });
    expect(digest).toContain("2031");
    expect(digest).toContain("42s");
  });

  it("does not produce literal 'undefined' text for missing optional fields", () => {
    const log = [{ year: 2027, decision: "Only a decision", doctrine: "", headline: "", note: "" }];
    const digest = buildHistoryDigest({ year: 2027, clock: 130, blocs: {}, log });
    expect(digest).not.toContain("undefined");
  });
});

// ---------------------------------------------------------------------------
// Prompts 5 & 6 — turn concurrency controller
// ---------------------------------------------------------------------------
describe("createTurnController", () => {
  it("allows a first request to begin", () => {
    const c = createTurnController();
    const r = c.begin();
    expect(r).not.toBeNull();
    expect(c.isInFlight).toBe(true);
  });

  it("rejects a second concurrent begin() while one is in flight", () => {
    const c = createTurnController();
    const r1 = c.begin();
    const r2 = c.begin();
    expect(r1).not.toBeNull();
    expect(r2).toBeNull(); // duplicate rapid submission produces no second request
  });

  it("releases the lock on finish, allowing a new request afterward", () => {
    const c = createTurnController();
    const r1 = c.begin();
    c.finish(r1.gen);
    expect(c.isInFlight).toBe(false);
    const r2 = c.begin();
    expect(r2).not.toBeNull();
  });

  it("finish always releases the lock even after a simulated failure path", () => {
    const c = createTurnController();
    const r1 = c.begin();
    try {
      throw new Error("simulated network failure");
    } catch {
      // swallow, simulating a catch block
    } finally {
      c.finish(r1.gen);
    }
    expect(c.isInFlight).toBe(false);
  });

  it("reset (abortAndReset) invalidates the in-flight request's generation", () => {
    const c = createTurnController();
    const r1 = c.begin();
    c.abortAndReset();
    expect(c.isCurrent(r1.gen)).toBe(false);
    expect(c.isInFlight).toBe(false);
  });

  it("a stale completion after reset must not be treated as current", () => {
    const c = createTurnController();
    const r1 = c.begin();
    c.abortAndReset();
    // Simulate the old request's fetch eventually resolving/rejecting late.
    const stillCurrent = c.isCurrent(r1.gen);
    expect(stillCurrent).toBe(false);
    // A stale finish() call must be a safe no-op, not corrupt new state.
    c.finish(r1.gen);
    const r2 = c.begin();
    expect(r2).not.toBeNull();
    expect(c.isCurrent(r2.gen)).toBe(true);
  });

  it("a real, current (non-aborted) failure is still identifiable as current before finish", () => {
    const c = createTurnController();
    const r1 = c.begin();
    expect(c.isCurrent(r1.gen)).toBe(true); // failure handling code can still show the error UI
    c.finish(r1.gen);
    expect(c.isCurrent(r1.gen)).toBe(false); // after release, no longer current
  });

  it("abort signal is provided and can be checked by callers", () => {
    const c = createTurnController();
    const r1 = c.begin();
    expect(r1.signal).toBeDefined();
    expect(r1.signal.aborted).toBe(false);
    c.abortAndReset();
    expect(r1.signal.aborted).toBe(true);
  });
});
