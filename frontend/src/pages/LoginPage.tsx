import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, storeAuthSession } from "../lib/api/authApi";
import { getResolvedApiBaseUrl } from "../api/config";
import luxmorWordmark from "../assets/1.jpg";

type Step = "login" | "forgot-email" | "forgot-otp" | "forgot-reset";
type LoginFieldErrors = { email?: string; password?: string };
//CHANGED THE LENGTH OF EMAIL AND PASSWORD//
const EMAIL_MAX_LENGTH = 60;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 30;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function extractErrorMessage(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = extractErrorMessage(item);
      if (nested) return nested;
    }
    return null;
  }

  if (value && typeof value === "object") {
    for (const nestedValue of Object.values(value as Record<string, unknown>)) {
      const nested = extractErrorMessage(nestedValue);
      if (nested) return nested;
    }
  }

  return null;
}

async function authPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${getResolvedApiBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const contentType = res.headers.get("content-type") || "";
  if (
    !res.ok &&
    (contentType.includes("text/html") || text.trimStart().toLowerCase().startsWith("<!doctype html"))
  ) {
    throw new Error(
      `Backend request failed (${res.status}). Check the deployed API URL and allowed host settings.`
    );
  }
  let data: unknown;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg =
      extractErrorMessage((data as { message?: unknown })?.message) ||
      extractErrorMessage((data as { detail?: unknown })?.detail) ||
      extractErrorMessage(data) ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10";

export default function LoginPage() {
  const navigate = useNavigate();

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loginErrors, setLoginErrors] = useState<LoginFieldErrors>({});
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [step, setStep] = useState<Step>("login");
  const [fpEmail, setFpEmail] = useState("");
  const [fpOtp, setFpOtp] = useState("");
  const [fpNewPwd, setFpNewPwd] = useState("");
  const [fpConfirmPwd, setFpConfirmPwd] = useState("");
  const [fpShowPwd, setFpShowPwd] = useState(false);
  const [fpError, setFpError] = useState("");
  const [fpLoading, setFpLoading] = useState(false);
  const [fpSuccess, setFpSuccess] = useState("");

  const rawRedirect =
    typeof window.history.state === "object" &&
    window.history.state !== null &&
    typeof (window.history.state as { usr?: { from?: unknown } }).usr?.from === "string"
      ? ((window.history.state as { usr: { from: string } }).usr.from || "/home")
      : "/home";

  const MODULE_PATHS: Array<{ module: string; prefixes: string[]; landing: string }> = [
    { module: "sales", prefixes: ["/leads", "/contacts", "/accounts", "/deals", "/documents", "/campaigns"], landing: "/leads" },
    { module: "activities", prefixes: ["/tasks", "/meetings", "/calls"], landing: "/tasks" },
    {
      module: "inventory",
      prefixes: ["/products", "/price-books", "/quotes", "/sales-orders", "/purchase-orders", "/invoices", "/vendors", "/configurator"],
      landing: "/products",
    },
    { module: "support", prefixes: ["/support/cases", "/support/solutions"], landing: "/support/cases" },
    { module: "integrations", prefixes: ["/integrations"], landing: "/integrations" },
    { module: "services", prefixes: ["/services/business-hours", "/services/catalog", "/services/appointments", "/services/job-sheets", "/services/settings"], landing: "/services/catalog" },
    { module: "projects", prefixes: ["/projects"], landing: "/projects" },
  ];

  const getRedirectForModules = (path: string, allowedModules: string[]) => {
    const rootMatch = MODULE_PATHS.find((entry) => path === `/${entry.module}`);
    if (rootMatch) {
      return allowedModules.includes(rootMatch.module) ? rootMatch.landing : "/home";
    }

    const match = MODULE_PATHS.find((entry) => entry.prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)));
    return match && !allowedModules.includes(match.module) ? "/home" : path;
  };

  const validateLoginFields = (nextEmail: string, nextPassword: string): LoginFieldErrors => {
    const nextErrors: LoginFieldErrors = {};
    const trimmedEmail = nextEmail.trim();

    if (!trimmedEmail) {
      nextErrors.email = "Email is required.";
    } else if (trimmedEmail.length > EMAIL_MAX_LENGTH) {
      nextErrors.email = `Email must be at most ${EMAIL_MAX_LENGTH} characters.`;
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!nextPassword) {
      nextErrors.password = "Password is required.";
    } else if (nextPassword.length < PASSWORD_MIN_LENGTH || nextPassword.length > PASSWORD_MAX_LENGTH) {
      nextErrors.password = `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters.`;
    }

    return nextErrors;
  };

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError("");
    const nextErrors = validateLoginFields(email, password);
    setLoginErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      if (!res.success || !res.data) { setError(res.message || "Login failed."); return; }
      storeAuthSession(res.data);
      window.dispatchEvent(new Event("auth:login"));
      if (res.data.user.must_change_password) {
        navigate("/change-password", { replace: true });
      } else {
        const allowedModules: string[] = res.data.user.allowed_modules ?? [];
        const finalRedirect = getRedirectForModules(rawRedirect, allowedModules);
        navigate(finalRedirect, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot: send OTP ───────────────────────────────────────────────────────
  const handleSendOtp = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setFpError("");
    if (!fpEmail.trim()) { setFpError("Email is required."); return; }
    setFpLoading(true);
    try {
      await authPost("/auth/forgot-password/", { email: fpEmail.trim() });
      setStep("forgot-otp");
    } catch (err) {
      setFpError(err instanceof Error ? err.message : "Failed to send OTP.");
    } finally {
      setFpLoading(false);
    }
  };

  // ── Forgot: verify OTP ─────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setFpError("");
    if (!fpOtp.trim()) { setFpError("Enter the OTP sent to your email."); return; }
    setStep("forgot-reset");
  };

  // ── Forgot: reset password ─────────────────────────────────────────────────
  const handleResetPassword = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setFpError("");
    if (!fpNewPwd || !fpConfirmPwd) { setFpError("Both password fields are required."); return; }
    if (fpNewPwd !== fpConfirmPwd) { setFpError("Passwords do not match."); return; }
    if (fpNewPwd.length < 6) { setFpError("Password must be at least 6 characters."); return; }
    setFpLoading(true);
    try {
      await authPost("/auth/reset-password/", {
        email: fpEmail.trim(),
        otp: fpOtp.trim(),
        new_password: fpNewPwd,
      });
      setFpSuccess("Password reset successfully. You can now sign in.");
      setStep("login");
      setFpEmail(""); setFpOtp(""); setFpNewPwd(""); setFpConfirmPwd("");
    } catch (err) {
      setFpError(err instanceof Error ? err.message : "Reset failed. Check your OTP and try again.");
    } finally {
      setFpLoading(false);
    }
  };

  const resetForgot = () => {
    setStep("login");
    setFpEmail(""); setFpOtp(""); setFpNewPwd(""); setFpConfirmPwd("");
    setFpError(""); setFpLoading(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="luxmor-login min-h-screen lg:grid lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#061532] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 top-20 h-80 w-80 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="absolute -right-20 bottom-16 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative z-10"><img src={luxmorWordmark} alt="Luxmor AI Technologies" className="h-20 w-auto max-w-[390px] rounded-2xl bg-white object-contain px-4 shadow-2xl" /></div>
        <div className="relative z-10 max-w-xl">
          <span className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Customer intelligence, reimagined</span>
          <h1 className="mt-7 text-5xl font-bold leading-[1.08] tracking-tight">Turn every relationship into momentum.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">One elegant workspace for sales, service, projects, campaigns, and the insights your team needs to move faster.</p>
          <div className="mt-10 grid grid-cols-3 gap-3 text-sm"><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><strong className="block text-xl text-white">360°</strong><span className="text-slate-400">Customer view</span></div><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><strong className="block text-xl text-white">Real-time</strong><span className="text-slate-400">Team insights</span></div><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><strong className="block text-xl text-white">Secure</strong><span className="text-slate-400">Cloud access</span></div></div>
        </div>
        <p className="relative z-10 text-xs text-slate-500">© 2026 Luxmor AI Technologies Pvt Ltd</p>
      </section>
      <section className="flex min-h-screen items-center justify-center bg-[#f6f8fc] px-4 py-10 sm:px-10">
      <div className="w-full max-w-[430px]">
        <div className="mb-7 lg:hidden"><img src={luxmorWordmark} alt="Luxmor AI Technologies" className="mx-auto h-16 w-auto max-w-full rounded-xl bg-white object-contain px-3 shadow-sm" /></div>
        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">LuxOne CRM</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#071a40]">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to continue to your intelligent workspace.</p>
        </div>

        <div className="rounded-3xl border border-white bg-white p-7 shadow-[0_24px_70px_rgba(15,35,75,0.12)] sm:p-9">

          {/* ── STEP: login ── */}
          {step === "login" && (
            <>
              <h2 className="mb-6 text-[18px] font-semibold text-[#071a40]">Sign in to your account</h2>

              {fpSuccess && (
                <div className="mb-4 rounded-[6px] border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
                  {fpSuccess}
                </div>
              )}

              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email address
                  </label>
                  <input
                    id="email" type="email" autoComplete="email" autoFocus
                    maxLength={EMAIL_MAX_LENGTH}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value.replace(/\s/g, "").slice(0, EMAIL_MAX_LENGTH));
                      setLoginErrors((current) => ({ ...current, email: undefined }));
                      if (error) setError("");
                    }}
                    placeholder="you@example.com" className={inputCls}
                  />
                  {loginErrors.email && (
                    <p className="mt-1.5 text-xs text-red-600">{loginErrors.email}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => { setFpEmail(email); setFpError(""); setFpSuccess(""); setStep("forgot-email"); }}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="password" type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      maxLength={PASSWORD_MAX_LENGTH}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value.replace(/\s/g, "").slice(0, PASSWORD_MAX_LENGTH));
                        setLoginErrors((current) => ({ ...current, password: undefined }));
                        if (error) setError("");
                      }}
                      placeholder="Enter your password"
                      className={inputCls + " pr-10"}
                    />
                    <button type="button" onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 text-xs" tabIndex={-1}>
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {loginErrors.password && (
                    <p className="mt-1.5 text-xs text-red-600">{loginErrors.password}</p>
                  )}
                </div>

                {error && (
                  <div className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="mt-2 w-full rounded-[8px] bg-gradient-to-b from-[#359de9] to-[#365eea] py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
                  {loading ? "Signing in…" : "Sign in"}
                </button>
              </form>
            </>
          )}

          {/* ── STEP: forgot-email ── */}
          {step === "forgot-email" && (
            <>
              <h2 className="mb-1 text-[18px] font-semibold text-[#1f2d3d]">Reset Password</h2>
              <p className="mb-6 text-sm text-slate-500">Enter your email and we'll send you a one-time code.</p>

              <form onSubmit={(e) => void handleSendOtp(e)} className="space-y-4" noValidate>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
                  <input type="email" autoFocus value={fpEmail}
                    onChange={(e) => setFpEmail(e.target.value)}
                    placeholder="you@example.com" className={inputCls} />
                </div>

                {fpError && (
                  <div className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">{fpError}</div>
                )}

                <button type="submit" disabled={fpLoading}
                  className="w-full rounded-[8px] bg-gradient-to-b from-[#359de9] to-[#365eea] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
                  {fpLoading ? "Sending…" : "Send OTP"}
                </button>

                <button type="button" onClick={resetForgot}
                  className="w-full text-sm text-slate-500 hover:text-slate-700 py-1">
                  Back to Sign in
                </button>
              </form>
            </>
          )}

          {/* ── STEP: forgot-otp ── */}
          {step === "forgot-otp" && (
            <>
              <h2 className="mb-1 text-[18px] font-semibold text-[#1f2d3d]">Enter OTP</h2>
              <p className="mb-6 text-sm text-slate-500">
                A 6-digit code was sent to <span className="font-medium text-slate-700">{fpEmail}</span>. It expires in 5 minutes.
              </p>

              <form onSubmit={(e) => void handleVerifyOtp(e)} className="space-y-4" noValidate>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">One-time code</label>
                  <input type="text" autoFocus maxLength={6} value={fpOtp}
                    onChange={(e) => setFpOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className={inputCls + " tracking-[0.3em] text-center text-lg font-bold"} />
                </div>

                {fpError && (
                  <div className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">{fpError}</div>
                )}

                <button type="submit" disabled={fpOtp.length < 6}
                  className="w-full rounded-[8px] bg-gradient-to-b from-[#359de9] to-[#365eea] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
                  Verify OTP
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button type="button" onClick={() => { setFpError(""); void handleSendOtp({ preventDefault: () => {} }); }}
                    className="text-[#359de9] hover:underline">
                    Resend OTP
                  </button>
                  <button type="button" onClick={resetForgot} className="text-slate-500 hover:text-slate-700">
                    Back to Sign in
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── STEP: forgot-reset ── */}
          {step === "forgot-reset" && (
            <>
              <h2 className="mb-1 text-[18px] font-semibold text-[#1f2d3d]">New Password</h2>
              <p className="mb-6 text-sm text-slate-500">Choose a strong new password for your account.</p>

              <form onSubmit={(e) => void handleResetPassword(e)} className="space-y-4" noValidate>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">New password</label>
                  <div className="relative">
                    <input type={fpShowPwd ? "text" : "password"} autoFocus value={fpNewPwd}
                      onChange={(e) => setFpNewPwd(e.target.value)}
                      placeholder="At least 6 characters"
                      className={inputCls + " pr-10"} />
                    <button type="button" onClick={() => setFpShowPwd((v) => !v)}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 text-xs" tabIndex={-1}>
                      {fpShowPwd ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm password</label>
                  <input type={fpShowPwd ? "text" : "password"} value={fpConfirmPwd}
                    onChange={(e) => setFpConfirmPwd(e.target.value)}
                    placeholder="Re-enter new password" className={inputCls} />
                </div>

                {fpError && (
                  <div className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">{fpError}</div>
                )}

                <button type="submit" disabled={fpLoading}
                  className="w-full rounded-[8px] bg-gradient-to-b from-[#359de9] to-[#365eea] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
                  {fpLoading ? "Resetting…" : "Reset Password"}
                </button>

                <button type="button" onClick={resetForgot}
                  className="w-full text-sm text-slate-500 hover:text-slate-700 py-1">
                  Back to Sign in
                </button>
              </form>
            </>
          )}

        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Contact your administrator if you don't have an account.
        </p>
      </div></section>
    </div>
  );
}
