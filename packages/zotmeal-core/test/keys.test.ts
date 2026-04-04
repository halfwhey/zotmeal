import { describe, it, expect, mock, beforeEach } from "bun:test";
import { HttpClient } from "../src/api/http.js";
import { KeysEndpoint } from "../src/api/endpoints/keys.js";

const mockFetch = mock<typeof fetch>();
globalThis.fetch = mockFetch as unknown as typeof fetch;

function makeResponse(
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: new Headers({
      "Content-Type": "application/json",
      "Last-Modified-Version": "10",
      ...headers,
    }),
  });
}

describe("KeysEndpoint", () => {
  let http: HttpClient;
  let keys: KeysEndpoint;

  beforeEach(() => {
    mockFetch.mockReset();
    http = new HttpClient({ apiKey: "key" });
    keys = new KeysEndpoint(http);
  });

  it("getCurrent() calls /keys/current", async () => {
    const permissions = {
      key: "abc123",
      userID: 12345,
      username: "testuser",
      access: {
        user: { library: true, files: true, notes: true, write: true },
      },
    };
    mockFetch.mockResolvedValueOnce(makeResponse(permissions));

    const result = await keys.getCurrent();
    expect(result.key).toBe("abc123");
    expect(result.userID).toBe(12345);

    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain("/keys/current");
  });

  it("get() calls /keys/{key}", async () => {
    const permissions = {
      key: "xyz789",
      userID: 67890,
      username: "otheruser",
      access: {
        user: { library: true, files: false, notes: true, write: false },
      },
    };
    mockFetch.mockResolvedValueOnce(makeResponse(permissions));

    const result = await keys.get("xyz789");
    expect(result.key).toBe("xyz789");

    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain("/keys/xyz789");
  });
});
