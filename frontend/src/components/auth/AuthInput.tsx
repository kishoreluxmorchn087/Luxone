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
  const resolvedType = type === "password" && showPassword ? "text" : type;

  return (
    <div className="w-full">
      <div className="relative">
        <input
          type={resolvedType}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`h-11 w-full rounded-xl border bg-white px-4 pr-11 text-[15px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
            error
              ? "border-red-300 focus:border-red-400 focus:ring-red-100"
              : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
          }`}
        />

        {type === "password" ? (
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-[14px] font-medium text-red-500">{error}</p> : null}
    </div>
  );
};

export default AuthInput;