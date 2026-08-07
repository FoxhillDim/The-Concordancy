import { describe, it, expect, vi } from "vitest";
import { callModel, HttpError, ApiError, EmptyContentError } from "./apiClient.js";

function mockFetch({ status = 200, jsonBody = null, textBody = null }) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (jsonBody !== null ? JSON.stringify(jsonBody) : (textBody ?? "")),
  });
}

describe("callModel — hardened HTTP path", () => {
  it("HTTP 200 with a valid response returns the model text", async () => {
    const fetchImpl = mockFetch({
      status: 200,
      jsonBody: { content: [{ type: "text", text: "Hello from the simulation core." }] },
    });
    const text = await callModel({ system: "sys", userPrompt: "hi", fetchImpl });
    expect(text).toBe("Hello from the simulation core.");
  });

  it("HTTP 400 with a JSON error body throws ApiError with the message", async () => {
    const fetchImpl = mockFetch({
      status: 400,
      jsonBody: { error: { type: "invalid_request_error", message: "bad request shape" } },
    });
    await expect(callModel({ system: "sys", userPrompt: "hi", fetchImpl })).rejects.toThrow(ApiError);
  });

  it("HTTP 500 with a JSON error body throws ApiError", async () => {
    const fetchImpl = mockFetch({
      status: 500,
      jsonBody: { error: { type: "api_error", message: "internal server error" } },
    });
    await expect(callModel({ system: "sys", userPrompt: "hi", fetchImpl })).rejects.toThrow(ApiError);
  });

  it("HTTP 500 with a plain-text/malformed body throws HttpError, not an unhandled parse crash", async () => {
    const fetchImpl = mockFetch({ status: 500, textBody: "<html>Bad Gateway</html>" });
    await expect(callModel({ system: "sys", userPrompt: "hi", fetchImpl })).rejects.toThrow(HttpError);
  });

  it("HTTP 200 with missing content throws EmptyContentError", async () => {
    const fetchImpl = mockFetch({ status: 200, jsonBody: { id: "msg_1" /* no content field */ } });
    await expect(callModel({ system: "sys", userPrompt: "hi", fetchImpl })).rejects.toThrow(EmptyContentError);
  });

  it("HTTP 200 with empty text content throws EmptyContentError", async () => {
    const fetchImpl = mockFetch({ status: 200, jsonBody: { content: [{ type: "text", text: "" }] } });
    await expect(callModel({ system: "sys", userPrompt: "hi", fetchImpl })).rejects.toThrow(EmptyContentError);
  });

  it("does not throw an unhandled exception if response.json()-equivalent body is garbage on a 200", async () => {
    const fetchImpl = mockFetch({ status: 200, textBody: "not json at all" });
    await expect(callModel({ system: "sys", userPrompt: "hi", fetchImpl })).rejects.toThrow(EmptyContentError);
  });
});
