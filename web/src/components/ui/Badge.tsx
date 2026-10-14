import React from "react";

export type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
  success: {
    container: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
    dot: "bg-emerald-500",
  },
  warning: {
    container: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
    dot: "bg-amber-500",
  },
  danger: {
    container: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20",
    dot: "bg-rose-500",
  },
  info: {
    container: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20",
    dot: "bg-sky-500",
  },
  neutral: {
    container: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-500/10",
    dot: "bg-slate-400",
  },
  brand: {
    container: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20",
    dot: "bg-indigo-600",
  },
};

export default function Badge({
  children,
  variant = "neutral",
  dot = true,
  className = "",
}: BadgeProps) {
  const styles = variantStyles[variant] || variantStyles.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${styles.container} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />}
      {children}
    </span>
  );
}

