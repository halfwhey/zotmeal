import { describe, it, expect, mock, beforeEach } from "bun:test";
import { HttpClient } from "../src/api/http.js";
import { TagsEndpoint } from "../src/api/endpoints/tags.js";
import { collectAll } from "../src/api/pagination.js";

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

describe("TagsEndpoint", () => {
  let http: HttpClient;
  let tags: TagsEndpoint;

  beforeEach(() => {
    mockFetch.mockReset();
    http = new HttpClient({ apiKey: "key" });
    tags = new TagsEndpoint(http, "/users/12345");
  });

  it("list() returns paginated results", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(
        [
          { tag: "philosophy", meta: { numItems: 5, type: 0 } },
          { tag: "science", meta: { numItems: 3, type: 0 } },
        ],
        { "Total-Results": "2" },
      ),
    );

    const { items: results } = await collectAll(tags.list());
    expect(results.length).toBe(2);

    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain("/users/12345/tags");
  });

  it("delete() sends tag as query param", async () => {
    mockFetch.mockResolvedValueOnce(make204Response());

    await tags.delete("my tag", 10);

    const call = mockFetch.mock.calls[0]!;
    expect(call[1]?.method).toBe("DELETE");

    const url = call[0] as string;
    expect(url).toContain("/users/12345/tags");
    expect(url).toContain("tag=my+tag");

    const headers = call[1]?.headers as Record<string, string>;
    expect(headers["If-Unmodified-Since-Version"]).toBe("10");
  });
});
