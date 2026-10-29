import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import ModuleToolbar from "../../components/crm/ModuleToolbar";
import FilterSidebar from "../../components/crm/FilterSidebar";
import CRMTable from "../../components/crm/CRMTable";
import CRMPagination from "../../components/crm/CRMPagination";
import { filterRecords, sortRecords } from "../../lib/shared/crmHelpers";
import type { CRMColumn, CRMRecord } from "../../lib/shared/crmTypes";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { addInventoryNote, convertQuoteToSalesOrder, convertSalesOrderToInvoice, deleteInventoryRecord, getInventoryList } from "../api";
import { getInventoryMeta, getInventorySortConfig } from "../config";
import { formatMoney } from "../utils";
import { DeleteModal, LogCallModal, MassDeleteModal, MassUpdateModal, NoteModal, ScheduleCallModal } from "../../components/crm/CRMActionModals";
import { apiRequest } from "../../api/client";
import type { InventoryDetailResponse, InventoryModuleKey } from "../types";
import InventoryDocumentPreviewModal from "./InventoryDocumentPreviewModal";

type InventoryListPageProps = {
  moduleKey: InventoryModuleKey;
};

const INVENTORY_CHART_COLORS = ["#ec4899", "#f97316", "#facc15", "#14b8a6", "#6366f1", "#8b5cf6"];
const HIDE_ROW_ACTIONS_MODULES = new Set<InventoryModuleKey>([
  "products",
  "price-books",
  "quotes",
  "sales-orders",
  "purchase-orders",
  "invoices",
  "vendors",
]);

function sampleDocument(moduleKey: "invoices" | "purchase-orders"): InventoryDetailResponse {
  const isInvoice = moduleKey === "invoices";
  const today = new Date();
  const due = new Date(today);
  due.setDate(due.getDate() + 15);
  const dateValue = (date: Date) => date.toISOString().slice(0, 10);

  return {
    id: isInvoice ? "INV-SAMPLE-001" : "PO-SAMPLE-001",
    name: isInvoice ? "LuxOne CRM Annual Subscription" : "LuxOne Software Procurement",
    subtitle: "Draft template",
    avatar: isInvoice ? "IN" : "PO",
    summary: [],
    fields: [],
    timeline: [],
    documentNumber: isInvoice ? "INV-2026-001" : "PO-2026-001",
    documentDate: dateValue(today),
    dueDate: dateValue(due),
    partyName: isInvoice ? "Acme Technologies Pvt Ltd" : "Cloud Systems India Pvt Ltd",
    contactName: isInvoice ? "Accounts Payable" : "Vendor Sales Team",
    status: "Draft",
    billingStreet: "12 Business Park, Hyderabad, Telangana, India 500081",
    shippingStreet: "Luxmor AI Technologies Pvt Ltd, Hyderabad, Telangana, India",
    subtotal: 120000,
    discount: 5000,
    tax: 20700,
    adjustment: 0,
    grandTotal: 135700,
    description: isInvoice
      ? "Annual LuxOne CRM subscription including onboarding and priority support."
      : "Sample purchase order for software licences and implementation services.",
    termsAndConditions: "Payment is due within 15 days. This is a sample template and does not represent a real transaction.",
    items: [
      {
        product: "luxone-enterprise",
        productName: "LuxOne Enterprise CRM",
        productCode: "LUX-CRM-ENT",
        quantity: 10,
        listPrice: 10000,
        amount: 100000,
        discount: 5000,
        tax: 17100,
        total: 112100,
        rowDescription: "Annual named-user licences",
      },
      {
        product: "implementation",
        productName: "Implementation & Onboarding",
        productCode: "LUX-IMP-01",
        quantity: 1,
        listPrice: 20000,
        amount: 20000,
        discount: 0,
        tax: 3600,
        total: 23600,
        rowDescription: "Configuration, migration, and team onboarding",
      },
    ],
  };
}

export default function InventoryListPage({ moduleKey }: InventoryListPageProps) {
  const meta = getInventoryMeta(moduleKey);
  const sortConfig = useMemo(() => getInventorySortConfig(moduleKey), [moduleKey]);
  const navigate = useNavigate();
  const [rows, setRows] = useState<CRMRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [pinnedColumn, setPinnedColumn] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<Partial<Record<string, string>>>({});
  const [sidebarFilters, setSidebarFilters] = useState<Record<string, string>>({});
  const [sortState, setSortState] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [filterOpen, setFilterOpen] = useState(true);
  const [globalSearch, setGlobalSearch] = useState("");
  const [samplePreviewOpen, setSamplePreviewOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "table" | "grid" | "kanban" | "chart">("table");
  const [massAction, setMassAction] = useState<"mass-delete" | "mass-update" | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<CRMRecord | null>(null);
  const [activeVendorName, setActiveVendorName] = useState("");
  const [activeNoteVendor, setActiveNoteVendor] = useState<CRMRecord | null>(null);
  const [activityModal, setActivityModal] = useState<"schedule-call" | "meeting" | "task" | "log-call" | null>(null);
  const supportsDocumentPreview = moduleKey === "invoices" || moduleKey === "purchase-orders";

  useEffect(() => {
    const handleSearch = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      setGlobalSearch(customEvent.detail);
      setPage(1);
    };
    window.addEventListener("topbar:search", handleSearch);
    return () => window.removeEventListener("topbar:search", handleSearch);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setRows(await getInventoryList(moduleKey));
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to load ${meta.title.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  }, [meta.title, moduleKey]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSortState(null);
    setPage(1);
  }, [moduleKey]);

  const visibleColumns = useMemo(
    () => meta.columns.filter((column) => !hiddenColumns.includes(column.key)),
    [hiddenColumns, meta.columns]
  );

  const processedRows = useMemo(() => {
    const combined = { ...sidebarFilters, ...columnFilters };
    let output = filterRecords(rows, visibleColumns as unknown as CRMColumn<CRMRecord>[], combined, globalSearch);
    if (sortState) {
      output = sortRecords(output, sortState.key as keyof CRMRecord & string, sortState.direction);
    }
    return output;
  }, [rows, visibleColumns, sidebarFilters, columnFilters, sortState, globalSearch]);

  const chartDistribution = useMemo(() => {
    const categoryFields: Partial<Record<InventoryModuleKey, string[]>> = {
      products: ["productCategory", "productType", "billingCycle", "deploymentModel"],
      vendors: ["category", "status"],
      "price-books": ["pricingModel", "active"],
      quotes: ["quoteStage", "status"],
      "sales-orders": ["status"],
      "purchase-orders": ["status"],
      invoices: ["status"],
      configurator: ["targetModule", "active"],
    };
    const fields = [
      ...(categoryFields[moduleKey] ?? []),
      "status",
      "category",
      "type",
    ];
    const getValue = (row: CRMRecord, field: string) => {
      const value = (row as Record<string, unknown>)[field];
      if (typeof value === "boolean") return value ? "Active" : "Inactive";
      if (typeof value === "string" || typeof value === "number") {
        return String(value).trim();
      }
      return "";
    };
    const groupField = fields.find((field) => processedRows.some((row) => getValue(row, field)));
    const counts = new Map<string, number>();

    processedRows.forEach((row) => {
      const category = groupField ? getValue(row, groupField) || "Uncategorized" : "All Records";
      counts.set(category, (counts.get(category) ?? 0) + 1);
    });

    const sorted = [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5);
    const remaining = [...counts.entries()].sort((left, right) => right[1] - left[1]).slice(5);
    const remainingCount = remaining.reduce((total, [, count]) => total + count, 0);

    if (remainingCount > 0) sorted.push(["Other", remainingCount]);

    return {
      groupLabel: groupField
        ? groupField.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())
        : "Records",
      data: sorted.map(([name, count]) => ({ name, count })),
    };
  }, [moduleKey, processedRows]);

  const pageSize = 10;
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processedRows.slice(start, start + pageSize);
  }, [page, pageSize, processedRows]);

  const handleMassDelete = async () => {
    try {
      const targetIds = selectedIds.length > 0 ? selectedIds : processedRows.map((r) => r.id);
      await Promise.all(
        targetIds.map(async (id) => {
          try {
            await deleteInventoryRecord(moduleKey, id);
          } catch {
            // Ignore individual deletion errors for sample items or non-existing records
          }
        })
      );
    } finally {
      setSelectedIds([]);
      setMassAction(null);
      await load();
    }
  };

  const handleMassUpdate = async (updates: Record<string, string>) => {
    const targetIds = selectedIds.length > 0 ? selectedIds : processedRows.map((r) => r.id);
    const cleanedUpdates: Record<string, unknown> = { ...updates };
    if (cleanedUpdates.owner && isNaN(Number(cleanedUpdates.owner))) {
      delete cleanedUpdates.owner;
    }
    if (Object.keys(cleanedUpdates).length === 0) return;
    await Promise.all(
      targetIds.map((id) =>
        apiRequest(`${meta.baseRoute}/${id}/`, {
          method: "PATCH",
          body: JSON.stringify(cleanedUpdates),
        })
      )
    );
    setSelectedIds([]);
    setMassAction(null);
    void load();
  };

  if (loading) {
    return <div className="p-6 text-sm text-slate-600">Loading {meta.title.toLowerCase()}...</div>;
  }

  if (error) {
    return <div className="p-6 text-sm text-rose-600">{error}</div>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <ModuleToolbar
          viewName={meta.title}
          createButtonLabel={meta.createLabel}
          massDeleteLabel="Delete"
          baseRoute={meta.baseRoute}
          importPrimaryLabel={meta.importLabel}
          showImportActions={Boolean(meta.importRoute)}
          sortFields={sortConfig.sortFields}
          sortFieldKeyMap={sortConfig.sortFieldKeyMap}
          isFilterOpen={filterOpen}
          onToggleFilter={() => setFilterOpen((prev) => !prev)}
          onCreateClick={() => navigate(meta.createRoute || `${meta.baseRoute}/create`)}
          onApplySort={(key, direction) => {
            setSortState(key ? { key, direction } : null);
            setPage(1);
          }}
          sortState={sortState}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onMassAction={setMassAction}
        />

        {meta.extraHeaderAction && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate(meta.extraHeaderAction!.route)}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
            >
              {meta.extraHeaderAction.label}
            </button>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-8 py-16 text-center">
            <h1 className="text-2xl font-semibold text-slate-900">{meta.emptyTitle}</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500">{meta.emptyDescription}</p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate(meta.createRoute || `${meta.baseRoute}/create`)}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
              >
                {meta.createLabel}
              </button>
              {supportsDocumentPreview && (
                <button
                  type="button"
                  onClick={() => setSamplePreviewOpen(true)}
                  className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                  Preview Default Template
                </button>
              )}
              {meta.importRoute && (
                <button
                  type="button"
                  onClick={() => navigate(meta.importRoute!)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700"
                >
                  {meta.importLabel}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            {filterOpen && (
              <FilterSidebar
                title={`Filter ${meta.title}`}
                sections={meta.filterSections}
                onApply={(filters) => {
                  setSidebarFilters(filters);
                  setPage(1);
                  if (moduleKey === "vendors") setFilterOpen(false);
                }}
                onClear={() => {
                  setSidebarFilters({});
                  setPage(1);
                }}
              />
            )}

            <div className="min-w-0 flex-1 space-y-3">
              {viewMode === "list" && (
                <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  {paginatedRows.map((row) => {
                    const r = row as Record<string, unknown>;
                    const title = String(r.productName || r.name || r.subject || r.vendorName || `Record #${row.id}`);
                    const badge = String(r.productCategory || r.category || r.status || r.productType || "");
                    const isSelected = selectedIds.includes(row.id);
                    const unitPrice = r.unitPrice !== undefined ? Number(r.unitPrice) : undefined;
                    const grandTotal = r.grandTotal !== undefined ? Number(r.grandTotal) : undefined;

                    return (
                      <div
                        key={row.id}
                        className={`flex items-center justify-between p-4 transition-colors hover:bg-slate-50 ${
                          isSelected ? "bg-blue-50/40" : ""
                        }`}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              setSelectedIds((prev) =>
                                e.target.checked ? [...new Set([...prev, row.id])] : prev.filter((item) => item !== row.id)
                              );
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div
                            onClick={() => navigate(`${meta.baseRoute}/${row.id}`)}
                            className="min-w-0 flex-1 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <span className="truncate font-semibold text-slate-900 hover:text-blue-600">{title}</span>
                              {badge && (
                                <span className="shrink-0 rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">
                                  {badge}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              {Boolean(r.productCode) && <span>SKU: {String(r.productCode)}</span>}
                              {Boolean(r.vendorName || r.owner) && <span>{String(r.vendorName || r.owner)}</span>}
                              {r.quantityInStock !== undefined && <span>Stock: {String(r.quantityInStock)}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-4 pl-4">
                          {unitPrice !== undefined && (
                            <div className="text-right">
                              <div className="text-base font-bold text-slate-900">{formatMoney(unitPrice)}</div>
                              {Boolean(r.billingCycle) && (
                                <div className="text-xs text-slate-500">{String(r.billingCycle)}</div>
                              )}
                            </div>
                          )}
                          {grandTotal !== undefined && unitPrice === undefined && (
                            <div className="text-right">
                              <div className="text-base font-bold text-slate-900">{formatMoney(grandTotal)}</div>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => navigate(`${meta.baseRoute}/${row.id}`)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {viewMode === "table" && (
                <CRMTable
                  rows={paginatedRows}
                  columns={visibleColumns as unknown as CRMColumn<CRMRecord>[]}
                  rowActions={meta.rowActions}
                  selectedIds={selectedIds}
                  hiddenColumns={hiddenColumns}
                  pinnedColumn={pinnedColumn}
                  columnFilters={columnFilters}
                  showNotes={moduleKey === "vendors"}
                  showActivity={moduleKey === "vendors"}
                  showActionsColumn={!HIDE_ROW_ACTIONS_MODULES.has(moduleKey)}
                  onToggleAll={(checked) => {
                    setSelectedIds(checked ? paginatedRows.map((row) => row.id) : []);
                  }}
                  onToggleRow={(id, checked) => {
                    setSelectedIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((item) => item !== id)));
                  }}
                  onOpenRow={(row) => navigate(`${meta.baseRoute}/${row.id}`)}
                  onOpenNotes={moduleKey === "vendors" ? (row) => setActiveNoteVendor(row) : undefined}
                  onOpenActivityAction={(row, actionKey) => {
                    const r = row as Record<string, unknown>;

                    const vendorName = String(
                      r.vendorName || r.name || `Vendor #${row.id}`
                    );

                    setActiveVendorName(vendorName);

                    if (actionKey === "schedule-call") {
                      setActivityModal("schedule-call");
                    } else if (actionKey === "log-call") {
                     setActivityModal("log-call");
                    } else if (actionKey === "create-task") {
                      const params = new URLSearchParams({ vendorName });
                      navigate(`/tasks/create?${params.toString()}`);
                    } else if (actionKey === "create-meeting") {
                      const params = new URLSearchParams({ vendorName });
                      navigate(`/meetings/create?${params.toString()}`);
                    }
                  }}
                  onRowAction={async (actionKey, row) => {
                    console.log("ROW ACTION FIRED:", actionKey, row.id);
                    if (actionKey === "create-meeting") {
                      const r = row as Record<string, unknown>;

                      const vendorName = String(
                        r.vendorName || r.name || `Vendor #${row.id}`
                     );

                     const params = new URLSearchParams({ vendorName });

                     navigate(`/meetings/create?${params.toString()}`);

                     return;
                    }
                   if (actionKey === "create-task") {
                     console.log(" CREATE TASK CLICKED");

                     const vendor = row as Record<string, unknown>;

                     const vendorName = String(
                       vendor.vendorName ?? vendor.name ?? `Vendor #${row.id}`
                     );

                     const params = new URLSearchParams();
                     params.set("vendorName", vendorName);

                     const targetUrl = `/tasks/create?${params.toString()}`;

                     console.log("Target URL:", targetUrl);

                     navigate(targetUrl);

                     return;
                  }
                    console.log("Clicked actionKey:", actionKey);
                    if (actionKey === "create-call" || actionKey === "schedule-call") {
                      const r = row as Record<string, unknown>;
                      setActiveVendorName(String(r.vendorName || r.name || `Vendor #${row.id}`));
                      setActivityModal("schedule-call");
                      return;
                    }
                    if (actionKey === "log-call") {
                      const r = row as Record<string, unknown>;
                      setActiveVendorName(String(r.vendorName || r.name || `Vendor #${row.id}`));
                      setActivityModal("log-call");
                      return;
                    }
                    if (actionKey === "open" || actionKey === "edit") {
                      navigate(`${meta.baseRoute}/${row.id}`);
                      return;
                    }
                    if (actionKey === "preview") {
                      navigate(`${meta.baseRoute}/${row.id}?preview=1`);
                      return;
                    }
                    if (actionKey === "duplicate") {
                      navigate(`${meta.baseRoute}/create?duplicate=${encodeURIComponent(row.id)}`);
                      return;
                    }
                    if (actionKey === "delete") {
                      setRecordToDelete(row);
                      return;
                    }
                    if (actionKey === "convert-to-sales-order") {
                      const response = await convertQuoteToSalesOrder(row.id);
                      navigate(`/sales-orders/${response.id}`);
                      return;
                    }
                    if (actionKey === "convert-to-invoice") {
                      const response = await convertSalesOrderToInvoice(row.id);
                      navigate(`/invoices/${response.id}`);
                      return;
                    }
                    if (actionKey === "create-service-appointment") {
                      const query =
                        moduleKey === "sales-orders"
                          ? `?salesOrder=${encodeURIComponent(row.id)}`
                          : `?invoice=${encodeURIComponent(row.id)}`;
                      navigate(`/services/appointments/create${query}`);
                      return;
                    }
                    if (actionKey === "create-project") {
                      const inventoryRow = row as Record<string, unknown>;
                      const params = new URLSearchParams({
                        sourceModule: moduleKey,
                        sourceId: row.id,
                        sourceLabel: String(inventoryRow.subject || inventoryRow.name || meta.singular),
                        name: String(inventoryRow.subject || meta.singular),
                        accountName: String(inventoryRow.accountName || ""),
                        contactName: String(inventoryRow.contactName || ""),
                        dealName: String(inventoryRow.dealName || ""),
                        owner: String(inventoryRow.owner || ""),
                        dueDate: String(inventoryRow.dueDate || ""),
                      });
                      navigate(`/projects/create?${params.toString()}`);
                    }
                  }}
                  onSortColumn={(columnKey, direction) => setSortState({ key: columnKey, direction })}
                  onToggleHideColumn={(columnKey) => {
                    setHiddenColumns((prev) =>
                      prev.includes(columnKey) ? prev.filter((item) => item !== columnKey) : [...prev, columnKey]
                    );
                  }}
                  onTogglePinColumn={(columnKey) => setPinnedColumn((prev) => (prev === columnKey ? null : columnKey))}
                  onFilterColumn={(columnKey, value) => setColumnFilters((prev) => ({ ...prev, [columnKey]: value }))}
                />
              )}

              {viewMode === "grid" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {paginatedRows.map((row) => {
                    const r = row as Record<string, unknown>;
                    const title = String(r.productName || r.name || r.subject || r.vendorName || `Record #${row.id}`);
                    const badge = String(r.productCategory || r.category || r.status || r.productType || "");
                    const unitPrice = r.unitPrice !== undefined ? Number(r.unitPrice) : undefined;
                    const grandTotal = r.grandTotal !== undefined ? Number(r.grandTotal) : undefined;

                    return (
                      <div
                        key={row.id}
                        onClick={() => navigate(`${meta.baseRoute}/${row.id}`)}
                        className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="truncate font-semibold text-slate-900 group-hover:text-blue-600">
                            {title}
                          </h3>
                          {badge && (
                            <span className="shrink-0 rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">
                              {badge}
                            </span>
                          )}
                        </div>

                        {Boolean(r.productCode) && (
                          <div className="mt-1 font-mono text-xs text-slate-500">SKU: {String(r.productCode)}</div>
                        )}

                        {unitPrice !== undefined && (
                          <div className="mt-3 rounded-xl bg-slate-50 p-3">
                            <span className="text-[11px] font-medium uppercase text-slate-400">Unit Price</span>
                            <div className="text-lg font-bold text-slate-900">
                              {formatMoney(unitPrice)}
                              {Boolean(r.billingCycle) && (
                                <span className="text-xs font-normal text-slate-500"> / {String(r.billingCycle)}</span>
                              )}
                            </div>
                          </div>
                        )}

                        {grandTotal !== undefined && unitPrice === undefined && (
                          <div className="mt-3 rounded-xl bg-slate-50 p-3">
                            <span className="text-[11px] font-medium uppercase text-slate-400">Total</span>
                            <div className="text-lg font-bold text-slate-900">{formatMoney(grandTotal)}</div>
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                          <span>{String(r.vendorName || r.owner || "")}</span>
                          {r.quantityInStock !== undefined && (
                            <span className="font-medium text-slate-700">Stock: {String(r.quantityInStock)}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {viewMode === "kanban" && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {["Draft", "Active", "Inactive"].map((stage) => {
                    const stageRows = processedRows.filter((r) => {
                      const row = r as Record<string, unknown>;
                      const val = String(row.status || row.active || "Active").toLowerCase();
                      return val === stage.toLowerCase();
                    });
                    return (
                      <div key={stage} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="font-semibold text-slate-700">{stage}</span>
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                            {stageRows.length}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {stageRows.slice(0, 10).map((row) => {
                            const r = row as Record<string, unknown>;
                            const title = String(r.productName || r.name || r.subject || `Record #${row.id}`);
                            const unitPrice = r.unitPrice !== undefined ? Number(r.unitPrice) : undefined;
                            return (
                              <div
                                key={row.id}
                                onClick={() => navigate(`${meta.baseRoute}/${row.id}`)}
                                className="cursor-pointer rounded-lg border border-slate-200 bg-white p-3 shadow-xs hover:border-blue-400"
                              >
                                <div className="truncate text-sm font-medium text-slate-800">
                                  {title}
                                </div>
                                {unitPrice !== undefined && (
                                  <div className="mt-1 text-xs font-semibold text-blue-600">
                                    {formatMoney(unitPrice)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {viewMode === "chart" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-5">
                    <h3 className="text-lg font-semibold text-slate-900">{meta.title} Distribution</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Records grouped by {chartDistribution.groupLabel.toLowerCase()}
                    </p>
                  </div>
                  {chartDistribution.data.length === 0 ? (
                    <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">
                      No records match the current filters.
                    </div>
                  ) : (
                    <div className="grid items-center gap-6 md:grid-cols-[minmax(280px,360px)_1fr]">
                      <div className="relative h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartDistribution.data}
                              dataKey="count"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={70}
                              outerRadius={118}
                              paddingAngle={3}
                              stroke="#ffffff"
                              strokeWidth={3}
                            >
                              {chartDistribution.data.map((entry, index) => (
                                <Cell
                                  key={entry.name}
                                  fill={INVENTORY_CHART_COLORS[index % INVENTORY_CHART_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value} records`, "Count"]} />
                            <text x="50%" y="47%" textAnchor="middle" className="fill-slate-800 text-2xl font-bold">
                              {processedRows.length}
                            </text>
                            <text x="50%" y="56%" textAnchor="middle" className="fill-slate-500 text-[11px]">
                              TOTAL RECORDS
                            </text>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-3">
                        {chartDistribution.data.map((entry, index) => {
                          const percentage = processedRows.length
                            ? Math.round((entry.count / processedRows.length) * 100)
                            : 0;
                          return (
                            <div
                              key={entry.name}
                              className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <span
                                  className="h-3 w-3 shrink-0 rounded-full"
                                  style={{
                                    backgroundColor:
                                      INVENTORY_CHART_COLORS[index % INVENTORY_CHART_COLORS.length],
                                  }}
                                />
                                <span className="truncate text-sm font-medium text-slate-700">{entry.name}</span>
                              </div>
                              <span className="shrink-0 text-sm font-semibold text-slate-900">
                                {entry.count} <span className="font-normal text-slate-500">({percentage}%)</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <CRMPagination
                page={page}
                pageSize={pageSize}
                totalItems={processedRows.length}
                onPageChange={setPage}
              />
            </div>
          </div>
        )}
      </div>

      {supportsDocumentPreview && (
        <InventoryDocumentPreviewModal
          open={samplePreviewOpen}
          moduleKey={moduleKey}
          detail={sampleDocument(moduleKey)}
          onClose={() => setSamplePreviewOpen(false)}
        />
      )}

      <MassDeleteModal
        open={massAction === "mass-delete"}
        onClose={() => setMassAction(null)}
        count={selectedIds.length > 0 ? selectedIds.length : processedRows.length}
        onConfirm={handleMassDelete}
      />

      <DeleteModal
        open={recordToDelete !== null}
        onClose={() => setRecordToDelete(null)}
        recordName={
          recordToDelete
            ? String(
                (recordToDelete as Record<string, unknown>).productName ||
                  (recordToDelete as Record<string, unknown>).vendorName ||
                  (recordToDelete as Record<string, unknown>).name ||
                  meta.singular.toLowerCase()
              )
            : meta.singular.toLowerCase()
        }
        onConfirm={async () => {
          if (!recordToDelete) throw new Error("No record selected for deletion.");
          await deleteInventoryRecord(moduleKey, recordToDelete.id);
          await load();
        }}
      />

      <MassUpdateModal
        open={massAction === "mass-update"}
        onClose={() => setMassAction(null)}
        count={selectedIds.length > 0 ? selectedIds.length : processedRows.length}
        module={moduleKey}
        onConfirm={handleMassUpdate}
      />

      {moduleKey === "vendors" && (
        <NoteModal
          open={activeNoteVendor !== null}
          onClose={() => setActiveNoteVendor(null)}
          recordName={
            activeNoteVendor
              ? String(
                  (activeNoteVendor as Record<string, unknown>).vendorName ??
                    (activeNoteVendor as Record<string, unknown>).name ??
                    ""
                )
              : ""
          }
          onSave={async (note) => {
            if (!activeNoteVendor) throw new Error("No vendor selected.");
            await addInventoryNote("vendors", activeNoteVendor.id, note);
            void load();
          }}
        />
      )}

      <ScheduleCallModal
        open={activityModal === "schedule-call"}
        onClose={() => setActivityModal(null)}
        recordName={activeVendorName}
        onSave={async (payload) => {
          await apiRequest("/calls/", {
            method: "POST",
            body: JSON.stringify({
              subject: payload.call_summary,
              call_type: payload.call_type ?? "Outbound",
              call_status: "Scheduled",
              call_start_time:
                payload.call_start_time ?? new Date().toISOString(),
              duration_minutes: payload.duration_minutes ?? 0,
              duration_seconds: payload.duration_seconds ?? 0,
              related_to_type: "None",
              reminder: payload.reminder ?? "None",
              purpose: payload.call_outcome ?? "",
              voice_recording: payload.voice_recording ?? "",}),
           });
         }}
      />
      <LogCallModal
        open={activityModal === "log-call"}
        onClose={() => setActivityModal(null)}
        recordName={activeVendorName}
        onSave={async (payload) => {
          await apiRequest("/calls/", {
            method: "POST",
            body: JSON.stringify({
              subject: payload.call_summary,
              call_type: payload.call_type ?? "Outbound",
              call_status: "Completed",
              call_start_time:
                payload.call_start_time ?? new Date().toISOString(),
              duration_minutes: payload.duration_minutes ?? 0,
              duration_seconds: payload.duration_seconds ?? 0,
              related_to_type: "None",
              reminder: "None",
              purpose: payload.call_outcome ?? "",
              voice_recording: payload.voice_recording ?? "",
            }),
          });
        }}
      />
    </DashboardLayout>
  );
}
