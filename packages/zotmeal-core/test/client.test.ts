import { describe, it, expect } from "bun:test";
import { ZoteroClient } from "../src/api/client.js";
import { ItemsEndpoint } from "../src/api/endpoints/items.js";
import { CollectionsEndpoint } from "../src/api/endpoints/collections.js";
import { TagsEndpoint } from "../src/api/endpoints/tags.js";
import { SearchesEndpoint } from "../src/api/endpoints/searches.js";

describe("ZoteroClient", () => {
  it("creates endpoint instances", () => {
    const client = new ZoteroClient({
      apiKey: "test",
      library: { type: "user", id: 12345 },
    });

    expect(client.items).toBeInstanceOf(ItemsEndpoint);
    expect(client.collections).toBeInstanceOf(CollectionsEndpoint);
    expect(client.tags).toBeInstanceOf(TagsEndpoint);
    expect(client.searches).toBeInstanceOf(SearchesEndpoint);
  });

  it("works with group libraries", () => {
    const client = new ZoteroClient({
      apiKey: "test",
      library: { type: "group", id: 999 },
    });

    expect(client.items).toBeInstanceOf(ItemsEndpoint);
  });
});
