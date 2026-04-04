import { Command } from "commander";
import { collectAll } from "@halfwhey/zotmeal-core";
import { getClient } from "../config.js";
import { formatTable, formatJson } from "../output.js";

export function makeTagsCommand(): Command {
  const cmd = new Command("tags").description("Manage tags");

  cmd
    .command("list")
    .description("List all tags")
    .option("-f, --format <format>", "Output format (table|json)", "table")
    .action(async (opts) => {
      const client = getClient();
      const { items: tags } = await collectAll(client.tags.list());

      if (opts.format === "json") {
        console.log(formatJson(tags));
      } else {
        console.log(
          formatTable(
            tags.map((t) => ({ tag: t.tag, type: t.type })),
            [
              { header: "Tag", accessor: (r) => String(r["tag"] ?? "") },
              { header: "Type", accessor: (r) => String(r["type"] ?? 0) },
            ],
          ),
        );
      }
    });

  return cmd;
}
