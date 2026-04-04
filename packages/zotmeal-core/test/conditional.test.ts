import { describe, it, expect, mock, beforeEach } from "bun:test";
import { HttpClient } from "../src/api/http.js";

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

describe("HttpClient.getIfModified", () => {
  let http: HttpClient;

  beforeEach(() => {
    mockFetch.mockReset();
    http = new HttpClient({ apiKey: "key" });
  });

  it("returns null on 304 Not Modified", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(null, {
        status: 304,
        headers: new Headers({}),
      }),
    );

    const result = await http.getIfModified("/users/12345/items", 5);
    expect(result).toBeNull();
  });

  it("returns data normally when modified", async () => {
    const items = [{ key: "A", data: { itemType: "book" } }];
    mockFetch.mockResolvedValueOnce(makeResponse(items));

    const result = await http.getIfModified<unknown[]>("/users/12345/items", 5);
    expect(result).not.toBeNull();
    expect(result!.data).toEqual(items);
    expect(result!.version).toBe(10);
  });

  it("sets If-Modified-Since-Version header correctly", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(null, {
        status: 304,
        headers: new Headers({}),
      }),
    );

    await http.getIfModified("/users/12345/items", 42);

    const call = mockFetch.mock.calls[0]!;
    const headers = call[1]?.headers as Record<string, string>;
    expect(headers["If-Modified-Since-Version"]).toBe("42");
  });
});
