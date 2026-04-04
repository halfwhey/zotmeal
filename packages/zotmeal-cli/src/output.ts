export type OutputFormat = "table" | "json" | "keys";

export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export function formatKeys(items: Array<{ key: string }>): string {
  return items.map((i) => i.key).join("\n");
}

interface Column {
  header: string;
  accessor: (row: Record<string, unknown>) => string;
  width?: number | undefined;
}

export function formatTable(
  rows: Record<string, unknown>[],
  columns: Column[],
): string {
  if (rows.length === 0) return "No results.";

  // Calculate column widths
  const widths = columns.map((col) => {
    const values = rows.map((row) => String(col.accessor(row)).length);
    return Math.max(col.header.length, ...values);
  });

  // Header
  const header = columns
    .map((col, i) => col.header.padEnd(widths[i]!))
    .join("  ");
  const separator = widths.map((w) => "─".repeat(w)).join("──");

  // Rows
  const body = rows
    .map((row) =>
      columns
        .map((col, i) => String(col.accessor(row)).padEnd(widths[i]!))
        .join("  "),
    )
    .join("\n");

  return `${header}\n${separator}\n${body}`;
}
