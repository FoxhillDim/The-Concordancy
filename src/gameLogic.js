// ---------------------------------------------------------------------------
// PROJECT CONCORDAT — pure game logic, extracted for regression testing.
//
// NOTE ON SCHEMA: the original hardening spec (project-concordat-beta-
// structural-repair-prompts.md) was written against an earlier snapshot of
// this game — a single 3-item options array and keyed trend objects. The
// actual current game uses a two-decision system (5 tactical + 3 doctrine
// options) with positional trend arrays and nu/ct/pw bloc fields, added in
// a later round at the player's request. This module hardens THAT schema,
// not the older one described in the doc. See the final report for the
// full list of adaptations.
// ---------------------------------------------------------------------------

export const NUCLEAR_POWERS = {
  US: { flag: "🇺🇸", name: "United States" },
  UK: { flag: "🇬🇧", name: "United Kingdom" },
  FR: { flag: "🇫🇷", name: "France" },
  RU: { flag: "🇷🇺", name: "Russia" },
  CN: { flag: "🇨🇳", name: "China" },
  IN: { flag: "🇮🇳", name: "India" },
  PK: { flag: "🇵🇰", name: "Pakistan" },
  IL: { flag: "🇮🇱", name: "Israel" },
  KP: { flag: "🇰🇵", name: "North Korea" },
};
export const NUCLEAR_CODES = Object.keys(NUCLEAR_POWERS);

export const METRIC_ORDER = ["m", "e", "w", "c", "l", "p"];
export const METRIC_META = {
  m: { label: "Military Readiness", invert: false },
  e: { label: "Economic Stability", invert: false },
  w: { label: "Will to Fight", invert: false },
  c: { label: "Alliance Cohesion", invert: false },
  l: { label: "Int'l Legitimacy", invert: false },
  p: { label: "Proliferation Risk", invert: true },
};
export const LEGAL_TRENDS = ["u", "d", "uu", "dd", "f"];

export function flatTrend() {
  return ["f", "f", "f", "f", "f", "f"];
}

export const STARTER_BLOCS = {
  "Concordat West — USA / UK / France": {
    m: 78, e: 64, w: 55, c: 61, l: 70, p: 30, t: flatTrend(),
    nu: ["US", "UK", "FR"], ct: 45, pw: 72,
  },
  "Orthodox Commonwealth — Russia": {
    m: 65, e: 40, w: 68, c: 60, l: 48, p: 35, t: flatTrend(),
    nu: ["RU"], ct: 9, pw: 38,
  },
  "Ummah Pact — Pakistan-led": {
    m: 52, e: 50, w: 62, c: 50, l: 55, p: 40, t: flatTrend(),
    nu: ["PK"], ct: 20, pw: 34,
  },
  "Dharmic-Confucian Sphere — China / India": {
    m: 76, e: 74, w: 30, c: 45, l: 58, p: 35, t: flatTrend(),
    nu: ["CN", "IN"], ct: 25, pw: 66,
  },
  "Israel — Nuclear Wildcard": {
    m: 45, e: 55, w: 72, c: 25, l: 42, p: 50, t: flatTrend(),
    nu: ["IL"], ct: 1, pw: 22,
  },
  "Rogue Nuclear Developers — North Korea / Iran": {
    m: 30, e: 32, w: 68, c: 20, l: 28, p: 60, t: flatTrend(),
    nu: ["KP"], ct: 2, pw: 14,
  },
};

export const DEFAULT_TACTICAL = [
  { x: "Fully commit U.S. forces to NATO Article 5 enforcement", y: "Signals resolve, locks you into every European flashpoint" },
  { x: "Withdraw from binding commitments, back allies bilaterally", y: "Keeps flexibility, reads as abandonment risk to allies" },
  { x: "Propose an early multilateral disarmament framework", y: "Claims moral high ground before any side has sunk cost" },
  { x: "Quietly share Iran nuclear intelligence with Israel", y: "Strengthens the exposed ally without a public tripwire" },
  { x: "Launch a rare-earth and semiconductor independence push", y: "Cuts Chinese leverage years before it turns urgent" },
];
export const DEFAULT_PHIL = [
  { x: "Lead through binding alliances — America keeps its word", y: "Allies plan around you instead of hedging" },
  { x: "Lead through strategic ambiguity — interests, not identities", y: "Maximizes freedom of action, costs long-term trust" },
  { x: "Lead through moral authority — restraint over raw power", y: "Slow to pay off, but can actually end it" },
];

export const STARTING_YEAR = 2026;
// Doomsday Clock is on a literal minutes-to-midnight scale now: 0 (midnight)
// to MAX_CLOCK (safest). CLOCK_SPLIT is where the two-ring gauge divides —
// the inner ring covers 0..CLOCK_SPLIT (the "final hour," yellow), the
// outer ring covers CLOCK_SPLIT..MAX_CLOCK (green). The outer ring drains
// first as danger rises; only once it's empty does the inner ring begin
// draining toward true midnight.
export const MAX_CLOCK = 120;
export const CLOCK_SPLIT = 60;
export const STARTING_CLOCK = 90;

export const INTRO_ENTRY = {
  year: STARTING_YEAR,
  headline: "The Fault Lines Set",
  narrative:
    "Nine nations, nine flags, one accelerating alignment: the world's power blocs are consolidating around civilizational and religious lines for the first time since before the Cold War. The United States holds the deepest alliance network on Earth and has not yet decided what to do with it.\n\nIntelligence assessments describe a board more nuclear-armed and more fractured than at any point since 1962. Every bloc believes it can still win. That belief is the war.",
  note: "Baseline year — sets the pre-war world state as of January 2026.",
  flag: "",
  decision: "",
  doctrine: "",
};

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
export function valueColor(val, invert) {
  const hot = val >= 66, mid = val >= 33 && val < 66;
  if (invert) return hot ? "text-rose-400" : mid ? "text-amber-300" : "text-emerald-400";
  return hot ? "text-emerald-400" : mid ? "text-amber-300" : "text-rose-400";
}

// Fixed two-tone Doomsday Clock ring scheme (replaces the old single-ring,
// 4-tier gradient) — outer ring = green ("an hour or more away"), inner
// ring = yellow ("the end is becoming near"). No value-dependent color
// shifting, by design — kept intentionally simple for now.
export const CLOCK_OUTER_COLOR = "#4af6c3";
export const CLOCK_INNER_COLOR = "#ffb020";
export const CLOCK_TRACK_COLOR = "#1c2530";

// Pure, testable ring-fill math for the two-ring gauge. The outer ring
// (CLOCK_SPLIT..MAX_CLOCK) drains first as danger rises; only once it's
// empty does the inner ring (0..CLOCK_SPLIT) begin draining toward true
// midnight. Returns fractions in [0, 1] for each ring.
export function clockRingFractions(minutes) {
  const clamped = Math.max(0, Math.min(MAX_CLOCK, minutes));
  const outer = Math.max(0, Math.min(1, (clamped - CLOCK_SPLIT) / CLOCK_SPLIT));
  const inner = Math.max(0, Math.min(1, clamped / CLOCK_SPLIT));
  return { outer, inner };
}

// Pure mapping used by the <TrendArrow/> component. Unknown/missing values
// render as flat rather than crashing.
export function trendSymbol(trend) {
  switch (trend) {
    case "u": return { glyph: "▲", className: "text-emerald-400" };
    case "uu": return { glyph: "▲▲", className: "text-emerald-400" };
    case "d": return { glyph: "▼", className: "text-rose-400" };
    case "dd": return { glyph: "▼▼", className: "text-rose-400" };
    case "f": return { glyph: "—", className: "text-slate-500" };
    default: return { glyph: "—", className: "text-slate-500" };
  }
}

// ---------------------------------------------------------------------------
// JSON extraction (Prompt 2)
//
// Tolerates: plain JSON, ```json fences, generic ``` fences, short
// accidental preamble/postamble text, surrounding whitespace.
// Rejects: empty output, no JSON object found, truncated JSON, mismatched
// braces, malformed JSON, top-level arrays.
//
// Brace-matching is quote-aware so braces inside JSON string values don't
// terminate the scan early.
// ---------------------------------------------------------------------------
export class ParseError extends Error {
  constructor(message) {
    super(message);
    this.name = "ParseError";
  }
}

function stripFences(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1];
  return text;
}

// Scans for the first balanced {...} object, respecting string literals and
// escape sequences so braces inside quoted strings are ignored.
function extractFirstJsonObject(text) {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  // Ran off the end without closing — truncated.
  return null;
}

export function parseModelJson(rawText) {
  if (typeof rawText !== "string" || rawText.trim().length === 0) {
    throw new ParseError("Empty model response.");
  }

  const unfenced = stripFences(rawText).trim();
  const candidate = extractFirstJsonObject(unfenced);

  if (candidate === null) {
    throw new ParseError("No complete JSON object found (response may be truncated).");
  }

  let parsed;
  try {
    parsed = JSON.parse(candidate);
  } catch (e) {
    throw new ParseError(`Malformed JSON: ${e.message}`);
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ParseError("Top-level JSON value must be an object.");
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Turn payload validation (Prompt 3)
//
// Adapted to the CURRENT compact schema: y/h/n/nt/ck/fl/bl/to/po, positional
// trend arrays, nu/ct/pw per bloc, and TWO option arrays (5 tactical + 3
// doctrine) instead of the older single 3-item array.
// ---------------------------------------------------------------------------
export class ValidationError extends Error {
  constructor(errors) {
    super(errors.join("; "));
    this.name = "ValidationError";
    this.errors = errors;
  }
}

function isFiniteInt(v) {
  return typeof v === "number" && Number.isFinite(v) && Number.isInteger(v);
}
function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function validateBlocs(bl, errors) {
  if (bl === null || typeof bl !== "object" || Array.isArray(bl)) {
    errors.push("bl: must be a non-null object");
    return;
  }
  const names = Object.keys(bl);
  if (names.length < 4 || names.length > 7) {
    errors.push(`bl: must contain 4-7 entries, got ${names.length}`);
  }
  for (const name of names) {
    if (!isNonEmptyString(name)) {
      errors.push("bl: bloc name must be a non-empty string");
      continue;
    }
    const s = bl[name];
    if (s === null || typeof s !== "object") {
      errors.push(`bl["${name}"]: must be a non-null object`);
      continue;
    }
    for (const k of METRIC_ORDER) {
      const v = s[k];
      if (!isFiniteInt(v) || v < 0 || v > 100) {
        errors.push(`bl["${name}"].${k}: must be an integer 0-100, got ${JSON.stringify(v)}`);
      }
    }
    if (!Array.isArray(s.t) || s.t.length !== 6) {
      errors.push(`bl["${name}"].t: must be a 6-element array`);
    } else {
      s.t.forEach((code, idx) => {
        if (!LEGAL_TRENDS.includes(code)) {
          errors.push(`bl["${name}"].t[${idx}]: illegal trend "${code}"`);
        }
      });
    }
    if (!Array.isArray(s.nu)) {
      errors.push(`bl["${name}"].nu: must be an array`);
    } else {
      s.nu.forEach((code) => {
        if (!NUCLEAR_CODES.includes(code)) {
          errors.push(`bl["${name}"].nu: unknown nuclear code "${code}"`);
        }
      });
    }
    if (!isFiniteInt(s.ct) || s.ct < 0 || s.ct > 193) {
      errors.push(`bl["${name}"].ct: must be an integer 0-193, got ${JSON.stringify(s.ct)}`);
    }
    if (!isFiniteInt(s.pw) || s.pw < 0 || s.pw > 100) {
      errors.push(`bl["${name}"].pw: must be an integer 0-100, got ${JSON.stringify(s.pw)}`);
    }
  }
}

function validateOptionArray(arr, expectedLen, field, errors) {
  if (!Array.isArray(arr) || arr.length !== expectedLen) {
    errors.push(`${field}: must be an array of exactly ${expectedLen} items`);
    return;
  }
  arr.forEach((opt, idx) => {
    if (opt === null || typeof opt !== "object") {
      errors.push(`${field}[${idx}]: must be an object`);
      return;
    }
    if (!isNonEmptyString(opt.x)) errors.push(`${field}[${idx}].x: must be a non-empty string`);
    if (!isNonEmptyString(opt.y)) errors.push(`${field}[${idx}].y: must be a non-empty string`);
  });
}

// Returns the validated/normalized payload on success, or throws ValidationError.
export function validateTurnPayload(payload, expectedYear) {
  const errors = [];

  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ValidationError(["payload: must be a non-null object"]);
  }

  if (!isFiniteInt(payload.y)) {
    errors.push(`y: must be an integer, got ${JSON.stringify(payload.y)}`);
  } else if (payload.y !== expectedYear) {
    errors.push(`y: expected ${expectedYear}, got ${payload.y}`);
  }

  if (!isNonEmptyString(payload.h)) errors.push("h (headline): must not be blank");
  if (!isNonEmptyString(payload.n)) errors.push("n (narrative): must not be blank");
  if (!isNonEmptyString(payload.nt)) errors.push("nt (note): must not be blank");
  if (typeof payload.fl !== "string") errors.push("fl (flag): must be a string (may be empty)");

if (!isFiniteInt(payload.ck) || payload.ck < 0 || payload.ck > MAX_CLOCK) {
    errors.push(`ck (clock): must be an integer 0-${MAX_CLOCK}, got ${JSON.stringify(payload.ck)}`);
  }

  validateBlocs(payload.bl, errors);
  validateOptionArray(payload.to, 5, "to", errors);
  validateOptionArray(payload.po, 3, "po", errors);

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }

  return payload;
}

// ---------------------------------------------------------------------------
// History digest (Prompt 7) — full campaign, not just the last few turns.
// ---------------------------------------------------------------------------
// Finds whichever bloc currently holds a given nuclear code — this is how
// the "your alliance" card survives bloc renames/splits/merges over a long
// campaign, since we don't track a stable bloc ID, only the nuclear-code
// invariant (every code lives in exactly one bloc, always). Also the
// mechanism that will let a future "play as any nuclear power" feature work
// with zero changes here — just pass a different code.
// Returns [name, stats] or null if not found (defensive; shouldn't happen
// given the invariant check, but the UI layer should never assume it).
export function findPlayerBloc(blocs, code = "US") {
  if (!blocs || typeof blocs !== "object") return null;
  for (const [name, stats] of Object.entries(blocs)) {
    if (stats && Array.isArray(stats.nu) && stats.nu.includes(code)) {
      return [name, stats];
    }
  }
  return null;
}

export function buildHistoryDigest({ year, clock, blocs, log }) {
  const completed = (log || []).filter((entry) => entry.decision || entry.doctrine);
  const lines = completed.map((entry) => {
    const decision = entry.decision || "(none)";
    const doctrine = entry.doctrine || "(none)";
    const headline = entry.headline || "(no headline)";
    const note = entry.note || "(no precedent noted)";
    return `${entry.year} | DECISION: ${decision} / DOCTRINE: ${doctrine} | RESULT: ${headline} | PRECEDENT: ${note}`;
  });

  return [
    `CURRENT YEAR: ${year}`,
    `CLOCK: ${clock}s`,
    `BLOC STATE: ${JSON.stringify(blocs)}`,
    `FULL CAMPAIGN LOG:`,
    lines.length ? lines.join("\n") : "(no turns completed yet)",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Turn concurrency controller (Prompts 5 & 6) — a plain-JS, React-free
// module so the duplicate-submission and reset-during-request invariants
// can be unit tested without DOM/component rendering.
// ---------------------------------------------------------------------------
export function createTurnController() {
  let inFlight = false;
  let generation = 0;
  let controller = null;

  return {
    // Call when starting a new turn. Returns null if a turn is already in
    // flight (caller must no-op). Otherwise returns {signal, gen}.
    begin() {
      if (inFlight) return null;
      inFlight = true;
      generation += 1;
      controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      return { signal: controller ? controller.signal : undefined, gen: generation };
    },
    // True if `gen` is still the active request (i.e. not superseded by a
    // reset or a later begin()).
    isCurrent(gen) {
      return inFlight && gen === generation;
    },
    // Call in `finally` for the request started with this `gen`. Only
    // releases the lock if this is still the current generation — a stale
    // call is a safe no-op.
    finish(gen) {
      if (gen === generation) {
        inFlight = false;
      }
    },
    // Call from resetGame(). Aborts the in-flight fetch (if any) and
    // invalidates its generation so a late completion is ignored.
    abortAndReset() {
      if (controller) controller.abort();
      generation += 1;
      inFlight = false;
      controller = null;
    },
    get isInFlight() {
      return inFlight;
    },
  };
}
