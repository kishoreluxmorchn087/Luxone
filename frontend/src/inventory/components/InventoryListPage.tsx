import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import ModuleToolbar from "../../components/crm/ModuleToolbar";
import FilterSidebar from "../../components/crm/FilterSidebar";
import CRMTable from "../../components/crm/CRMTable";
import CRMPagination from "../../components/crm/CRMPagination";
import { filterRecords, sortRecords } from "../../lib/shared/crmHelpers";
import type { CRMRecord } from "../../lib/shared/crmTypes";
import { convertQuoteToSalesOrder, convertSalesOrderToInvoice, deleteInventoryRecord, getInventoryList } from "../api";
import { getInventoryMeta } from "../config";
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
  const [activeView, setActiveView] = useState<"list" | "table" | "chart" | "layout" | "map" | "panels">("list");
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
    let output = filterRecords(rows, visibleColumns as any, combined, globalSearch);
    if (sortState) {
      output = sortRecords(output as any, sortState.key as never, sortState.direction) as CRMRecord[];
    }
    return output;
  }, [rows, visibleColumns, sidebarFilters, columnFilters, sortState]);

  const pageSize = 10;
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processedRows.slice(start, start + pageSize);
  }, [page, pageSize, processedRows]);

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
          activeViewType={activeView}
          onViewTypeChange={setActiveView}
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
                  setPage(1);
                }}
              />
            )}

            <div className="min-w-0 flex-1 space-y-3">
              {activeView === "list" || activeView === "table" ? (
                <CRMTable
                  rows={paginatedRows as any}
                  columns={visibleColumns as any}
                  rowActions={meta.rowActions}
                  selectedIds={selectedIds}
                  hiddenColumns={hiddenColumns}
                  pinnedColumn={pinnedColumn}
                  columnFilters={columnFilters}
                  showNotes={moduleKey === "vendors"}
                  showActivity={moduleKey === "vendors"}
                  variant={activeView === "table" ? "bordered" : "default"}
                onToggleAll={(checked) => {
                  setSelectedIds(checked ? paginatedRows.map((row) => row.id) : []);
                }}
                onToggleRow={(id, checked) => {
                  setSelectedIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((item) => item !== id)));
                }}
                onOpenRow={(row) => navigate(`${meta.baseRoute}/${row.id}`)}
                onRowAction={async (actionKey, row) => {
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
                    const inventoryRow = row as any;
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
              ) : activeView === "panels" ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-6 shadow-sm ring-1 ring-slate-900/5">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {paginatedRows.map((row: any) => (
                      <div 
                        key={row.id} 
                        onClick={() => navigate(`${meta.baseRoute}/${row.id}`)}
                        className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
                      >
                        <div className="absolute left-0 top-0 h-full w-[4px] bg-gradient-to-b from-blue-400 to-blue-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                        <div className="mb-4 flex items-start justify-between">
                          <h3 className="truncate font-semibold text-slate-800 transition-colors group-hover:text-blue-600">
                            {row.subject || row.name || row.productName || "Unnamed Record"}
                          </h3>
                        </div>
                        <div className="space-y-3">
                          {visibleColumns.slice(0, 4).map((col: any) => (
                            <div key={col.key} className="flex justify-between text-sm">
                              <span className="text-slate-500">{col.title}</span>
                              <span className="font-medium text-slate-700 truncate max-w-[120px] text-right">
                                {row[col.key] || "-"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {paginatedRows.length === 0 && (
                      <div className="col-span-full py-12 text-center text-slate-500">
                        No records found.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex h-96 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-center">
                  <div className="rounded-full bg-slate-50 p-4">
                    <span className="text-4xl text-slate-400">🚧</span>
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-slate-900 capitalize">
                    {activeView === "layout" ? "Grid" : activeView} View
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    The {activeView === "layout" ? "Grid" : activeView} view is currently under construction for the {meta.title} module.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveView("list")}
                    className="mt-6 rounded-md bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                  >
                    Return to List View
                  </button>
                </div>
              )}

              {activeView === "list" || activeView === "table" || activeView === "panels" ? (
                <CRMPagination
                  page={page}
                  pageSize={pageSize}
                  totalItems={processedRows.length}
                  onPageChange={setPage}
                />
              ) : null}
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
    </DashboardLayout>
  );
}
