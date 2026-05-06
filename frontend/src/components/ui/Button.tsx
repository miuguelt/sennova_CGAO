import * as React from "react";
import { cn } from "@/lib/utils";

const Button = React.forwardRef(({ className, variant = "primary", size = "md", children, ...props }, ref) => {
  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200/50 active:scale-95 transition-all",
    sena: "bg-gradient-to-r from-[#2A7D00] to-[#39A900] text-white hover:from-[#205E00] hover:to-[#2d8000] shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all font-bold",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200",
    outline: "border-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    danger: "bg-rose-500 text-white hover:bg-rose-600 shadow-md shadow-rose-200/50 active:scale-95 transition-all",
    indigo: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200/50 active:scale-95 transition-all",
  };

  const sizes = {
    sm: "h-9 px-4 text-xs",
    md: "h-11 px-6 py-2.5",
    lg: "h-14 px-10 text-base",
    icon: "h-11 w-11 p-0",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";

export { Button };
export default Button;
