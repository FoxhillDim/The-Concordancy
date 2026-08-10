import React, { useState, useRef, useEffect } from "react";
import { Radio, ChevronRight, ChevronDown, RotateCcw, AlertTriangle, Send, RefreshCw } from "lucide-react";
import {
  NUCLEAR_POWERS, METRIC_ORDER, METRIC_META,
  STARTER_BLOCS, DEFAULT_TACTICAL, DEFAULT_PHIL, INTRO_ENTRY,
  STARTING_YEAR, STARTING_MONTH, STARTING_CLOCK, MAX_CLOCK,
  CLOCK_OUTER_COLOR, CLOCK_INNER_COLOR, CLOCK_TRACK_COLOR,
  valueColor, clockRingFractions, trendSymbol,
  buildHistoryDigest, findPlayerBloc,
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
US, UK, FR (Concordat West) — RU (Orthodox Commonwealth) — CN, IN (Dharmic-Confucian
Sphere, rivals-of-convenience, real Galwan border tension) — PK (Ummah Pact, Sunni) —
IL (Israel, independent wildcard) — KP (North Korea, erratic China client).
Iran is a tenth major actor but NOT yet nuclear at game start — may develop/detonate
if the narrative earns it.

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
4. Nuclear doctrine is sticky: cornered/threatened nuclear states get MORE
