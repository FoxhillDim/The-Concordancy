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
return ["f", "f", "f", "f", "f", "f", "f", "f"]; // 8: 6 core metrics + ct + pw
}

export const STARTER_BLOCS = {
  "Western Alliance — USA / UK / France": {
    m: 78, e: 64, w: 55, c: 61, l: 70, p: 30, t: flatTrend(),
    nu: ["US", "UK", "FR"], ct: 45, pw: 72,
  },
  "Orthodox Commonwealth — Russia": {
    m: 65, e: 40, w: 68, c: 60, l: 48, p: 35, t: flatTrend(),
    nu: ["RU"], ct: 9, pw: 38,
  },
  "Sunni Coalition — Pakistan-led": {
    m: 52, e: 50, w: 62, c: 50, l: 55, p: 40, t: flatTrend(),
    nu: ["PK"], ct: 20, pw: 34,
  },
  "Asian Compact — China / India": {
    m: 76, e: 74, w: 30, c: 45, l: 58, p: 35, t: flatTrend(),
    nu: ["CN", "IN"], ct: 25, pw: 66,
  },
  "Israel — Independent": {
    m: 45, e: 55, w: 72, c: 25, l: 42, p: 50, t: flatTrend(),
    nu: ["IL"], ct: 1, pw: 22,
  },
  "North Korea — Independent": {
    m: 30, e: 25, w: 70, c: 15, l: 15, p: 55, t: flatTrend(),
    nu: ["KP"], ct: 1, pw: 8,
  },
  // Iran holds none of the 9 fixed nuclear codes at game start — it's
  // deliberately "a tenth actor," not one of the nine, per the system
  // prompt. An empty "nu" array is valid: the nuclear invariant check only
  // requires each of the 9 FIXED codes appear in exactly one bloc, it
  // doesn't require every bloc to hold one.
  "Iran — Independent": {
    m: 35, e: 20, w: 65, c: 20, l: 20, p: 65, t: flatTrend(),
    nu: [], ct: 1, pw: 10,
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

// Dynamic "now" — this is deliberately real-clock-driven rather than a
// hardcoded year, so the campaign always opens in the actual present,
// whenever it's played. STARTING_YEAR is also the FIRST ACTIONABLE year
// (not year+1) — the baseline narrative describes the state of the world
// as this year begins; the player's first directive resolves what happens
// by the end of that SAME year. See App.jsx's `nextActionYear` for how
// this is threaded through consistently everywhere a year is displayed.
export const STARTING_YEAR = new Date().getFullYear();
export const STARTING_MONTH = new Date().toLocaleString("en-US", { month: "long" });
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
  note: `Baseline — sets the pre-war world state as of ${STARTING_MONTH} ${STARTING_YEAR}.`,
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
if (names.length < 4 || names.length > 8) {
    errors.push(`bl: must contain 4-8 entries, got ${names.length}`);
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
if (!Array.isArray(s.t) || s.t.length !== 8) {
errors.push(`bl["${name}"].t: must be an 8-element array`);
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
// Historical Precedent Library — EXPANDABLE reference the simulation draws
// on for narrative grounding, beyond the compact numbered rules in the
// system prompt. Priority order (most to least emphasis, per design
// direction): alliance formation/betrayal, insurgency/proxy war, nuclear
// crisis management, diplomatic breakthroughs, economic coercion
// (deliberately thin — this is a religious/military sim first, not an
// economic one).
//
// TO ADD MORE LATER: append an object to HISTORICAL_PRECEDENTS with a
// category from PRECEDENT_CATEGORY_ORDER, a short title, and a one-to-two
// sentence PARAPHRASED lesson (never a direct quote — always paraphrase,
// same discipline as everywhere else in this app).
// ---------------------------------------------------------------------------
export const PRECEDENT_CATEGORY_ORDER = ["alliance", "insurgency", "nuclear", "diplomacy", "economic"];
export const PRECEDENT_CATEGORY_LABELS = {
  alliance: "ALLIANCE FORMATION & BETRAYAL",
  insurgency: "INSURGENCY & PROXY WAR",
  nuclear: "NUCLEAR CRISIS MANAGEMENT",
  diplomacy: "DIPLOMATIC BREAKTHROUGHS",
  economic: "ECONOMIC COERCION",
};

export const HISTORICAL_PRECEDENTS = [
  // -- alliance formation / betrayal --
  { category: "alliance", title: "NATO's founding (1949)", lesson: "Alliances form fastest around one clear, immediate shared threat, not shared identity. A mutual-defense promise rarely tested holds; one tested often and inconsistently erodes fast." },
  { category: "alliance", title: "Molotov-Ribbentrop Pact (1939)", lesson: "Ideological enemies will ally short-term if it buys strategic room. Everyone reads such pacts as temporary — betrayal is expected the moment either side gains enough advantage to act on it." },
  { category: "alliance", title: "Sino-Soviet split (1960s)", lesson: "Shared ideology doesn't guarantee alliance stability. Border disputes and leadership rivalry fractured a supposedly unified bloc within a single generation." },
  { category: "alliance", title: "Suez Crisis collusion (1956)", lesson: "Secret alliances collapse fast when a stronger patron disapproves. US financial pressure on the pound forced British-French-Israeli withdrawal within days — alliance value is capped by what your strongest ally will tolerate." },
  { category: "alliance", title: "Warsaw Pact collapse (1989-91)", lesson: "Alliances built on imposed loyalty rather than genuine shared interest don't decline gradually — they evaporate almost overnight once the enforcing power's will visibly weakens." },
  { category: "alliance", title: "Entente Cordiale (1904)", lesson: "Centuries-old rivals can form durable alliances when a third power's rise makes old grievances suddenly irrelevant by comparison." },
  { category: "alliance", title: "July 1914 alliance cascade", lesson: "A regional crisis between two minor actors can drag every allied great power into total war within weeks, once mutual-defense treaties trigger in sequence. No single leader chooses the wider war — the alliance architecture makes it structurally inevitable once the first mobilization order is signed." },
  { category: "alliance", title: "Rapallo Treaty (1922)", lesson: "Two states excluded and humiliated by the same postwar settlement will find each other useful allies regardless of ideological distance — shared pariah status is its own basis for cooperation." },
  { category: "alliance", title: "Peace of Westphalia (1648)", lesson: "Ended Europe's deadliest religious war not with one faith's total victory, but by separating religious identity from political sovereignty entirely — rulers, not empires or churches, would determine religious alignment within their own borders. The exit ramp from a religious war is often territorial division, not conquest." },
  { category: "alliance", title: "Congress of Vienna (1815)", lesson: "After Napoleon, the victors deliberately restored a balance of power rather than punishing France into permanent weakness, producing roughly 40 years without a general European war. Settlements that avoid humiliating the defeated side tend to outlast ones that don't." },
  { category: "alliance", title: "Diplomatic Revolution of 1756", lesson: "France and Austria, enemies for over two centuries, allied virtually overnight once the strategic calculus flipped. Even 'ancient enmity' is negotiable the instant circumstances change enough." },

  // -- insurgency / proxy war --
  { category: "insurgency", title: "Soviet-Afghan War (1979-89)", lesson: "Arming an insurgency can bleed a superpower without direct confrontation — but the weapons and networks created outlive the conflict and become their own future threat." },
  { category: "insurgency", title: "Vietnam War escalation", lesson: "Great powers backing opposite sides in a civil conflict escalate through incremental mission creep, not one decisive choice. Each step is individually justifiable; the sum becomes an unplanned full-scale war." },
  { category: "insurgency", title: "Iran-Contra precedent", lesson: "Covert proxy support that violates a government's own stated policy, once exposed, damages domestic legitimacy far more than the operation's tactical value ever justified." },
  { category: "insurgency", title: "Cuban revolutionary export (1960s-80s)", lesson: "A militarily weak power can project influence far beyond its means by exporting cheap revolutionary support, forcing larger rivals into containment responses disproportionate to the original threat." },
  { category: "insurgency", title: "Korean War (1950)", lesson: "The first Cold War proxy war set the template: a divided state becomes the battlefield, great powers intervene without formally declaring war on each other, and the conflict ends not in victory but an armistice that freezes the division for generations." },
  { category: "insurgency", title: "Syrian Civil War proxy dynamics", lesson: "Multiple outside powers can each back a different faction in the same civil war simultaneously — victory for any single faction becomes nearly impossible once its sponsor's real interest is regional standing, not that faction's actual success." },
  { category: "insurgency", title: "Peninsular War (1808-1814)", lesson: "Spanish guerrilla resistance bled Napoleon's dominant military for six years without ever winning a decisive battle, backed by British support. Occupying a hostile population is expensive even when you win every fight — attrition breaks occupiers, not battlefield losses." },
  
  // -- nuclear crisis management --
  { category: "nuclear", title: "Cuban Missile Crisis (1962)", lesson: "Private backchannel communication resolved what public brinkmanship could not. A face-saving secret concession let both sides claim victory domestically while avoiding war." },
  { category: "nuclear", title: "Yom Kippur War DEFCON 3 (1973)", lesson: "Superpower nuclear signaling can de-escalate a regional conflict by making the cost of continued involvement clear to both sides — without a shot fired between the superpowers themselves." },
  { category: "nuclear", title: "Able Archer 83", lesson: "A routine military exercise, poorly communicated, can be misread by a paranoid adversary as first-strike preparation. The closest the Cold War came to accidental nuclear war stemmed from ambiguity, not aggression." },
  { category: "nuclear", title: "Israel's undeclared arsenal", lesson: "Strategic ambiguity about a weapon's existence can serve deterrence without inviting the backlash of open declaration — but only until an attack forces the question." },
  { category: "nuclear", title: "Petrov Incident (1983)", lesson: "Automated early-warning systems produce false positives; the safeguard against accidental nuclear war is often one officer's judgment to disbelieve the machine. Technical reliability is not the same as decision-making reliability." },
  { category: "nuclear", title: "Kargil War (1999)", lesson: "Two openly declared nuclear powers fought a real, sustained conventional war within a year of both testing weapons — deterrence caps the ceiling of a conflict, it doesn't prevent conflict from happening at all." },
  { category: "nuclear", title: "JCPOA and its 2018 collapse", lesson: "A negotiated nonproliferation framework can genuinely constrain a weapons program for years — but unilateral withdrawal by one signatory, even without provocation, destroys the credibility of every future framework with that actor." },

  // -- diplomatic breakthroughs --
  { category: "diplomacy", title: "Camp David Accords (1978)", lesson: "A mediator with no direct stake, combined with sustained personal relationship-building between adversarial leaders, can overcome decades of stated hostility faster than institutional diplomacy." },
  { category: "diplomacy", title: "Nixon's China opening (1972)", lesson: "A leader with unimpeachable hardline credentials can make concessions a moderate leader could never survive politically making." },
  { category: "diplomacy", title: "Good Friday Agreement (1998)", lesson: "Ending a protracted conflict often requires formally acknowledging both sides' core grievances at once, not declaring one side's narrative the winner." },
  { category: "diplomacy", title: "Reykjavik Summit (1986)", lesson: "Two superpower leaders came within one unresolved technical dispute of agreeing to abolish nuclear weapons entirely — proof total disarmament has been within reach before, and that it can still collapse over a single sticking point neither side will yield." },
  { category: "diplomacy", title: "Congress of Berlin (1878)", lesson: "The great powers convened specifically to revise a prior treaty judged too favorable to one side and too destabilizing to the regional balance, redrawing borders by committee instead of by further war. When one power's unilateral gains threaten to overturn the wider order, others will often intervene diplomatically to claw the balance back." },

  // -- economic coercion (deliberately thin — secondary to this sim's focus) --
  { category: "economic", title: "1973 Oil Embargo", lesson: "Resource leverage can force policy change faster than military pressure, but it also accelerates the target's long-term effort to become independent of that resource." },
  { category: "economic", title: "Suez financial pressure (1956)", lesson: "Even a close ally bows to economic coercion faster than military pressure, if the economic stakes are existential enough." },
  { category: "economic", title: "SWIFT sanctions on Russia (2022)", lesson: "Cutting a state out of the global financial messaging system inflicts damage faster than almost any other economic weapon — but it also accelerates that state's investment in parallel systems immune to future exclusion." },
];

// Formats the library into prompt-ready text, grouped by category in
// priority order. Pure function, independently testable.
export function formatPrecedentLibrary(precedents = HISTORICAL_PRECEDENTS) {
  const lines = [];
  for (const cat of PRECEDENT_CATEGORY_ORDER) {
    const entries = precedents.filter((p) => p.category === cat);
    if (entries.length === 0) continue;
    lines.push(PRECEDENT_CATEGORY_LABELS[cat] + ":");
    for (const e of entries) {
      lines.push(`- ${e.title} — ${e.lesson}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}
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
