import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "sena" | "secondary" | "outline" | "ghost" | "danger" | "warning" | "indigo" | "success";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
  icon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary: "bg-emerald-700 text-white hover:bg-emerald-800 shadow-md shadow-emerald-900/20 active:scale-95 transition-all font-bold",
      sena: "bg-gradient-to-r from-[#175200] to-[#257c00] text-white hover:from-[#103d00] hover:to-[#1b5e00] shadow-lg shadow-emerald-950/20 active:scale-[0.98] transition-all font-bold",
      secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-300 font-bold",
      outline: "border-2 border-slate-300 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-950 font-bold",
      ghost: "text-slate-700 hover:bg-slate-100 hover:text-slate-950 font-bold",
      danger: "bg-rose-700 text-white hover:bg-rose-800 shadow-md shadow-rose-900/20 active:scale-95 transition-all font-bold",
      warning: "bg-amber-500 text-slate-950 hover:bg-amber-400 border border-amber-600 shadow-md shadow-amber-900/10 active:scale-95 transition-all font-black",
      indigo: "bg-indigo-700 text-white hover:bg-indigo-800 shadow-md shadow-indigo-900/20 active:scale-95 transition-all font-bold",
      success: "bg-emerald-700 text-white hover:bg-emerald-800 shadow-md shadow-emerald-900/20 active:scale-95 transition-all font-bold",
    };

    const sizes = {
      sm: "h-9 px-4 text-xs",
      md: "h-11 px-6 py-2.5",
      lg: "h-14 px-10 text-base",
      icon: "h-11 w-11 p-0",
    };

    const spinnerSizes: Record<NonNullable<ButtonProps["size"]>, string> = {
      sm: "h-3.5 w-3.5",
      md: "h-4 w-4",
      lg: "h-5 w-5",
      icon: "h-5 w-5",
    };

    const isLoading = Boolean(loading);
    const isDisabled = Boolean(disabled || isLoading);

    const renderContent = () => {
      if (size === "icon") {
        return isLoading ? (
          <Loader2
            className={cn("animate-spin shrink-0", spinnerSizes[size])}
            aria-hidden="true"
          />
        ) : (
          children
        );
      }

      return (
        <>
          {isLoading ? (
            <Loader2
              className={cn("animate-spin shrink-0", spinnerSizes[size])}
              aria-hidden="true"
            />
          ) : (
            icon
          )}
          {children}
        </>
      );
    };

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={isLoading ? "true" : undefined}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {renderContent()}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
export default Button;
