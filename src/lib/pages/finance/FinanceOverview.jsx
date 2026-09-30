import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useFamilyData } from "@/lib/useFamilyData";
import FinanceNav from "@/Components/FinanceNav";
import { StatCard, SectionCard, ProgressBar, EmptyState } from "@/Components/uiBits";
import { RWF, inPeriod, monthKey, monthLabel } from "@/lib/famNestUtils";
import { TrendingUp, TrendingDown, PiggyBank, Wallet, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const PIE_COLORS = ["#10b981", "#f43f5e", "#3b82f6", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#6366f1", "#14b8a6", "#eab308", "#a855f7", "#64748b", "#fb7185"];

export default function FinanceOverview() {
  const d = useFamilyData();
  const [period, setPeriod] = useState("month");

  const totals = useMemo(() => {
    const income = d.income.filter((i) => inPeriod(i.date, period)).reduce((s, i) => s + i.amount, 0);
    const expenses = d.expenses.filter((i) => inPeriod(i.date, period)).reduce((s, i) => s + i.amount, 0);
    const savings = d.savingsContributions.filter((i) => inPeriod(i.date, period)).reduce((s, i) => s + i.amount, 0);
    return { income, expenses, savings, available: income - expenses - savings };
  }, [d, period]);

  const byCategory = useMemo(() => {
    const map = {};
    d.expenses.filter((e) => inPeriod(e.date, period)).forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [d, period]);

  const monthlyTrend = useMemo(() => {
    const map = {};
    d.income.forEach((i) => { const k = monthKey(i.date); map[k] = map[k] || { income: 0, expenses: 0 }; map[k].income += i.amount; });
    d.expenses.forEach((i) => { const k = monthKey(i.date); map[k] = map[k] || { income: 0, expenses: 0 }; map[k].expenses += i.amount; });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([k, v]) => ({ name: monthLabel(k), ...v }));
  }, [d]);

  if (d.loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <FinanceNav />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Finance Overview</h1>
        <div className="flex gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
          {[{ k: "week", l: "Week" }, { k: "month", l: "Month" }, { k: "year", l: "Year" }].map((p) => (
            <button key={p.k} onClick={() => setPeriod(p.k)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${period === p.k ? "bg-white dark:bg-stone-700 text-emerald-700 shadow-sm" : "text-stone-500"}`}>{p.l}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Income" value={RWF(totals.income)} icon={TrendingUp} tone="income" />
        <StatCard label="Expenses" value={RWF(totals.expenses)} icon={TrendingDown} tone="expense" />
        <StatCard label="Savings" value={RWF(totals.savings)} icon={PiggyBank} tone="savings" />
        <StatCard label="Available" value={RWF(totals.available)} icon={Wallet} tone={totals.available >= 0 ? "balance" : "expense"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <SectionCard title="Income vs Expenses">
          {monthlyTrend.length === 0 ? <EmptyState icon={BarChart3} title="No data yet" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyTrend}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={(v) => RWF(v)} contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4" }} />
                <Legend />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Expenses by Category">
          {byCategory.length === 0 ? <EmptyState icon={PieChart} title="No expenses" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => e.name}>
                  {byCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => RWF(v)} contentStyle={{ borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Savings Goals">
        {d.savingsGoals.length === 0 ? <EmptyState icon={PiggyBank} title="No savings goals" /> : (
          <div className="grid sm:grid-cols-2 gap-4">
            {d.savingsGoals.map((g) => (
              <div key={g.id}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-sm font-medium text-stone-700 dark:text-stone-200">{g.name}</span>
                  <span className="text-xs text-stone-400">{Math.round(g.current_amount / g.target_amount * 100)}%</span>
                </div>
                <ProgressBar value={g.current_amount} max={g.target_amount} tone="sky" />
                <div className="text-xs text-stone-400 mt-1">{RWF(g.current_amount)} of {RWF(g.target_amount)}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}