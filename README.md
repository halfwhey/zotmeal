# zotmeal

A strongly-typed TypeScript client library and CLI for the [Zotero Web API v3](https://www.zotero.org/support/dev/web_api/v3/start).

## Features

- **Strongly typed** -- discriminated union types for all ~40 Zotero item types, generated from the Zotero API schema
- **Zero runtime dependencies** in the core library (uses native `fetch`)
- **Async generator pagination** -- memory-efficient streaming of large result sets
- **Typed errors** -- `AuthenticationError`, `NotFoundError`, `VersionConflictError`, `RateLimitError` with automatic retry on 429
- **CLI** with table, JSON, and keys output formats

## Project Structure

```
zotmeal/
  packages/
    zotmeal-core/   # @halfwhey/zotmeal-core - client library (zero runtime deps)
    zotmeal-cli/    # @halfwhey/zotmeal-cli - command-line interface
  scripts/
    generate-item-types.ts   # Generates TypeScript types from Zotero API schema
```

## Installation

```bash
# Install globally from npm
npm install -g @halfwhey/zotmeal-cli

# Or run without installing
npx @halfwhey/zotmeal-cli items list
```

## Requirements

- Node.js v18+
- A [Zotero API key](https://www.zotero.org/settings/keys)

## Development

Requires [Bun](https://bun.sh) v1.0+.

```bash
bun install                            # Install dependencies
make build                             # Build single-file CLI
bun test                               # Run tests
make typecheck                         # Type check all packages
bun run scripts/generate-item-types.ts # Regenerate item types from Zotero API schema
bun packages/zotmeal-cli/src/index.ts  # Run CLI from source
```

## Configuration

Set these environment variables:

```bash
export ZOTERO_API_KEY="your-api-key"        # Required — from https://www.zotero.org/settings/keys
export ZOTERO_LIBRARY_ID="12345"            # Required — your user/group ID
export ZOTERO_LIBRARY_TYPE="user"           # Optional — "user" (default) or "group"
```

Your user ID is visible at [zotero.org/settings/storage](https://www.zotero.org/settings/storage).

## CLI Commands

### Items

```bash
zotmeal-cli items list                            # List items (default: 25)
zotmeal-cli items list --limit 10                 # Limit results
zotmeal-cli items list --sort dateModified        # Sort by field
zotmeal-cli items list --tag "Favorite"           # Filter by tag
zotmeal-cli items list --query "quantum"          # Search
zotmeal-cli items list --format json              # Output as JSON
zotmeal-cli items list --format keys              # Output item keys only
zotmeal-cli items get <key>                       # Get a single item
zotmeal-cli items create --type book --title "Book Title"
zotmeal-cli items create --type book --title "Title" --creator "author:Last,First"
zotmeal-cli items update <key> --title "New Title"
zotmeal-cli items delete <key>
```

### Collections

```bash
zotmeal-cli collections list                      # List all collections
zotmeal-cli collections list --top                # Top-level only
zotmeal-cli collections list --format json        # Output as JSON
zotmeal-cli collections items <key>               # List items in a collection
```

### Tags

```bash
zotmeal-cli tags list                             # List all tags
zotmeal-cli tags list --format json               # Output as JSON
```

## Using the Core Library

```typescript
import { ZoteroClient, collectAll } from "@halfwhey/zotmeal-core";

const client = new ZoteroClient({
  apiKey: "your-api-key",
  library: { type: "user", id: 12345 },
});

// Stream items with async generator
for await (const item of client.items.list({ q: "quantum" })) {
  console.log(item.data.title);
}

// Or collect all into an array
const { items } = await collectAll(client.items.list({ limit: 50 }));

// Type narrowing on itemType
const item = await client.items.get("ABC123");
if (item.data.itemType === "book") {
  console.log(item.data.publisher); // TypeScript knows this is a book
}

// CRUD
await client.items.create([{ itemType: "book", title: "New Book" }]);
await client.items.update("ABC123", { title: "Updated" }, item.version);
await client.items.delete("ABC123", item.version);

// Collections, tags, searches
const collections = await collectAll(client.collections.list());
const tags = await collectAll(client.tags.list());
```

## License

MIT
