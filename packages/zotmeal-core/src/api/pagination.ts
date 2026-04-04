import type { HttpClient, HttpResponse } from "./http.js";

/**
 * Parse the Link header to find the "next" URL.
 * Format: <https://api.zotero.org/...>; rel="next", <...>; rel="last"
 */
function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null;

  const parts = linkHeader.split(",");
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match?.[1]) return match[1];
  }
  return null;
}

export interface PaginatedInfo {
  totalResults: number;
}

/**
 * Async generator that yields individual items from paginated Zotero API responses.
 */
export async function* paginate<T>(
  http: HttpClient,
  path: string,
  params?: Record<string, string | number | boolean | string[] | undefined>,
): AsyncGenerator<T, PaginatedInfo> {
  let url = http.buildUrl(path, params);
  let totalResults = 0;

  while (true) {
    const response: HttpResponse<T[]> = await http.getUrl<T[]>(url);
    totalResults = Number(response.headers.get("Total-Results") ?? totalResults);

    for (const item of response.data) {
      yield item;
    }

    const nextUrl = parseNextLink(response.headers.get("Link"));
    if (!nextUrl) break;
    url = nextUrl;
  }

  return { totalResults };
}

/**
 * Collect all items from a paginated async generator into an array.
 */
export async function collectAll<T>(
  generator: AsyncGenerator<T, PaginatedInfo>,
): Promise<{ items: T[]; totalResults: number }> {
  const items: T[] = [];
  let result: IteratorResult<T, PaginatedInfo>;

  while (true) {
    result = await generator.next();
    if (result.done) {
      return { items, totalResults: result.value.totalResults };
    }
    items.push(result.value);
  }
}
