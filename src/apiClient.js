// ---------------------------------------------------------------------------
// PROJECT CONCORDAT — hardened Anthropic fetch wrapper (Prompt 8).
//
// This does NOT change the API architecture, add auth, or move the call
// server-side. It only makes the existing client-side fetch fail safely
// instead of assuming every response is a well-formed success.
// ---------------------------------------------------------------------------

export class HttpError extends Error {
  constructor(status, detail) {
    super(`HTTP ${status}: ${detail}`);
    this.name = "HttpError";
    this.status = status;
  }
}
export class ApiError extends Error {
  constructor(message) {
    super(`Anthropic API error: ${message}`);
    this.name = "ApiError";
  }
}
export class EmptyContentError extends Error {
  constructor(detail) {
    super(`Model response had no usable text content: ${detail}`);
    this.name = "EmptyContentError";
  }
}

// Safely reads a response body as JSON. Never lets a malformed/non-JSON
// body throw an unhandled parse error — returns { ok:false, raw } instead.
async function safeReadJson(response) {
  const raw = await response.text();
  try {
    return { ok: true, data: JSON.parse(raw) };
  } catch {
    return { ok: false, raw };
  }
}

// Calls OUR OWN serverless proxy (/api/resolve-turn), which holds the real
// Anthropic API key server-side and forwards the request. The browser never
// sees the key. Returns the raw model text. Throws HttpError / ApiError /
// EmptyContentError on any failure — callers should catch these and route
// to the existing simulation error UI without exposing the raw error/stack.
//
// timeoutMs: this fetch previously had NO client-side ceiling at all — if
// the network dropped mid-request, the promise could hang forever with no
// error and no way to recover except a manual page refresh. This wraps the
// external `signal` (used for user-initiated Reset) together with our own
// internal timer, and — critically — distinguishes the two: a user Reset
// stays silent (existing behavior via AbortError), but our OWN timeout
// firing is re-thrown as a visible HttpError instead of a silent abort, so
// a real network hang produces a clear message rather than nothing at all.
export async function callModel({ system, userPrompt, signal, model = "claude-sonnet-5", maxTokens = 8000, fetchImpl = fetch, endpoint = "/api/resolve-turn", timeoutMs = 90000 }) {
  const internalController = new AbortController();
  let timedOut = false;
  const forwardExternalAbort = () => internalController.abort();
  if (signal) {
    if (signal.aborted) internalController.abort();
    else signal.addEventListener("abort", forwardExternalAbort);
  }
  const timeoutId = setTimeout(() => {
    timedOut = true;
    internalController.abort();
  }, timeoutMs);

  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: internalController.signal,
      body: JSON.stringify({ system, userPrompt, model, maxTokens }),
    });
  } catch (e) {
    if (e && e.name === "AbortError" && timedOut) {
      throw new HttpError(0, `No response after ${Math.round(timeoutMs / 1000)}s — check your connection and try again`);
    }
    throw e; // genuine user-initiated Reset abort, or another network error
  } finally {
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener("abort", forwardExternalAbort);
  }

  const parsed = await safeReadJson(response);

  if (!response.ok) {
    if (parsed.ok && parsed.data && parsed.data.error && parsed.data.error.message) {
      throw new ApiError(parsed.data.error.message);
    }
    const detail = parsed.ok ? JSON.stringify(parsed.data).slice(0, 200) : String(parsed.raw).slice(0, 200);
    throw new HttpError(response.status, detail);
  }

  if (!parsed.ok) {
    throw new EmptyContentError("response body was not valid JSON");
  }
  const data = parsed.data;

  if (data && data.error && data.error.message) {
    // Some error shapes return 200 with an error envelope — defend anyway.
    throw new ApiError(data.error.message);
  }

  if (!data || !Array.isArray(data.content) || data.content.length === 0) {
    throw new EmptyContentError("no content blocks in response");
  }

  const text = data.content.map((b) => (b && typeof b.text === "string" ? b.text : "")).join("").trim();
  if (text.length === 0) {
    throw new EmptyContentError("all content blocks were empty");
  }

  return text;
}

  return text;
}
