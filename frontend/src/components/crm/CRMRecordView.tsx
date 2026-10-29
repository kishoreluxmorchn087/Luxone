type RecordViewMode = "list" | "grid" | "kanban" | "chart";

type RecordViewProps<T extends { id: string }> = {
  mode: RecordViewMode;
  rows: T[];
  columns: Array<{ key: string; label: string }>;
  onOpen: (row: T) => void;
};

function getValue(row: { id: string }, key: string): string {
  const value = (row as Record<string, unknown>)[key];
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Active" : "Inactive";
  return String(value);
}

export default function CRMRecordView<T extends { id: string }>({
  mode,
  rows,
  columns,
  onOpen,
}: RecordViewProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        No records match the current filters.
      </div>
    );
  }

  if (mode === "chart") {
    const groupColumn =
      columns.find((column) => ["status", "category", "priority", "type"].includes(column.key.toLowerCase())) ??
      columns[0];
    const counts = new Map<string, number>();
    rows.forEach((row) => {
      const label = groupColumn ? getValue(row, groupColumn.key) : "All records";
      const category = label === "-" ? "Uncategorized" : label;
      counts.set(category, (counts.get(category) ?? 0) + 1);
    });
    const sortedCounts = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const chartData = sortedCounts.slice(0, 8);
    const remaining = sortedCounts.slice(8).reduce((total, [, count]) => total + count, 0);
    if (remaining > 0) chartData.push(["Other", remaining]);
    const maxCount = Math.max(...chartData.map(([, count]) => count));

    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-5 text-lg font-semibold text-slate-900">
          Records by {groupColumn?.label ?? "total"}
        </h2>
        <div className="space-y-4">
          {chartData.map(([label, count]) => (
            <div key={label} className="grid grid-cols-[minmax(90px,160px)_1fr_36px] items-center gap-3">
              <span className="truncate text-sm text-slate-600">{label}</span>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
              <span className="text-right text-sm font-medium text-slate-700">{count}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (mode === "kanban") {
    const groupColumn =
      columns.find((column) => column.key.toLowerCase() === "status") ??
      columns.find((column) => ["priority", "category", "type"].includes(column.key.toLowerCase()));
    const groups = new Map<string, T[]>();
    rows.forEach((row) => {
      const label = groupColumn ? getValue(row, groupColumn.key) : "All records";
      const category = label === "-" ? "Uncategorized" : label;
      groups.set(category, [...(groups.get(category) ?? []), row]);
    });

    return (
      <div className="flex gap-4 overflow-x-auto pb-2">
        {[...groups.entries()].map(([label, groupRows]) => (
          <section key={label} className="w-72 shrink-0 rounded-xl bg-slate-100 p-3">
            <h2 className="mb-3 flex items-center justify-between font-semibold text-slate-700">
              {label}
              <span className="rounded-full bg-white px-2 py-0.5 text-xs">{groupRows.length}</span>
            </h2>
            <div className="space-y-3">
              {groupRows.map((row) => (
                <button
                  type="button"
                  key={row.id}
                  onClick={() => onOpen(row)}
                  className="block w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm hover:border-blue-400"
                >
                  <div className="font-medium text-slate-900">
                    {getValue(row, columns[0]?.key ?? "id")}
                  </div>
                  {columns.slice(1, 4).map((column) => (
                    <div key={column.key} className="mt-1 truncate text-xs text-slate-500">
                      {column.label}: {getValue(row, column.key)}
                    </div>
                  ))}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  if (mode === "grid") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <button
            type="button"
            key={row.id}
            onClick={() => onOpen(row)}
            className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-blue-400"
          >
            <h2 className="mb-3 truncate font-semibold text-slate-900">
              {getValue(row, columns[0]?.key ?? "id")}
            </h2>
            <div className="space-y-2">
              {columns.slice(1, 5).map((column) => (
                <div key={column.key} className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-500">{column.label}</span>
                  <span className="truncate text-right text-slate-700">{getValue(row, column.key)}</span>
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {rows.map((row) => (
        <button
          type="button"
          key={row.id}
          onClick={() => onOpen(row)}
          className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-slate-50"
        >
          <span className="min-w-0 flex-1 truncate font-medium text-slate-900">
            {getValue(row, columns[0]?.key ?? "id")}
          </span>
          <span className="hidden max-w-[55%] truncate text-sm text-slate-500 sm:block">
            {columns.slice(1, 4).map((column) => `${column.label}: ${getValue(row, column.key)}`).join(" · ")}
          </span>
          {columns.some((column) => column.key.toLowerCase() === "status") && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
              {getValue(row, columns.find((column) => column.key.toLowerCase() === "status")!.key)}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
