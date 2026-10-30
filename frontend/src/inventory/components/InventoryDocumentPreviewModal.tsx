import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";
import luxmorLogo from "../../assets/1.jpg";
import type { InventoryDetailResponse } from "../types";
import { formatMoney } from "../utils";

type Props = {
  open: boolean;
  moduleKey: "invoices" | "purchase-orders";
  detail: InventoryDetailResponse;
  onClose: () => void;
};

function displayDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function address(detail: InventoryDetailResponse, kind: "billing" | "shipping") {
  const values = kind === "billing"
    ? [detail.billingStreet, detail.billingCity, detail.billingState, detail.billingCountry, detail.billingZipCode]
    : [detail.shippingStreet, detail.shippingCity, detail.shippingState, detail.shippingCountry, detail.shippingZipCode];
  return values.filter(Boolean).join(", ") || "-";
}

export default function InventoryDocumentPreviewModal({ open, moduleKey, detail, onClose }: Props) {
  if (!open) return null;

  const isInvoice = moduleKey === "invoices";
  const documentTitle = isInvoice ? "INVOICE" : "PURCHASE ORDER";
  const partyLabel = isInvoice ? "Bill To" : "Vendor";

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/60 p-4 sm:p-8">
      <style>{`@media print {
        body * { visibility: hidden !important; }
        .inventory-document-preview, .inventory-document-preview * { visibility: visible !important; }
        .inventory-document-preview { position: absolute !important; inset: 0 !important; width: 100% !important; box-shadow: none !important; }
        .inventory-preview-controls { display: none !important; }
        @page { size: A4; margin: 12mm; }
      }`}</style>

      <div className="inventory-preview-controls mx-auto mb-3 flex max-w-[920px] items-center justify-between">
        <p className="text-sm font-medium text-white">{documentTitle} preview</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Printer size={16} /> Print / Save PDF
          </button>
          <button type="button" onClick={onClose} className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            <X size={16} /> Close
          </button>
        </div>
      </div>

      <article className="inventory-document-preview mx-auto min-h-[1120px] max-w-[920px] bg-white p-8 text-slate-800 shadow-2xl sm:p-12">
        <header className="flex items-start justify-between gap-8 border-b-2 border-indigo-700 pb-8">
          <div>
            <img src={luxmorLogo} alt="Luxmor AI" className="h-20 w-auto max-w-[330px] object-contain object-left" />
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-bold tracking-wide text-slate-950">{documentTitle}</h1>
            <p className="mt-3 text-sm text-slate-500">{detail.documentNumber || detail.id}</p>
            <span className="mt-3 inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
              {detail.status || "Draft"}
            </span>
          </div>
        </header>

        <section className="grid gap-8 py-8 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{partyLabel}</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{detail.partyName || "-"}</p>
            {detail.contactName && <p className="mt-1 text-sm text-slate-600">Attn: {detail.contactName}</p>}
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">{address(detail, "billing")}</p>
          </div>
          <dl className="grid grid-cols-[1fr_auto] content-start gap-x-8 gap-y-3 text-sm sm:justify-self-end">
            <dt className="text-slate-500">Document date</dt><dd className="font-medium text-slate-900">{displayDate(detail.documentDate)}</dd>
            <dt className="text-slate-500">Due date</dt><dd className="font-medium text-slate-900">{displayDate(detail.dueDate)}</dd>
            <dt className="text-slate-500">Reference</dt><dd className="font-medium text-slate-900">{detail.documentNumber || detail.id}</dd>
          </dl>
        </section>

        <section>
          <div className="mb-3 rounded-lg bg-slate-50 px-4 py-3 text-sm">
            <span className="font-semibold text-slate-700">Ship to: </span>
            <span className="text-slate-600">{address(detail, "shipping")}</span>
          </div>
          <table className="w-full table-fixed border-collapse text-sm">
            <thead>
              <tr className="bg-slate-900 text-left text-white">
                <th className="w-[42%] px-4 py-3 font-semibold">Product / Description</th>
                <th className="w-[12%] px-3 py-3 text-right font-semibold">Qty</th>
                <th className="w-[20%] px-3 py-3 text-right font-semibold">Rate</th>
                <th className="w-[26%] px-4 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {(detail.items || []).map((item, index) => (
                <tr key={`${item.product}-${index}`} className="border-b border-slate-200 align-top">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-900">{item.productName || item.product || `Item ${index + 1}`}</p>
                    {(item.productCode || item.rowDescription) && <p className="mt-1 text-xs leading-5 text-slate-500">{[item.productCode, item.rowDescription].filter(Boolean).join(" · ")}</p>}
                  </td>
                  <td className="px-3 py-4 text-right">{item.quantity}</td>
                  <td className="px-3 py-4 text-right">{formatMoney(item.listPrice)}</td>
                  <td className="px-4 py-4 text-right font-semibold">{formatMoney(item.total)}</td>
                </tr>
              ))}
              {!detail.items?.length && <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">No line items</td></tr>}
            </tbody>
          </table>
        </section>

        <section className="mt-8 grid gap-8 sm:grid-cols-[1fr_320px]">
          <div className="space-y-5 text-sm leading-6 text-slate-600">
            {detail.description && <div><p className="font-semibold text-slate-900">Notes</p><p className="mt-1 whitespace-pre-wrap">{detail.description}</p></div>}
            {detail.termsAndConditions && <div><p className="font-semibold text-slate-900">Terms & Conditions</p><p className="mt-1 whitespace-pre-wrap">{detail.termsAndConditions}</p></div>}
          </div>
          <dl className="space-y-3 rounded-xl bg-slate-50 p-5 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="font-medium">{formatMoney(detail.subtotal || 0)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Discount</dt><dd className="font-medium">-{formatMoney(detail.discount || 0)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Tax</dt><dd className="font-medium">{formatMoney(detail.tax || 0)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Adjustment</dt><dd className="font-medium">{formatMoney(detail.adjustment || 0)}</dd></div>
            <div className="flex justify-between border-t border-slate-300 pt-4 text-base"><dt className="font-bold text-slate-950">Grand Total</dt><dd className="font-bold text-indigo-700">{formatMoney(detail.grandTotal || 0)}</dd></div>
          </dl>
        </section>

        <footer className="mt-16 border-t border-slate-200 pt-5 text-center text-xs text-slate-400">
          Thank you for your business.
        </footer>
      </article>
    </div>,
    document.body
  );
}
