import { describe, it, expect, mock, beforeEach } from "bun:test";
import { HttpClient } from "../src/api/http.js";
import { GroupsEndpoint } from "../src/api/endpoints/groups.js";
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

describe("GroupsEndpoint", () => {
  let http: HttpClient;
  let groups: GroupsEndpoint;

  beforeEach(() => {
    mockFetch.mockReset();
    http = new HttpClient({ apiKey: "key" });
    groups = new GroupsEndpoint(http);
  });

  it("get() calls correct URL", async () => {
    const groupData = {
      id: 99999,
      version: 10,
      data: {
        id: 99999,
        name: "Test Group",
        owner: 12345,
        type: "PublicOpen",
      },
    };
    mockFetch.mockResolvedValueOnce(makeResponse(groupData));

    const result = await groups.get(99999);
    expect(result.data.name).toBe("Test Group");

    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain("/groups/99999");
  });

  it("listForUser() calls correct URL", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(
        [
          { id: 111, data: { name: "Group A" } },
          { id: 222, data: { name: "Group B" } },
        ],
        { "Total-Results": "2" },
      ),
    );

    const { items: results } = await collectAll(groups.listForUser(12345));
    expect(results.length).toBe(2);

    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain("/users/12345/groups");
  });
});
