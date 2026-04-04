import { describe, it, expect, mock, beforeEach } from "bun:test";
import { HttpClient } from "../src/api/http.js";
import { ItemsEndpoint } from "../src/api/endpoints/items.js";
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

describe("ItemsEndpoint", () => {
  let http: HttpClient;
  let items: ItemsEndpoint;

  beforeEach(() => {
    mockFetch.mockReset();
    http = new HttpClient({ apiKey: "key" });
    items = new ItemsEndpoint(http, "/users/12345");
  });

  it("get() calls correct URL", async () => {
    const itemData = {
      key: "ABC",
      version: 10,
      data: { itemType: "book", title: "Test" },
    };
    mockFetch.mockResolvedValueOnce(makeResponse(itemData));

    const result = await items.get("ABC");
    expect(result.key).toBe("ABC");

    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain("/users/12345/items/ABC");
  });

  it("list() returns paginated results", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(
        [
          { key: "A", data: { itemType: "book" } },
          { key: "B", data: { itemType: "note" } },
        ],
        { "Total-Results": "2" },
      ),
    );

    const { items: results } = await collectAll(items.list({ limit: 10 }));
    expect(results.length).toBe(2);
  });

  it("create() posts items", async () => {
    const writeResult = {
      success: { "0": "NEW" },
      unchanged: {},
      failed: {},
      successful: {},
    };
    mockFetch.mockResolvedValueOnce(makeResponse(writeResult));

    const result = await items.create([
      { itemType: "book" } as any,
    ]);
    expect(result.success).toEqual({ "0": "NEW" });

    const call = mockFetch.mock.calls[0]!;
    expect(call[1]?.method).toBe("POST");
  });

  it("delete() calls DELETE with version", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(null, {
        status: 204,
        headers: new Headers({ "Last-Modified-Version": "11" }),
      }),
    );

    await items.delete("ABC", 10);
    const call = mockFetch.mock.calls[0]!;
    expect(call[1]?.method).toBe("DELETE");
    const headers = call[1]?.headers as Record<string, string>;
    expect(headers["If-Unmodified-Since-Version"]).toBe("10");
  });
});
