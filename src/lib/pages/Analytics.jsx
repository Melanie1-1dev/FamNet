import React, { useState, useMemo } from "react";
import { useFamilyData } from "@/lib/useFamilyData";
import { SectionCard, EmptyState } from "@/Components/uiBits";
import { RWF, inPeriod, monthKey, monthLabel } from "@/lib/famNestUtils";
import { BarChart3, Loader2 } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#10b981", "#f43f5e", "#3b82f6", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#6366f1", "#14b8a6", "#eab308", "#a855f7", "#64748b", "#fb7185"];

export default function Analytics() {
  const d = useFamilyData();
  const [period, setPeriod] = useState("year");

  const incomeBySource = useMemo(() => {
    const map = {};
    d.income.filter((i) => inPeriod(i.date, period)).forEach((i) => { map[i.source] = (map[i.source] || 0) + i.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [d, period]);

  const expenseByCat = useMemo(() => {
    const map = {};
    d.expenses.filter((i) => inPeriod(i.date, period)).forEach((i) => { map[i.category] = (map[i.category] || 0) + i.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [d, period]);

  const expenseByPerson = useMemo(() => {
    const map = {};
    d.expenses.filter((i) => inPeriod(i.date, period)).forEach((i) => { const p = i.person || "Unknown"; map[p] = (map[p] || 0) + i.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [d, period]);

  const monthlyTrend = useMemo(() => {
    const map = {};
    d.income.forEach((i) => { const k = monthKey(i.date); map[k] = map[k] || { income: 0, expenses: 0, savings: 0 }; map[k].income += i.amount; });
    d.expenses.forEach((i) => { const k = monthKey(i.date); map[k] = map[k] || { income: 0, expenses: 0, savings: 0 }; map[k].expenses += i.amount; });
    d.savingsContributions.forEach((i) => { const k = monthKey(i.date); map[k] = map[k] || { income: 0, expenses: 0, savings: 0 }; map[k].savings += i.amount; });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-8).map(([k, v]) => ({ name: monthLabel(k), ...v }));
  }, [d]);

  const savingsProgress = useMemo(() => d.savingsGoals.map((g) => ({ name: g.name, current: g.current_amount, target: g.target_amount, pct: Math.round((g.current_amount / g.target_amount) * 100) })), [d]);

  if (d.loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Analytics</h1>
          <p className="text-sm text-stone-400">Insights into your family finances</p>
        </div>
        <div className="flex gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
          {[{ k: "week", l: "Week" }, { k: "month", l: "Month" }, { k: "year", l: "Year" }].map((p) => (
            <button key={p.k} onClick={() => setPeriod(p.k)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${period === p.k ? "bg-white dark:bg-stone-700 text-emerald-700 shadow-sm" : "text-stone-500"}`}>{p.l}</button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <SectionCard title="Monthly Trend">
          {monthlyTrend.length === 0 ? <EmptyState icon={BarChart3} title="No data" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyTrend}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={(v) => RWF(v)} contentStyle={{ borderRadius: 12 }} />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2} />
                <Line type="monotone" dataKey="savings" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Income by Source">
          {incomeBySource.length === 0 ? <EmptyState title="No income" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={incomeBySource} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e) => e.name}>
                  {incomeBySource.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => RWF(v)} contentStyle={{ borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Expenses by Category">
          {expenseByCat.length === 0 ? <EmptyState title="No expenses" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={expenseByCat} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(v) => RWF(v)} contentStyle={{ borderRadius: 12 }} />
                <Bar dataKey="value" fill="#f43f5e" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Expenses by Person">
          {expenseByPerson.length === 0 ? <EmptyState title="No data" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={expenseByPerson}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={(v) => RWF(v)} contentStyle={{ borderRadius: 12 }} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Savings Goal Progress">
        {savingsProgress.length === 0 ? <EmptyState title="No savings goals" /> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={savingsProgress}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(v) => RWF(v)} contentStyle={{ borderRadius: 12 }} />
              <Legend />
              <Bar dataKey="current" name="Current" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="target" name="Target" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>
    </div>
  );
}