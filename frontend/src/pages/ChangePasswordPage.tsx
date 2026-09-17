import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { changePassword, getAccessToken, getStoredUser } from "../lib/api/authApi";

export default function ChangePasswordPage() {
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const user = getStoredUser();
  const accessToken = getAccessToken();
  const isForcedChange = user?.must_change_password === true;

  const inputCls =
    "w-full rounded-[8px] border border-[#cfd7e6] px-3 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-[#359de9] focus:ring-2 focus:ring-[#359de9]/10";

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All password fields are required.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!accessToken) {
      setError("Session expired. Please log in again.");
      navigate("/login", { replace: true });
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword, confirmPassword, accessToken);
      if (user) {
        localStorage.setItem("loggedInUser", JSON.stringify({ ...user, must_change_password: false }));
      }
      navigate("/home", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] flex items-center justify-center px-4">
      <div className="w-full max-w-105">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <ShieldCheck size={28} className="text-[#359de9]" />
          </div>
          <h1 className="text-2xl font-bold text-[#1f2d3d]">
            {isForcedChange ? "Set Your Password" : "Change Password"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {isForcedChange
              ? `${user?.email ? `Welcome, ${user.name || user.email.split("@")[0]}! ` : ""}Please set a new password to continue.`
              : "Update your password to keep your account secure."}
          </p>
        </div>

        <div className="rounded-[20px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.08)] p-8">
          <div className="mb-5 rounded-lgrder border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <strong>Security Notice:</strong> Use a password you do not reuse elsewhere.
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="current-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Current Password
              </label>
              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showNew ? "text" : "password"}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 text-xs"
                  tabIndex={-1}
                >
                  {showNew ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your new password"
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 text-xs"
                  tabIndex={-1}
                >
                  {showConfirm ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-linear-to-b from-[#359de9] to-[#365eea] py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <KeyRound size={15} />
              )}
              {loading ? "Saving..." : isForcedChange ? "Set Password & Continue" : "Change Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
