import { useCallback, useEffect, useMemo, useState } from "react";
import { Filter, Loader2, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import FilterSidebar from "../../../components/crm/FilterSidebar";
import DashboardLayout from "../../../components/layout/DashboardLayout";
import { apiRequest } from "../../../api/client";
import type { FilterSection } from "../../../lib/shared/crmTypes";
import { keepEmployeeVisibleRows } from "../../../lib/shared/recordVisibility";
import { formatDateTimeForDisplay } from "../../../lib/dateUtils";

type FilterMap = Record<string, string>;

interface Meeting {
  id: string | number;
  title: string;
  start_date: string;
  end_date?: string;
  location?: string;
  organizer?: { name?: string; email?: string };
  lead_name?: string;
  contact_name?: string;
  account_name?: string;
  status?: string;
  created_at?: string;
}

function formatDate(dateString?: string) {
  if (!dateString) return "—";
  return formatDateTimeForDisplay(dateString);
}

const MEETING_FILTER_SECTIONS: FilterSection[] = [
  {
    title: "Title",
    items: [{ label: "Title contains", key: "title" }],
  },
  {
    title: "From",
    items: [{ label: "From date contains", key: "from" }],
  },
  {
    title: "To",
    items: [{ label: "To date contains", key: "to" }],
  },
  {
    title: "Location",
    items: [{ label: "Location contains", key: "location" }],
  },
  {
    title: "Status",
    items: [{ label: "Status contains", key: "status" }],
  },
  {
    title: "Organizer",
    items: [{ label: "Organizer name", key: "organizer" }],
  },
  {
    title: "Related",
    items: [
      { label: "Related contact/account", key: "related" },
      { label: "Company / Account", key: "company" },
    ],
  },
];

export default function MeetingsPage() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterMap>({});
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const loadMeetings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest<Meeting[] | { results: Meeting[] }>("/meetings/", { method: "GET" });
      if (Array.isArray(data)) {
        setMeetings(keepEmployeeVisibleRows(data, (meeting) => meeting.organizer));
      } else if (data && typeof data === "object" && Array.isArray((data as { results: Meeting[] }).results)) {
        setMeetings(keepEmployeeVisibleRows((data as { results: Meeting[] }).results, (meeting) => meeting.organizer));
      } else {
        setMeetings([]);
      }
    } catch (err) {
      console.error("Failed to load meetings:", err);
      setError(err instanceof Error ? err.message : "Unable to load meetings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMeetings();
  }, [loadMeetings]);

  const filteredMeetings = useMemo(() => {
    const filterFields: Record<string, (meeting: Meeting) => string> = {
      title: (m) => m.title || "",
      from: (m) => `${m.start_date || ""} ${formatDate(m.start_date)}`,
      to: (m) => `${m.end_date || ""} ${formatDate(m.end_date)}`,
      location: (m) => m.location || "",
      status: (m) => m.status || "Scheduled",
      organizer: (m) => `${m.organizer?.name || ""} ${m.organizer?.email || ""}`,
      related: (m) => `${m.lead_name || ""} ${m.contact_name || ""} ${m.account_name || ""}`,
      company: (m) => m.account_name || "",
    };

    return meetings.filter((meeting) =>
      Object.entries(filters).every(([key, value]) => {
        if (!value.trim()) return true;
        const getFieldValue = filterFields[key];
        return (
          !getFieldValue ||
          getFieldValue(meeting).toLowerCase().includes(value.trim().toLowerCase())
        );
      })
    );
  }, [meetings, filters]);

  const toggleSelect = (id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(filteredMeetings.map((m) => m.id)) : new Set());
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} meeting${selectedIds.size !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    setDeleting(true);
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map((id) => apiRequest(`/meetings/${id}/`, { method: "DELETE" })));
      setMeetings((prev) => prev.filter((m) => !selectedIds.has(m.id)));
      setSelectedIds(new Set());
    } catch {
      alert("Some meetings could not be deleted. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="px-6 py-6">
          <p className="text-sm text-slate-600">Loading meetings...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="px-6 py-6">
          <p className="text-sm text-rose-600">Error: {error}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-6 py-6">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Meetings</h1>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFilterOpen((prev) => !prev)}
              className={`flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition duration-150 hover:bg-slate-50 ${
                filterOpen ? "bg-slate-100 shadow-sm" : "bg-white"
              }`}
            >
              <Filter size={16} />
              <span>Filters</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/meetings/create")}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Create Meeting
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          {filterOpen && (
            <FilterSidebar
              title="Filter Meetings by"
              sections={MEETING_FILTER_SECTIONS}
              onApply={(activeFilters) => setFilters(activeFilters)}
              onClear={() => setFilters({})}
            />
          )}

          <div className="flex-1">
            {/* Selection bar */}
            {selectedIds.size > 0 && (
              <div className="mb-3 flex items-center gap-3 rounded-lg bg-slate-800 px-5 py-2.5">
                <span className="text-sm font-medium text-white">
                  {selectedIds.size} record{selectedIds.size !== 1 ? "s" : ""} selected
                </span>
                <span className="text-slate-500">·</span>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-sm text-slate-400 hover:text-white"
                >
                  Clear
                </button>
                <div className="ml-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={deleting}
                    className="flex items-center gap-1.5 rounded border border-red-400 px-3 py-1 text-xs font-medium text-red-400 transition hover:bg-red-500 hover:text-white disabled:opacity-60"
                  >
                    {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="ml-auto rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {filteredMeetings.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
                <p className="text-sm font-medium text-slate-500">
                  {meetings.length ? "No meetings match the selected filters." : "No meetings found."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filteredMeetings.length && filteredMeetings.length > 0}
                          ref={(el) => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < filteredMeetings.length; }}
                          onChange={(e) => toggleSelectAll(e.target.checked)}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Title</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">From</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">To</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Location</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Related To</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Contact</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMeetings.map((meeting) => (
                      <tr
                        key={meeting.id}
                        className={`border-b transition hover:bg-slate-50 cursor-pointer ${selectedIds.has(meeting.id) ? "bg-blue-50" : ""}`}
                        onClick={() => navigate(`/meetings/${meeting.id}`)}
                      >
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(meeting.id)}
                            onChange={() => toggleSelect(meeting.id)}
                            className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600"
                          />
                        </td>
                        <td className="px-4 py-4 text-sm text-blue-600 hover:underline font-medium">
                          {meeting.title}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          {formatDate(meeting.start_date)}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          {formatDate(meeting.end_date)}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          {meeting.location || "—"}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          {meeting.lead_name || meeting.account_name || "—"}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          {meeting.contact_name || "—"}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            meeting.status === "Completed" ? "bg-green-100 text-green-800" :
                            meeting.status === "Cancelled" ? "bg-red-100 text-red-800" :
                            meeting.status === "Rescheduled" ? "bg-yellow-100 text-yellow-800" :
                            "bg-blue-100 text-blue-800"
                          }`}>
                            {meeting.status || "Scheduled"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
