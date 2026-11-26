import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, UserCheck, UserCog, ChevronRight, ChevronDown,
  Loader2, Plus, Building2, UserPlus, Check, X,
} from "lucide-react";
import { apiRequest } from "../../api/client";
import { readDashboardCache, writeDashboardCache, removeDashboardCache } from "../../lib/dashboardCache";

type OrgUser = {
  id: number;
  email: string;
  name?: string | null;
  role: "admin" | "sub_admin" | "hr" | "manager" | "team_lead" | "business_development" | "software_development" | "support_team" | "employee";
  team: string;
  team_label?: string | null;
  is_active: boolean;
  manager: number | null;
  manager_email: string | null;
};

const ORGANIZATION_LABEL = "Luxmor AI Technologies Pvt Ltd";

type GroupedOrg = {
  managers: OrgUser[];
  unassigned: OrgUser[];
  byManager: Record<number, OrgUser[]>;
};

const ADMIN_DASHBOARD_CACHE_KEY = "admin-dashboard-cache-v1";
const MANAGER_DASHBOARD_CACHE_KEY = "manager-dashboard-cache-v1";
const ADMIN_DASHBOARD_CACHE_TTL_MS = 5 * 60 * 1000;
const TEAM_UPDATED_EVENT = "team:updated";

function groupUsers(users: OrgUser[]): GroupedOrg {
  const nonAdmins = users.filter((u) => u.role !== "admin");

  // Count direct reports for each user
  const directReportsCount: Record<number, number> = {};
  for (const u of nonAdmins) {
    if (u.manager) {
      directReportsCount[u.manager] = (directReportsCount[u.manager] ?? 0) + 1;
    }
  }

  // A manager card is for:
  // - users with role === 'manager' or 'sales_manager'
  // - OR any user who has people reporting to them and does not report to another manager
  const managers = nonAdmins.filter(
    (u) =>
      ((u.role === "manager" || (u.role as string) === "sales_manager" || (directReportsCount[u.id] ?? 0) > 0) &&
        !u.manager)
  );

  const managerIds = new Set(managers.map((m) => m.id));

  // Staff: anyone who is not a top-level manager card
  const staff = nonAdmins.filter((u) => !managerIds.has(u.id));

  const byManager: Record<number, OrgUser[]> = {};
  const unassigned: OrgUser[] = [];

  for (const emp of staff) {
    if (emp.manager && managerIds.has(emp.manager)) {
      byManager[emp.manager] = [...(byManager[emp.manager] ?? []), emp];
    } else {
      unassigned.push(emp);
    }
  }

  return { managers, unassigned, byManager };
}

function RoleBadge({ role }: { role: string }) {
  const cls =
    role === "admin" || role === "sub_admin" ? "bg-blue-100 text-blue-700"
    : role === "manager" ? "bg-violet-100 text-violet-700"
    : role === "team_lead" ? "bg-purple-100 text-purple-700"
    : role === "hr" ? "bg-pink-100 text-pink-700"
    : "bg-emerald-100 text-emerald-700";
  const label = role.replace(/_/g, " ");
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${cls}`}>
      {label}
    </span>
  );
}

function UserRow({
  user,
  onClick,
}: {
  user: OrgUser;
  onClick: () => void;
}) {
  const displayName = user.name || user.email;
  return (
    <div className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 transition hover:bg-slate-50">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={onClick}
          className="flex items-center gap-3 text-left min-w-0 flex-1"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 uppercase shrink-0">
            {displayName[0]}
          </div>
          <div className="min-w-0">
            <span className="block text-sm font-medium text-slate-800 truncate max-w-[200px]">{displayName}</span>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 shrink-0">
            {user.team_label || user.team || "General"}
          </span>
        </button>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 ml-2">
        <RoleBadge role={user.role} />
        <button
          type="button"
          onClick={onClick}
          className="text-slate-400 hover:text-slate-600 p-1"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Unassigned row with inline manager picker ─────────────────────────────────

function UnassignedRow({
  user,
  managers,
  onAssigned,
  onViewProfile,
}: {
  user: OrgUser;
  managers: OrgUser[];
  onAssigned: () => void;
  onViewProfile: () => void;
}) {
  const [assigning, setAssigning] = useState(false);
  const [selectedManager, setSelectedManager] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleAssign = async () => {
    if (!selectedManager) return;
    setSaving(true);
    setError("");
    try {
      await apiRequest(`/auth/manage-users/${user.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ manager: Number(selectedManager) }),
      });
      removeDashboardCache(ADMIN_DASHBOARD_CACHE_KEY);
      window.dispatchEvent(new Event(TEAM_UPDATED_EVENT));
      onAssigned(); // refresh parent
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign.");
      setSaving(false);
    }
  };

  if (assigning) {
    const displayName = user.name || user.email;
    return (
      <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-3 mx-1 my-1">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 uppercase shrink-0">
            {displayName[0]}
          </div>
          <div className="min-w-0">
            <span className="block text-sm font-medium text-slate-700 truncate">{displayName}</span>
          </div>
        </div>

        <label className="mb-1 block text-xs font-semibold text-violet-700">
          Assign to Manager
        </label>
        <select
          value={selectedManager}
          onChange={(e) => setSelectedManager(e.target.value)}
          className="w-full rounded-lg border border-violet-300 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 mb-2"
        >
          <option value="">— Select a manager —</option>
          {managers.map((mgr) => (
            <option key={mgr.id} value={mgr.id}>
              {mgr.name || mgr.email}
            </option>
          ))}
        </select>

        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!selectedManager || saving}
            onClick={handleAssign}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            {saving ? "Assigning..." : "Confirm"}
          </button>
          <button
            type="button"
            onClick={() => { setAssigning(false); setSelectedManager(""); setError(""); }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <X size={12} />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2.5 transition hover:bg-slate-50">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={onViewProfile}
          className="flex items-center gap-3 text-left min-w-0 flex-1"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 uppercase shrink-0">
            {(user.name || user.email)[0]}
          </div>
          <div className="min-w-0">
            <span className="block text-sm font-medium text-slate-700 truncate">{user.name || user.email}</span>
          </div>
        </button>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 ml-2">
        <RoleBadge role={user.role} />
        <button
          type="button"
          onClick={() => setAssigning(true)}
          className="flex items-center gap-1 rounded-md bg-violet-50 border border-violet-200 px-2.5 py-1 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100"
          title="Assign to a manager"
        >
          <UserPlus size={11} />
          Assign
        </button>
        <button
          type="button"
          onClick={onViewProfile}
          className="text-slate-400 hover:text-slate-600 p-1"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Manager card ──────────────────────────────────────────────────────────────

function ManagerCard({
  manager,
  employees,
  onUserClick,
}: {
  manager: OrgUser;
  employees: OrgUser[];
  onUserClick: (u: OrgUser) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex w-full items-center justify-between border-b border-violet-100 bg-violet-50 px-4 py-3 transition hover:bg-violet-100/70">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onUserClick(manager)}
            className="flex items-center gap-3 text-left min-w-0 flex-1"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-200 text-sm font-bold text-violet-800 uppercase shrink-0">
              {(manager.name || manager.email)[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate max-w-[200px]">
                {manager.name || manager.email}
              </p>
              <p className="text-xs text-violet-600">{employees.length} employee{employees.length !== 1 ? "s" : ""}</p>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <RoleBadge role={manager.role} />
          <button
            type="button"
            onClick={() => onUserClick(manager)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {employees.length > 0 ? (
        <div className="divide-y divide-slate-50 px-1 py-1">
          {employees.map((emp) => (
            <UserRow
              key={emp.id}
              user={emp}
              onClick={() => onUserClick(emp)}
            />
          ))}
        </div>
      ) : (
        <p className="px-4 py-3 text-xs text-slate-400">No employees assigned yet.</p>
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [initialCache] = useState(() => readDashboardCache<OrgUser[]>(ADMIN_DASHBOARD_CACHE_KEY, ADMIN_DASHBOARD_CACHE_TTL_MS));
  const [users, setUsers] = useState<OrgUser[]>(initialCache?.state ?? []);
  const [loading, setLoading] = useState(!initialCache?.state);
  const [refreshKey, setRefreshKey] = useState(0);
  const [projectDeskOpen, setProjectDeskOpen] = useState(false);



  useEffect(() => {
    let active = true;
    const shouldFetch = refreshKey > 0 || !initialCache?.state;

    if (!shouldFetch) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    apiRequest<OrgUser[]>("/auth/manage-users/")
      .then((data) => {
        if (!active) return;
        const nextUsers = Array.isArray(data) ? data : [];
        setUsers(nextUsers);
        writeDashboardCache(ADMIN_DASHBOARD_CACHE_KEY, nextUsers);
      })
      .catch(() => { if (active) setUsers([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [initialCache?.state, refreshKey]);

  useEffect(() => {
    const refresh = () => {
      removeDashboardCache(ADMIN_DASHBOARD_CACHE_KEY);
      setRefreshKey((k) => k + 1);
    };

    window.addEventListener(TEAM_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(TEAM_UPDATED_EVENT, refresh);
  }, []);

  const { managers, unassigned, byManager } = groupUsers(users);
  const managerIds = new Set(managers.map((m) => m.id));
  const nonAdminUsers = users.filter((u) => u.role !== "admin");
  const totalStaff = nonAdminUsers.filter((u) => !managerIds.has(u.id)).length;
  const orgName = ORGANIZATION_LABEL;

  // All roles that can have staff assigned to them
  const assignableManagers = users.filter(
    (u) =>
      u.role === "manager" ||
      (u.role as string) === "sales_manager" ||
      u.role === "team_lead" ||
      u.role === "hr" ||
      u.role === "sub_admin",
  );

  const goToProfile = (u: OrgUser) => navigate(`/team/user/${u.id}`);
  const refresh = () => {
    removeDashboardCache(ADMIN_DASHBOARD_CACHE_KEY);
    setRefreshKey((k) => k + 1);
  };

  const openProjectTaskDesk = async () => {
    setProjectDeskOpen(false);
    try {
      const response = await apiRequest("/projects/");
      const projects = Array.isArray(response)
        ? response
        : ((response as { results?: Array<{ id: string | number }> }).results ?? []);

      if (projects.length > 0) {
        navigate(`/projectdesk/tasks/create?project=${projects[0].id}`);
        return;
      }
    } catch {
      // Fall through to project creation if loading projects fails.
    }

    navigate("/projects/create");
  };

  const openProjectMeetingDesk = async () => {
    setProjectDeskOpen(false);
    try {
      const response = await apiRequest("/projects/");
      const projects = Array.isArray(response)
        ? response
        : ((response as { results?: Array<{ id: string | number }> }).results ?? []);

      if (projects.length > 0) {
        navigate(`/projectdesk/meetings/create?project=${projects[0].id}`);
        return;
      }
    } catch {
      // Fall through to project creation if loading projects fails.
    }

    navigate("/projects/create");
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6 pb-24">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Building2 size={20} className="text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">{orgName}</h1>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {loading ? "Loading team..." : `${users.length} members across all teams`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setProjectDeskOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm"
            >
              <Plus size={15} />
              Project Desk
              <ChevronDown size={14} className="text-slate-400" />
            </button>
            {projectDeskOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg z-20">
                <button
                  type="button"
                  onClick={openProjectTaskDesk}
                  className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Plus size={13} className="text-blue-600" />
                  Create Task
                </button>
                <button
                  type="button"
                  onClick={openProjectMeetingDesk}
                  className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Plus size={13} className="text-violet-600" />
                  Create Meeting
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate("/team/users/create")}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition shadow-sm"
          >
            <UserPlus size={15} />
            Add User
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-50">
            <UserCog size={18} className="text-violet-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{loading ? "..." : managers.length}</p>
            <p className="text-xs font-medium text-slate-500">Managers</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <Users size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{loading ? "..." : totalStaff}</p>
            <p className="text-xs font-medium text-slate-500">Employees</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
            <UserCheck size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{loading ? "..." : users.length}</p>
            <p className="text-xs font-medium text-slate-500">Total Users</p>
          </div>
        </div>
        {!loading && unassigned.length > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <UserPlus size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-800">{unassigned.length}</p>
              <p className="text-xs font-medium text-amber-600">Unassigned</p>
            </div>
          </div>
        )}
      </div>

      {/* Org tree header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
          Organization Structure
        </h2>
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
              </div>
              <div className="space-y-3 px-4 py-4">
                {Array.from({ length: 3 }, (_, rowIndex) => (
                  <div key={rowIndex} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
                      <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
                    </div>
                    <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <Users size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-500">No users yet. Add managers and employees to get started.</p>
          <button
            type="button"
            onClick={() => navigate("/team/users/create")}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add First User
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {managers.map((mgr) => (
            <ManagerCard
              key={mgr.id}
              manager={mgr}
              employees={byManager[mgr.id] ?? []}
              onUserClick={goToProfile}
            />
          ))}

          {/* Unassigned employees */}
          {unassigned.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-amber-100 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-800">Unassigned Employees</p>
                <p className="text-xs text-amber-600">
                  Click <strong>Assign</strong> next to an employee to assign a manager
                </p>
              </div>
              <div className="divide-y divide-slate-50 py-1">
                {unassigned.map((emp) => (
                  <UnassignedRow
                    key={emp.id}
                    user={emp}
                    managers={assignableManagers}
                    onAssigned={refresh}
                    onViewProfile={() => goToProfile(emp)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}


    </div>
  );
}
