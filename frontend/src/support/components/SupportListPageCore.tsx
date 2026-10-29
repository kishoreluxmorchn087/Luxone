import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import ModuleToolbar from "../../components/crm/ModuleToolbar";
import FilterSidebar from "../../components/crm/FilterSidebar";
import CRMTable from "../../components/crm/CRMTable";
import CRMPagination from "../../components/crm/CRMPagination";
import CRMRecordView from "../../components/crm/CRMRecordView";
import { DeleteModal, SendEmailModal } from "../../components/crm/CRMActionModals";
import { filterRecords, sortRecords } from "../../lib/shared/crmHelpers";
import type { CRMRecord, CRMRowAction } from "../../lib/shared/crmTypes";
import { copyToClipboard } from "../../lib/clipboard";
import { apiRequest } from "../../api/client";
import { deleteSupportRecord, findExistingSolutionByCase, getSupportList } from "../api";
import { supportModuleMeta } from "../config";
import type { SupportModuleKey } from "../types";

const rowActions: Record<SupportModuleKey, CRMRowAction[]> = {
  cases: [
    { key: "edit", label: "Edit" },
    { key: "send-email", label: "Send Email" },
    { key: "convert", label: "Convert" },
    { key: "delete", label: "Delete", destructive: true },
    { key: "copy-url", label: "Copy URL" },
    { key: "more", label: "More", children: [{ key: "open", label: "Open" }] },
  ],
  solutions: [
    { key: "edit", label: "Edit" },
    { key: "delete", label: "Delete", destructive: true },
    { key: "copy-url", label: "Copy URL" },
    { key: "more", label: "More", children: [{ key: "open", label: "Open" }] },
  ],
};

type Props = {
  moduleKey: SupportModuleKey;
};

export default function SupportListPageCore({ moduleKey }: Props) {
  const meta = supportModuleMeta[moduleKey];
  const navigate = useNavigate();
  const [rows, setRows] = useState<CRMRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"list" | "table" | "grid" | "kanban" | "chart">("table");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [pinnedColumn, setPinnedColumn] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<Partial<Record<string, string>>>({});
  const [sidebarFilters, setSidebarFilters] = useState<Record<string, string>>({});
  const [sortState, setSortState] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [filterOpen, setFilterOpen] = useState(true);
  const [globalSearch, setGlobalSearch] = useState("");
  const [deleteRow, setDeleteRow] = useState<CRMRecord | null>(null);
  const [emailRow, setEmailRow] = useState<CRMRecord | null>(null);
  const [copyMessage, setCopyMessage] = useState("");

  const handleRowAction = async (actionKey: string, row: CRMRecord) => {
    if (actionKey === "open") {
      navigate(`${meta.baseRoute}/${row.id}`);
    } else if (actionKey === "edit") {
      navigate(`${meta.baseRoute}/${row.id}/edit`);
    } else if (actionKey === "delete") {
      setDeleteRow(row);
    } else if (actionKey === "copy-url") {
      const copied = await copyToClipboard(`${window.location.origin}${meta.baseRoute}/${row.id}`);
      setCopyMessage(copied ? "URL copied to clipboard." : "Unable to copy URL.");
      window.setTimeout(() => setCopyMessage(""), 2500);
    } else if (actionKey === "send-email" && moduleKey === "cases") {
      setEmailRow(row);
    } else if (actionKey === "convert" && moduleKey === "cases") {
      try {
        const existing = await findExistingSolutionByCase(row.id);
        if (existing) {
          navigate(`/support/solutions/${existing.id}`);
          return;
        }
        const query = new URLSearchParams({
          caseId: row.id,
          caseNumber: String((row as Record<string, unknown>).caseNumber || ""),
        });
        navigate(`/support/solutions/create?${query.toString()}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to convert case to a solution.");
      }
    }
  };

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
      setRows(await getSupportList(moduleKey));
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
    () => meta.rowColumns.filter((column) => !hiddenColumns.includes(column.key)),
    [hiddenColumns, meta.rowColumns]
  );
  const tableColumns = visibleColumns.map((column) => ({
    ...column,
    key: column.key as keyof CRMRecord & string,
  }));

  const processedRows = useMemo(() => {
    const combined = { ...sidebarFilters, ...columnFilters };
    let output = filterRecords(rows, tableColumns, combined, globalSearch);
    if (sortState) {
      output = sortRecords(output, sortState.key as keyof CRMRecord & string, sortState.direction);
    }
    return output;
  }, [rows, tableColumns, sidebarFilters, columnFilters, sortState, globalSearch]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * 10;
    return processedRows.slice(start, start + 10);
  }, [page, processedRows]);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <ModuleToolbar
          viewName={meta.title}
          createButtonLabel={meta.createLabel}
          massDeleteLabel="Delete"
          baseRoute={meta.baseRoute}
          importPrimaryLabel={meta.importLabel}
          isFilterOpen={filterOpen}
          onToggleFilter={() => setFilterOpen((prev) => !prev)}
          onCreateClick={() => navigate(meta.createRoute)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {loading ? <div className="p-6 text-sm text-slate-600">Loading {meta.title.toLowerCase()}...</div> : null}
        {error ? <div className="p-6 text-sm text-rose-600">{error}</div> : null}

        {!loading && !error && rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-8 py-16 text-center">
            <h1 className="text-2xl font-semibold text-slate-900">{meta.emptyTitle}</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500">{meta.emptyDescription}</p>
            <div className="mt-6 flex justify-center gap-3">
              <button type="button" onClick={() => navigate(meta.createRoute)} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white">
                {meta.createLabel}
              </button>
              <button type="button" onClick={() => navigate(meta.importRoute)} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700">
                {meta.importLabel}
              </button>
            </div>
          </div>
        ) : null}

        {!loading && !error && rows.length > 0 ? (
          <div className="flex gap-3">
            {filterOpen ? (
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
            ) : null}

            <div className="min-w-0 flex-1 space-y-3">
              {viewMode === "table" ? (
                <CRMTable<CRMRecord>
                  rows={paginatedRows}
                  columns={tableColumns}
                  rowActions={rowActions[moduleKey]}
                  selectedIds={selectedIds}
                  hiddenColumns={hiddenColumns}
                  pinnedColumn={pinnedColumn}
                  columnFilters={columnFilters}
                  showNotes={false}
                  showActivity={false}
                  showActionsColumn={false}
                  onToggleAll={(checked) => {
                    setSelectedIds(checked ? paginatedRows.map((row) => row.id) : []);
                  }}
                  onToggleRow={(id, checked) => {
                    setSelectedIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((item) => item !== id)));
                  }}
                  onOpenRow={(row) => navigate(`${meta.baseRoute}/${row.id}`)}
                  onRowAction={handleRowAction}
                  onSortColumn={(columnKey, direction) => setSortState({ key: columnKey, direction })}
                  onToggleHideColumn={(columnKey) => {
                    setHiddenColumns((prev) =>
                      prev.includes(columnKey) ? prev.filter((item) => item !== columnKey) : [...prev, columnKey]
                    );
                  }}
                  onTogglePinColumn={(columnKey) => setPinnedColumn((prev) => (prev === columnKey ? null : columnKey))}
                  onFilterColumn={(columnKey, value) => setColumnFilters((prev) => ({ ...prev, [columnKey]: value }))}
                />
              ) : (
                <CRMRecordView
                  mode={viewMode}
                  rows={paginatedRows}
                  columns={visibleColumns}
                  onOpen={(row) => navigate(`${meta.baseRoute}/${row.id}`)}
                />
              )}
              <CRMPagination page={page} pageSize={10} totalItems={processedRows.length} onPageChange={setPage} />
            </div>
          </div>
        ) : null}
      </div>
      {copyMessage ? (
        <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-50 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          {copyMessage}
        </div>
      ) : null}
      <DeleteModal
        open={deleteRow !== null}
        onClose={() => setDeleteRow(null)}
        recordName={
          deleteRow
            ? String((deleteRow as Record<string, unknown>).subject || (deleteRow as Record<string, unknown>).solutionTitle || meta.singular.toLowerCase())
            : meta.singular.toLowerCase()
        }
        onConfirm={async () => {
          if (!deleteRow) throw new Error("No record selected for deletion.");
          await deleteSupportRecord(moduleKey, deleteRow.id);
          setRows((current) => current.filter((row) => row.id !== deleteRow.id));
          setSelectedIds((current) => current.filter((id) => id !== deleteRow.id));
        }}
      />
      {moduleKey === "cases" ? (
        <SendEmailModal
          open={emailRow !== null}
          onClose={() => setEmailRow(null)}
          toEmail={emailRow ? String((emailRow as Record<string, unknown>).email || "") : ""}
          recordName={emailRow ? String((emailRow as Record<string, unknown>).subject || "") : ""}
          onSend={async (email) => {
            await apiRequest("/send-email", {
              method: "POST",
              body: JSON.stringify({
                to: email.to,
                subject: email.subject,
                body: email.body,
                from_email: email.from_email,
              }),
            });
          }}
        />
      ) : null}
    </DashboardLayout>
  );
}
