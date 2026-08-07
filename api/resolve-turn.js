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

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: { message: "Method not allowed" } }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
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

  const { system, userPrompt, model = "claude-sonnet-5", maxTokens = 1000 } = body || {};
  if (!system || !userPrompt) {
    return new Response(JSON.stringify({ error: { message: "Missing system or userPrompt" } }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let upstream;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: { message: `Upstream request failed: ${e.message}` } }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Pass the Anthropic response straight through — status code and body —
  // so the existing client-side error handling (HttpError/ApiError/
  // EmptyContentError) keeps working unchanged.
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
