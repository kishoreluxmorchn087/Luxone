import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, CalendarDays, CheckCircle2, ClipboardList, Clock3, Layers3, RefreshCw } from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import CRMSectionCard from "../components/crm/CRMSectionCard";
import { useAuth } from "../hooks/useAuth";
import {
  getMyRequestsDashboard,
  type DashboardRequestItem,
  type MyRequestsDashboardResponse,
} from "../lib/api/dashboardApi";
import { readDashboardCache, refreshLiveNow, useLiveNow, writeDashboardCache } from "../lib/dashboardCache";
import { formatDateTimeForDisplay } from "../lib/dateUtils";

const MY_REQUESTS_CACHE_KEY = "my-requests-cache-v4";
const MY_REQUESTS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const EMPTY_STATE: MyRequestsDashboardResponse = {
  updated: "",
  summary_cards: { created_today: 0, updated_today: 0, due_today: 0, closed_today: 0 },
  focus_today: { overdue: 0, due_today: 0, pending: 0 },
  focus_requests: { overdue: [], due_today: [], pending: [] },
  request_mix: [],
  open_requests: [],
  upcoming_queue: [],
  closed_history: [],
  pending_approval: [],
};

function toDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(value?: string | null) {
  return formatDateTimeForDisplay(value) || "N/A";
}

function formatUpdatedAt(value?: string | null, now = Date.now()) {
  const parsed = toDate(value);
  if (!parsed) return "Not updated yet";
  const seconds = Math.max(1, Math.round((now - parsed.getTime()) / 1000));
  if (seconds < 60) return `Updated ${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  return `Updated ${Math.round(hours / 24)}d ago`;
}

function statusTone(status: string) {
  const normalized = status.trim().toLowerCase();
  if (normalized.includes("pending")) return "bg-amber-100 text-amber-800";
  if (["closed", "completed", "resolved", "done"].some((token) => normalized.includes(token))) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (normalized.includes("overdue")) return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function RequestList({ items, emptyText }: { items: DashboardRequestItem[]; emptyText: string }) {
  if (!items.length) {
    return <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">{emptyText}</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Link
          key={item.id}
          to={item.href}
          className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold text-slate-900">{item.title}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(item.status)}`}>{item.status}</span>
              </div>
              <div className="mt-2 text-sm text-slate-600">{item.module}</div>
              <div className="mt-1 text-sm leading-6 text-slate-500">{item.meta}</div>
            </div>
            <div className="shrink-0 text-right text-xs text-slate-500">
              <div>{item.priority || "Standard"}</div>
              <div className="mt-1">{formatDateTime(item.updated_at || item.created_at || item.due_at)}</div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function MyRequestsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const focus = searchParams.get("focus");
  const cacheKey = `${MY_REQUESTS_CACHE_KEY}:${user?.id ?? user?.email ?? "anonymous"}`;
  const initialCache = useMemo(
    () => readDashboardCache<MyRequestsDashboardResponse>(cacheKey, MY_REQUESTS_CACHE_TTL_MS),
    [cacheKey],
  );
  const [loading, setLoading] = useState(!initialCache?.state);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const now = useLiveNow();
  const [requestState, setRequestState] = useState({
    cacheKey,
    value: initialCache?.state ?? EMPTY_STATE,
  });
  const state =
    requestState.cacheKey === cacheKey
      ? requestState.value
      : initialCache?.state ?? EMPTY_STATE;
  const focusedListRef = useRef<HTMLDivElement>(null);
  const refreshInProgressRef = useRef(false);
  const focusedList =
    focus === "overdue"
      ? { title: "Overdue Requests", items: state.focus_requests.overdue }
      : focus === "due_today"
        ? { title: "Requests Due Today", items: state.focus_requests.due_today }
        : focus === "pending"
          ? { title: "Pending Requests", items: state.focus_requests.pending }
          : null;

  useEffect(() => {
    if (focus === "overdue" || focus === "due_today" || focus === "pending") {
      focusedListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focus]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const hasCachedState = Boolean(initialCache?.state);
    const isManualRefresh = refreshKey > 0;
    let delayTimer: number | undefined;

    if (hasCachedState && !isManualRefresh) {
      setLoading(false);
      setRefreshing(false);
      return () => {
        active = false;
        controller.abort();
      };
    }

    const load = async () => {
      try {
        refreshInProgressRef.current = true;
        setError(null);
        setLoading(!hasCachedState && !isManualRefresh);
        setRefreshing(hasCachedState || isManualRefresh);
        const minDelayPromise = isManualRefresh
          ? new Promise<void>((resolve) => {
              delayTimer = window.setTimeout(resolve, 1000);
            })
          : Promise.resolve();
        const [nextState] = await Promise.all([
          getMyRequestsDashboard(0, controller.signal, isManualRefresh),
          minDelayPromise,
        ]);
        if (!active) return;
        setRequestState({ cacheKey, value: nextState });
        writeDashboardCache(cacheKey, nextState);
        refreshLiveNow();
      } catch (loadError) {
        if (!active || controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load your requests.");
      } finally {
        refreshInProgressRef.current = false;
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
      refreshInProgressRef.current = false;
      if (delayTimer !== undefined) {
        window.clearTimeout(delayTimer);
      }
      controller.abort();
    };
  }, [cacheKey, initialCache, refreshKey]);

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-[1400px] space-y-6">
        {error && (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {error}
          </div>
        )}
        <div className="relative overflow-hidden rounded-[34px] border border-[#d6d9f6] bg-[linear-gradient(135deg,#faf8ff_0%,#f1efff_46%,#ffffff_100%)] shadow-[0_18px_42px_rgba(101,87,180,0.10)]">
          <div className="pointer-events-none absolute -right-6 top-0 h-40 w-40 rounded-full bg-violet-300/25 blur-3xl" />
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-700">Personal Queue</div>
              <h1 className="mt-2 text-[2.1rem] font-semibold tracking-[-0.04em] text-slate-950">My Requests</h1>
              <p className="mt-1 text-sm text-slate-500">
                Daily requests assigned to {user?.name || user?.email || "you"} across tasks, meetings, support, and services.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-white/70 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700">
                {formatUpdatedAt(state.updated, now)}
              </div>
              <button
                type="button"
                disabled={loading || refreshing}
                aria-busy={loading || refreshing}
                onClick={() => {
                  if (refreshInProgressRef.current) return;
                  refreshInProgressRef.current = true;
                  setRefreshKey((current) => current + 1);
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-white bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loading || refreshing ? "animate-spin" : ""}`} />
                {loading ? "Loading..." : refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="grid gap-4 px-5 py-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Created Today</span>
                <ClipboardList className="h-5 w-5 text-slate-500" />
              </div>
              <div className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{loading ? "..." : state.summary_cards.created_today}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Updated Today</span>
                <Layers3 className="h-5 w-5 text-slate-500" />
              </div>
              <div className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{loading ? "..." : state.summary_cards.updated_today}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Due Today</span>
                <CalendarDays className="h-5 w-5 text-slate-500" />
              </div>
              <div className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{loading ? "..." : state.summary_cards.due_today}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Closed Today</span>
                <CheckCircle2 className="h-5 w-5 text-slate-500" />
              </div>
              <div className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{loading ? "..." : state.summary_cards.closed_today}</div>
            </div>
          </div>
        </div>

        <div className="grid items-stretch gap-4 lg:grid-cols-3">
          <Link to="?focus=overdue" className="block rounded-2xl border border-rose-200 bg-[linear-gradient(180deg,#fff9f9_0%,#fff2f3_100%)] px-4 py-4 transition hover:border-rose-300 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Overdue</div>
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            </div>
            <div className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{state.focus_today.overdue}</div>
            <div className="mt-2 text-sm text-slate-500">Requests that need immediate attention.</div>
          </Link>
          <Link to="?focus=due_today" className="block rounded-2xl border border-amber-200 bg-[linear-gradient(180deg,#fffdf7_0%,#fff8ea_100%)] px-4 py-4 transition hover:border-amber-300 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Due Today</div>
              <Clock3 className="h-5 w-5 text-amber-600" />
            </div>
            <div className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{state.focus_today.due_today}</div>
            <div className="mt-2 text-sm text-slate-500">Queue items expected to move before today ends.</div>
          </Link>
          <Link to="?focus=pending" className="block rounded-2xl border border-violet-200 bg-[linear-gradient(180deg,#fbf9ff_0%,#f4efff_100%)] px-4 py-4 transition hover:border-violet-300 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Pending</div>
              <ClipboardList className="h-5 w-5 text-violet-600" />
            </div>
            <div className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{state.focus_today.pending}</div>
            <div className="mt-2 text-sm text-slate-500">Approvals or waiting states that may block progress.</div>
          </Link>
        </div>

        {focusedList && (
          <div ref={focusedListRef} className="scroll-mt-24">
            <CRMSectionCard title={focusedList.title} subtitle="Select a request to open its details.">
              <RequestList items={focusedList.items} emptyText="No matching requests right now." />
            </CRMSectionCard>
          </div>
        )}

        <CRMSectionCard title="Request Mix" subtitle="Current distribution across your assigned CRM work.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {state.request_mix.map((item) => (
              <div key={item.module} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-sm font-semibold text-slate-900">{item.module}</div>
                <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{item.count}</div>
              </div>
            ))}
          </div>
        </CRMSectionCard>

        <div className="grid items-start gap-5 xl:grid-cols-[1.12fr_0.88fr]">
          <CRMSectionCard title="Open Requests" subtitle="Active work that currently needs your attention.">
            <RequestList items={state.open_requests} emptyText="No open requests assigned right now." />
          </CRMSectionCard>

          <CRMSectionCard title="Upcoming Queue" subtitle="What is scheduled next in your request pipeline.">
            <RequestList items={state.upcoming_queue} emptyText="No upcoming queue items scheduled yet." />
          </CRMSectionCard>
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-[1fr_1fr]">
          <CRMSectionCard title="Closed History" subtitle="Recently completed request history for today and recent cycles.">
            <RequestList items={state.closed_history} emptyText="No recently closed request history available." />
          </CRMSectionCard>

          <CRMSectionCard title="Pending Approval" subtitle="Requests still waiting on confirmation, input, or review.">
            <RequestList items={state.pending_approval} emptyText="No pending approval items right now." />
          </CRMSectionCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
