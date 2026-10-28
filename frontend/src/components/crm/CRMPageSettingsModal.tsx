import { useState, useMemo, useEffect } from "react";
import {
  Columns3,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Pin,
  Search,
  Check,
  RotateCcw,
  Layers,
} from "lucide-react";
import CRMModalBase from "./CRMModalBase";

export type DensityMode = "compact" | "normal" | "comfortable";

export type PageSettingsValues = {
  hiddenColumns: string[];
  pageSize: number;
  density: DensityMode;
  pinnedColumn: string | null;
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  filterOpen?: boolean;
  showNotes?: boolean;
  showActivity?: boolean;
};

type CRMPageSettingsModalProps = {
  open: boolean;
  onClose: () => void;
  viewName: string;
  moduleName?: string;
  columns: Array<{ key: string; label: string; minWidth?: string }>;
  hiddenColumns: string[];
  pageSize: number;
  density: DensityMode;
  pinnedColumn: string | null;
  sortState?: { key: string; direction: "asc" | "desc" } | null;
  filterOpen?: boolean;
  showNotes?: boolean;
  showActivity?: boolean;
  initialTab?: "columns" | "table" | "views";
  onApply: (settings: PageSettingsValues) => void;
  onResetDefaults?: () => void;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200, 1000];

export default function CRMPageSettingsModal({
  open,
  onClose,
  viewName,
  moduleName = "Records",
  columns,
  hiddenColumns: initialHiddenColumns,
  pageSize: initialPageSize,
  density: initialDensity,
  pinnedColumn: initialPinnedColumn,
  sortState: initialSortState,
  filterOpen: initialFilterOpen = true,
  showNotes: initialShowNotes = true,
  showActivity: initialShowActivity = false,
  initialTab = "columns",
  onApply,
  onResetDefaults,
}: CRMPageSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"columns" | "table" | "views">(initialTab);
  const [columnSearch, setColumnSearch] = useState("");

  // Working state for settings
  const [hiddenCols, setHiddenCols] = useState<string[]>(initialHiddenColumns);
  const [curPageSize, setCurPageSize] = useState<number>(initialPageSize);
  const [curDensity, setCurDensity] = useState<DensityMode>(initialDensity);
  const [curPinnedCol, setCurPinnedCol] = useState<string | null>(initialPinnedColumn);
  const [curSortCol, setCurSortCol] = useState<string | null>(initialSortState?.key || null);
  const [curSortDir, setCurSortDir] = useState<"asc" | "desc">(initialSortState?.direction || "asc");
  const [curFilterOpen, setCurFilterOpen] = useState<boolean>(initialFilterOpen);
  const [curShowNotes, setCurShowNotes] = useState<boolean>(initialShowNotes);
  const [curShowActivity, setCurShowActivity] = useState<boolean>(initialShowActivity);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setHiddenCols(initialHiddenColumns);
      setCurPageSize(initialPageSize);
      setCurDensity(initialDensity);
      setCurPinnedCol(initialPinnedColumn);
      setCurSortCol(initialSortState?.key || null);
      setCurSortDir(initialSortState?.direction || "asc");
      setCurFilterOpen(initialFilterOpen);
      setCurShowNotes(initialShowNotes);
      setCurShowActivity(initialShowActivity);
      setColumnSearch("");
    }
  }, [
    open,
    initialTab,
    initialHiddenColumns,
    initialPageSize,
    initialDensity,
    initialPinnedColumn,
    initialSortState,
    initialFilterOpen,
    initialShowNotes,
    initialShowActivity,
  ]);

  // Filter columns by search query
  const filteredColumns = useMemo(() => {
    const q = columnSearch.trim().toLowerCase();
    if (!q) return columns;
    return columns.filter(
      (col) =>
        col.label.toLowerCase().includes(q) || col.key.toLowerCase().includes(q)
    );
  }, [columns, columnSearch]);

  const visibleCount = columns.length - hiddenCols.length;

  const toggleColumn = (key: string) => {
    setHiddenCols((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
    if (curPinnedCol === key) {
      setCurPinnedCol(null);
    }
  };

  const showAllColumns = () => {
    setHiddenCols([]);
  };

  const hideAllColumns = () => {
    // Keep at least the first column visible
    const firstKey = columns[0]?.key;
    setHiddenCols(columns.map((c) => c.key).filter((k) => k !== firstKey));
  };

  const handleResetToDefaults = () => {
    setHiddenCols([]);
    setCurPageSize(25);
    setCurDensity("normal");
    setCurPinnedCol(null);
    setCurSortCol(null);
    setCurSortDir("asc");
    setCurFilterOpen(true);
    setCurShowNotes(true);
    setCurShowActivity(false);
    onResetDefaults?.();
  };

  const handleSave = () => {
    onApply({
      hiddenColumns: hiddenCols,
      pageSize: curPageSize,
      density: curDensity,
      pinnedColumn: curPinnedCol,
      sortColumn: curSortCol,
      sortDirection: curSortDir,
      filterOpen: curFilterOpen,
      showNotes: curShowNotes,
      showActivity: curShowActivity,
    });
    onClose();
  };

  return (
    <CRMModalBase
      open={open}
      title={`Page Settings — ${viewName}`}
      maxWidthClassName="max-w-2xl"
      onClose={onClose}
      footer={
        <div className="flex w-full items-center justify-between">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <RotateCcw size={14} />
            <span>Reset to Defaults</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
            >
              <Check size={16} />
              <span>Apply Settings</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("columns")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              activeTab === "columns"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            <Columns3 size={16} />
            <span>Visible Columns</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {visibleCount}/{columns.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("table")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              activeTab === "table"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            <SlidersHorizontal size={16} />
            <span>Table & Pagination</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("views")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              activeTab === "views"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            <Layers size={16} />
            <span>Manage Views</span>
          </button>
        </div>

        {/* Tab 1: Visible Columns */}
        {activeTab === "columns" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search fields / columns..."
                  value={columnSearch}
                  onChange={(e) => setColumnSearch(e.target.value)}
                  className="w-full rounded-md border border-slate-300 py-1.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={showAllColumns}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Show All
                </button>
                <button
                  type="button"
                  onClick={hideAllColumns}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Hide Optional
                </button>
              </div>
            </div>

            <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {filteredColumns.map((col) => {
                const isVisible = !hiddenCols.includes(col.key);
                const isPinned = curPinnedCol === col.key;
                return (
                  <div
                    key={col.key}
                    onClick={() => toggleColumn(col.key)}
                    className={`flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm transition ${
                      isVisible ? "bg-slate-50 text-slate-900 hover:bg-slate-100" : "text-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => {}} // Handled by container onClick
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`font-medium ${isVisible ? "text-slate-800" : "text-slate-400"}`}>
                        {col.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {isPinned ? (
                        <span className="flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
                          <Pin size={11} className="rotate-45" /> Pinned
                        </span>
                      ) : null}
                      <button
                        type="button"
                        title={isPinned ? "Unpin column" : "Pin column to left"}
                        onClick={() => setCurPinnedCol((prev) => (prev === col.key ? null : col.key))}
                        className={`rounded p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 ${
                          isPinned ? "text-amber-600" : ""
                        }`}
                      >
                        <Pin size={14} className={isPinned ? "rotate-45" : ""} />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleColumn(col.key)}
                        className="rounded p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                      >
                        {isVisible ? <Eye size={15} /> : <EyeOff size={15} />}
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredColumns.length === 0 && (
                <div className="py-6 text-center text-sm text-slate-400">
                  No columns match "{columnSearch}"
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500">
              Tip: Click any field to toggle visibility. Pinned columns stay anchored on the left when scrolling horizontally.
            </p>
          </div>
        )}

        {/* Tab 2: Table & Pagination */}
        {activeTab === "table" && (
          <div className="space-y-5">
            {/* Records per page */}
            <div>
              <label className="block text-sm font-semibold text-slate-800">
                Records per page
              </label>
              <p className="mb-2 text-xs text-slate-500">
                Choose how many records to display in the table at once.
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setCurPageSize(size)}
                    className={`rounded-lg border px-3 py-2 text-center text-sm font-medium transition ${
                      curPageSize === size
                        ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-600"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {size === 1000 ? "All" : size}
                  </button>
                ))}
              </div>
            </div>

            {/* Row Density */}
            <div>
              <label className="block text-sm font-semibold text-slate-800">
                Display Density
              </label>
              <p className="mb-2 text-xs text-slate-500">
                Adjust row height and spacing for compact data viewing or spacious scanning.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "compact" as const, label: "Compact", desc: "Maximum records on screen" },
                  { id: "normal" as const, label: "Normal", desc: "Balanced standard view" },
                  { id: "comfortable" as const, label: "Comfortable", desc: "Spacious row padding" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurDensity(item.id)}
                    className={`flex flex-col items-start rounded-lg border p-3 text-left transition ${
                      curDensity === item.id
                        ? "border-blue-600 bg-blue-50/60 ring-1 ring-blue-600"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className={`text-sm font-semibold ${curDensity === item.id ? "text-blue-800" : "text-slate-800"}`}>
                      {item.label}
                    </span>
                    <span className="mt-1 text-xs text-slate-500">
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pinned / Frozen Column */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-800">
                  Frozen Column
                </label>
                <p className="mb-1.5 text-xs text-slate-500">
                  Keep column fixed on the left during horizontal scroll.
                </p>
                <select
                  value={curPinnedCol || ""}
                  onChange={(e) => setCurPinnedCol(e.target.value || null)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">None (no pinned column)</option>
                  {columns
                    .filter((c) => !hiddenCols.includes(c.key))
                    .map((col) => (
                      <option key={col.key} value={col.key}>
                        {col.label}
                      </option>
                    ))}
                </select>
              </div>

              {/* Default Sort */}
              <div>
                <label className="block text-sm font-semibold text-slate-800">
                  Default Sorting
                </label>
                <p className="mb-1.5 text-xs text-slate-500">
                  Select default column and order.
                </p>
                <div className="flex gap-2">
                  <select
                    value={curSortCol || ""}
                    onChange={(e) => setCurSortCol(e.target.value || null)}
                    className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">Default order</option>
                    {columns.map((col) => (
                      <option key={col.key} value={col.key}>
                        {col.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={curSortDir}
                    onChange={(e) => setCurSortDir(e.target.value as "asc" | "desc")}
                    disabled={!curSortCol}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="asc">Asc</option>
                    <option value="desc">Desc</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Manage Views */}
        {activeTab === "views" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-blue-950">Active View: {viewName}</h4>
                  <p className="mt-0.5 text-xs text-blue-700">
                    Showing standard workspace view for {moduleName}.
                  </p>
                </div>
                <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white">
                  Current
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-800">View Preferences</h4>

              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-800">Open Filter Sidebar by default</p>
                  <p className="text-xs text-slate-500">Keep filter panel expanded when opening this module</p>
                </div>
                <input
                  type="checkbox"
                  checked={curFilterOpen}
                  onChange={(e) => setCurFilterOpen(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-800">Show Quick Note Action</p>
                  <p className="text-xs text-slate-500">Display the note shortcut button on table rows</p>
                </div>
                <input
                  type="checkbox"
                  checked={curShowNotes}
                  onChange={(e) => setCurShowNotes(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-800">Show Activity Shortcuts</p>
                  <p className="text-xs text-slate-500">Display task/meeting/call shortcuts on table rows</p>
                </div>
                <input
                  type="checkbox"
                  checked={curShowActivity}
                  onChange={(e) => setCurShowActivity(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </CRMModalBase>
  );
}
