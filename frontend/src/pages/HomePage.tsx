import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Crown,
  Download,
  FileBarChart2,
  Gift,
  Search,
  ShieldAlert,
  Sparkles,
  Star,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import CRMSectionCard from "../components/crm/CRMSectionCard";
import { useAuth } from "../hooks/useAuth";
import { getHomeDashboard, type HomeDashboardResponse } from "../lib/api/dashboardApi";
import { readDashboardCache, writeDashboardCache } from "../lib/dashboardCache";

const HOME_CACHE_KEY = "home-customer-command-center-v1";
const HOME_CACHE_TTL_MS = 5 * 60 * 1000;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function activityTone(tag: string) {
  if (tag === "VIP") return "bg-[#f2edff] text-[#7548b9]";
  if (tag === "Repeat") return "bg-[#e8f8ef] text-[#13795b]";
  if (tag === "Offer Used") return "bg-[#eef4ff] text-[#365eea]";
  if (tag === "At Risk") return "bg-[#fff1f2] text-[#be123c]";
  return "bg-[#f5f7fb] text-[#4e6485]";
}

const EMPTY_STATE: HomeDashboardResponse = {
  hero: {
    follow_ups: 0,
    inactive_customers: 0,
    repeat_revenue: 0,
    tasks_due_today: 0,
    meetings_today: 0,
    deals_updated_today: 0,
    customers_added_today: 0,
  },
  summary_cards: [],
  top_insight_chips: [],
  action_queue: [],
  segments: [],
  recent_activity: [],
  top_customers: [],
};

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [initialCache] = useState(() => readDashboardCache<HomeDashboardResponse>(HOME_CACHE_KEY, HOME_CACHE_TTL_MS));
  const [loading, setLoading] = useState(!initialCache?.state);
  const [state, setState] = useState<HomeDashboardResponse>(initialCache?.state || EMPTY_STATE);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(!initialCache?.state);
        const nextState = await getHomeDashboard(2 * 60 * 1000);
        if (!active) return;
        setState(nextState);
        writeDashboardCache(HOME_CACHE_KEY, nextState);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [initialCache?.state]);

  const summaryCards = state.summary_cards.map((card) => ({
    ...card,
    displayValue: card.title.toLowerCase().includes("revenue") ? formatCurrency(Number(card.value || 0)) : String(card.value ?? 0),
    icon:
      card.title === "Customers Added Today"
        ? <UserPlus className="h-5 w-5 text-slate-700" />
        : card.title === "Deals Updated Today"
          ? <TrendingUp className="h-5 w-5 text-slate-700" />
          : card.title === "Tasks Due Today"
            ? <ShieldAlert className="h-5 w-5 text-slate-700" />
            : card.title === "Meetings Today"
              ? <Users className="h-5 w-5 text-slate-700" />
              : <Wallet className="h-5 w-5 text-slate-700" />,
  }));

  const actionQueue = state.action_queue.map((item) => ({
    ...item,
    explanation:
      item.title === "Customers to follow up"
        ? "Live follow-up work derived from daily CRM activity."
        : item.title === "High-value customers with no recent orders"
          ? "High-value accounts that need a retention nudge."
          : item.title === "One-time customers ready for conversion"
            ? "New or light-touch accounts ready for nurture."
            : "Customers likely ready for loyalty or offer outreach.",
    route:
      item.title === "Customers to follow up"
        ? "/tasks"
        : item.title === "High-value customers with no recent orders"
          ? "/deals"
          : item.title === "One-time customers ready for conversion"
            ? "/accounts"
            : "/campaigns",
    icon:
      item.title === "Customers to follow up"
        ? <ShieldAlert className="h-5 w-5 text-[#365eea]" />
        : item.title === "High-value customers with no recent orders"
          ? <Crown className="h-5 w-5 text-[#7548b9]" />
          : item.title === "One-time customers ready for conversion"
            ? <Star className="h-5 w-5 text-[#13795b]" />
            : <Gift className="h-5 w-5 text-[#7548b9]" />,
    tone:
      item.title === "Customers to follow up"
        ? "border-[#d7e3f8] bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)]"
        : item.title === "One-time customers ready for conversion"
          ? "border-[#cbe6d8] bg-[linear-gradient(180deg,#f5fcf7_0%,#eef9f1_100%)]"
          : "border-[#ddd3f3] bg-[linear-gradient(180deg,#faf8ff_0%,#f1edff_100%)]",
  }));

  const segmentCards = state.segments.map((segment) => ({
    ...segment,
    note:
      segment.name === "New"
        ? "Fresh accounts to onboard"
        : segment.name === "Repeat"
          ? "Returning customers to retain"
          : segment.name === "VIP"
            ? "High-value accounts worth protecting"
            : segment.name === "At-risk"
              ? "Revenue cooling without follow-up"
              : "Reactivation candidates",
    tone:
      segment.name === "New"
        ? "border-[#d8cdf8] bg-[#fbf9ff]"
        : segment.name === "Repeat"
          ? "border-[#c7ead8] bg-[#eefbf4]"
          : segment.name === "VIP"
            ? "border-[#ddd3f3] bg-[#f7f2ff]"
            : segment.name === "At-risk"
              ? "border-[#d7e3f8] bg-[#f5f9ff]"
              : "border-[#f0c4c7] bg-[#fff1f2]",
  }));

  const quickActions = [
    { label: "Add Customer", route: "/accounts/create", icon: <UserPlus className="h-5 w-5" /> },
    { label: "Search Customer", route: "/accounts", icon: <Search className="h-5 w-5" /> },
    { label: "Send Offer", route: "/campaigns", icon: <Gift className="h-5 w-5" /> },
    { label: "View Customer Report", route: "/reports", icon: <FileBarChart2 className="h-5 w-5" /> },
    { label: "Export Customer Data", route: "/reports", icon: <Download className="h-5 w-5" /> },
  ];

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-[1400px] space-y-5">
        <div className="relative overflow-hidden rounded-[28px] border border-[#d9e5f5] bg-[linear-gradient(135deg,#f8faff_0%,#edf5ff_48%,#f5fdff_100%)] shadow-[0_18px_42px_rgba(15,57,122,0.09)]">
          <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-[#10bde8]/15 blur-3xl" />
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-700">
                <Sparkles className="h-3.5 w-3.5" />
                Customer Command Center
              </div>
              <h1 className="mt-2 text-[2.15rem] font-semibold tracking-[-0.04em] text-slate-950">
                {greeting()}, {user?.name || user?.email || "Admin"}
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                {loading
                  ? "Loading live CRM customer intelligence..."
                  : `Today shows ${state.hero.tasks_due_today} tasks due, ${state.hero.meetings_today} meetings scheduled, ${state.hero.deals_updated_today} deals updated, and ${state.hero.customers_added_today} new customers added.`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/accounts")}
              className="inline-flex items-center gap-2 rounded-2xl border border-indigo-400/20 bg-[linear-gradient(135deg,#4537d4_0%,#176de5_65%,#10bde8_130%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(40,74,210,0.22)] transition hover:-translate-y-0.5 hover:brightness-105"
            >
              Open Customers
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 px-5 py-4 md:grid-cols-2 xl:grid-cols-4">
            {state.top_insight_chips.map((chip) => (
              <div key={chip.label} className="rounded-2xl bg-white/80 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{chip.label}</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{chip.value}</div>
              </div>
            ))}
          </div>
        </div>

        <CRMSectionCard title="Action Queue" subtitle="Live customer situations derived from your CRM records.">
          <div className="grid items-stretch gap-4 xl:grid-cols-2">
            {actionQueue.map((item) => (
              <div key={item.title} className={`flex h-full min-h-[208px] flex-col rounded-2xl border px-4 py-4 ${item.tone}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">{item.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-500">{item.explanation}</div>
                    </div>
                  </div>
                  <div className="w-16 shrink-0 text-right">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Count</div>
                    <div className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{item.count}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(item.route)}
                  className="mt-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  View
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </CRMSectionCard>

        <div className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {summaryCards.map((card) => (
            <article key={card.title} className="flex h-full min-h-[228px] flex-col rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-h-[72px] max-w-[calc(100%-3.5rem)] text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-400">{card.title}</div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100">{card.icon}</div>
              </div>
              <div className="mt-4 break-words text-[clamp(2.25rem,2.6vw,3rem)] font-semibold leading-none tracking-tight text-slate-900">
                {loading ? "..." : card.displayValue}
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-500">{card.note}</div>
              <div className="mt-auto pt-4 text-sm font-medium leading-7 text-slate-700">{card.trend}</div>
            </article>
          ))}
        </div>

        <CRMSectionCard title="Customer Segments" subtitle="Real distribution built from current customer and deal records.">
          <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-5">
            {segmentCards.map((segment) => (
              <button
                key={segment.name}
                type="button"
                onClick={() => navigate("/accounts")}
                className={`flex h-full min-h-[168px] flex-col rounded-2xl border px-4 py-4 text-left transition hover:-translate-y-0.5 ${segment.tone}`}
              >
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{segment.name}</div>
                <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{loading ? "..." : segment.count}</div>
                <div className="mt-auto pt-3 text-sm leading-6 text-slate-500">{segment.note}</div>
              </button>
            ))}
          </div>
        </CRMSectionCard>

        <div className="grid items-start gap-5 xl:grid-cols-[1.08fr_0.92fr]">
          <CRMSectionCard title="Recent Customer Activity" subtitle="Recent items pulled from live accounts, deals, and CRM tasks.">
            <div className="space-y-3">
              {state.recent_activity.length ? state.recent_activity.map((item) => (
                <div key={item.key} className="grid min-h-[110px] gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-slate-900">{item.customer}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${activityTone(item.tag)}`}>{item.tag}</span>
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-700">{item.type}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-500">{item.context}</div>
                  </div>
                  <div className="text-sm font-medium text-slate-500 md:text-right">{item.time || "Recently"}</div>
                </div>
              )) : <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">No recent customer activity available.</div>}
            </div>
          </CRMSectionCard>

          <CRMSectionCard title="Top Customers" subtitle="Highest-value live accounts based on CRM deal activity.">
            <div className="space-y-3">
              {state.top_customers.length ? state.top_customers.map((customer) => (
                <div key={customer.id} className="min-h-[110px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900">{customer.name}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-500">{customer.status_line}</div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">#{customer.rank}</span>
                  </div>
                  <div className="mt-3 text-sm font-medium text-slate-700">
                    {formatCurrency(customer.revenue)} | {customer.deals} deal{customer.deals === 1 ? "" : "s"}
                  </div>
                </div>
              )) : <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">No top customer data available yet.</div>}
            </div>
          </CRMSectionCard>
        </div>

        <CRMSectionCard title="Quick Actions" subtitle="Shortcuts into the customer parts of your CRM project.">
          <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-5">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => navigate(action.route)}
                className="group flex h-full min-h-[168px] flex-col rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:bg-slate-100"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm transition group-hover:bg-blue-50">
                  {action.icon}
                </div>
                <div className="mt-4 text-base font-semibold text-slate-900">{action.label}</div>
                <div className="mt-auto inline-flex items-center gap-2 pt-4 text-sm font-medium text-slate-700">
                  Open
                  <ArrowRight className="h-4 w-4" />
                </div>
              </button>
            ))}
          </div>
        </CRMSectionCard>
      </div>
    </DashboardLayout>
  );
}
