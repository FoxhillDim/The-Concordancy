import { callModel } from "./apiClient.js";
import { parseModelJson, validateTurnPayload } from "./gameLogic.js";

// Runs one full turn: fetch -> parse -> validate. NEVER throws — always
// resolves to either { ok: true, payload } or { ok: false, message }.
// The caller (React component) may only call state setters when ok===true,
// which structurally prevents partial/best-effort state mutation.
export async function runTurn({ system, userPrompt, expectedYear, signal, fetchImpl }) {
  let rawText = "";
  try {
    rawText = await callModel({ system, userPrompt, signal, fetchImpl });
    const parsed = parseModelJson(rawText);
    const validated = validateTurnPayload(parsed, expectedYear);
    return { ok: true, payload: validated };
  } catch (e) {
    if (e && e.name === "AbortError") {
      return { ok: false, aborted: true, message: "Request aborted." };
    }
    // Console detail for beta debugging; never surface raw stack to the player.
    console.error("Turn resolution failed:", e, "\nRaw response:", rawText);
    return { ok: false, aborted: false, message: friendlyMessage(e) };
  }
}

function friendlyMessage(e) {
  const name = e && e.name;
  if (name === "ParseError") {
    return `Simulation core failed to resolve this turn (${e.message}). Usually a truncated/malformed response — hit Retry to re-roll the same directives.`;
  }
  if (name === "ValidationError") {
    return `Simulation core returned an invalid turn (${e.errors ? e.errors.length : ""} field${e.errors && e.errors.length === 1 ? "" : "s"} failed validation). Hit Retry to re-roll.`;
  }
  if (name === "HttpError" || name === "ApiError" || name === "EmptyContentError") {
    return `Simulation core connection failed (${e.message}). Hit Retry to try again.`;
  }
  return `Simulation core failed to resolve this turn (${e && e.message ? e.message : "unknown error"}). Hit Retry to try again.`;
}
