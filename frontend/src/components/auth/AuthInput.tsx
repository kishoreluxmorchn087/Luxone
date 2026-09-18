import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type AuthInputProps = {
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
};

const AuthInput = ({
  type = "text",
  value,
  onChange,
  placeholder,
  error,
}: AuthInputProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <div className="w-full">
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`h-[44px] w-full rounded-[12px] border bg-white px-4 ${isPassword ? "pr-10" : ""} text-[15px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
            error
              ? "border-red-300 focus:border-red-400 focus:ring-red-100"
              : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error ? (
        <p className="mt-2 text-[14px] font-medium text-red-500">{error}</p>
      ) : null}
    </div>
  );
};

export default AuthInput;