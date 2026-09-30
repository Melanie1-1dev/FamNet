import React from "react";

export function StatCard({ label, value, sub, icon: Icon, tone = "default" }) {
  const tones = {
    default: "from-stone-50 to-stone-100 text-stone-700",
    income: "from-emerald-50 to-teal-50 text-emerald-700",
    expense: "from-rose-50 to-red-50 text-rose-700",
    savings: "from-sky-50 to-blue-50 text-sky-700",
    balance: "from-violet-50 to-purple-50 text-violet-700",
  };
  return (
    <div className={`rounded-2xl border border-stone-200 dark:border-stone-800 bg-gradient-to-br ${tones[tone]} p-4 dark:bg-stone-900`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-stone-500 dark:text-stone-400">{label}</span>
        {Icon && <Icon size={18} className="opacity-70" />}
      </div>
      <div className="text-xl lg:text-2xl font-bold mt-2 text-stone-800 dark:text-stone-100">{value}</div>
      {sub && <div className="text-xs text-stone-400 mt-1">{sub}</div>}
    </div>
  );
}

export function SectionCard({ title, action, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 lg:p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="font-semibold text-stone-800 dark:text-stone-100">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function Badge({ children, className = "" }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>{children}</span>;
}

export function ProgressBar({ value, max, tone = "emerald" }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const colors = { emerald: "bg-emerald-500", sky: "bg-sky-500", rose: "bg-rose-500", amber: "bg-amber-500", violet: "bg-violet-500" };
  return (
    <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${colors[tone] || "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      {Icon && <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 mb-3"><Icon size={22} /></div>}
      <div className="font-medium text-stone-600 dark:text-stone-300">{title}</div>
      {subtitle && <div className="text-sm text-stone-400 mt-1">{subtitle}</div>}
    </div>
  );
}