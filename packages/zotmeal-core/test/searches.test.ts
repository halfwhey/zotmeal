import { describe, it, expect, mock, beforeEach } from "bun:test";
import { HttpClient } from "../src/api/http.js";
import { SearchesEndpoint } from "../src/api/endpoints/searches.js";
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

describe("SearchesEndpoint", () => {
  let http: HttpClient;
  let searches: SearchesEndpoint;

  beforeEach(() => {
    mockFetch.mockReset();
    http = new HttpClient({ apiKey: "key" });
    searches = new SearchesEndpoint(http, "/users/12345");
  });

  it("get() calls correct URL", async () => {
    const searchData = {
      key: "SRCH1",
      version: 10,
      data: {
        key: "SRCH1",
        name: "My Search",
        conditions: [],
      },
    };
    mockFetch.mockResolvedValueOnce(makeResponse(searchData));

    const result = await searches.get("SRCH1");
    expect(result.key).toBe("SRCH1");

    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain("/users/12345/searches/SRCH1");
  });

  it("list() returns paginated results", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(
        [
          { key: "SRCH1", data: { name: "Search A" } },
          { key: "SRCH2", data: { name: "Search B" } },
        ],
        { "Total-Results": "2" },
      ),
    );

    const { items: results } = await collectAll(searches.list());
    expect(results.length).toBe(2);
  });

  it("create() posts searches", async () => {
    const writeResult = {
      success: { "0": "NEW" },
      unchanged: {},
      failed: {},
      successful: {},
    };
    mockFetch.mockResolvedValueOnce(makeResponse(writeResult));

    const result = await searches.create([
      { name: "New Search", conditions: [] } as any,
    ]);
    expect(result.success).toEqual({ "0": "NEW" });

    const call = mockFetch.mock.calls[0]!;
    expect(call[1]?.method).toBe("POST");
  });

  it("delete() calls DELETE with version", async () => {
    mockFetch.mockResolvedValueOnce(make204Response());

    await searches.delete("SRCH1", 10);
    const call = mockFetch.mock.calls[0]!;
    expect(call[1]?.method).toBe("DELETE");

    const url = call[0] as string;
    expect(url).toContain("/users/12345/searches/SRCH1");

    const headers = call[1]?.headers as Record<string, string>;
    expect(headers["If-Unmodified-Since-Version"]).toBe("10");
  });

  it("deleteMany() calls DELETE with searchKey param", async () => {
    mockFetch.mockResolvedValueOnce(make204Response());

    await searches.deleteMany(["SRCH1", "SRCH2"], 10);
    const call = mockFetch.mock.calls[0]!;
    expect(call[1]?.method).toBe("DELETE");

    const url = call[0] as string;
    expect(url).toContain("searchKey=SRCH1%2CSRCH2");

    const headers = call[1]?.headers as Record<string, string>;
    expect(headers["If-Unmodified-Since-Version"]).toBe("10");
  });
});
