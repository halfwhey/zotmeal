import { describe, it, expect, mock, beforeEach } from "bun:test";
import { HttpClient } from "../src/api/http.js";
import { FullTextEndpoint } from "../src/api/endpoints/fulltext.js";

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

function make204Response(): Response {
  return new Response(null, {
    status: 204,
    headers: new Headers({ "Last-Modified-Version": "11" }),
  });
}

describe("FullTextEndpoint", () => {
  let http: HttpClient;
  let fulltext: FullTextEndpoint;

  beforeEach(() => {
    mockFetch.mockReset();
    http = new HttpClient({ apiKey: "key" });
    fulltext = new FullTextEndpoint(http, "/users/12345");
  });

  it("get() calls correct URL", async () => {
    const content = {
      content: "Full text of the document",
      indexedPages: 10,
      totalPages: 10,
    };
    mockFetch.mockResolvedValueOnce(makeResponse(content));

    const result = await fulltext.get("ITEM1");
    expect(result.content).toBe("Full text of the document");

    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain("/users/12345/items/ITEM1/fulltext");
  });

  it("set() PUTs with version header", async () => {
    mockFetch.mockResolvedValueOnce(make204Response());

    await fulltext.set(
      "ITEM1",
      { content: "Updated text", indexedPages: 5, totalPages: 5 },
      10,
    );

    const call = mockFetch.mock.calls[0]!;
    expect(call[1]?.method).toBe("PUT");

    const url = call[0] as string;
    expect(url).toContain("/users/12345/items/ITEM1/fulltext");

    const headers = call[1]?.headers as Record<string, string>;
    expect(headers["If-Unmodified-Since-Version"]).toBe("10");
  });

  it("listVersions() calls correct URL with since param", async () => {
    const versions = { ITEM1: 5, ITEM2: 8 };
    mockFetch.mockResolvedValueOnce(makeResponse(versions));

    const result = await fulltext.listVersions(3);
    expect(result).toEqual({ ITEM1: 5, ITEM2: 8 });

    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain("/users/12345/fulltext");
    expect(url).toContain("since=3");
  });

  it("listVersions() calls without since param when omitted", async () => {
    const versions = { ITEM1: 5 };
    mockFetch.mockResolvedValueOnce(makeResponse(versions));

    await fulltext.listVersions();

    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain("/users/12345/fulltext");
    expect(url).not.toContain("since=");
  });
});
