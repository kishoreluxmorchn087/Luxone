import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import ModuleToolbar from "../../components/crm/ModuleToolbar";
import FilterSidebar from "../../components/crm/FilterSidebar";
import CRMTable from "../../components/crm/CRMTable";
import CRMPagination from "../../components/crm/CRMPagination";
import { filterRecords, sortRecords } from "../../lib/shared/crmHelpers";
import type { CRMColumn, CRMRecord } from "../../lib/shared/crmTypes";
import { convertQuoteToSalesOrder, convertSalesOrderToInvoice, deleteInventoryRecord, getInventoryList } from "../api";
import { getInventoryMeta } from "../config";
import { formatMoney } from "../utils";
import { MassDeleteModal, MassUpdateModal } from "../../components/crm/CRMActionModals";
import { apiRequest } from "../../api/client";
import type { InventoryDetailResponse, InventoryModuleKey } from "../types";
import InventoryDocumentPreviewModal from "./InventoryDocumentPreviewModal";

type InventoryListPageProps = {
  moduleKey: InventoryModuleKey;
};

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
          baseRoute={meta.baseRoute}
          importPrimaryLabel={meta.importLabel}
          showImportActions={Boolean(meta.importRoute)}
          isFilterOpen={filterOpen}
          onToggleFilter={() => setFilterOpen((prev) => !prev)}
          onCreateClick={() => navigate(meta.createRoute || `${meta.baseRoute}/create`)}
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
                }}
                onClear={() => {
                  setSidebarFilters({});
                  setColumnFilters({});
                  setSortState(null);
                  setSelectedIds([]);
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
                  onToggleAll={(checked) => {
                    setSelectedIds(checked ? paginatedRows.map((row) => row.id) : []);
                  }}
                  onToggleRow={(id, checked) => {
                    setSelectedIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((item) => item !== id)));
                  }}
                  onOpenRow={(row) => navigate(`${meta.baseRoute}/${row.id}`)}
                  onRowAction={async (actionKey, row) => {
                    if (actionKey === "open") {

                      navigate(`${meta.baseRoute}/${row.id}`);
                      return;
                    }
                    if (actionKey === "edit") {
                      navigate(`${meta.baseRoute}/${row.id}/edit`);
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
                      await deleteInventoryRecord(moduleKey, row.id);
                      void load();
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
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">{meta.title} Summary</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-xl bg-blue-50 p-4">
                      <div className="text-xs font-semibold uppercase text-blue-600">Total Items</div>
                      <div className="mt-1 text-2xl font-bold text-blue-900">{rows.length}</div>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-4">
                      <div className="text-xs font-semibold uppercase text-emerald-600">Active Records</div>
                      <div className="mt-1 text-2xl font-bold text-emerald-900">
                        {rows.filter((r) => {
                          const row = r as Record<string, unknown>;
                          return String(row.status || row.active || "").toLowerCase().includes("active");
                        }).length || rows.length}
                      </div>
                    </div>
                    <div className="rounded-xl bg-purple-50 p-4">
                      <div className="text-xs font-semibold uppercase text-purple-600">Filtered Records</div>
                      <div className="mt-1 text-2xl font-bold text-purple-900">{processedRows.length}</div>
                    </div>
                  </div>
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

      <MassUpdateModal
        open={massAction === "mass-update"}
        onClose={() => setMassAction(null)}
        count={selectedIds.length > 0 ? selectedIds.length : processedRows.length}
        module={moduleKey}
        onConfirm={handleMassUpdate}
      />
    </DashboardLayout>
  );
}
