#!/usr/bin/env bun
import { Command } from "commander";
import { makeItemsCommand } from "./commands/items.js";
import { makeCollectionsCommand } from "./commands/collections.js";
import { makeTagsCommand } from "./commands/tags.js";

const program = new Command();

program
  .name("zotmeal")
  .description("CLI for the Zotero Web API")
  .version("0.1.0");

program.addCommand(makeItemsCommand());
program.addCommand(makeCollectionsCommand());
program.addCommand(makeTagsCommand());

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
