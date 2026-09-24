import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import CRMSectionCard from "../../components/crm/CRMSectionCard";
import { listDomainMappings, listServices, verifyDomainMapping } from "../api";
import type { DomainMapping } from "../types";
import DomainMappingModal from "./DomainMappingModal";
import { copyToClipboard } from "../../lib/clipboard";

export default function DomainMappingPage() {
  const [rows, setRows] = useState<DomainMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationNotice, setVerificationNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [publishedServices, setPublishedServices] = useState(0);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [domainRows, services] = await Promise.all([listDomainMappings(), listServices()]);
      setRows(domainRows);
      setPublishedServices(services.filter((service) => Boolean(service.publicBookingUrl)).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load domain mappings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const verifiedCount = rows.filter((row) => row.verificationStatus === "verified").length;
  const pendingCount = rows.filter((row) => row.verificationStatus === "pending").length;
  const failedCount = rows.filter((row) => row.verificationStatus === "failed").length;

  const handleVerify = async (id: string) => {
    try {
      setVerifyingId(id);
      setError(null);
      setVerificationNotice(null);
      const verifiedMapping = await verifyDomainMapping(id);
      await load();
      setVerificationNotice(
        verifiedMapping.verificationStatus === "verified"
          ? { tone: "success", message: `${verifiedMapping.domain} was verified successfully.` }
          : { tone: "error", message: `${verifiedMapping.domain} could not be verified. Check its DNS record and try again.` },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify domain mapping.");
    } finally {
      setVerifyingId(null);
    }
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (value: string, label: string, rowId?: string) => {
    const success = await copyToClipboard(value);
    if (success) {
      if (rowId) {
        setCopiedId(rowId);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } else {
      setError(`${label} could not be copied.`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Domain Mapping</h1>
            <p className="text-sm text-slate-500">Map custom domains for CRM, Sandbox, and Portal-facing service experiences.</p>
          </div>
          <button type="button" onClick={() => setOpen(true)} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white">Map Domain</button>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Verified Domains</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{verifiedCount}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Pending Verification</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{pendingCount}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Failed Domains</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{failedCount}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 md:col-span-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Public Booking Usage</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{publishedServices}</div>
            <div className="mt-1 text-sm text-slate-500">service{publishedServices === 1 ? "" : "s"} currently expose a booking URL through mapped/company domains.</div>
          </div>
        </div>
        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">{error}</div> : null}
        {verificationNotice ? (
          <div
            role="status"
            className={`rounded-xl border p-4 text-sm ${verificationNotice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-600"}`}
          >
            {verificationNotice.message}
          </div>
        ) : null}
        {loading ? <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading domain mappings...</div> : null}
        {!loading && !rows.length ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-8 py-16 text-center">
            <h2 className="text-2xl font-semibold text-slate-900">No mapped domains yet</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500">Start the three-step mapping flow to connect a custom domain and verify it.</p>
          </div>
        ) : null}
        {!loading && rows.length ? (
          <div className="grid gap-4">
            {rows.map((row) => (
              <CRMSectionCard
                key={row.id}
                title={row.domain}
                action={
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCopy(row.cnameTarget, "CNAME target", row.id)}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-all duration-200 ${
                        copiedId === row.id
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-xs"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                      title={copiedId === row.id ? "Copied to clipboard!" : "Copy CNAME target"}
                    >
                      {copiedId === row.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-slate-500" />
                          <span>Copy CNAME</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleVerify(row.id)}
                      disabled={verifyingId === row.id}
                      className="inline-flex min-w-23 items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white disabled:cursor-wait disabled:opacity-60"
                    >
                      {verifyingId === row.id ? (
                        <>
                          <span aria-hidden="true" className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          Verifying...
                        </>
                      ) : "Verify Now"}
                    </button>
                  </div>
                }
              >
                <div className="grid gap-4 sm:grid-cols-4">
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">Account</p><p className="mt-1 text-sm text-slate-800">{row.accountType.toUpperCase()}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">CNAME Target</p><p className="mt-1 text-sm text-slate-800">{row.cnameTarget}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">Verification</p><p className="mt-1 text-sm text-slate-800">{row.verificationStatus}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">Portal URL</p><p className="mt-1 text-sm text-slate-800">{row.publicBookingBaseUrl || "-"}</p></div>
                </div>
              </CRMSectionCard>
            ))}
          </div>
        ) : null}
      </div>
      <DomainMappingModal open={open} onClose={() => setOpen(false)} onSaved={() => void load()} />
    </DashboardLayout>
  );
}
