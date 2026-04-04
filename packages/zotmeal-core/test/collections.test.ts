import { describe, it, expect, mock, beforeEach } from "bun:test";
import { HttpClient } from "../src/api/http.js";
import { CollectionsEndpoint } from "../src/api/endpoints/collections.js";
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

describe("CollectionsEndpoint", () => {
  let http: HttpClient;
  let collections: CollectionsEndpoint;

  beforeEach(() => {
    mockFetch.mockReset();
    http = new HttpClient({ apiKey: "key" });
    collections = new CollectionsEndpoint(http, "/users/12345");
  });

  it("get() calls correct URL", async () => {
    const collectionData = {
      key: "COL1",
      version: 10,
      data: { key: "COL1", name: "My Collection" },
    };
    mockFetch.mockResolvedValueOnce(makeResponse(collectionData));

    const result = await collections.get("COL1");
    expect(result.key).toBe("COL1");

    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain("/users/12345/collections/COL1");
  });

  it("list() returns paginated results", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(
        [
          { key: "COL1", data: { name: "Collection A" } },
          { key: "COL2", data: { name: "Collection B" } },
        ],
        { "Total-Results": "2" },
      ),
    );

    const { items: results } = await collectAll(collections.list({ limit: 10 }));
    expect(results.length).toBe(2);
  });

  it("items() calls correct URL with collection key", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(
        [{ key: "ITEM1", data: { itemType: "book" } }],
        { "Total-Results": "1" },
      ),
    );

    const { items: results } = await collectAll(collections.items("COL1"));
    expect(results.length).toBe(1);

    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain("/users/12345/collections/COL1/items");
  });

  it("itemsTop() calls correct URL", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(
        [{ key: "ITEM1", data: { itemType: "book" } }],
        { "Total-Results": "1" },
      ),
    );

    const { items: results } = await collectAll(collections.itemsTop("COL1"));
    expect(results.length).toBe(1);

    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain("/users/12345/collections/COL1/items/top");
  });

  it("create() posts collections", async () => {
    const writeResult = {
      success: { "0": "NEW" },
      unchanged: {},
      failed: {},
      successful: {},
    };
    mockFetch.mockResolvedValueOnce(makeResponse(writeResult));

    const result = await collections.create([{ name: "New Collection" }]);
    expect(result.success).toEqual({ "0": "NEW" });

    const call = mockFetch.mock.calls[0]!;
    expect(call[1]?.method).toBe("POST");
  });

  it("delete() calls DELETE with version", async () => {
    mockFetch.mockResolvedValueOnce(make204Response());

    await collections.delete("COL1", 10);
    const call = mockFetch.mock.calls[0]!;
    expect(call[1]?.method).toBe("DELETE");
    const headers = call[1]?.headers as Record<string, string>;
    expect(headers["If-Unmodified-Since-Version"]).toBe("10");
  });

  it("deleteMany() calls DELETE with collectionKey param", async () => {
    mockFetch.mockResolvedValueOnce(make204Response());

    await collections.deleteMany(["COL1", "COL2"], 10);
    const call = mockFetch.mock.calls[0]!;
    expect(call[1]?.method).toBe("DELETE");

    const url = call[0] as string;
    expect(url).toContain("collectionKey=COL1%2CCOL2");

    const headers = call[1]?.headers as Record<string, string>;
    expect(headers["If-Unmodified-Since-Version"]).toBe("10");
  });
});
