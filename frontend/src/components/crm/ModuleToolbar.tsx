import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Ellipsis,
  Filter,
  ListFilter,
  PanelsTopLeft,
  ArrowUpDown,
  LayoutGrid,
  Table,
  ChartPie,
  MapPin,
  Search,
  Check,
} from "lucide-react";

type ModuleToolbarProps = {
  viewName: string;
  createButtonLabel: string;
  baseRoute?: string;
  importPrimaryLabel?: string;
  showImportActions?: boolean;
  sortFields?: string[];
  sortFieldKeyMap?: Partial<Record<string, string>>;
  isFilterOpen: boolean;
  onToggleFilter: () => void;
  onCreateClick: () => void;
  onApplySort?: (columnKey: string | null, direction: "asc" | "desc") => void;
  onMassAction?: (action: "mass-delete" | "mass-update") => void;
  viewMode?: "list" | "table" | "grid" | "kanban" | "chart";
  onViewModeChange?: (mode: "list" | "table" | "grid" | "kanban" | "chart") => void;
};

const defaultSortFields = [
  "None",
  "Address - City",
  "Address - Country / Region",
  "Company",
  "Created Time",
  "Email",
  "First Name",
  "Last Name",
  "Lead Name",
  "Lead Owner",
  "Lead Source",
  "Lead Status",
  "Phone",
  "Rating",
  "Title",
  "Website",
];

export default function ModuleToolbar({
  viewName,
  createButtonLabel,
  baseRoute,
  importPrimaryLabel,
  showImportActions = true,
  sortFields,
  sortFieldKeyMap,
  isFilterOpen,
  onToggleFilter,
  onCreateClick,
  onApplySort,
  onMassAction,
  viewMode = "table",
  onViewModeChange,
}: ModuleToolbarProps) {
  const navigate = useNavigate();

  const fields = sortFields?.length ? sortFields : defaultSortFields;

  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [fieldDropdownOpen, setFieldDropdownOpen] = useState(false);
  const [orderDropdownOpen, setOrderDropdownOpen] = useState(false);
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const [ellipsisMenuOpen, setEllipsisMenuOpen] = useState(false);
  const ellipsisMenuRef = useRef<HTMLDivElement | null>(null);
  
  const [topEllipsisOpen, setTopEllipsisOpen] = useState(false);
  const topEllipsisRef = useRef<HTMLDivElement | null>(null);

  const [selectedField, setSelectedField] = useState(fields[0] ?? "None");
  const [selectedOrder, setSelectedOrder] = useState<"Ascending" | "Descending">(
    "Ascending"
  );
  const [searchText, setSearchText] = useState("");

  const modalRef = useRef<HTMLDivElement | null>(null);
  const importMenuRef = useRef<HTMLDivElement | null>(null);

  const filteredFields = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return fields;
    return fields.filter((item) => item.toLowerCase().includes(q));
  }, [fields, searchText]);

  const singularModuleName = useMemo(() => {
    if (createButtonLabel.startsWith("Create ")) {
      return createButtonLabel.replace("Create ", "").trim();
    }
    return "Record";
  }, [createButtonLabel]);

  const fallbackImportPrimaryLabel = useMemo(
    () => `Import ${singularModuleName}s`,
    [singularModuleName]
  );

  const moduleBaseRoute = useMemo(() => {
    if (baseRoute) return baseRoute;
    const normalized = singularModuleName.toLowerCase();

    if (normalized === "contact") return "/contacts";
    if (normalized === "account") return "/accounts";
    if (normalized === "deal") return "/deals";
    if (normalized === "product") return "/products";
    if (normalized === "price book") return "/price-books";
    if (normalized === "quote") return "/quotes";
    if (normalized === "sales order") return "/sales-orders";
    if (normalized === "purchase order") return "/purchase-orders";
    if (normalized === "invoice") return "/invoices";
    if (normalized === "vendor") return "/vendors";
    return "/leads";
  }, [baseRoute, singularModuleName]);

  const normalizedModuleName = singularModuleName.toLowerCase();
  const isDealsToolbar = normalizedModuleName === "deal";
  const hidePostSortIconStrip = ["lead", "contact", "account", "deal"].includes(normalizedModuleName);

  const primaryActionClass = isDealsToolbar
    ? "cursor-pointer rounded-xl border border-indigo-400/20 bg-[linear-gradient(135deg,#4537d4_0%,#176de5_68%,#10bde8_135%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(40,74,210,0.20)] transition duration-150 hover:-translate-y-0.5 hover:brightness-105"
    : "cursor-pointer rounded-md bg-gradient-to-b from-blue-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition duration-150 hover:shadow-sm";
  const primaryDropdownClass = isDealsToolbar
    ? "cursor-pointer rounded-xl border border-indigo-400/20 bg-[linear-gradient(135deg,#4537d4_0%,#176de5_68%,#10bde8_135%)] px-3 py-2 text-white shadow-[0_10px_24px_rgba(40,74,210,0.20)] transition duration-150 hover:-translate-y-0.5 hover:brightness-105"
    : "cursor-pointer rounded-md bg-gradient-to-b from-blue-500 to-blue-600 px-3 py-2 text-white transition duration-150 hover:shadow-sm";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        importMenuRef.current &&
        !importMenuRef.current.contains(event.target as Node)
      ) {
        setImportMenuOpen(false);
      }

      if (
        ellipsisMenuRef.current &&
        !ellipsisMenuRef.current.contains(event.target as Node)
      ) {
        setEllipsisMenuOpen(false);
      }

      if (
        topEllipsisRef.current &&
        !topEllipsisRef.current.contains(event.target as Node)
      ) {
        setTopEllipsisOpen(false);
      }

    if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setSortModalOpen(false);
        setFieldDropdownOpen(false);
        setOrderDropdownOpen(false);
   }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const currentField = fields.includes(selectedField) ? selectedField : (fields[0] ?? "None");

  const handleApplySort = () => {
    const mappedKey = sortFieldKeyMap?.[currentField] ?? null;
    const direction = selectedOrder === "Ascending" ? "asc" : "desc";
    onApplySort?.(mappedKey, direction);
    setSortModalOpen(false);
    setFieldDropdownOpen(false);
    setOrderDropdownOpen(false);
  };

  const handleCancelSort = () => {
    setSortModalOpen(false);
    setFieldDropdownOpen(false);
    setOrderDropdownOpen(false);
    setSearchText("");
  };

  const handleImportPrimary = () => {
    navigate(`${moduleBaseRoute}/import`);
    setImportMenuOpen(false);
  };

  const handleImportNotes = () => {
    navigate(`${moduleBaseRoute}/import-notes`);
    setImportMenuOpen(false);
  };

  const toolbarIconButtonClass =
    "relative flex cursor-pointer items-center justify-center rounded-lg p-2 text-slate-500 transition-all duration-200 hover:bg-gradient-to-b hover:from-slate-50 hover:to-slate-100 hover:text-slate-700 hover:shadow-[0_2px_8px_rgba(15,23,42,0.08)] active:scale-95 active:bg-slate-200";

  const toolbarIconActiveClass =
    "relative flex cursor-pointer items-center justify-center rounded-lg bg-gradient-to-b from-blue-50 to-blue-100/80 p-2 text-blue-600 shadow-[0_2px_8px_rgba(37,99,235,0.15),inset_0_1px_0_rgba(255,255,255,0.8)] ring-1 ring-blue-200/60 transition-all duration-200 hover:from-blue-100 hover:to-blue-150 hover:shadow-[0_4px_12px_rgba(37,99,235,0.2)] active:scale-95";

  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex items-center gap-3">
          <button className="cursor-pointer rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition duration-150 hover:bg-slate-200 hover:shadow-sm">
            {viewName}
          </button>

          <div className="relative" ref={topEllipsisRef}>
            <button 
              type="button" 
              onClick={() => setTopEllipsisOpen((prev) => !prev)}
              className={toolbarIconButtonClass}
            >
              <Ellipsis size={18} />
            </button>
            {topEllipsisOpen && (
              <div className="absolute left-0 top-[40px] z-50 min-w-[150px] rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => setTopEllipsisOpen(false)}
                  className="block w-full px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  Manage Views
                </button>
                <button
                  type="button"
                  onClick={() => setTopEllipsisOpen(false)}
                  className="block w-full px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  Page Settings
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCreateClick}
            className={primaryActionClass}
          >
            {createButtonLabel}
          </button>

          {showImportActions && (
            <div className="relative" ref={importMenuRef}>
              <button
                type="button"
                onClick={() => setImportMenuOpen((prev) => !prev)}
                className={primaryDropdownClass}
              >
                <ChevronDown size={16} />
              </button>

              {importMenuOpen && (
                <div className="absolute right-0 top-[42px] z-50 min-w-[170px] rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={handleImportPrimary}
                    className="block w-full px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                  >
                    {importPrimaryLabel ?? fallbackImportPrimaryLabel}
                  </button>

                  <button
                    type="button"
                    onClick={handleImportNotes}
                    className="block w-full px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                  >
                    Import Notes
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => onMassAction?.("mass-delete")}
            className="cursor-pointer rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition duration-150 hover:bg-red-100 hover:shadow-sm"
          >
            Mass Delete
          </button>
          <div className="relative" ref={ellipsisMenuRef}>
            <button
              type="button"
              onClick={() => setEllipsisMenuOpen((prev) => !prev)}
              className="cursor-pointer rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-slate-700 transition duration-150 hover:bg-slate-200 hover:shadow-sm"
            >
              <Ellipsis size={16} />
            </button>

            {ellipsisMenuOpen && (
              <div className="absolute right-0 top-[42px] z-50 min-w-[160px] rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setEllipsisMenuOpen(false);
                    onMassAction?.("mass-delete");
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                >
                  Mass Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleFilter}
            className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-slate-700 transition duration-150 hover:shadow-sm active:bg-slate-200 ${
              isFilterOpen ? "bg-slate-100 shadow-sm" : "hover:bg-slate-100"
            }`}
          >
            <Filter size={16} />
            <span>Filter</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSortModalOpen((prev) => !prev);
              setFieldDropdownOpen(false);
              setOrderDropdownOpen(false);
            }}
            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-slate-700 transition duration-150 hover:bg-slate-100 hover:shadow-sm active:bg-slate-200"
          >
            <ArrowUpDown size={16} />
            <span>Sort</span>
          </button>

          {!hidePostSortIconStrip && (
            <>
              <div className="mx-1.5 h-5 w-px bg-slate-200" />

              <button
                type="button"
                id="module-toolbar-list-view"
                aria-label="List View"
                onClick={() => onViewModeChange?.("list")}
                className={`group ${viewMode === "list" ? toolbarIconActiveClass : toolbarIconButtonClass}`}
              >
                <ListFilter size={16} />
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-sm transition-all duration-200 group-hover:-top-10 group-hover:opacity-100 z-50">
                  List View
                  <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-800"></span>
                </span>
              </button>

              <button
                type="button"
                id="module-toolbar-panels-view"
                aria-label="Panels View"
                onClick={() => onViewModeChange?.("kanban")}
                className={`group ${viewMode === "kanban" ? toolbarIconActiveClass : toolbarIconButtonClass}`}
              >
                <PanelsTopLeft size={16} />
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-sm transition-all duration-200 group-hover:-top-10 group-hover:opacity-100 z-50">
                  Layout View
                  <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-800"></span>
                </span>
              </button>

              <button
                type="button"
                id="module-toolbar-table-view"
                aria-label="Table View"
                onClick={() => onViewModeChange?.("table")}
                className={`group ${viewMode === "table" ? toolbarIconActiveClass : toolbarIconButtonClass}`}
              >
                <Table size={16} />
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-sm transition-all duration-200 group-hover:-top-10 group-hover:opacity-100 z-50">
                  Table View
                  <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-800"></span>
                </span>
              </button>

              <button
                type="button"
                id="module-toolbar-chart-view"
                aria-label="Chart View"
                onClick={() => onViewModeChange?.("chart")}
                className={`group ${viewMode === "chart" ? toolbarIconActiveClass : toolbarIconButtonClass}`}
              >
                <ChartPie size={16} />
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-sm transition-all duration-200 group-hover:-top-10 group-hover:opacity-100 z-50">
                  Chart View
                  <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-800"></span>
                </span>
              </button>

              <button
                type="button"
                id="module-toolbar-grid-view"
                aria-label="Grid View"
                onClick={() => onViewModeChange?.("grid")}
                className={`group ${viewMode === "grid" ? toolbarIconActiveClass : toolbarIconButtonClass}`}
              >
                <LayoutGrid size={16} />
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-sm transition-all duration-200 group-hover:-top-10 group-hover:opacity-100 z-50">
                  Grid View
                  <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-800"></span>
                </span>
              </button>

              <button type="button" aria-label="Map View" className={`group ${toolbarIconButtonClass}`}>
                <MapPin size={16} />
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-sm transition-all duration-200 group-hover:-top-10 group-hover:opacity-100 z-50">
                  Map View
                  <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-800"></span>
                </span>
              </button>

              <button type="button" aria-label="More Views" className={`group ${toolbarIconButtonClass}`}>
                <ChevronDown size={16} />
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-sm transition-all duration-200 group-hover:-top-10 group-hover:opacity-100 z-50">
                  More Views
                  <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-800"></span>
                </span>
              </button>
            </>
          )}
        </div>

        {sortModalOpen && (
          <div
            ref={modalRef}
            className="absolute left-[78px] top-[52px] z-50 w-[385px] rounded-lg border border-slate-300 bg-white shadow-xl"
          >
            <div className="p-5">
              <h3 className="mb-5 text-[15px] font-medium text-slate-700">
                Sort By
              </h3>

              <div className="flex gap-3">
                <div className="relative flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFieldDropdownOpen((prev) => !prev);
                      setOrderDropdownOpen(false);
                    }}
                    className="flex h-[38px] w-full cursor-pointer items-center justify-between rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <span className="truncate">{currentField}</span>
                    <ChevronDown size={16} className="text-slate-500" />
                  </button>

                  {fieldDropdownOpen && (
                    <div className="absolute left-0 top-[42px] z-50 w-[380px] rounded-md border border-slate-300 bg-white shadow-lg">
                      <div className="border-b border-slate-200 p-2">
                        <div className="flex items-center gap-2 rounded-md border border-blue-500 px-3 py-2">
                          <Search size={16} className="text-slate-500" />
                          <input
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            placeholder="Search"
                            className="w-full bg-transparent text-sm outline-none"
                          />
                        </div>
                      </div>

                      <div className="max-h-[220px] overflow-y-auto p-1">
                        {filteredFields.map((field) => (
                          <button
                            key={field}
                            type="button"
                            onClick={() => {
                              setSelectedField(field);
                              setFieldDropdownOpen(false);
                              setSearchText("");
                            }}
                            className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition ${
                              selectedField === field
                                ? "bg-slate-100 font-medium text-slate-800"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <span className="w-4">
                              {selectedField === field && <Check size={16} />}
                            </span>
                            <span className="truncate">{field}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative w-[152px]">
                  <button
                    type="button"
                    onClick={() => {
                      setOrderDropdownOpen((prev) => !prev);
                      setFieldDropdownOpen(false);
                    }}
                    className="flex h-[38px] w-full cursor-pointer items-center justify-between rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <span>{selectedOrder}</span>
                    <ChevronDown size={16} className="text-slate-500" />
                  </button>

                  {orderDropdownOpen && (
                    <div className="absolute left-0 top-[42px] z-50 w-full rounded-md border border-slate-300 bg-white shadow-lg">
                      {(["Ascending", "Descending"] as const).map((order) => (
                        <button
                          key={order}
                          type="button"
                          onClick={() => {
                            setSelectedOrder(order);
                            setOrderDropdownOpen(false);
                          }}
                          className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition ${
                            selectedOrder === order
                              ? "bg-slate-100 font-medium text-slate-800"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span className="w-4">
                            {selectedOrder === order && <Check size={16} />}
                          </span>
                          <span>{order}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelSort}
                  className="cursor-pointer rounded-md border border-slate-300 bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-700 transition duration-150 hover:bg-slate-200 hover:shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplySort}
                  className="cursor-pointer rounded-md bg-gradient-to-b from-blue-500 to-blue-600 px-4 py-1.5 text-sm font-semibold text-white transition duration-150 hover:shadow-sm"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
