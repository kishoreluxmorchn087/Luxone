import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { ChevronDown, ExternalLink, UserPlus, X } from "lucide-react";
import { createCampaign, getCampaignById, updateCampaign, type CampaignFormData } from "../../lib/api/campaignsApi";
import DatePicker from "../../components/common/DatePicker";
import { validateDatePickerInputs } from "../../lib/dateUtils";

type CampaignFormState = {
  campaignOwner: string;
  campaignName: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  expectedRevenue: string;
  budgetedCost: string;
  actualCost: string;
  expectedResponse: string;
  numbersSent: string;
  description: string;
};

const inputClass =
  "h-[34px] w-full rounded-[4px] border border-[#cfd7e6] bg-white px-3 text-[14px] text-slate-700 outline-none transition focus:border-[#6d8dff]";

const selectClass =
  "h-[34px] w-full appearance-none rounded-[4px] border border-[#cfd7e6] bg-white px-3 pr-8 text-[14px] text-slate-700 outline-none transition focus:border-[#6d8dff]";

const labelClass =
  "pr-4 text-right text-[14px] font-normal text-[#4e6485]";

function getLoggedInUserLabel() {
  const savedUser = localStorage.getItem("loggedInUser");
  if (!savedUser) return "Current User";
  try {
    const parsed = JSON.parse(savedUser) as {
      name?: string;
      full_name?: string;
      first_name?: string;
      firstName?: string;
      username?: string;
      email?: string;
      id?: string | number;
    };
    return (
      parsed.name ||
      parsed.full_name ||
      parsed.first_name ||
      parsed.firstName ||
      parsed.username ||
      parsed.email ||
      "Current User"
    );
  } catch {
    return "Current User";
  }
}

const initialFormData: CampaignFormState = {
  campaignOwner: "",
  campaignName: "",
  type: "",
  status: "",
  startDate: "",
  endDate: "",
  expectedRevenue: "",
  budgetedCost: "",
  actualCost: "",
  expectedResponse: "",
  numbersSent: "",
  description: "",
};

function SelectField({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
}) {
  return (
    <div className="relative">
      <select name={name} value={value} onChange={onChange} className={selectClass}>
        {options.map((option) => (
          <option key={option} value={option === "-None-" ? "" : option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
      />
    </div>
  );
}

function TextField({
  name,
  value,
  onChange,
  placeholder = "",
  type = "text",
}: {
  name: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={inputClass}
    />
  );
}

function CurrencyField({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="relative">
      <input
        name={name}
        value={value}
        onChange={onChange}
        className={`${inputClass} pl-11`}
      />
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-slate-600">
        Rs.
      </span>
    </div>
  );
}

function sanitizeNumericInput(value: string) {
  return value.replace(/\D/g, "");
}

export default function CreateCampaignPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CampaignFormState>(initialFormData);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formViewsOpen, setFormViewsOpen] = useState(false);
  const ownerLabel = getLoggedInUserLabel();

  // Load existing campaign when editing
  useEffect(() => {
    if (!id) return;
    void (async () => {
      const campaign = await getCampaignById(id);
      if (!campaign) return;
      setFormData({
        campaignOwner: campaign.campaignOwnerId,
        campaignName: campaign.campaignName,
        type: campaign.type,
        status: campaign.status,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        expectedRevenue: campaign.expectedRevenue,
        budgetedCost: campaign.budgetedCost,
        actualCost: campaign.actualCost,
        expectedResponse: campaign.expectedResponse,
        numbersSent: campaign.numbersSent,
        description: campaign.description,
      });
    })();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name } = e.target;
    const value =
      ["budgetedCost", "expectedRevenue", "actualCost"].includes(name)
        ? sanitizeNumericInput(e.target.value)
        : e.target.value;

    setError(null);
    setSuccessMessage(null);
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setError(null);
    setSuccessMessage(null);
  };

  const handleSave = async (goToNew = false) => {
    if (!validateDatePickerInputs()) return;

    if (!formData.campaignName.trim()) {
      setError("Campaign Name is required.");
      return;
    }

    if (formData.actualCost.trim() !== "" && (Number(formData.actualCost) < 0 || Number.isNaN(Number(formData.actualCost)))) {
      setError("Actual Cost cannot be negative.");
      return;
    }

    if (formData.budgetedCost.trim() !== "" && (Number(formData.budgetedCost) < 0 || Number.isNaN(Number(formData.budgetedCost)))) {
      setError("Budgeted Cost cannot be negative.");
      return;
    }

    if (formData.expectedRevenue.trim() !== "" && (Number(formData.expectedRevenue) < 0 || Number.isNaN(Number(formData.expectedRevenue)))) {
      setError("Expected Revenue cannot be negative.");
      return;
    }

    if (formData.numbersSent.trim() !== "" && (Number(formData.numbersSent) < 0 || Number.isNaN(Number(formData.numbersSent)))) {
      setError("Numbers sent cannot be negative.");
      return;
    }

    if (formData.expectedResponse.trim() !== "" && (Number(formData.expectedResponse) < 0 || Number.isNaN(Number(formData.expectedResponse)))) {
      setError("Expected Response cannot be negative.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const payload: CampaignFormData = {
        campaignOwner: formData.campaignOwner,
        campaignName: formData.campaignName,
        type: formData.type,
        status: formData.status,
        startDate: formData.startDate,
        endDate: formData.endDate,
        expectedRevenue: formData.expectedRevenue,
        budgetedCost: formData.budgetedCost,
        actualCost: formData.actualCost,
        expectedResponse: formData.expectedResponse,
        numbersSent: formData.numbersSent,
        description: formData.description,
      };

      if (isEdit && id) {
        await updateCampaign(id, payload);
      } else {
        await createCampaign(payload);
      }

      if (goToNew && !isEdit) {
        resetForm();
        setSuccessMessage("Campaign created successfully.");
        return;
      }

      navigate(isEdit ? `/campaigns/${id}` : "/campaigns");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create campaign.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="h-full overflow-hidden bg-[#f3f5f9]">
        <div className="border-b border-[#d9e1ef] bg-[#f7f9fc] px-7 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-[16px] font-semibold text-[#1f2d3d]">
                {isEdit ? "Edit Campaign" : "Create Campaign"}
              </h1>
              
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(isEdit ? `/campaigns/${id}` : "/campaigns")}
                disabled={saving}
                className="h-[32px] w-[140px] rounded-[6px] border border-[#cfd7e6] bg-white px-4 text-[14px] text-[#334155] hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave(true)}
                disabled={saving}
                className="h-[32px] w-[140px] rounded-[6px] border border-[#cfd7e6] bg-white px-4 text-[14px] text-[#334155] hover:bg-slate-50 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save and New"}
              </button>
              <button
                type="button"
                onClick={() => void handleSave(false)}
                disabled={saving}
                className="h-[32px] w-[140px] rounded-[6px] bg-gradient-to-b from-[#359de9] to-[#365eea] px-4 text-[14px] font-medium text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>

        <div className="h-[calc(100%-57px)] overflow-y-auto px-3 py-3">
          <div className="bg-white">
            <div className="px-3 pt-4">
              {error ? (
                <div className="mb-4 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              ) : null}
              {successMessage ? (
                <div className="mb-4 rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successMessage}
                </div>
              ) : null}
              <div className="mb-8">
                <div className="mb-5 text-[13px] font-semibold text-[#1f2d3d]">
                  Campaign Information
                </div>

                <div className="grid grid-cols-2 gap-x-16 gap-y-5">
                  <div className="grid grid-cols-[180px_minmax(0,1fr)] items-center gap-y-5">
                    <label className={labelClass}>Campaign Owner</label>
                    <div className="relative flex items-center gap-0">
                      <input
                        name="campaignOwner"
                        value={ownerLabel}
                        readOnly
                        className={`${inputClass} rounded-r-none bg-slate-50`}
                      />
                      <button
                        type="button"
                        disabled
                        className="flex h-[34px] w-[34px] items-center justify-center rounded-r-[4px] border border-l-0 border-[#cfd7e6] bg-white text-slate-600"
                      >
                        <UserPlus size={16} />
                      </button>
                    </div>

                    <label className={labelClass}>
                      Campaign Name <span className="text-red-500">*</span>
                    </label>
                    <TextField
                      name="campaignName"
                      value={formData.campaignName}
                      onChange={handleChange}
                    />

                    <label className={labelClass}>Start Date</label>
                    <DatePicker
                      name="startDate"
                      value={formData.startDate}
                      onChange={(startDate) => setFormData((previous) => ({ ...previous, startDate }))}
                      className={inputClass}
                    />

                    <label className={labelClass}>Expected Revenue</label>
                    <CurrencyField
                      name="expectedRevenue"
                      value={formData.expectedRevenue}
                      onChange={handleChange as React.ChangeEventHandler<HTMLInputElement>}
                    />

                    <label className={labelClass}>Actual Cost</label>
                    <CurrencyField
                      name="actualCost"
                      value={formData.actualCost}
                      onChange={handleChange as React.ChangeEventHandler<HTMLInputElement>}
                    />

                    <label className={labelClass}>Numbers sent</label>
                    <TextField
                      name="numbersSent"
                      value={formData.numbersSent}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="grid grid-cols-[180px_minmax(0,1fr)] items-center gap-y-5">
                    <label className={labelClass}>Type</label>
                    <SelectField
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      options={[
                        "-None-",
                        "Advertisement",
                        "Direct Mail",
                        "Email",
                        "Trade Show",
                        "Seminar",
                        "Webinar",
                        "Referral Program",
                        "Partners",
                        "Public Relations",
                        "Banner Ads",
                        "Social Media",
                        "Internal",
                      ]}
                    />

                    <label className={labelClass}>Status</label>
                    <SelectField
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      options={[
                        "-None-",
                        "Planning",
                        "Active",
                        "Inactive",
                        "Complete",
                      ]}
                    />

                    <label className={labelClass}>End Date</label>
                    <DatePicker
                      name="endDate"
                      value={formData.endDate}
                      onChange={(endDate) => setFormData((previous) => ({ ...previous, endDate }))}
                      className={inputClass}
                    />

                    <label className={labelClass}>Budgeted Cost</label>
                    <CurrencyField
                      name="budgetedCost"
                      value={formData.budgetedCost}
                      onChange={handleChange as React.ChangeEventHandler<HTMLInputElement>}
                    />

                    <label className={labelClass}>Expected Response</label>
                    <TextField
                      name="expectedResponse"
                      value={formData.expectedResponse}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <div className="mb-5 text-[13px] font-semibold text-[#1f2d3d]">
                  Description Information
                </div>

                <div className="grid w-[75%] grid-cols-[180px_minmax(0,1fr)] items-start">
                  <label className={`${labelClass} pt-2`}>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="min-h-[34px] w-full rounded-[4px] border border-[#cfd7e6] bg-white px-3 py-2 text-[14px] text-slate-700 outline-none focus:border-[#6d8dff]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-5 border-t border-[#d9e1ef] px-8 py-3">
              <button
                type="button"
                onClick={() => setFormViewsOpen(true)}
                className="text-[14px] text-[#1d4ed8] hover:underline"
              >
                Create Form Views
              </button>

            </div>
          </div>
        </div>
      </div>
      {formViewsOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setFormViewsOpen(false);
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="campaign-form-views-title"
                className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-2xl"
              >
                <header className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
                  <div>
                    <h2 id="campaign-form-views-title" className="text-lg font-semibold text-slate-900">
                      Campaign Form Views
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Preview the public form used to collect campaign leads.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormViewsOpen(false)}
                    aria-label="Close form views"
                    className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  >
                    <X size={20} />
                  </button>
                </header>

                <div className="p-6">
                  <div className="mx-auto max-w-lg rounded-[14px] border border-[#d9e1ef] bg-white p-6 shadow-sm sm:p-8">
                    <div className="mb-6 text-center">
                      <h3 className="text-[22px] font-semibold text-[#1f2d3d]">Get in Touch</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Fill out the form below and we'll get back to you shortly.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <label className="text-[13px] font-medium text-[#4e6485]">
                          First Name *
                          <input disabled placeholder="John" className="mt-1 h-[40px] w-full rounded-[6px] border border-[#cfd7e6] bg-slate-50 px-3 text-[14px] font-normal text-slate-700" />
                        </label>
                        <label className="text-[13px] font-medium text-[#4e6485]">
                          Last Name *
                          <input disabled placeholder="Doe" className="mt-1 h-[40px] w-full rounded-[6px] border border-[#cfd7e6] bg-slate-50 px-3 text-[14px] font-normal text-slate-700" />
                        </label>
                      </div>
                      <label className="block text-[13px] font-medium text-[#4e6485]">
                        Email Address *
                        <input disabled type="email" placeholder="john@example.com" className="mt-1 h-[40px] w-full rounded-[6px] border border-[#cfd7e6] bg-slate-50 px-3 text-[14px] font-normal text-slate-700" />
                      </label>
                      <label className="block text-[13px] font-medium text-[#4e6485]">
                        Phone Number *
                        <input disabled type="tel" placeholder="Enter phone number" className="mt-1 h-[40px] w-full rounded-[6px] border border-[#cfd7e6] bg-slate-50 px-3 text-[14px] font-normal text-slate-700" />
                      </label>
                      <label className="block text-[13px] font-medium text-[#4e6485]">
                        Company *
                        <input disabled placeholder="Your company name" className="mt-1 h-[40px] w-full rounded-[6px] border border-[#cfd7e6] bg-slate-50 px-3 text-[14px] font-normal text-slate-700" />
                      </label>
                      <label className="block text-[13px] font-medium text-[#4e6485]">
                        Website *
                        <input disabled type="url" placeholder="https://yourcompany.com" className="mt-1 h-[40px] w-full rounded-[6px] border border-[#cfd7e6] bg-slate-50 px-3 text-[14px] font-normal text-slate-700" />
                      </label>
                      <label className="block text-[13px] font-medium text-[#4e6485]">
                        Message / Notes *
                        <textarea disabled rows={3} placeholder="Tell us more about what you're looking for..." className="mt-1 w-full rounded-[6px] border border-[#cfd7e6] bg-slate-50 px-3 py-2 text-[14px] font-normal text-slate-700" />
                      </label>
                      <button
                        type="button"
                        disabled
                        className="w-full rounded-[8px] bg-gradient-to-b from-[#359de9] to-[#365eea] py-2.5 text-[15px] font-medium text-white opacity-70"
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-slate-500">
                      {id
                        ? "This is a non-submittable preview of the public form."
                        : "Save the campaign to generate a shareable form link."}
                    </p>
                    {id ? (
                      <a
                        href={`/public/campaigns/${encodeURIComponent(id)}/form`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Open live form
                        <ExternalLink size={15} />
                      </a>
                    ) : null}
                  </div>
                </div>

                <footer className="flex justify-end border-t border-slate-200 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setFormViewsOpen(false)}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </footer>
              </section>
            </div>,
            document.body
          )
        : null}
    </DashboardLayout>
  );
}
