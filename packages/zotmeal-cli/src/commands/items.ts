import { Command } from "commander";
import { type ApiResponse, type ItemData } from "@halfwhey/zotmeal-core";
import { getClient } from "../config.js";
import { formatTable, formatJson, formatKeys, type OutputFormat } from "../output.js";

async function collect<T>(
  gen: AsyncGenerator<T>,
  limit: number,
): Promise<T[]> {
  const items: T[] = [];
  for await (const item of gen) {
    items.push(item);
    if (items.length >= limit) break;
  }
  return items;
}

export function makeItemsCommand(): Command {
  const cmd = new Command("items").description("Manage library items");

  cmd
    .command("list")
    .description("List items in the library")
    .option("-l, --limit <n>", "Maximum number of items", "25")
    .option("-s, --sort <field>", "Sort field")
    .option("-t, --tag <tag>", "Filter by tag")
    .option("-q, --query <query>", "Search query")
    .option("-f, --format <format>", "Output format (table|json|keys)", "table")
    .action(async (opts) => {
      const client = getClient();
      const limit = Number(opts.limit) || 25;
      const items = await collect(
        client.items.list({
          limit,
          sort: opts.sort,
          tag: opts.tag,
          q: opts.query,
        }),
        limit,
      );

      outputItems(items, opts.format as OutputFormat);
    });

  cmd
    .command("get <key>")
    .description("Get a specific item")
    .option("-f, --format <format>", "Output format (json|bibtex|bib)", "json")
    .action(async (key: string, _opts) => {
      const client = getClient();
      const item = await client.items.get(key);
      console.log(formatJson(item));
    });

  cmd
    .command("create")
    .description("Create a new item")
    .requiredOption("--type <itemType>", "Item type (e.g., book, journalArticle)")
    .requiredOption("--title <title>", "Item title")
    .option("--creator <creator>", "Creator in format 'role:Last,First'")
    .action(async (opts) => {
      const client = getClient();
      const itemData: Record<string, unknown> = {
        itemType: opts.type,
        title: opts.title,
      };

      if (opts.creator) {
        const match = (opts.creator as string).match(/^(\w+):(.+),(.+)$/);
        if (match) {
          itemData["creators"] = [
            {
              creatorType: match[1],
              lastName: match[2]!.trim(),
              firstName: match[3]!.trim(),
            },
          ];
        }
      }

      const result = await client.items.create([itemData as Partial<ItemData>]);
      console.log(formatJson(result));
    });

  cmd
    .command("update <key>")
    .description("Update an item")
    .option("--title <title>", "New title")
    .action(async (key: string, opts) => {
      const client = getClient();
      const item = await client.items.get(key);
      const updates: Record<string, unknown> = {};
      if (opts.title) updates["title"] = opts.title;

      await client.items.update(key, updates as Partial<ItemData>, item.version);
      console.log("Item updated.");
    });

  cmd
    .command("delete <key>")
    .description("Delete an item")
    .action(async (key: string) => {
      const client = getClient();
      const item = await client.items.get(key);
      await client.items.delete(key, item.version);
      console.log("Item deleted.");
    });

  return cmd;
}

function outputItems(
  items: ApiResponse<ItemData>[],
  format: OutputFormat,
): void {
  switch (format) {
    case "json":
      console.log(formatJson(items));
      break;
    case "keys":
      console.log(formatKeys(items));
      break;
    case "table":
    default:
      console.log(
        formatTable(
          items.map((i) => ({
            key: i.key,
            type: i.data.itemType,
            title: "title" in i.data ? (i.data as unknown as Record<string, unknown>)["title"] : "",
            date: i.data.dateModified,
          })),
          [
            { header: "Key", accessor: (r) => String(r["key"] ?? "") },
            { header: "Type", accessor: (r) => String(r["type"] ?? "") },
            { header: "Title", accessor: (r) => String(r["title"] ?? "").slice(0, 60) },
            { header: "Modified", accessor: (r) => String(r["date"] ?? "").slice(0, 10) },
          ],
        ),
      );
  }
}
