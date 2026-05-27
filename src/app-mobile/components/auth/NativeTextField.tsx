import { forwardRef, useState, InputHTMLAttributes, ReactNode } from "react";
import { Eye, EyeOff, Check, AlertCircle } from "lucide-react";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label: string;
  icon?: ReactNode;
  error?: string | null;
  valid?: boolean;
  togglePassword?: boolean;
}

export const NativeTextField = forwardRef<HTMLInputElement, Props>(
  ({ label, icon, error, valid, togglePassword, type = "text", className, ...rest }, ref) => {
    const [show, setShow] = useState(false);
    const inputType = togglePassword ? (show ? "text" : "password") : type;
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground/90 px-0.5">{label}</label>
        <div
          className={`relative flex items-center rounded-2xl border-2 bg-background transition-colors ${
            error
              ? "border-destructive"
              : valid
              ? "border-emerald-500/60"
              : "border-border focus-within:border-primary"
          }`}
        >
          {icon && <span className="pl-4 text-muted-foreground">{icon}</span>}
          <input
            ref={ref}
            type={inputType}
            className={`flex-1 bg-transparent h-13 px-3 py-3.5 text-base outline-none placeholder:text-muted-foreground/60 ${className ?? ""}`}
            {...rest}
          />
          {togglePassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShow((s) => !s)}
              className="px-4 text-muted-foreground active:scale-95 transition-transform"
            >
              {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          )}
          {!togglePassword && valid && (
            <Check className="h-5 w-5 mr-4 text-emerald-500" />
          )}
        </div>
        {error && (
          <p className="flex items-center gap-1.5 text-xs text-destructive px-1">
            <AlertCircle className="h-3.5 w-3.5" /> {error}
          </p>
        )}
      </div>
    );
  }
);
NativeTextField.displayName = "NativeTextField";
