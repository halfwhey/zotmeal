import { Command } from "commander";
import { collectAll } from "@halfwhey/zotmeal-core";
import { getClient } from "../config.js";
import { formatTable, formatJson } from "../output.js";

export function makeCollectionsCommand(): Command {
  const cmd = new Command("collections").description("Manage collections");

  cmd
    .command("list")
    .description("List collections")
    .option("--top", "Only top-level collections")
    .option("-f, --format <format>", "Output format (table|json)", "table")
    .action(async (opts) => {
      const client = getClient();
      const gen = opts.top
        ? client.collections.listTop()
        : client.collections.list();
      const { items } = await collectAll(gen);

      if (opts.format === "json") {
        console.log(formatJson(items));
      } else {
        console.log(
          formatTable(
            items.map((c) => ({
              key: c.key,
              name: c.data.name,
              parent: c.data.parentCollection || "—",
            })),
            [
              { header: "Key", accessor: (r) => String(r["key"] ?? "") },
              { header: "Name", accessor: (r) => String(r["name"] ?? "") },
              { header: "Parent", accessor: (r) => String(r["parent"] ?? "") },
            ],
          ),
        );
      }
    });

  cmd
    .command("items <key>")
    .description("List items in a collection")
    .option("-f, --format <format>", "Output format (table|json)", "table")
    .action(async (key: string, opts) => {
      const client = getClient();
      const { items } = await collectAll(client.collections.items(key));

      if (opts.format === "json") {
        console.log(formatJson(items));
      } else {
        console.log(
          formatTable(
            items.map((i) => ({
              key: i.key,
              type: i.data.itemType,
              title: "title" in i.data ? (i.data as unknown as Record<string, unknown>)["title"] : "",
            })),
            [
              { header: "Key", accessor: (r) => String(r["key"] ?? "") },
              { header: "Type", accessor: (r) => String(r["type"] ?? "") },
              { header: "Title", accessor: (r) => String(r["title"] ?? "").slice(0, 60) },
            ],
          ),
        );
      }
    });

  return cmd;
}
