import React from "react";
import { NavLink } from "react-router-dom";
import { TrendingUp, TrendingDown, PiggyBank, Receipt, Target, PieChart, Wallet } from "lucide-react";

const ITEMS = [
  { to: "/finance", label: "Overview", icon: PieChart, end: true },
  { to: "/finance/income", label: "Income", icon: TrendingUp },
  { to: "/finance/expenses", label: "Expenses", icon: TrendingDown },
  { to: "/finance/savings", label: "Savings", icon: PiggyBank },
  { to: "/finance/budgets", label: "Budgets", icon: Wallet },
  { to: "/finance/bills", label: "Bills", icon: Receipt },
  { to: "/goals", label: "Goals", icon: Target },
];

export default function FinanceNav() {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 mb-4">
      {ITEMS.map((i) => {
        const Icon = i.icon;
        return (
          <NavLink key={i.to} to={i.to} end={i.end}
            className={({ isActive }) => `flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${isActive ? "bg-emerald-600 text-white" : "bg-white dark:bg-stone-900 text-stone-500 border border-stone-200 dark:border-stone-800"}`}>
            <Icon size={15} /> {i.label}
          </NavLink>
        );
      })}
    </div>
  );
}