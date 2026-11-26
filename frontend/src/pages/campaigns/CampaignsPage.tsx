import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { deleteCampaign, getCampaigns, type CampaignRecord } from "../../lib/api/campaignsApi";
import { keepEmployeeOwnedRows } from "../../lib/shared/recordVisibility";
import { Eye, Pencil, Trash2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Planning: "bg-blue-100 text-blue-700",
  Inactive: "bg-slate-100 text-slate-600",
  Complete: "bg-purple-100 text-purple-700",
};

export default function CampaignsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CampaignRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      setRows(keepEmployeeOwnedRows(await getCampaigns({ search })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [search]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this campaign?")) return;
    try {
      setDeletingId(id);
      await deleteCampaign(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete campaign.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="h-full overflow-hidden bg-[#f5f7fb]">
        <div className="border-b border-slate-200 bg-white px-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" className="cursor-pointer rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition duration-150 hover:bg-slate-200 hover:shadow-sm">
              All Campaigns
            </button>
            <div className="flex items-center gap-3">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search campaigns"
                className="h-[38px] w-[240px] rounded-[6px] border border-[#cfd7e6] bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#6d8dff]"
              />
              <button
                type="button"
                onClick={() => navigate("/campaigns/create")}
                className="rounded-[6px] bg-blue-600 px-4 py-2 text-[14px] font-medium text-white transition"
              >
                Create Campaign
              </button>
            </div>
          </div>
        </div>

        <div className="h-[calc(100%-57px)] p-4">
          {loading ? (
            <div className="rounded-[10px] border border-[#d9e1ef] bg-white p-4 text-sm text-slate-600">
              Loading campaigns...
            </div>
          ) : error ? (
            <div className="rounded-[10px] border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          ) : (
            <div className="overflow-hidden rounded-[10px] border border-[#d9e1ef] bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Campaign Name</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Start Date</th>
                    <th className="px-4 py-3">End Date</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-500" colSpan={7}>
                        No campaigns found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr
                        key={row.id}
                        className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                        onClick={() => navigate(`/campaigns/${row.id}`)}
                      >
                        <td className="px-4 py-3 font-medium text-[#2563eb]">{row.campaignName}</td>
                        <td className="px-4 py-3 text-slate-600">{row.campaignOwnerEmail || "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{row.type || "-"}</td>
                        <td className="px-4 py-3">
                          {row.status ? (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[row.status] ?? "bg-slate-100 text-slate-600"}`}
                            >
                              {row.status}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{row.startDate || "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{row.endDate || "-"}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); navigate(`/campaigns/${row.id}`); }}
                              className="rounded p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                              title="View"
                              aria-label={`View ${row.campaignName}`}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); navigate(`/campaigns/${row.id}/edit`); }}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              title="Edit"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => void handleDelete(e, row.id)}
                              disabled={deletingId === row.id}
                              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
