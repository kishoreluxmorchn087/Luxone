import { useEffect, useMemo, useRef, useState } from "react";
import { formatDateTimeForDisplay } from "../../lib/dateUtils";
import { Phone, CalendarCheck, CalendarDays, Activity, Pencil, Trash2 } from "lucide-react";
import type { CRMColumn, CRMRecord, CRMRowAction } from "../../lib/shared/crmTypes";
import CRMRowMoreOptionsMenu from "./CRMRowMoreOptionsMenu";
import CRMRowUtilityIcons from "./CRMRowUtilityIcons";
import CRMTableHeaderMenu from "./CRMTableHeaderMenu";

type ActivityBadge = { date: string; type: "call" | "task" | "meeting" | "other"; action: string };

function ActivityReminderBadge({ activity, onClick }: { activity: ActivityBadge; onClick?: () => void }) {
  const iconMap = {
    call: <Phone className="h-3 w-3" />,
    task: <CalendarCheck className="h-3 w-3" />,
    meeting: <CalendarDays className="h-3 w-3" />,
    other: <Activity className="h-3 w-3" />,
  };
  const colorMap = {
    call: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200",
    task: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200",
    meeting: "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200",
    other: "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200",
  };
  return (
    <button
      type="button"
      title={activity.action}
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium transition-colors ${colorMap[activity.type]}`}
    >
      {iconMap[activity.type]}
      {formatDateTimeForDisplay(activity.date)}
    </button>
  );
}

type CRMTableProps<T extends CRMRecord> = {
  rows: T[];
  columns: CRMColumn<T>[];
  rowActions: CRMRowAction[];
  selectedIds: string[];
  hiddenColumns: string[];
  pinnedColumn: string | null;
  columnFilters: Partial<Record<string, string>>;
  showNotes?: boolean;
  showActivity?: boolean;
  showActionsColumn?: boolean;
  onToggleAll: (checked: boolean) => void;
  onToggleRow: (id: string, checked: boolean) => void;
  onOpenRow: (row: T) => void;
  onOpenNotes?: (row: T) => void;
  onOpenActivityAction?: (row: T, actionKey: string) => void;
  onActivityBadgeClick?: (row: T) => void;
  onRowAction: (actionKey: string, row: T) => void;
  onSortColumn: (columnKey: string, direction: "asc" | "desc") => void;
  onToggleHideColumn: (columnKey: string) => void;
  onTogglePinColumn: (columnKey: string) => void;
  onFilterColumn: (columnKey: string, value: string) => void;
  variant?: "default" | "bordered";
  density?: "compact" | "normal" | "comfortable";
};

export default function CRMTable<T extends CRMRecord>({
  rows,
  columns,
  rowActions,
  selectedIds,
  hiddenColumns,
  pinnedColumn,
  columnFilters,
  showNotes = true,
  showActivity = true,
  showActionsColumn = true,
  onToggleAll,
  onToggleRow,
  onOpenRow,
  onOpenNotes,
  onOpenActivityAction,
  onActivityBadgeClick,
  onRowAction,
  onSortColumn,
  onToggleHideColumn,
  onTogglePinColumn,
  onFilterColumn,
  variant = "default",
  density = "normal",
}: CRMTableProps<T>) {
  const isLongTextColumn = (columnKey: string) => {
    const normalized = columnKey.toLowerCase();
    return (
      normalized.includes("email") ||
      normalized.includes("website") ||
      normalized.includes("address")
    );
  };
  const formatCellValue = (columnKey: string, value: unknown) => {
    if (value === null || value === undefined || value === "") return "-";
    if (columnKey === "annualRevenue" || columnKey.toLowerCase().includes("revenue")) {
      const num = Number(String(value).replace(/,/g, ""));
      if (Number.isFinite(num)) {
        if (num === 0) return "-";
        return `Rs. ${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
      }
    }
    if (typeof value === "string" && /(date|_at|At$)/i.test(columnKey)) {
      return formatDateTimeForDisplay(value) || "-";
    }
    return String(value);
  };

  const [openHeaderMenu, setOpenHeaderMenu] = useState<string | null>(null);
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpenHeaderMenu(null);
        setActiveFilterColumn(null);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const visibleColumns = useMemo(
    () => columns.filter((column) => !hiddenColumns.includes(column.key)),
    [columns, hiddenColumns]
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
        No records found.
      </div>
    );
  }

  const cellPaddingClass =
    density === "compact"
      ? "py-1.5 px-3 text-xs"
      : density === "comfortable"
      ? "py-4 px-4 text-sm"
      : "py-2.5 px-4 text-sm";

  const headerPaddingClass =
    density === "compact"
      ? "py-2 px-3 text-[11px]"
      : density === "comfortable"
      ? "py-3.5 px-4 text-xs"
      : "py-3 px-4 text-xs";

  const allChecked = rows.every((row) => selectedIds.includes(row.id));

  return (
    <div className="overflow-visible rounded-xl border border-slate-200 bg-white pb-1">
      <div className="overflow-x-auto overflow-y-visible">
      <table className={`w-full min-w-[1180px] text-left ${variant === "bordered" ? "border-collapse border border-slate-300" : "divide-y divide-slate-200"}`}>
        <thead className="bg-slate-50">
          <tr>
            <th className={`w-10 px-2 py-3 ${variant === "bordered" ? "border border-slate-300 bg-slate-50" : ""}`} />
            {showNotes ? <th className={`w-10 px-2 py-3 ${variant === "bordered" ? "border border-slate-300 bg-slate-50" : ""}`} /> : null}
            {showActivity ? <th className={`w-10 px-2 py-3 ${variant === "bordered" ? "border border-slate-300 bg-slate-50" : ""}`} /> : null}
            <th className={`w-12 px-3 py-3 ${variant === "bordered" ? "border border-slate-300 bg-slate-50" : ""}`}>
              <input
                type="checkbox"
                checked={allChecked}
                onChange={(event) => onToggleAll(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </th>

            {visibleColumns.map((column) => (
              <th
                key={column.key}
                className={`${headerPaddingClass} font-semibold uppercase tracking-wide text-slate-600 ${column.minWidth ?? ""} ${
                  pinnedColumn === column.key ? "sticky z-30 bg-slate-50" : ""
                } ${variant === "bordered" ? "border border-slate-300 bg-slate-50" : ""}`}
                style={pinnedColumn === column.key ? { left: showNotes && showActivity ? 172 : 132 } : undefined}
              >
                <div ref={openHeaderMenu === column.key ? menuRef : null}>
                  <CRMTableHeaderMenu
                    column={column}
                    open={openHeaderMenu === column.key}
                    filterValue={columnFilters[column.key] ?? ""}
                    onOpen={() => setOpenHeaderMenu((prev) => (prev === column.key ? null : column.key))}
                    onSortAsc={() => {
                      onSortColumn(column.key, "asc");
                      setOpenHeaderMenu(null);
                    }}
                    onSortDesc={() => {
                      onSortColumn(column.key, "desc");
                      setOpenHeaderMenu(null);
                    }}
                    onPin={() => {
                      onTogglePinColumn(column.key);
                      setOpenHeaderMenu(null);
                    }}
                    onHide={() => {
                      onToggleHideColumn(column.key);
                      setOpenHeaderMenu(null);
                    }}
                    onToggleFilter={() => setActiveFilterColumn((prev) => (prev === column.key ? null : column.key))}
                    showFilter={activeFilterColumn === column.key}
                    onFilterChange={(value) => onFilterColumn(column.key, value)}
                  />
                </div>
              </th>
            ))}
            {showActionsColumn ? (
              <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 text-center ${variant === "bordered" ? "border border-slate-300 bg-slate-50" : ""}`}>
                ACTIONS
              </th>
            ) : null}
          </tr>
        </thead>

        <tbody className={variant === "default" ? "divide-y divide-slate-100" : ""}>
          {rows.map((row) => (
            <tr key={row.id} className="group transition-colors duration-200 hover:bg-blue-50/30">
              <td className={`px-2 py-2 ${variant === "bordered" ? "border border-slate-300" : "relative"}`} onClick={(event) => event.stopPropagation()}>
                {variant === "default" && (
                  <div className="absolute left-0 top-0 h-full w-[3px] scale-y-50 bg-gradient-to-b from-blue-400 to-blue-600 opacity-0 transition-all duration-300 group-hover:scale-y-100 group-hover:opacity-100"></div>
                )}
                <CRMRowMoreOptionsMenu
                  actions={rowActions}
                  onClickAction={(actionKey) => {
                    console.log("1. MENU ACTION:", actionKey, row.id);

                    onRowAction(actionKey, row);

                    console.log("2. onRowAction CALLED");
                  }}
                />
              </td>

              {showNotes ? (
                <td className={`px-2 py-2 ${variant === "bordered" ? "border border-slate-300" : ""}`} onClick={(event) => event.stopPropagation()}>
                  <CRMRowUtilityIcons showActivity={false} onOpenNotes={() => onOpenNotes?.(row)} />
                </td>
              ) : null}

              {showActivity ? (
                <td className={`px-2 py-2 ${variant === "bordered" ? "border border-slate-300" : ""}`} onClick={(event) => event.stopPropagation()}>
                  {(row as { nextActivity?: ActivityBadge }).nextActivity ? (
                    <ActivityReminderBadge
                      activity={(row as { nextActivity: ActivityBadge }).nextActivity}
                      onClick={() => onActivityBadgeClick?.(row)}
                    />
                  ) : (
                    <CRMRowUtilityIcons
                      showNotes={false}
                      onOpenActivityAction={(actionKey) => onOpenActivityAction?.(row, actionKey)}
                    />
                  )}
                </td>
              ) : null}

              <td className={`px-3 py-2 ${variant === "bordered" ? "border border-slate-300" : ""}`} onClick={(event) => event.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(row.id)}
                  onChange={(event) => onToggleRow(row.id, event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </td>

              {visibleColumns.map((column) => (
                <td
                  key={column.key}
                  className={`${cellPaddingClass} text-slate-700 ${pinnedColumn === column.key ? "sticky z-20 bg-white" : ""} ${variant === "bordered" ? "border border-slate-300" : ""}`}
                  style={pinnedColumn === column.key ? { left: showNotes && showActivity ? 172 : 132 } : undefined}
                >
                  <button
                    type="button"
                    onClick={() => onOpenRow(row)}
                    className={`w-full text-left ${cellPaddingClass.includes("text-xs") ? "text-xs" : "text-sm"} text-slate-700 ${
                      isLongTextColumn(column.key) ? "break-all whitespace-normal" : "break-words"
                    }`}
                  >
                    {formatCellValue(column.key, row[column.key])}
                  </button>
                </td>
              ))}

              {showActionsColumn ? (
                <td className={`${cellPaddingClass} text-slate-700 whitespace-nowrap ${variant === "bordered" ? "border border-slate-300" : ""}`} onClick={(event) => event.stopPropagation()}>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      title="Update"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRowAction("edit", row);
                      }}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-100 hover:shadow-sm"
                    >
                      <Pencil size={13} className="text-blue-600" />
                      <span>Update</span>
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRowAction("delete", row);
                      }}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-100 hover:shadow-sm"
                    >
                      <Trash2 size={13} className="text-rose-600" />
                      <span>Delete</span>
                    </button>
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}