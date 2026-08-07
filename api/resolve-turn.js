// Vercel Function (Node.js runtime, Web Standard handler). Any file placed
// in /api automatically becomes a serverless endpoint at /api/<filename>.
//
// This holds ANTHROPIC_API_KEY as a server-side environment variable —
// it is never sent to, or visible from, the browser. The client only ever
// talks to this same-origin endpoint.
//
// maxDuration: the default function timeout is too short for a full
// structured-JSON turn generation, especially on a cold start. This
// requests the maximum Vercel allows on the current plan — if the plan
// caps lower than 60s, Vercel silently applies its own ceiling rather
// than failing the deployment.
export const maxDuration = 60;

export async function POST(request) {
  const t0 = Date.now();
  console.log("[resolve-turn] invocation start");

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: { message: "Method not allowed" } }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[resolve-turn] ANTHROPIC_API_KEY is not set");
    return new Response(
      JSON.stringify({ error: { message: "Server misconfigured: ANTHROPIC_API_KEY is not set" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: { message: "Invalid JSON request body" } }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { system, userPrompt, model = "claude-sonnet-5", maxTokens = 8000 } = body || {};
  if (!system || !userPrompt) {
    return new Response(JSON.stringify({ error: { message: "Missing system or userPrompt" } }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log(
    `[resolve-turn] body parsed at +${Date.now() - t0}ms — model=${model} systemLen=${system.length} promptLen=${userPrompt.length}`
  );

  // Internal fail-fast timeout: this used to be much tighter (25s) purely
  // as a debugging aid while hunting an earlier bug. Now that requests
  // complete normally, a short internal ceiling does more harm than good —
  // it kills legitimately slower (but fine) turns before Vercel's own real
  // 60s limit would. Set it just under maxDuration instead.
  const upstreamController = new AbortController();
  const upstreamTimeout = setTimeout(() => upstreamController.abort(), 55000);

  let upstream;
  try {
    console.log(`[resolve-turn] calling Anthropic at +${Date.now() - t0}ms`);
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal: upstreamController.signal,
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: userPrompt }],
        // Sonnet 5 runs adaptive thinking ON BY DEFAULT (a behavior change
        // from Sonnet 4.6, where thinking was opt-in). Left uncontrolled,
        // it will reason very deeply — and expensively, and slowly — on
        // genuinely novel/hard turns (e.g. an unprecedented player action).
        // "medium" caps that runaway case while preserving good reasoning
        // quality on normal turns. Tune to "low" for cheaper/faster at the
        // cost of some nuance, or "high"/"max" for the opposite trade-off.
        output_config: { effort: "medium" },
      }),
    });
    console.log(`[resolve-turn] Anthropic responded status=${upstream.status} at +${Date.now() - t0}ms`);
  } catch (e) {
    clearTimeout(upstreamTimeout);
    const isTimeout = e.name === "AbortError";
    console.error(
      `[resolve-turn] upstream call failed at +${Date.now() - t0}ms: ${isTimeout ? "internal 55s timeout fired" : e.message}`
    );
    return new Response(
      JSON.stringify({
        error: {
          message: isTimeout
            ? "Anthropic took longer than 55s to respond — this can happen on complex turns. Hit Retry."
            : `Upstream request failed: ${e.message}`,
        },
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
  clearTimeout(upstreamTimeout);

  // Pass the Anthropic response straight through — status code and body —
  // so the existing client-side error handling (HttpError/ApiError/
  // EmptyContentError) keeps working unchanged.
  const text = await upstream.text();
  console.log(`[resolve-turn] read upstream body (${text.length} chars) at +${Date.now() - t0}ms — returning`);
  return new Response(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
