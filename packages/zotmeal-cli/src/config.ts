import { ZoteroClient } from "@halfwhey/zotmeal-core";

export function getClient(): ZoteroClient {
  const apiKey = process.env["ZOTERO_API_KEY"];
  if (!apiKey) {
    throw new Error("ZOTERO_API_KEY environment variable is not set");
  }

  const libraryId = process.env["ZOTERO_LIBRARY_ID"];
  if (!libraryId) {
    throw new Error("ZOTERO_LIBRARY_ID environment variable is not set");
  }

  const libraryType = (process.env["ZOTERO_LIBRARY_TYPE"] ?? "user") as "user" | "group";

  return new ZoteroClient({
    apiKey,
    library: { type: libraryType, id: Number(libraryId) },
  });
}
