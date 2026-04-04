import type { ApiResponse } from "../api/types/responses.js";
import type { ItemData } from "../api/types/items.js";

export interface DuplicateGroup {
  matchField: "url" | "DOI" | "ISBN" | "title";
  matchValue: string;
  items: ApiResponse<ItemData>[];
}

const MATCH_FIELDS = ["DOI", "ISBN", "url", "title"] as const;

function extractField(
  data: ItemData,
  field: (typeof MATCH_FIELDS)[number],
): string | undefined {
  if (field in data) {
    const value = (data as unknown as Record<string, unknown>)[field];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim().toLowerCase();
    }
  }
  return undefined;
}

export function findDuplicates(
  items: ApiResponse<ItemData>[],
): DuplicateGroup[] {
  // For each match field, map normalized value -> list of items
  const maps: Record<
    (typeof MATCH_FIELDS)[number],
    Map<string, ApiResponse<ItemData>[]>
  > = {
    DOI: new Map(),
    ISBN: new Map(),
    url: new Map(),
    title: new Map(),
  };

  for (const item of items) {
    for (const field of MATCH_FIELDS) {
      const value = extractField(item.data, field);
      if (value !== undefined) {
        let list = maps[field].get(value);
        if (list === undefined) {
          list = [];
          maps[field].set(value, list);
        }
        list.push(item);
      }
    }
  }

  // Collect groups with 2+ items, respecting priority:
  // DOI > ISBN > URL > title
  // If an item already belongs to a higher-priority group, skip it in lower ones.
  const seen = new Set<string>(); // item keys already assigned
  const groups: DuplicateGroup[] = [];

  for (const field of MATCH_FIELDS) {
    for (const [value, fieldItems] of maps[field]) {
      const remaining = fieldItems.filter((item) => !seen.has(item.key));
      if (remaining.length >= 2) {
        groups.push({
          matchField: field,
          matchValue: value,
          items: remaining,
        });
        for (const item of remaining) {
          seen.add(item.key);
        }
      }
    }
  }

  return groups;
}
