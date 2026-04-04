import { describe, it, expect } from "bun:test";
import { findDuplicates } from "../src/utils/duplicates.js";
import type { ApiResponse } from "../src/api/types/responses.js";
import type { ItemData } from "../src/api/types/items.js";

function makeItem(
  key: string,
  fields: Record<string, unknown>,
): ApiResponse<ItemData> {
  return {
    key,
    version: 1,
    library: {} as any,
    links: {} as any,
    meta: {} as any,
    data: {
      key,
      version: 1,
      itemType: "journalArticle",
      title: "",
      ...fields,
    } as unknown as ItemData,
  };
}

describe("findDuplicates", () => {
  it("items with same DOI are grouped", () => {
    const items = [
      makeItem("A", { DOI: "10.1234/test", title: "Paper A" }),
      makeItem("B", { DOI: "10.1234/test", title: "Paper B" }),
    ];

    const groups = findDuplicates(items);
    expect(groups.length).toBe(1);
    expect(groups[0]!.matchField).toBe("DOI");
    expect(groups[0]!.items.length).toBe(2);
  });

  it("items with same ISBN are grouped", () => {
    const items = [
      makeItem("A", { ISBN: "978-0-123456-78-9", title: "Book A" }),
      makeItem("B", { ISBN: "978-0-123456-78-9", title: "Book B" }),
    ];

    const groups = findDuplicates(items);
    expect(groups.length).toBe(1);
    expect(groups[0]!.matchField).toBe("ISBN");
    expect(groups[0]!.items.length).toBe(2);
  });

  it("items with same URL are grouped", () => {
    const items = [
      makeItem("A", { url: "https://example.com/paper", title: "Page A" }),
      makeItem("B", { url: "https://example.com/paper", title: "Page B" }),
    ];

    const groups = findDuplicates(items);
    expect(groups.length).toBe(1);
    expect(groups[0]!.matchField).toBe("url");
    expect(groups[0]!.items.length).toBe(2);
  });

  it("items with same title are grouped", () => {
    const items = [
      makeItem("A", { title: "Same Title" }),
      makeItem("B", { title: "Same Title" }),
    ];

    const groups = findDuplicates(items);
    expect(groups.length).toBe(1);
    expect(groups[0]!.matchField).toBe("title");
    expect(groups[0]!.items.length).toBe(2);
  });

  it("DOI match has priority over title match", () => {
    const items = [
      makeItem("A", { DOI: "10.1234/test", title: "Same Title" }),
      makeItem("B", { DOI: "10.1234/test", title: "Same Title" }),
    ];

    const groups = findDuplicates(items);
    // Should only produce one group (DOI), not also a title group
    expect(groups.length).toBe(1);
    expect(groups[0]!.matchField).toBe("DOI");
  });

  it("no groups returned when all items are unique", () => {
    const items = [
      makeItem("A", { DOI: "10.1234/aaa", title: "Title A" }),
      makeItem("B", { DOI: "10.1234/bbb", title: "Title B" }),
      makeItem("C", { DOI: "10.1234/ccc", title: "Title C" }),
    ];

    const groups = findDuplicates(items);
    expect(groups.length).toBe(0);
  });

  it("empty input returns empty array", () => {
    const groups = findDuplicates([]);
    expect(groups).toEqual([]);
  });
});
