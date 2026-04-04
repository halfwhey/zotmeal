import { describe, it, expect, mock, beforeEach } from "bun:test";
import { HttpClient } from "../src/api/http.js";
import { paginate, collectAll } from "../src/api/pagination.js";

const mockFetch = mock<typeof fetch>();
globalThis.fetch = mockFetch as unknown as typeof fetch;

function makePageResponse(
  items: unknown[],
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(items), {
    status: 200,
    headers: new Headers({
      "Content-Type": "application/json",
      "Last-Modified-Version": "1",
      "Total-Results": "5",
      ...headers,
    }),
  });
}

describe("paginate", () => {
  let http: HttpClient;

  beforeEach(() => {
    mockFetch.mockReset();
    http = new HttpClient({ apiKey: "test-key" });
  });

  it("yields items from a single page", async () => {
    mockFetch.mockResolvedValueOnce(
      makePageResponse([{ id: 1 }, { id: 2 }]),
    );

    const results: unknown[] = [];
    for await (const item of paginate(http, "/items")) {
      results.push(item);
    }

    expect(results).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("follows Link header for pagination", async () => {
    mockFetch.mockResolvedValueOnce(
      makePageResponse([{ id: 1 }], {
        Link: '<https://api.zotero.org/items?start=1>; rel="next", <https://api.zotero.org/items?start=2>; rel="last"',
      }),
    );
    mockFetch.mockResolvedValueOnce(makePageResponse([{ id: 2 }]));

    const results: unknown[] = [];
    for await (const item of paginate(http, "/items")) {
      results.push(item);
    }

    expect(results).toEqual([{ id: 1 }, { id: 2 }]);
    expect(mockFetch.mock.calls.length).toBe(2);
  });

  it("handles empty results", async () => {
    mockFetch.mockResolvedValueOnce(
      makePageResponse([], { "Total-Results": "0" }),
    );

    const results: unknown[] = [];
    for await (const item of paginate(http, "/items")) {
      results.push(item);
    }

    expect(results).toEqual([]);
  });
});

describe("collectAll", () => {
  let http: HttpClient;

  beforeEach(() => {
    mockFetch.mockReset();
    http = new HttpClient({ apiKey: "test-key" });
  });

  it("collects all items into an array", async () => {
    mockFetch.mockResolvedValueOnce(
      makePageResponse([{ id: 1 }, { id: 2 }]),
    );

    const { items, totalResults } = await collectAll(
      paginate(http, "/items"),
    );

    expect(items).toEqual([{ id: 1 }, { id: 2 }]);
    expect(totalResults).toBe(5);
  });
});
