import { describe, it, expect, mock, beforeEach } from "bun:test";
import { HttpClient } from "../src/api/http.js";
import { DeletedEndpoint } from "../src/api/endpoints/deleted.js";

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

describe("DeletedEndpoint", () => {
  let http: HttpClient;
  let deleted: DeletedEndpoint;

  beforeEach(() => {
    mockFetch.mockReset();
    http = new HttpClient({ apiKey: "key" });
    deleted = new DeletedEndpoint(http, "/users/12345");
  });

  it("list() calls correct URL with since param", async () => {
    const deletedContent = {
      collections: ["COL1"],
      searches: ["SRCH1"],
      items: ["ITEM1", "ITEM2"],
      tags: ["old-tag"],
      settings: [],
    };
    mockFetch.mockResolvedValueOnce(makeResponse(deletedContent));

    const result = await deleted.list(5);
    expect(result.items).toEqual(["ITEM1", "ITEM2"]);
    expect(result.collections).toEqual(["COL1"]);

    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain("/users/12345/deleted");
    expect(url).toContain("since=5");
  });
});
