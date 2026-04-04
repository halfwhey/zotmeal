import { describe, it, expect, beforeEach, mock } from "bun:test";
import { HttpClient } from "../src/api/http.js";
import {
  AuthenticationError,
  NotFoundError,
  VersionConflictError,
  ZoteroError,
} from "../src/api/types/errors.js";

// Mock fetch
const mockFetch = mock<typeof fetch>();
globalThis.fetch = mockFetch as unknown as typeof fetch;

function makeResponse(status: number, body: unknown = {}, headers: Record<string, string> = {}): Response {
  return new Response(
    status === 204 ? null : JSON.stringify(body),
    {
      status,
      statusText: status === 200 ? "OK" : "Error",
      headers: new Headers({
        "Content-Type": "application/json",
        "Last-Modified-Version": "42",
        ...headers,
      }),
    },
  );
}

describe("HttpClient", () => {
  let http: HttpClient;

  beforeEach(() => {
    mockFetch.mockReset();
    http = new HttpClient({ apiKey: "test-key" });
  });

  it("sets auth and version headers", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { ok: true }));
    await http.get("/test");

    const call = mockFetch.mock.calls[0]!;
    const headers = call[1]?.headers as Record<string, string>;
    expect(headers["Zotero-API-Key"]).toBe("test-key");
    expect(headers["Zotero-API-Version"]).toBe("3");
  });

  it("returns data and version from response", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { title: "Test" }));
    const result = await http.get<{ title: string }>("/test");

    expect(result.data).toEqual({ title: "Test" });
    expect(result.version).toBe(42);
  });

  it("throws AuthenticationError on 403", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(403));
    expect(http.get("/test")).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("throws NotFoundError on 404", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(404));
    expect(http.get("/test")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws VersionConflictError on 412", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(412));
    expect(http.get("/test")).rejects.toBeInstanceOf(VersionConflictError);
  });

  it("retries on 429 with Retry-After header", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(429, {}, { "Retry-After": "0" }),
    );
    mockFetch.mockResolvedValueOnce(makeResponse(200, { ok: true }));

    const result = await http.get<{ ok: boolean }>("/test");
    expect(result.data).toEqual({ ok: true });
    expect(mockFetch.mock.calls.length).toBe(2);
  });

  it("throws ZoteroError on other HTTP errors", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(500));
    expect(http.get("/test")).rejects.toBeInstanceOf(ZoteroError);
  });

  it("handles 204 No Content", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(204));
    const result = await http.delete("/test/ABC", 1);
    expect(result.data).toBeUndefined();
  });

  it("sends If-Unmodified-Since-Version on patch", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(204));
    await http.patch("/test/ABC", { title: "New" }, 5);

    const call = mockFetch.mock.calls[0]!;
    const headers = call[1]?.headers as Record<string, string>;
    expect(headers["If-Unmodified-Since-Version"]).toBe("5");
  });
});
