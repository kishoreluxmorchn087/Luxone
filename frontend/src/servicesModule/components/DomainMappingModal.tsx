import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import CRMModalBase from "../../components/crm/CRMModalBase";
import { createDomainMapping, updateDomainMapping, verifyDomainMapping } from "../api";
import { domainMappingSteps } from "../config";
import type { DomainMapping } from "../types";
import { copyToClipboard } from "../../lib/clipboard";

type Props = Readonly<{
  open: boolean;
  initialMapping: DomainMapping | null;
  onClose: () => void;
  onSaved: () => void;
}>;

export default function DomainMappingModal({ open, initialMapping, onClose, onSaved }: Props) {
  const [step, setStep] = useState(0);
  const [accountType, setAccountType] = useState<"crm" | "sandbox" | "portals">("crm");
  const [domain, setDomain] = useState("");
  const [mappingId, setMappingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalCopied, setModalCopied] = useState(false);

  const handleCopyTarget = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setModalCopied(true);
      setTimeout(() => setModalCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (open && initialMapping) {
      setStep(0);
      setAccountType(initialMapping.accountType);
      setDomain(initialMapping.domain);
      setMappingId(initialMapping.id);
      setError(null);
    } else if (!open) {
      setStep(0);
      setAccountType("crm");
      setDomain("");
      setMappingId("");
      setError(null);
    }
  }, [initialMapping, open]);

  const handleNext = async () => {
    try {
      setSaving(true);
      setError(null);
      if (step === 1) {
        if (!domain.trim()) {
          setError("Domain is required.");
          return;
        }
        if (!isPublicDomain(domain)) {
          setError("Enter a valid public domain or URL. Local and internal addresses are not allowed.");
          return;
        }
        if (initialMapping) {
          await updateDomainMapping(initialMapping.id, accountType, domain);
          onSaved();
          onClose();
          return;
        }
        const created = await createDomainMapping(accountType, domain);
        setMappingId(created.id);
      }
      if (step === 2) {
        await verifyDomainMapping(mappingId);
        onSaved();
        onClose();
        return;
      }
      setStep((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to continue domain mapping.");
    } finally {
      setSaving(false);
    }
  };

  const actionLabel = saving
    ? "Working..."
    : initialMapping && step === 1
      ? "Save Changes"
      : step === 2
        ? "Link and Verify"
        : "Next";

  return (
    <CRMModalBase
      open={open}
      title={initialMapping ? "Edit Domain Mapping" : "Map Domain"}
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700">
            Cancel
          </button>
          {step > 0 ? (
            <button type="button" onClick={() => setStep((prev) => prev - 1)} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700">
              Back
            </button>
          ) : null}
          <button type="button" disabled={saving} onClick={() => void handleNext()} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white">
            {actionLabel}
          </button>
        </>
      }
      maxWidthClassName="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          {domainMappingSteps.map((item, index) => (
            <div key={item} className={`rounded-full px-3 py-1 text-xs font-medium ${index === step ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
              {index + 1}. {item}
            </div>
          ))}
        </div>

        {step === 0 ? (
          <div className="space-y-3">
            {[
              { label: "CRM", value: "crm" },
              { label: "Sandbox", value: "sandbox" },
              { label: "Portals", value: "portals" },
            ].map((item) => (
              <label key={item.value} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                <input type="radio" checked={accountType === item.value} onChange={() => setAccountType(item.value as "crm" | "sandbox" | "portals")} />
                {item.label}
              </label>
            ))}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-3">
            <div>
              <label htmlFor="domain-mapping-domain" className="mb-1.5 block text-sm font-medium text-slate-700">Domain / URL</label>
              <input id="domain-mapping-domain" value={domain} onChange={(e) => setDomain(e.target.value)} className="h-[38px] w-full rounded-md border border-slate-300 px-3 text-sm" placeholder="support.yourcompany.com" />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              <div>
                <p>Prerequisite: create a CNAME record for your chosen domain.</p>
                <p className="mt-1 font-medium text-slate-900">
                  Point to: <span className="font-mono text-blue-600">crm.cs.zohohost.in</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleCopyTarget("crm.cs.zohohost.in")}
                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all ${
                  modalCopied
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
                title="Copy CNAME target"
              >
                {modalCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
                {modalCopied ? "Copied!" : "Copy CNAME"}
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3 text-sm text-slate-600">
            <p>Account: <span className="font-medium text-slate-900">{accountType.toUpperCase()}</span></p>
            <p>Domain: <span className="font-medium text-slate-900">{domain}</span></p>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">CNAME Target</p>
                <p className="mt-1 font-mono font-medium text-slate-900">crm.cs.zohohost.in</p>
              </div>
              <button
                type="button"
                onClick={() => void handleCopyTarget("crm.cs.zohohost.in")}
                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all ${
                  modalCopied
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
                title="Copy CNAME target"
              >
                {modalCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
                {modalCopied ? "Copied!" : "Copy CNAME"}
              </button>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              Use the final step to persist the domain mapping and verify it.
            </div>
          </div>
        ) : null}

        {error ? <div className="text-sm text-rose-600">{error}</div> : null}
      </div>
    </CRMModalBase>
  );
}

function isPublicDomain(value: string) {
  const rawValue = value.trim();
  const candidate = rawValue.includes("://") ? rawValue : `https://${rawValue}`;

  try {
    const url = new URL(candidate);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    if (!/^https?:$/.test(url.protocol) || !hostname || hostname === "localhost" || hostname.split(".").length < 2) {
      return false;
    }
    if ([".local", ".internal", ".test", ".invalid", ".example"].some((suffix) => hostname.endsWith(suffix))) {
      return false;
    }
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
      return false;
    }
    return hostname.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
  } catch {
    return false;
  }
}

