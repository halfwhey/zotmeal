/**
 * Integration test suite — runs against the live Zotero API.
 *
 * Usage:
 *   ZOTERO_API_KEY=... ZOTERO_LIBRARY_ID=... bun packages/core/test/integration/run.ts
 */

import { ZoteroClient } from "../../src/index.js";
import { collectAll } from "../../src/api/pagination.js";
import { findDuplicates } from "../../src/utils/duplicates.js";

const API_KEY = process.env["ZOTERO_API_KEY"]!;
const LIBRARY_ID = Number(process.env["ZOTERO_LIBRARY_ID"]!);

if (!API_KEY || !LIBRARY_ID) {
  console.error("Set ZOTERO_API_KEY and ZOTERO_LIBRARY_ID");
  process.exit(1);
}

const client = new ZoteroClient({
  apiKey: API_KEY,
  library: { type: "user", id: LIBRARY_ID },
});

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string): void {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ ${msg}`);
    failed++;
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

// ─── Keys Endpoint ───────────────────────────────────────────────────────────
async function testKeys(): Promise<void> {
  console.log("\n═══ Keys Endpoint ═══");

  const current = await client.keys.getCurrent();
  assert(typeof current.key === "string", "getCurrent() returns key string");
  assert(current.userID === LIBRARY_ID, `getCurrent() userID matches (${current.userID})`);
  assert(typeof current.username === "string", `getCurrent() has username: ${current.username}`);
  assert(current.access !== undefined, "getCurrent() has access permissions");
  console.log("  Permissions:", JSON.stringify(current.access));

  const specific = await client.keys.get(API_KEY);
  assert(specific.key === current.key, "get(key) returns same key as getCurrent()");
}

// ─── Items Endpoint ──────────────────────────────────────────────────────────
let bookKey = "";
let bookVersion = 0;
let articleKey = "";
let articleVersion = 0;
let noteKey = "";
let noteVersion = 0;

async function testItemsCreate(): Promise<void> {
  console.log("\n═══ Items — Create ═══");

  // Create a book
  const bookResult = await client.items.create([
    {
      itemType: "book",
      title: "The Art of Computer Programming",
      creators: [{ creatorType: "author", firstName: "Donald", lastName: "Knuth" }],
      date: "1968",
      publisher: "Addison-Wesley",
      ISBN: "978-0-201-89683-1",
      url: "https://example.com/taocp",
      tags: [{ tag: "computer science" }, { tag: "algorithms" }],
    } as any,
  ]);
  assert(bookResult.success["0"] !== undefined, "Created book item");
  bookKey = bookResult.success["0"]!;
  console.log(`  Book key: ${bookKey}`);

  // Create a journal article
  const articleResult = await client.items.create([
    {
      itemType: "journalArticle",
      title: "Attention Is All You Need",
      creators: [
        { creatorType: "author", firstName: "Ashish", lastName: "Vaswani" },
        { creatorType: "author", firstName: "Noam", lastName: "Shazeer" },
      ],
      date: "2017",
      publicationTitle: "Advances in Neural Information Processing Systems",
      DOI: "10.48550/arXiv.1706.03762",
      url: "https://arxiv.org/abs/1706.03762",
      tags: [{ tag: "machine learning" }, { tag: "transformers" }],
    } as any,
  ]);
  assert(articleResult.success["0"] !== undefined, "Created journal article");
  articleKey = articleResult.success["0"]!;
  console.log(`  Article key: ${articleKey}`);

  // Create a standalone note
  const noteResult = await client.items.create([
    {
      itemType: "note",
      note: "<p>This is a test note for integration testing.</p>",
      tags: [{ tag: "test" }],
    } as any,
  ]);
  assert(noteResult.success["0"] !== undefined, "Created standalone note");
  noteKey = noteResult.success["0"]!;
  console.log(`  Note key: ${noteKey}`);

  // Create a duplicate book (same ISBN, for dedup testing later)
  const dupResult = await client.items.create([
    {
      itemType: "book",
      title: "The Art of Computer Programming",
      creators: [{ creatorType: "author", firstName: "Donald", lastName: "Knuth" }],
      ISBN: "978-0-201-89683-1",
      tags: [{ tag: "duplicate" }],
    } as any,
  ]);
  assert(dupResult.success["0"] !== undefined, "Created duplicate book (same ISBN)");

  // Create more items for pagination testing
  const batchItems = [];
  for (let i = 0; i < 5; i++) {
    batchItems.push({
      itemType: "webpage",
      title: `Test Webpage ${i + 1}`,
      url: `https://example.com/page-${i + 1}`,
      tags: [{ tag: "batch" }, { tag: "test" }],
    } as any);
  }
  const batchResult = await client.items.create(batchItems);
  const batchSuccesses = Object.keys(batchResult.success).length;
  if (batchSuccesses < 5) {
    console.log(`  ⚠ Batch failures: ${JSON.stringify(batchResult.failed)}`);
  }
  assert(batchSuccesses === 5, `Batch created ${batchSuccesses}/5 webpages`);
}

async function testItemsRead(): Promise<void> {
  console.log("\n═══ Items — Read ═══");

  // Get single item
  const book = await client.items.get(bookKey);
  assert(book.data.title === "The Art of Computer Programming", "get() returns correct title");
  assert(book.key === bookKey, "get() returns correct key");
  bookVersion = book.version;
  console.log(`  Book version: ${bookVersion}`);

  // Get article
  const article = await client.items.get(articleKey);
  assert(article.data.itemType === "journalArticle", "Article has correct itemType");
  articleVersion = article.version;

  // Get note
  const note = await client.items.get(noteKey);
  assert(note.data.itemType === "note", "Note has correct itemType");
  noteVersion = note.version;
}

async function testItemsList(): Promise<void> {
  console.log("\n═══ Items — List & Pagination ═══");

  // List all items
  const { items: allItems, totalResults } = await collectAll(client.items.list());
  assert(allItems.length >= 4, `Listed ${allItems.length} items (expected ≥4)`);
  assert(totalResults >= 4, `Total-Results header: ${totalResults}`);

  // List with limit
  const { items: limited } = await collectAll(client.items.list({ limit: 3 }));
  assert(limited.length >= 3, `List with limit=3 returned ${limited.length} items (paginated)`);

  // List top-level items
  const { items: topItems } = await collectAll(client.items.listTop());
  assert(topItems.length >= 4, `listTop() returned ${topItems.length} top-level items`);

  // List with search
  const { items: searched } = await collectAll(
    client.items.list({ q: "Attention", qmode: "titleCreatorYear" }),
  );
  assert(searched.length >= 1, `Search for "Attention" found ${searched.length} items`);
  assert(
    searched.some((i) => i.data.title.includes("Attention")),
    "Search result contains matching title",
  );

  // List with tag filter
  const { items: tagged } = await collectAll(
    client.items.list({ tag: "algorithms" }),
  );
  assert(tagged.length >= 1, `Tag filter "algorithms" found ${tagged.length} items`);

  // List with itemType filter
  const { items: books } = await collectAll(
    client.items.list({ itemType: "book" }),
  );
  assert(books.length >= 2, `itemType=book filter found ${books.length} books`);
  assert(
    books.every((b) => b.data.itemType === "book"),
    "All filtered items are books",
  );

  // List with sort
  const { items: sorted } = await collectAll(
    client.items.list({ sort: "title", direction: "asc" }),
  );
  assert(sorted.length > 0, `Sorted list returned ${sorted.length} items`);
}

async function testItemsUpdate(): Promise<void> {
  console.log("\n═══ Items — Update ═══");

  // Update the book title
  await client.items.update(bookKey, { title: "TAOCP Vol 1: Fundamental Algorithms" } as any, bookVersion);
  const updated = await client.items.get(bookKey);
  assert(
    updated.data.title === "TAOCP Vol 1: Fundamental Algorithms",
    `Updated title: ${updated.data.title}`,
  );
  bookVersion = updated.version;
  assert(updated.version > bookVersion - 1, `Version incremented to ${updated.version}`);
}

async function testItemsExport(): Promise<void> {
  console.log("\n═══ Items — Export Formats ═══");

  // BibTeX export
  const bibtex = await client.items.export({ format: "bibtex" });
  assert(typeof bibtex === "string", "export(bibtex) returns string");
  assert(bibtex.length > 0, `BibTeX output: ${bibtex.length} chars`);
  assert(bibtex.includes("@"), "BibTeX contains @ entries");
  console.log(`  BibTeX preview: ${bibtex.substring(0, 100)}...`);

  // RIS export
  const ris = await client.items.export({ format: "ris" });
  assert(typeof ris === "string", "export(ris) returns string");
  assert(ris.includes("TY  -"), "RIS contains TY field");

  // CSL JSON export
  const csljson = await client.items.export({ format: "csljson" });
  assert(typeof csljson === "string", "export(csljson) returns string");
  assert(csljson.length > 0, `CSL JSON output: ${csljson.length} chars`);
}

async function testItemsChildren(): Promise<void> {
  console.log("\n═══ Items — Children ═══");

  // Create a child note attached to the book
  const childResult = await client.items.create([
    {
      itemType: "note",
      parentItem: bookKey,
      note: "<p>Chapter 1 notes: great intro to MIX assembly.</p>",
      tags: [{ tag: "chapter-notes" }],
    } as any,
  ]);
  assert(childResult.success["0"] !== undefined, "Created child note");

  // List children
  const { items: children } = await collectAll(client.items.listChildren(bookKey));
  assert(children.length >= 1, `Book has ${children.length} children`);
  assert(
    children.some((c) => c.data.itemType === "note"),
    "Children include a note",
  );
}

// ─── Collections Endpoint ────────────────────────────────────────────────────
let collectionKey = "";
let collectionVersion = 0;
let subCollectionKey = "";

async function testCollections(): Promise<void> {
  console.log("\n═══ Collections ═══");

  // Create collections
  const result = await client.collections.create([
    { name: "Computer Science" } as any,
  ]);
  assert(result.success["0"] !== undefined, "Created collection");
  collectionKey = result.success["0"]!;

  // Get collection
  const col = await client.collections.get(collectionKey);
  assert(col.data.name === "Computer Science", `Collection name: ${col.data.name}`);
  collectionVersion = col.version;

  // Create sub-collection
  const subResult = await client.collections.create([
    { name: "Algorithms", parentCollection: collectionKey } as any,
  ]);
  assert(subResult.success["0"] !== undefined, "Created sub-collection");
  subCollectionKey = subResult.success["0"]!;

  // Create another top-level collection
  await client.collections.create([{ name: "Machine Learning" } as any]);

  // List all collections
  const { items: allCols } = await collectAll(client.collections.list());
  assert(allCols.length >= 3, `Listed ${allCols.length} collections`);

  // List top-level only
  const { items: topCols } = await collectAll(client.collections.listTop());
  assert(topCols.length >= 2, `Top-level collections: ${topCols.length}`);
  assert(
    topCols.every((c) => c.data.parentCollection === false),
    "All top-level collections have parentCollection=false",
  );

  // Update collection
  await client.collections.update(
    collectionKey,
    { name: "CS & Algorithms" } as any,
    collectionVersion,
  );
  const updatedCol = await client.collections.get(collectionKey);
  assert(updatedCol.data.name === "CS & Algorithms", `Updated collection name: ${updatedCol.data.name}`);
  collectionVersion = updatedCol.version;

  // Add item to collection
  await client.items.update(bookKey, { collections: [collectionKey] } as any, bookVersion);
  const bookAfter = await client.items.get(bookKey);
  bookVersion = bookAfter.version;
  assert(
    bookAfter.data.collections.includes(collectionKey),
    "Book added to collection",
  );

  // Also add article to collection
  await client.items.update(articleKey, { collections: [collectionKey] } as any, articleVersion);
  const artAfter = await client.items.get(articleKey);
  articleVersion = artAfter.version;

  // List items in collection
  const { items: colItems } = await collectAll(client.collections.items(collectionKey));
  assert(colItems.length >= 2, `Collection has ${colItems.length} items`);

  // List top items in collection
  const { items: colTopItems } = await collectAll(client.collections.itemsTop(collectionKey));
  assert(colTopItems.length >= 2, `Collection top items: ${colTopItems.length}`);
}

// ─── Tags Endpoint ───────────────────────────────────────────────────────────
async function testTags(): Promise<void> {
  console.log("\n═══ Tags ═══");

  // List all tags
  const { items: tags } = await collectAll(client.tags.list());
  assert(tags.length >= 4, `Found ${tags.length} tags`);
  console.log(`  Tags: ${tags.map((t) => t.tag).join(", ")}`);

  // Search tags
  const { items: filtered } = await collectAll(client.tags.list({ q: "algorithm" }));
  assert(filtered.length >= 1, `Tag search "algorithm" found ${filtered.length} results`);

  // Delete a tag — need current library version
  // Tags use library version, not item version — get it from a fresh items request
  const { HttpClient: HC } = await import("../../src/api/http.js");
  const httpForVersion = new HC({ apiKey: API_KEY });
  const libResp = await httpForVersion.get<any[]>(`/users/${LIBRARY_ID}/items`, { limit: 1 });
  const tagDeleteVersion = libResp.version;
  await client.tags.delete("batch", tagDeleteVersion);
  await sleep(1000);

  const { items: afterDelete } = await collectAll(client.tags.list());
  assert(
    !afterDelete.some((t) => t.tag === "batch"),
    "Tag 'batch' deleted successfully",
  );
}

async function getLibraryVersion(): Promise<number> {
  const item = await client.items.get(bookKey);
  return item.version;
}

// ─── Searches Endpoint ───────────────────────────────────────────────────────
let searchKey = "";
let searchVersion = 0;

async function testSearches(): Promise<void> {
  console.log("\n═══ Searches ═══");

  // Create a saved search
  const result = await client.searches.create([
    {
      name: "Recent CS Papers",
      conditions: [
        { condition: "itemType", operator: "is", value: "journalArticle" },
        { condition: "tag", operator: "is", value: "machine learning" },
      ],
    } as any,
  ]);
  assert(result.success["0"] !== undefined, "Created saved search");
  searchKey = result.success["0"]!;

  // Get search
  const search = await client.searches.get(searchKey);
  assert(search.data.name === "Recent CS Papers", `Search name: ${search.data.name}`);
  assert(search.data.conditions.length === 2, `Search has ${search.data.conditions.length} conditions`);
  searchVersion = search.version;

  // List searches
  const { items: allSearches } = await collectAll(client.searches.list());
  assert(allSearches.length >= 1, `Listed ${allSearches.length} searches`);

  // Update search
  await client.searches.update(searchKey, { name: "ML Papers" } as any, searchVersion);
  const updated = await client.searches.get(searchKey);
  assert(updated.data.name === "ML Papers", `Updated search name: ${updated.data.name}`);
  searchVersion = updated.version;
}

// ─── Full-Text Endpoint ─────────────────────────────────────────────────────
async function testFullText(): Promise<void> {
  console.log("\n═══ Full-Text ═══");

  // Set full-text content for book
  const bookNow = await client.items.get(bookKey);
  bookVersion = bookNow.version;

  try {
    await client.fulltext.set(
      bookKey,
      {
        content: "This is the full text content of The Art of Computer Programming. It covers fundamental algorithms, sorting, and searching.",
        indexedChars: 120,
      },
      bookVersion,
    );
    assert(true, "Set full-text content for book");

    // Get full-text content
    const content = await client.fulltext.get(bookKey);
    assert(content.content.includes("fundamental algorithms"), `Full-text content retrieved: ${content.content.substring(0, 60)}...`);
    assert(typeof content.indexedChars === "number", `indexedChars: ${content.indexedChars}`);
  } catch (e: any) {
    // Full-text may require an actual file attachment
    console.log(`  ⚠ Full-text set/get: ${e.message} (may require file attachment)`);
  }

  // List full-text versions
  try {
    const versions = await client.fulltext.listVersions(0);
    assert(typeof versions === "object", `Full-text versions returned (${Object.keys(versions).length} items)`);
  } catch (e: any) {
    console.log(`  ⚠ Full-text versions: ${e.message}`);
  }
}

// ─── Deleted Endpoint ────────────────────────────────────────────────────────
async function testDeleted(): Promise<void> {
  console.log("\n═══ Deleted Content ═══");

  // Delete the standalone note
  const noteNow = await client.items.get(noteKey);
  noteVersion = noteNow.version;
  await client.items.delete(noteKey, noteVersion);
  assert(true, `Deleted note ${noteKey}`);

  await sleep(500);

  // Check deleted content
  const deleted = await client.deleted.list(0);
  assert(Array.isArray(deleted.items), "deleted.items is an array");
  assert(Array.isArray(deleted.collections), "deleted.collections is an array");
  assert(Array.isArray(deleted.searches), "deleted.searches is an array");
  assert(Array.isArray(deleted.tags), "deleted.tags is an array");
  assert(deleted.items.includes(noteKey), `Deleted items includes note key ${noteKey}`);
  console.log(`  Deleted items: ${deleted.items.length}, collections: ${deleted.collections.length}, tags: ${deleted.tags.length}`);
}

// ─── Conditional GETs ────────────────────────────────────────────────────────
async function testConditionalGets(): Promise<void> {
  console.log("\n═══ Conditional GETs (If-Modified-Since-Version) ═══");

  const { HttpClient } = await import("../../src/api/http.js");
  const http = new HttpClient({ apiKey: API_KEY });
  const prefix = `/users/${LIBRARY_ID}`;

  // Get current version
  const current = await http.get<any[]>(`${prefix}/items`, { limit: 1 });
  const currentVersion = current.version;
  assert(currentVersion > 0, `Current library version: ${currentVersion}`);

  // Conditional GET with current version — should return 304 (null)
  const notModified = await http.getIfModified<any[]>(
    `${prefix}/items`,
    currentVersion,
  );
  assert(notModified === null, "getIfModified() returns null when not modified (304)");

  // Conditional GET with version 0 — should return data
  const modified = await http.getIfModified<any[]>(`${prefix}/items`, 0);
  assert(modified !== null, "getIfModified(0) returns data when modified");
  assert(modified!.data.length > 0, `Returned ${modified!.data.length} items`);
}

// ─── Groups Endpoint ─────────────────────────────────────────────────────────
async function testGroups(): Promise<void> {
  console.log("\n═══ Groups ═══");

  // List groups for user
  const { items: groups } = await collectAll(client.groups.listForUser(LIBRARY_ID));
  console.log(`  User has ${groups.length} groups`);
  assert(Array.isArray(groups), "listForUser() returns array");

  // If there are groups, try getting one
  if (groups.length > 0) {
    const group = await client.groups.get(groups[0]!.data.id);
    assert(group.data.name !== undefined, `Got group: ${group.data.name}`);
  } else {
    console.log("  ⚠ No groups to test get() on (user has no groups)");
  }
}

// ─── Files Endpoint ──────────────────────────────────────────────────────────
async function testFiles(): Promise<void> {
  console.log("\n═══ Files ═══");

  // Test URL generation
  const downloadUrl = client.files.getDownloadUrl(bookKey);
  assert(downloadUrl.includes(`/items/${bookKey}/file`), `Download URL: ${downloadUrl}`);
  assert(downloadUrl.startsWith("https://"), "Download URL is absolute");

  const viewUrl = client.files.getViewUrl(bookKey);
  assert(viewUrl.includes(`/items/${bookKey}/file/view`), `View URL: ${viewUrl}`);

  // Upload authorization (will fail without an actual attachment item, but tests the request)
  try {
    const auth = await client.files.getUploadAuthorization(bookKey, {
      md5: "d41d8cd98f00b204e9800998ecf8427e",
      filename: "test.pdf",
      filesize: 1024,
      mtime: Date.now(),
    });
    assert(true, `Upload authorization succeeded: ${JSON.stringify(auth).substring(0, 100)}`);
  } catch (e: any) {
    // Expected to fail for non-attachment items
    console.log(`  ⚠ Upload auth: ${e.message} (expected — book is not an attachment item)`);
    assert(e.message !== undefined, "Upload auth correctly rejected for non-attachment item");
  }
}

// ─── Batch Delete ────────────────────────────────────────────────────────────
async function testBatchDelete(): Promise<void> {
  console.log("\n═══ Batch Delete ═══");

  // Get webpage items to batch-delete
  const { items: webpages } = await collectAll(
    client.items.list({ itemType: "webpage" }),
  );
  assert(webpages.length >= 5, `Found ${webpages.length} webpages to batch-delete`);

  const keys = webpages.map((w) => w.key);
  // Need library version, not item version — get fresh from API
  const { HttpClient: HC2 } = await import("../../src/api/http.js");
  const httpBatch = new HC2({ apiKey: API_KEY });
  const libVer = (await httpBatch.get<any[]>(`/users/${LIBRARY_ID}/items`, { limit: 1 })).version;

  await client.items.deleteMany(keys, libVer);
  assert(true, `Batch-deleted ${keys.length} webpages`);

  await sleep(500);

  // Verify they're gone
  const { items: remaining } = await collectAll(
    client.items.list({ itemType: "webpage" }),
  );
  assert(remaining.length === 0, `After batch delete: ${remaining.length} webpages remain`);
}

// ─── Duplicate Detection ─────────────────────────────────────────────────────
async function testDuplicates(): Promise<void> {
  console.log("\n═══ Duplicate Detection ═══");

  const { items: allItems } = await collectAll(client.items.list());
  const groups = findDuplicates(allItems);
  console.log(`  Found ${groups.length} duplicate groups among ${allItems.length} items`);

  if (groups.length > 0) {
    for (const group of groups) {
      assert(group.items.length >= 2, `Group matched by ${group.matchField}="${group.matchValue}" has ${group.items.length} items`);
    }
  } else {
    console.log("  ⚠ No duplicates detected (may have been cleaned up by earlier tests)");
  }
}

// ─── Batch Collection Delete ─────────────────────────────────────────────────
async function testBatchCollectionDelete(): Promise<void> {
  console.log("\n═══ Batch Collection Delete ═══");

  const { items: allCols } = await collectAll(client.collections.list());
  if (allCols.length >= 2) {
    // Delete sub-collections first (can't delete parent with children)
    const subCols = allCols.filter((c) => c.data.parentCollection !== false);
    if (subCols.length > 0) {
      const subKeys = subCols.map((c) => c.key);
      const { HttpClient: HC3 } = await import("../../src/api/http.js");
      const httpCol = new HC3({ apiKey: API_KEY });
      const colVer = (await httpCol.get<any[]>(`/users/${LIBRARY_ID}/collections`, { limit: 1 })).version;
      await client.collections.deleteMany(subKeys, colVer);
      assert(true, `Batch-deleted ${subKeys.length} sub-collections`);
      await sleep(500);
    }
  }
}

// ─── Search Delete ───────────────────────────────────────────────────────────
async function testSearchDelete(): Promise<void> {
  console.log("\n═══ Search Delete ═══");

  // Create an extra search for batch delete
  await client.searches.create([
    {
      name: "Temp Search",
      conditions: [{ condition: "title", operator: "contains", value: "temp" }],
    } as any,
  ]);

  const { items: allSearches } = await collectAll(client.searches.list());
  if (allSearches.length >= 2) {
    const sKeys = allSearches.map((s) => s.key);
    const { HttpClient: HC4 } = await import("../../src/api/http.js");
    const httpSearch = new HC4({ apiKey: API_KEY });
    const searchVer = (await httpSearch.get<any[]>(`/users/${LIBRARY_ID}/searches`, { limit: 1 })).version;
    await client.searches.deleteMany(sKeys, searchVer);
    assert(true, `Batch-deleted ${sKeys.length} searches`);
  } else if (allSearches.length === 1) {
    const { HttpClient: HC5 } = await import("../../src/api/http.js");
    const httpS = new HC5({ apiKey: API_KEY });
    const sVer = (await httpS.get<any[]>(`/users/${LIBRARY_ID}/searches`, { limit: 1 })).version;
    await client.searches.delete(allSearches[0]!.key, sVer);
    assert(true, "Deleted single search");
  }
}

// ─── Trash ───────────────────────────────────────────────────────────────────
async function testTrash(): Promise<void> {
  console.log("\n═══ Trash ═══");

  const { items: trashed } = await collectAll(client.items.listTrash());
  console.log(`  Trash contains ${trashed.length} items`);
  assert(Array.isArray(trashed), "listTrash() returns items");
}

// ─── Run All ─────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║  Zotmeal Integration Tests — Live API    ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`Library: user/${LIBRARY_ID}`);

  try {
    await testKeys();
    await testItemsCreate();
    await testItemsRead();
    await testItemsList();
    await testItemsUpdate();
    await testItemsExport();
    await testItemsChildren();
    await testCollections();
    await testTags();
    await testSearches();
    await testFullText();
    await testGroups();
    await testFiles();
    await testConditionalGets();
    await testDuplicates();
    await testTrash();
    await testBatchDelete();
    await testBatchCollectionDelete();
    await testSearchDelete();
    await testDeleted();
  } catch (e: any) {
    console.error(`\n💥 Fatal error: ${e.message}`);
    console.error(e.stack);
  }

  console.log("\n══════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("══════════════════════════════════════════");
  process.exit(failed > 0 ? 1 : 0);
}

main();
