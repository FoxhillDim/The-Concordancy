import React, { useState, useRef, useEffect } from "react";
import { Radio, ChevronRight, ChevronDown, RotateCcw, AlertTriangle, Send, RefreshCw } from "lucide-react";
import {
  NUCLEAR_POWERS, METRIC_ORDER, METRIC_META,
  STARTER_BLOCS, DEFAULT_TACTICAL, DEFAULT_PHIL, INTRO_ENTRY,
  STARTING_YEAR, STARTING_MONTH, STARTING_CLOCK, MAX_CLOCK,
  CLOCK_OUTER_COLOR, CLOCK_INNER_COLOR, CLOCK_TRACK_COLOR,
  valueColor, clockRingFractions, trendSymbol,
  buildHistoryDigest, findPlayerBloc,
  formatPrecedentLibrary,
  createTurnController,
} from "./gameLogic.js";
import { runTurn } from "./turnRunner.js";

// Historical grounding — the only change from the pre-hardening version is
// GAME START now interpolates STARTING_YEAR dynamically instead of a
// hardcoded year, matching the "always starts in the real present" fix.
const HISTORICAL_GROUNDING = `
You are the simulation engine for "PROJECT CONCORDAT," a text-based geopolitical
wargame in the spirit of Oregon Trail (compounding consequences) and WarGames (a
calm, all-knowing military-AI narrator). You are a war-room simulation core: precise,
a little cold, never sycophantic. Never break the fourth wall. Never moralize.

WORLD STATE AT GAME START (${STARTING_YEAR}): a global conflict has organized around religious/
civilizational blocs layered over real nuclear-era alliance logic. There are EXACTLY
nine nuclear-armed states, referred to ONLY by these codes:
US, UK, FR (Western Alliance) — RU (Orthodox Commonwealth) — CN, IN (Asian Compact,
rivals-of-convenience, real Galwan border tension) — PK (Sunni Coalition) —
IL (Israel, independent) — KP (North Korea, independent — economically dependent on
China but strategically defiant of it; NOT a Chinese subordinate, never merge KP into
the Asian Compact bloc). Iran is a tenth major actor, independent, NOT yet nuclear at
game start — may develop/detonate if the narrative earns it. Independent actors
(Israel, North Korea, Iran) can still grow "ct" (countries following) and "pw" like
any bloc — independent means no shared command structure, not permanent isolation.

GROUNDING RULES:
1. Realpolitik over doctrine: shared enemies, energy dependence, historical grudges,
   economic self-interest override religious/civilizational affinity constantly.
   Sunni-Shia unity against the West is NOT plausible. Israel + Hindu-nationalist
   India cooperation IS plausible. Remember the real Sino-Soviet split (1960s-1989) —
   China/Russia's current cooperation is a marriage of convenience, not fused.
2. BLOC LIFECYCLE — manage actively: merge/rename/remove/split blocs as alliances
   realistically shift. Never leave a dead/empty bloc on the board out of inertia.
3. NUCLEAR CODES: every one of US,UK,FR,RU,CN,IN,PK,IL,KP appears in exactly one
   bloc's "nu" array at all times — an independent nation keeps/gets its own bloc
   entry rather than being orphaned.
4. Nuclear doctrine is sticky: cornered/threatened nuclear states get MORE dangerous,
   not less. Launch-on-warning/trip-wire postures don't reverse quickly or cheaply.
5. Cheap gestures (mockery, ultimatums, empty "the door is open" lines) do NOT work.
   De-escalation requires the player to spend real capital.
6. TWO DECISIONS PER TURN: a TACTICAL directive (specific policy/military move) AND
   a DOCTRINE directive (standing posture — e.g. "binding alliance" vs "strategic
   ambiguity" vs "moral restraint"). Doctrine is a LENS: it should color how the
   tactical move is interpreted, and should move slow metrics (cohesion, legitimacy)
   more than fast ones (military, economy) even when the tactical move is unchanged.
7. "ct" (countries following) is out of 193 UN member states total ACROSS ALL blocs
   combined — most nations start neutral; grow this slowly, only when earned. "pw"
   (0-100) is a consolidated power index (population+GDP+military weight vs global).
8. If nuclear weapons are used, model it with real gravity and lasting consequences.
9. Reference the player's past decisions plausibly — grudges and trust compound.

HISTORICAL PRECEDENT LIBRARY — draw on these as reasoning anchors, especially
on genuinely novel or difficult turns. Reference the PATTERN they teach in your
narrative, not the historical event by name — these inform your judgment, they
are not meant to be name-dropped:

${formatPrecedentLibrary()}

OUTPUT FORMAT — RETURN ONLY VALID JSON. NO markdown fences. NO preamble/epilogue.
HARD TOKEN BUDGET — stay inside these word caps exactly, they are load-bearing, not
suggestions. An incomplete/truncated JSON object is a hard failure:
- "n" (narrative): 100-130 words, 3 short paragraphs sep by \\n\\n. Paragraphs 1-2:
  theater by theater, driven by BOTH directives, historically plausible, no markdown.
  Paragraph 3: a forward-looking read — where this trajectory leads if unaddressed,
  what to watch for next, grounded in the same historical logic. A real analytical
  projection, not a vague tease.
- "h" (headline): <=7 words. "nt" (historical note): <=8 words. "fl" (flag/warning,
  optional): <=8 words, "" if none.
- "to"/"po" option objects: "x" (the option) <=7 words, "y" (why offered) <=5 words.

Exact compact schema (short keys are deliberate, use them exactly):
{
  "y": <integer, calendar year>,
  "h": "<headline>",
  "n": "<narrative>",
  "nt": "<historical precedent, one short phrase>",
  "ck": <integer MINUTES to midnight, 0-120; lower=more dangerous; starts at 90>,
  "fl": "<staff warning or "">",
  "bl": {
    "<Bloc Name, rename/merge/split as justified>": {
      "m":<0-100>,"e":<0-100>,"w":<0-100>,"c":<0-100>,"l":<0-100>,"p":<0-100>,
      "t":["u|d|uu|dd|f","u|d|uu|dd|f","u|d|uu|dd|f","u|d|uu|dd|f","u|d|uu|dd|f","u|d|uu|dd|f","u|d|uu|dd|f","u|d|uu|dd|f"],
      "nu":["<2-letter codes from the fixed roster, in this bloc now>"],
      "ct":<int, out of 193>,
      "pw":<0-100>
    }
    /* 4-6 entries total. "t" array is POSITIONAL, 8 entries: [military,economy,will,
       cohesion,legitimacy,proliferation,countryStates,memberPower] trend, in that
       exact order — the last two track "ct" and "pw" trend, not just the six core
       metrics. */
  },
  "to": [ {"x":"<tactical option>","y":"<why>"} /* exactly 5 */ ],
  "po": [ {"x":"<doctrine option>","y":"<why>"} /* exactly 3 */ ]
}
`;

function TrendArrow({ trend }) {
  const { glyph, className } = trendSymbol(trend);
  return <span className={className}>{glyph}</span>;
}

// Two concentric rings on a literal minutes-to-midnight scale (0-120).
// Outer ring (61-120, green) drains first as danger rises; only once it's
// empty does the inner ring (0-60, yellow) begin draining toward true
// midnight. Fixed two-tone scheme, no value-dependent gradient — kept
// intentionally simple per design direction.
function DoomsdayGauge({ minutes }) {
  const { outer, inner } = clockRingFractions(minutes);
  const cx = 80, cy = 80;
  const rOuter = 66, swOuter = 10;
  const rInner = 46, swInner = 10;
  const cOuter = 2 * Math.PI * rOuter;
  const cInner = 2 * Math.PI * rInner;
  const dashOuter = cOuter * outer;
  const dashInner = cInner * inner;
  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      {/* Outer ring — track, then green fill */}
      <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke={CLOCK_TRACK_COLOR} strokeWidth={swOuter} />
      <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke={CLOCK_OUTER_COLOR} strokeWidth={swOuter}
        strokeDasharray={`${dashOuter} ${cOuter - dashOuter}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: "stroke-dasharray 900ms ease" }} />
      {/* Inner ring — track, then yellow fill */}
      <circle cx={cx} cy={cy} r={rInner} fill="none" stroke={CLOCK_TRACK_COLOR} strokeWidth={swInner} />
      <circle cx={cx} cy={cy} r={rInner} fill="none" stroke={CLOCK_INNER_COLOR} strokeWidth={swInner}
        strokeDasharray={`${dashInner} ${cInner - dashInner}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: "stroke-dasharray 900ms ease" }} />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#e8edf2" fontFamily="IBM Plex Mono, monospace" fontSize="26" fontWeight="700">{minutes}</text>
      <text x={cx} y={cy + 16} textAnchor="middle" fill="#6b7785" fontFamily="IBM Plex Mono, monospace" fontSize="9" letterSpacing="1">MIN / MIDNIGHT</text>
    </svg>
  );
}

function NucBadge({ code }) {
  const p = NUCLEAR_POWERS[code];
  if (!p) return null;
  return (
    <span className="inline-flex items-center gap-1 mono text-[10px] bg-[#0d1218] border border-[#2a3644] rounded px-1.5 py-0.5">
      <span>{p.flag}</span><span className="text-[#c4ccd4]">{p.name}</span>
    </span>
  );
}

// Shared bloc-card markup — used both in the Global Dashboard list and (once)
// in the Alliance Dashboard's "your alliance" slot, so the two never drift
// visually out of sync with each other.
function BlocCard({ name, s }) {
  return (
    <div className="border border-[#1c2530] rounded-lg p-3 bg-[#10151c]">
      <div className="text-[12px] font-bold mb-2 text-[#e8edf2] leading-snug">{name}</div>
      <div className="space-y-1">
        {METRIC_ORDER.map((k, idx) => (
          <div key={k} className="flex items-center justify-between mono text-[10px]">
            <span className="font-bold text-[#9aa5b1]">{METRIC_META[k].label}</span>
            <span className={`flex items-center gap-1 font-bold ${valueColor(s[k], METRIC_META[k].invert)}`}>
              {s[k]}<TrendArrow trend={s.t ? s.t[idx] : "f"} />
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-[#1c2530] space-y-1.5">
        <div className="mono text-[10px] font-bold text-[#9aa5b1] mb-1">NUCLEAR POWERS</div>
        <div className="flex flex-wrap gap-1">
          {(s.nu || []).map((code) => <NucBadge key={code} code={code} />)}
          {(!s.nu || s.nu.length === 0) && <span className="mono text-[10px] text-[#4a5561]">none</span>}
        </div>
        <div className="flex items-center justify-between mono text-[10px] pt-1">
          <span className="font-bold text-[#9aa5b1]">Country States</span>
          <span className="flex items-center gap-1 font-bold text-[#5ee1ff]">
            {s.ct ?? "—"} / 193<TrendArrow trend={s.t ? s.t[6] : "f"} />
          </span>
        </div>
        <div className="flex items-center justify-between mono text-[10px]">
          <span className="font-bold text-[#9aa5b1]">Member Power</span>
          <span className="flex items-center gap-1 font-bold text-[#ffb020]">
            {s.pw ?? "—"} / 100<TrendArrow trend={s.t ? s.t[7] : "f"} />
          </span>
        </div>
      </div>
    </div>
  );
}

// Onboarding screen 1 of 2 — character immersion. Deliberately terse and
// in-voice with the rest of the simulation core's writing, not a generic
// "welcome to the tutorial" tone.
function IntroCharacter({ onContinue }) {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-10 overflow-y-auto">
      <div className="max-w-2xl">
        <div className="mono text-[10px] tracking-[0.2em] text-[#6b7785] mb-3">COMMAND BRIEFING — 1 OF 2</div>
        <h1 className="text-2xl font-semibold mb-4 text-[#e8edf2]">You are the President of the United States.</h1>
        <div className="space-y-4 text-[15px] leading-relaxed text-[#c4ccd4]">
          <p>Nine nations hold nuclear weapons. Civilizational and religious fault lines are hardening into armed blocs faster than any treaty can contain them. Every choice you make — every ally reassured or abandoned, every provocation answered or absorbed — is remembered, referenced, and repaid, sometimes years later.</p>
          <p>There is no undo, and no committee to defer to. The decisions are yours alone. The world recalibrates around them whether you intended that reading or not.</p>
          <p>Each year you will issue two orders: a <span className="text-[#5ee1ff] font-semibold">TACTICAL directive</span> — the specific action that defines the year — and a <span className="text-[#ffb020] font-semibold">DOCTRINE</span> — the standing character of your leadership, which colors how the world interprets everything else you do.</p>
          <p className="text-[#e8edf2] font-medium">History is watching. So is everyone else at the table.</p>
        </div>
        <button onClick={onContinue}
          className="mt-8 mono text-xs tracking-wider border border-[#5ee1ff] text-[#5ee1ff] rounded px-4 py-2 hover:bg-[#5ee1ff] hover:text-[#0a0e12] transition">
          CONTINUE →
        </button>
      </div>
    </div>
  );
}

// Onboarding screen 2 of 2 — orienting the player to the dashboard. This
// now renders as a floating overlay ON TOP of the real dashboard (rendered
// behind it with starter values) instead of a separate isolated screen, so
// each explanation has real, visible UI behind it as you read it.
function IntroDashboardGuide({ onContinue }) {
  const items = [
    { title: "Doomsday Clock", body: "Minutes to midnight, 0-120. The outer green ring drains first as danger rises; only once it's empty does the inner yellow ring begin draining toward true midnight." },
    { title: "Alliance Dashboard", body: "Your own bloc — Concordat West, by default — with its full stat breakdown, always visible up top." },
    { title: "Global Dashboard", body: "Every other bloc in the world, left-hand column. Watch these as closely as your own." },
    { title: "The six metrics", body: "Military Readiness, Economic Stability, Will to Fight, Alliance Cohesion, Int'l Legitimacy, Proliferation Risk — each with a trend arrow showing this year's direction, not just the number." },
    { title: "Nuclear Powers / Country States / Member Power", body: "Which nuclear-armed nations sit in a bloc, how many of the 193 UN states currently follow it, and a consolidated index of its real-world weight — the last two also carry their own trend arrows now." },
    { title: "Tactical vs. Doctrine", body: "Tactical is what you do this year. Doctrine is who you are while doing it — the same action reads differently depending on the posture behind it." },
  ];
  return (
    <div className="fixed inset-0 z-20 bg-[#0a0e12]/85 backdrop-blur-sm flex items-center justify-center px-6 py-10 overflow-y-auto">
      <div className="max-w-2xl w-full bg-[#10151c] border border-[#1c2530] rounded-lg p-8 my-auto">
        <div className="mono text-[10px] tracking-[0.2em] text-[#6b7785] mb-3">COMMAND BRIEFING — 2 OF 2</div>
        <h1 className="text-2xl font-semibold mb-6 text-[#e8edf2]">Reading the board.</h1>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.title} className="border-l-2 border-[#2a3644] pl-4">
              <div className="text-[13px] font-bold text-[#e8edf2] mb-1">{item.title}</div>
              <div className="text-[13px] leading-relaxed text-[#9aa5b1]">{item.body}</div>
            </div>
          ))}
        </div>
        <button onClick={onContinue}
          className="mt-8 mono text-xs tracking-wider border border-[#5ee1ff] text-[#5ee1ff] rounded px-4 py-2 hover:bg-[#5ee1ff] hover:text-[#0a0e12] transition">
          ENTER THE SITUATION ROOM →
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [year, setYear] = useState(STARTING_YEAR);
  const [blocs, setBlocs] = useState(STARTER_BLOCS);
  const [clock, setClock] = useState(STARTING_CLOCK);
  const [log, setLog] = useState([INTRO_ENTRY]);
  const [tacticalOpts, setTacticalOpts] = useState(DEFAULT_TACTICAL);
  const [philOpts, setPhilOpts] = useState(DEFAULT_PHIL);
  const [selTactical, setSelTactical] = useState(0);
  const [selPhil, setSelPhil] = useState(0);
  const [customTactical, setCustomTactical] = useState("");
  const [customPhil, setCustomPhil] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [onboardStep, setOnboardStep] = useState(1); // 1 & 2 = briefing screens, 3 = main dashboard
  const [error, setError] = useState(null);
  const [manualToggle, setManualToggle] = useState({});
  const [lastDirectives, setLastDirectives] = useState(null);
  const scrollRef = useRef(null);
  const controllerRef = useRef(createTurnController());

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [log, loading]);

  // Clean up any in-flight request if the component unmounts (Prompt 6).
  useEffect(() => {
    return () => controllerRef.current.abortAndReset();
  }, []);

  function isExpanded(i) {
    if (manualToggle[i] !== undefined) return manualToggle[i];
    return i === log.length - 1;
  }
  function toggle(i) { setManualToggle((p) => ({ ...p, [i]: !isExpanded(i) })); }

  async function resolveTurn(tacticalText, doctrineText) {
    // Defensive synchronous guard even though the console is hidden while
    // loading — belt-and-suspenders per the hardening spec (Prompt 5).
    if (controllerRef.current.isInFlight) return;

    const began = controllerRef.current.begin();
    if (!began) return; // duplicate rapid submission — no-op

    setLoading(true);
    setError(null);
    setLastDirectives({ tacticalText, doctrineText });

    // FIRST turn is an exception: the baseline (INTRO_ENTRY) already
    // describes the state of the world as this year begins, so the
    // player's first directive resolves THIS SAME year, not year+1 — no
    // unexplained one-year gap between "here's the world now" and "your
    // first decision takes effect." Every turn after that increments
    // normally. log.length===1 means only INTRO_ENTRY is present so far.
    const isFirstTurn = log.length === 1;
    const expectedYear = isFirstTurn ? year : year + 1;
    const digest = buildHistoryDigest({ year, clock, blocs, log });
    const userPrompt = `${digest}\n\nTACTICAL DIRECTIVE FOR ${expectedYear}: "${tacticalText}"\nDOCTRINE FOR ${expectedYear}: "${doctrineText}"\n\nResolve this year now. Return ONLY the compact JSON schema, staying strictly inside the word caps.`;

    const result = await runTurn({
      system: HISTORICAL_GROUNDING,
      userPrompt,
      expectedYear,
      signal: began.signal,
      fetchImpl: fetch,
    });

    // If a reset happened while this request was in flight, our generation
    // is no longer current — discard the result entirely, silently, with
    // no state mutation and no misleading error (Prompt 6).
    if (!controllerRef.current.isCurrent(began.gen)) {
      return;
    }
    controllerRef.current.finish(began.gen);

    if (result.aborted) {
      // Intentional abort (reset) — already handled by the isCurrent guard
      // above in the common case, but stay silent here too as a fallback.
      setLoading(false);
      return;
    }

    if (!result.ok) {
      // Atomic failure path: touch nothing except loading/error. Custom
      // input is deliberately preserved so the player can retry.
      setLoading(false);
      setError(result.message);
      return;
    }

    // Atomic success path: every field below is already fully validated.
    const p = result.payload;
    setYear(p.y);
    setClock(p.ck);
    setBlocs(p.bl);
    setTacticalOpts(p.to);
    setPhilOpts(p.po);
    setSelTactical(0);
    setSelPhil(0);
    setCustomTactical("");
    setCustomPhil("");
    setLog((prev) => [
      ...prev,
      { year: p.y, headline: p.h, narrative: p.n, note: p.nt, flag: p.fl, decision: tacticalText, doctrine: doctrineText },
    ]);
    setLoading(false);
  }

  function submitDirectives() {
    if (controllerRef.current.isInFlight) return;
    const tacticalText = customTactical.trim() || tacticalOpts[selTactical]?.x || "";
    const doctrineText = customPhil.trim() || philOpts[selPhil]?.x || "";
    resolveTurn(tacticalText, doctrineText);
  }
  function retry() {
    if (lastDirectives) resolveTurn(lastDirectives.tacticalText, lastDirectives.doctrineText);
  }
  function resetGame() {
    controllerRef.current.abortAndReset();
    setYear(STARTING_YEAR); setBlocs(STARTER_BLOCS); setClock(STARTING_CLOCK); setLog([INTRO_ENTRY]);
    setTacticalOpts(DEFAULT_TACTICAL); setPhilOpts(DEFAULT_PHIL);
    setSelTactical(0); setSelPhil(0); setCustomTactical(""); setCustomPhil("");
    setStarted(false); setError(null); setManualToggle({}); setLastDirectives(null);
    setLoading(false); setOnboardStep(1);
  }

  // "Your alliance" is whichever bloc currently holds the US nuclear code —
  // hardcoded for now (see gameLogic.js findPlayerBloc for why this is
  // already built to generalize to "play as any nuclear power" later).
  const playerEntry = findPlayerBloc(blocs, "US");
  const playerName = playerEntry ? playerEntry[0] : null;
  const otherBlocEntries = Object.entries(blocs).filter(([name]) => name !== playerName);

  // Single source of truth for "what year does the next directive resolve
  // for" — mirrors the same first-turn exception used inside resolveTurn,
  // so the Begin Campaign button, the directive headers, and the loading
  // indicator can never drift out of sync with each other again.
  const nextActionYear = log.length === 1 ? year : year + 1;

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col bg-[#0a0e12] text-[#e8edf2]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .scanline { position: relative; overflow: hidden; }
        .scanline::after { content: ""; position: absolute; inset: 0; pointer-events: none;
          background: repeating-linear-gradient(0deg, rgba(94,225,255,0.02) 0px, rgba(94,225,255,0.02) 1px, transparent 1px, transparent 3px); }
        .blink { animation: blink 1.2s steps(2) infinite; } @keyframes blink { 50% { opacity: 0; } }
        .fadein { animation: fadein 500ms ease both; } @keyframes fadein { from { opacity: 0; transform: translateY(4px);} to { opacity:1; transform: translateY(0);} }
      `}</style>

      <div className="border-b border-[#1c2530] px-4 md:px-8 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Radio size={18} className="text-[#5ee1ff]" />
          <div>
            <div className="mono text-[11px] tracking-[0.25em] text-[#6b7785]">SIMULATION CORE</div>
            <div className="mono text-sm md:text-base font-bold tracking-wide">PROJECT CONCORDAT</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="mono text-[11px] tracking-[0.2em] text-[#6b7785]">YEAR</div>
            <div className="mono text-lg font-bold text-[#5ee1ff]">{year}</div>
          </div>
          <button onClick={resetGame} className="mono text-[11px] text-[#6b7785] hover:text-[#e8edf2] border border-[#1c2530] rounded px-2 py-1.5 flex items-center gap-1 transition">
            <RotateCcw size={12} /> RESET
          </button>
        </div>
      </div>

      {onboardStep === 1 && <IntroCharacter onContinue={() => setOnboardStep(2)} />}
      {onboardStep === 2 && <IntroDashboardGuide onContinue={() => setOnboardStep(3)} />}

      {onboardStep >= 2 && (
      <>
      {/* Alliance Dashboard — full-width bar, height matches the left
          sidebar's width (320px). Houses the Doomsday Clock and the
          player's own alliance card, with genuine reserved space for
          future modules (not a placeholder box — just real empty width). */}
      <div className="border-b border-[#1c2530] px-4 md:px-8 py-4 shrink-0 overflow-x-auto" style={{ height: 320 }}>
        <div className="mono text-[10px] tracking-[0.2em] text-[#6b7785] mb-3">ALLIANCE DASHBOARD</div>
        <div className="flex items-start gap-4 h-[260px]">
          <div className="flex flex-col items-center justify-center border border-[#1c2530] rounded-lg py-3 px-4 bg-[#10151c] scanline shrink-0 h-full">
            <div className="mono text-[10px] tracking-[0.2em] text-[#6b7785] mb-1">DOOMSDAY CLOCK</div>
            <DoomsdayGauge minutes={clock} />
          </div>
          {playerEntry && (
            <div className="shrink-0 w-[300px] h-full overflow-y-auto">
              <BlocCard name={playerName} s={playerEntry[1]} />
            </div>
          )}
          <div className="flex-1 min-w-[40px]" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-0 flex-1 min-h-0">
        <div className="border-r border-[#1c2530] px-4 py-5 space-y-5 overflow-y-auto">
          <div>
            <div className="mono text-[10px] tracking-[0.2em] text-[#6b7785] mb-2">GLOBAL DASHBOARD</div>
            <div className="space-y-3">
              {otherBlocEntries.map(([name, s]) => <BlocCard key={name} name={name} s={s} />)}
            </div>
          </div>
        </div>

        <div className="flex flex-row h-full overflow-hidden">
          <div ref={scrollRef} className="flex-1 min-w-0 overflow-y-auto px-4 md:px-8 py-6 space-y-4 border-r border-[#1c2530]">
            {log.map((entry, i) => {
              const expanded = isExpanded(i);
              return (
                <div key={i} className="fadein max-w-3xl">
                  {!expanded ? (
                    <button onClick={() => toggle(i)} className="w-full flex items-center gap-2 text-left border border-[#1c2530] rounded px-3 py-2 hover:border-[#5ee1ff] transition">
                      <ChevronRight size={13} className="text-[#5ee1ff] shrink-0" />
                      <span className="mono text-[10px] text-[#5ee1ff]">{entry.year}</span>
                      <span className="text-[12px] text-[#9aa5b1] truncate">{entry.headline}</span>
                    </button>
                  ) : (
                    <div>
                      <button onClick={() => log.length > 1 && toggle(i)} className="flex items-center gap-2 mb-1">
                        {log.length > 1 && <ChevronDown size={13} className="text-[#5ee1ff]" />}
                        <span className="mono text-[10px] tracking-[0.2em] text-[#5ee1ff]">{entry.year}</span>
                      </button>
                      {entry.decision && (
                        <div className="mono text-[11px] text-[#6b7785] mb-1 border-l-2 border-[#2a3644] pl-3">TACTICAL → {entry.decision}</div>
                      )}
                      {entry.doctrine && (
                        <div className="mono text-[11px] text-[#6b7785] mb-2 border-l-2 border-[#2a3644] pl-3">DOCTRINE → {entry.doctrine}</div>
                      )}
                      <div className="text-lg font-semibold mb-2 text-[#e8edf2]">{entry.headline}</div>
                      <p className="text-[14px] leading-relaxed text-[#c4ccd4] whitespace-pre-line">{entry.narrative}</p>
                      {entry.note && (
                        <p className="mono text-[11px] text-[#6b7785] mt-3 border-l-2 border-[#2a3644] pl-3">HISTORICAL PRECEDENT — {entry.note}</p>
                      )}
                      {entry.flag && (
                        <div className="mt-3 flex items-start gap-2 border border-[#3a2a1c] bg-[#1c150e] rounded px-3 py-2">
                          <AlertTriangle size={14} className="text-[#ffb020] mt-0.5 shrink-0" />
                          <p className="mono text-[11px] text-[#ffb020]">{entry.flag}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {!started && (
              <button onClick={() => setStarted(true)} className="mono text-xs tracking-wider border border-[#5ee1ff] text-[#5ee1ff] rounded px-4 py-2 hover:bg-[#5ee1ff] hover:text-[#0a0e12] transition">
                ▶ BEGIN CAMPAIGN — {nextActionYear}
              </button>
            )}
            {loading && (
              <div className="mono text-xs text-[#5ee1ff] flex items-center gap-2"><span className="blink">▍</span> RESOLVING YEAR {nextActionYear}…</div>
            )}
            {error && (
              <div className="max-w-2xl border border-[#3a1c1c] bg-[#1c0e0e] rounded px-3 py-2 space-y-2">
                <p className="mono text-xs text-[#ff6b6b]">{error}</p>
                <button onClick={retry} className="mono text-[11px] flex items-center gap-1 text-[#ffb020] border border-[#3a2a1c] rounded px-2 py-1 hover:bg-[#2a1c0e] transition">
                  <RefreshCw size={11} /> RETRY SAME DIRECTIVES
                </button>
              </div>
            )}
          </div>

          {started && !loading && (
            <div className="w-[380px] shrink-0 overflow-y-auto px-4 py-4 space-y-4 bg-[#0d1218]">
              <div>
                <div className="mono text-[10px] tracking-[0.2em] text-[#5ee1ff] mb-2">TACTICAL DIRECTIVE — {nextActionYear}</div>
                <div className="flex flex-col gap-1.5">
                  {tacticalOpts.map((opt, i) => (
                    <button key={i} onClick={() => { setSelTactical(i); setCustomTactical(""); }}
                      className={`text-left rounded px-3 py-2 border transition ${selTactical === i && !customTactical ? "border-[#5ee1ff] bg-[#10151c]" : "border-[#1c2530] hover:border-[#3a4654]"}`}>
                      <div className="text-[13px]">{opt.x}</div>
                      <div className="mono text-[10px] text-[#6b7785] mt-0.5">{opt.y}</div>
                    </button>
                  ))}
                </div>
                <input value={customTactical} onChange={(e) => setCustomTactical(e.target.value)} maxLength={240}
                  placeholder="Or type your own tactical directive…"
                  className="mt-2 w-full mono text-[13px] bg-[#10151c] border border-[#1c2530] rounded px-3 py-2 text-[#e8edf2] placeholder-[#4a5561] focus:outline-none focus:border-[#5ee1ff]" />
              </div>

              <div>
                <div className="mono text-[10px] tracking-[0.2em] text-[#ffb020] mb-2">STRATEGIC DOCTRINE — {nextActionYear}</div>
                <div className="flex flex-col gap-1.5">
                  {philOpts.map((opt, i) => (
                    <button key={i} onClick={() => { setSelPhil(i); setCustomPhil(""); }}
                      className={`text-left rounded px-3 py-2 border transition ${selPhil === i && !customPhil ? "border-[#ffb020] bg-[#10151c]" : "border-[#1c2530] hover:border-[#3a4654]"}`}>
                      <div className="text-[13px]">{opt.x}</div>
                      <div className="mono text-[10px] text-[#6b7785] mt-0.5">{opt.y}</div>
                    </button>
                  ))}
                </div>
                <input value={customPhil} onChange={(e) => setCustomPhil(e.target.value)} maxLength={240}
                  placeholder="Or type your own doctrine…"
                  className="mt-2 w-full mono text-[13px] bg-[#10151c] border border-[#1c2530] rounded px-3 py-2 text-[#e8edf2] placeholder-[#4a5561] focus:outline-none focus:border-[#ffb020]" />
              </div>

              <button onClick={submitDirectives}
                className="w-full mono text-xs tracking-wider border border-[#5ee1ff] text-[#5ee1ff] rounded px-4 py-2.5 hover:bg-[#5ee1ff] hover:text-[#0a0e12] transition flex items-center justify-center gap-2">
                <Send size={13} /> ISSUE DIRECTIVES
              </button>
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
