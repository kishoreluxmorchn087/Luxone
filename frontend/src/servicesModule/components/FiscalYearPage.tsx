    import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import CRMSectionCard from "../../components/crm/CRMSectionCard";
import { getFiscalYearSettings, listAppointments, listJobSheets, updateFiscalYearSettings } from "../api";
import { fiscalYearMonthOptions } from "../config";
import type { FiscalYearSettings } from "../types";

const inputClass = "h-[38px] w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500";
const customPeriodStorageKey = "services-fiscal-year-custom-period";

type CustomPeriod = {
  start: string;
  end: string;
};

export default function FiscalYearPage() {
  const [form, setForm] = useState<FiscalYearSettings>({ id: "", fiscalYearType: "standard", startsInMonth: 1 });
  const [customStartsInMonth, setCustomStartsInMonth] = useState(1);
  const [customPeriod, setCustomPeriod] = useState<CustomPeriod>({ start: "", end: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [usageSummary, setUsageSummary] = useState({ appointmentsInPeriod: 0, completedAppointments: 0, jobSheetsInPeriod: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const [settings, appointments, jobSheets] = await Promise.all([
          getFiscalYearSettings(),
          listAppointments(),
          listJobSheets(),
        ]);
        setForm(settings);
        setCustomStartsInMonth(settings.fiscalYearType === "custom" ? settings.startsInMonth : 1);
        try {
          const savedPeriod = window.localStorage.getItem(customPeriodStorageKey);
          const parsedPeriod = savedPeriod ? JSON.parse(savedPeriod) as Partial<CustomPeriod> : null;
          const period = {
            start: parsedPeriod?.start || settings.currentPeriodStart || "",
            end: parsedPeriod?.end || settings.currentPeriodEnd || "",
          };
          setCustomPeriod(period);
          if (period.start) setCustomStartsInMonth(Number(period.start.slice(5, 7)));
        } catch {
          setCustomPeriod({ start: settings.currentPeriodStart || "", end: settings.currentPeriodEnd || "" });
        }
        const inRange = (value?: string) => {
          if (!value || !settings.currentPeriodStart || !settings.currentPeriodEnd) return false;
          return value >= settings.currentPeriodStart && value <= settings.currentPeriodEnd;
        };
        const appointmentsInPeriod = appointments.filter((item) => inRange(item.appointmentDate));
        setUsageSummary({
          appointmentsInPeriod: appointmentsInPeriod.length,
          completedAppointments: appointmentsInPeriod.filter((item) => item.status.toLowerCase() === "completed").length,
          jobSheetsInPeriod: jobSheets.filter((item) => inRange(item.createdAt.slice(0, 10))).length,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load fiscal year settings.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleSave = async () => {
    if (form.fiscalYearType === "custom" && customPeriod.start && customPeriod.end && customPeriod.end < customPeriod.start) {
      setError("Custom fiscal year end date must be on or after the start date.");
      return;
    }
    const valuesToSave = {
      ...form,
      startsInMonth: form.fiscalYearType === "custom" && customPeriod.start
        ? Number(customPeriod.start.slice(5, 7))
        : form.startsInMonth,
    };
    if (valuesToSave.startsInMonth < 1 || valuesToSave.startsInMonth > 12) {
      setError("Fiscal year month must be between 1 and 12.");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      setSavedMessage(null);
      const updatedSettings = await updateFiscalYearSettings(valuesToSave);
      setForm(updatedSettings);
      setCustomStartsInMonth(valuesToSave.startsInMonth);
      if (valuesToSave.fiscalYearType === "custom") {
        window.localStorage.setItem(customPeriodStorageKey, JSON.stringify(customPeriod));
      }
      setSavedMessage("Fiscal year settings updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update fiscal year settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Fiscal Year</h1>
            <p className="text-sm text-slate-500">Configure the fiscal-year mode and starting month for Services settings.</p>
          </div>
          <button type="button" disabled={saving || loading} onClick={() => void handleSave()} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white">{saving ? "Saving..." : "Save"}</button>
        </div>
        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">{error}</div> : null}
        {savedMessage ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{savedMessage}</div> : null}
        <CRMSectionCard title="Fiscal Year Settings">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="rounded-lg border border-slate-200 p-4 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={form.fiscalYearType === "standard"}
                  onChange={() => setForm((current) => ({ ...current, fiscalYearType: "standard" }))}
                />
                Standard Fiscal Year
              </div>
            </label>
            <label className="rounded-lg border border-slate-200 p-4 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={form.fiscalYearType === "custom"}
                  onChange={() => setForm((current) => ({ ...current, fiscalYearType: "custom", startsInMonth: customStartsInMonth }))}
                />
                Custom Fiscal Year
              </div>
            </label>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Fiscal year begins in month</label>
              <select
                className={inputClass}
                value={form.startsInMonth}
                onChange={(e) => {
                  const startsInMonth = Number(e.target.value);
                  setCustomStartsInMonth(startsInMonth);
                  setForm((current) => ({ ...current, startsInMonth }));
                }}
              >
                {fiscalYearMonthOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            {form.fiscalYearType === "custom" ? (
              <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Custom period start date</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={customPeriod.start}
                    onChange={(e) => {
                      const start = e.target.value;
                      setCustomPeriod((current) => ({ ...current, start }));
                      if (start) {
                        const startsInMonth = Number(start.slice(5, 7));
                        setCustomStartsInMonth(startsInMonth);
                        setForm((current) => ({ ...current, startsInMonth }));
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Custom period end date</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={customPeriod.end}
                    min={customPeriod.start || undefined}
                    onChange={(e) => setCustomPeriod((current) => ({ ...current, end: e.target.value }))}
                  />
                </div>
              </div>
            ) : null}
            <div><p className="text-xs uppercase tracking-wide text-slate-500">Current Fiscal Year</p><p className="mt-1 text-sm text-slate-800">{form.fiscalYearLabel || "-"}</p></div>
            <div><p className="text-xs uppercase tracking-wide text-slate-500">Current Period</p><p className="mt-1 text-sm text-slate-800">{form.fiscalYearType === "custom" && customPeriod.start && customPeriod.end ? `${customPeriod.start} to ${customPeriod.end}` : form.currentPeriodStart && form.currentPeriodEnd ? `${form.currentPeriodStart} to ${form.currentPeriodEnd}` : "-"}</p></div>
          </div>
        </CRMSectionCard>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Appointments In Period</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{usageSummary.appointmentsInPeriod}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Completed Appointments</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{usageSummary.completedAppointments}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Job Sheets In Period</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{usageSummary.jobSheetsInPeriod}</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
