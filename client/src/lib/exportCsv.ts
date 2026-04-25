export function exportToCsv(
   filename: string,
   rows: Record<string, unknown>[],
): void {
   if (!rows.length) return;
   const headers = Object.keys(rows[0]);
   const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
   const lines = [
      headers.map(escape).join(","),
      ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
   ];
   const blob = new Blob([lines.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
   });
   const url = URL.createObjectURL(blob);
   const a = document.createElement("a");
   a.href = url;
   a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
   a.click();
   URL.revokeObjectURL(url);
}
