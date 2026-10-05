import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useFamilyData } from "@/lib/useFamilyData";
import { SectionCard, StatCard, ProgressBar, EmptyState, Badge } from "@/Components/uiBits";
import { RWF } from "@/lib/famNestUtils";
import { ArrowLeft, ArrowRight, BarChart3, CheckCircle2, PiggyBank, Wallet, ClipboardCheck } from "lucide-react";

const atLocalMidnight = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const dateLabel = (date) => date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function parseRecordDate(value) {
  if (!value) return null;
  const text = String(value);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? new Date(`${text}T00:00:00`)
    : new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function weeklyBudget(amount, period) {
  const value = Number(amount || 0);
  if (period === "weekly") return value;
  if (period === "yearly") return value / 52;
  return value / 4.345;
}

export default function WeeklyReport() {
  const d = useFamilyData();
  const [weekOffset, setWeekOffset] = useState(0);

  const report = useMemo(() => {
    const today = atLocalMidnight(new Date());
    const daysSinceMonday = (today.getDay() + 6) % 7;
    const start = new Date(today);
    start.setDate(start.getDate() - daysSinceMonday + weekOffset * 7);
    const endExclusive = new Date(start);
    endExclusive.setDate(endExclusive.getDate() + 7);
    const end = new Date(endExclusive);
    end.setDate(end.getDate() - 1);
    const includesDate = (value) => {
      const date = parseRecordDate(value);
      return date && date >= start && date < endExclusive;
    };

    const completedLogs = d.activity
      .filter((entry) => entry.action === "task_done" && includesDate(entry.date || entry.created_date))
      .sort((a, b) => new Date(b.date || b.created_date) - new Date(a.date || a.created_date));
    const weeklyExpenses = d.expenses.filter((expense) => includesDate(expense.date));
    const spendingByCategory = new Map();
    weeklyExpenses.forEach((expense) => {
      const category = expense.category || "Other";
      spendingByCategory.set(category, (spendingByCategory.get(category) || 0) + Number(expense.amount || 0));
    });
    const budgetByCategory = new Map();
    d.budgets.forEach((budget) => {
      const category = budget.category || "Other";
      budgetByCategory.set(category, (budgetByCategory.get(category) || 0) + weeklyBudget(budget.budgeted_amount, budget.period));
    });
    const categories = [...new Set([...spendingByCategory.keys(), ...budgetByCategory.keys()])]
      .map((category) => ({
        category,
        spent: spendingByCategory.get(category) || 0,
        budget: budgetByCategory.get(category) || 0,
      }))
      .sort((a, b) => b.spent - a.spent);
    const contributions = d.savingsContributions.filter((item) => includesDate(item.date));

    return {
      start,
      end,
      completedLogs,
      totalSpent: weeklyExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      totalBudget: [...budgetByCategory.values()].reduce((sum, value) => sum + value, 0),
      categories,
      totalContributed: contributions.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    };
  }, [d.activity, d.budgets, d.expenses, d.savingsContributions, weekOffset]);

  if (d.loading) return <div className="flex justify-center py-20"><ClipboardCheck className="animate-pulse text-emerald-600" /></div>;

  const balance = report.totalBudget - report.totalSpent;
  const periodLabel = `${dateLabel(report.start)} – ${dateLabel(report.end)}`;

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Weekly family report</h1>
          <p className="text-sm text-stone-400">A quick look at your family’s progress this week.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-1 dark:border-stone-800 dark:bg-stone-900">
          <button onClick={() => setWeekOffset((value) => value - 1)} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800" aria-label="Previous week"><ArrowLeft size={17} /></button>
          <span className="min-w-44 text-center text-sm font-medium text-stone-600 dark:text-stone-300">{periodLabel}</span>
          <button onClick={() => setWeekOffset((value) => Math.min(0, value + 1))} disabled={weekOffset === 0} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 disabled:opacity-30 dark:hover:bg-stone-800" aria-label="Next week"><ArrowRight size={17} /></button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tasks completed" value={report.completedLogs.length} icon={CheckCircle2} tone="savings" />
        <StatCard label="Spending this week" value={RWF(report.totalSpent)} icon={Wallet} tone="expense" />
        <StatCard label="Weekly budget allowance" value={RWF(report.totalBudget)} icon={BarChart3} />
        <StatCard label="Added to savings" value={RWF(report.totalContributed)} icon={PiggyBank} tone="savings" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Completed tasks">
          {report.completedLogs.length === 0 ? <EmptyState icon={ClipboardCheck} title="No tasks completed this week" subtitle="Completed family tasks will appear here." /> : (
            <div className="space-y-2">
              {report.completedLogs.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2 rounded-xl bg-stone-50 p-3 text-sm dark:bg-stone-800/70">
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" />
                  <div className="min-w-0 flex-1">
                    <div className="text-stone-700 dark:text-stone-200">{entry.description || "Task completed"}</div>
                    <div className="mt-1 text-xs text-stone-400">{dateLabel(parseRecordDate(entry.date || entry.created_date))}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Spending vs weekly budget">
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-stone-50 p-3 dark:bg-stone-800/70">
            <div>
              <div className="text-xs text-stone-400">{balance >= 0 ? "Budget remaining" : "Over budget"}</div>
              <div className={`mt-1 text-lg font-bold ${balance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{RWF(Math.abs(balance))}</div>
            </div>
            <Badge className={balance >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}>
              {report.totalBudget > 0 ? `${Math.round((report.totalSpent / report.totalBudget) * 100)}% used` : "No budgets set"}
            </Badge>
          </div>
          {report.categories.length === 0 ? <EmptyState icon={Wallet} title="No spending or budgets yet" subtitle="Add expenses and budgets to see a weekly comparison." /> : (
            <div className="space-y-4">
              {report.categories.map((item) => (
                <div key={item.category}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-stone-700 dark:text-stone-200">{item.category}</span>
                    <span className="text-stone-500">{RWF(item.spent)}{item.budget > 0 ? ` / ${RWF(item.budget)}` : " · no budget"}</span>
                  </div>
                  {item.budget > 0 && <ProgressBar value={item.spent} max={item.budget} tone={item.spent > item.budget ? "rose" : "emerald"} />}
                </div>
              ))}
              <p className="text-xs text-stone-400">Monthly and yearly budgets are converted to an average weekly amount.</p>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Savings goal progress" action={<Link to="/finance/savings" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">Open savings dashboard</Link>}>
        {d.savingsGoals.length === 0 ? <EmptyState icon={PiggyBank} title="No savings goals yet" subtitle="Create a goal to track your family’s savings progress." /> : (
          <div className="grid gap-4 sm:grid-cols-2">
            {d.savingsGoals.map((goal) => {
              const current = Number(goal.current_amount || 0);
              const target = Number(goal.target_amount || 0);
              const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
              return (
                <div key={goal.id} className="rounded-xl border border-stone-100 p-3 dark:border-stone-800">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="font-medium text-stone-700 dark:text-stone-200">{goal.name}</span>
                    <span className="text-sm font-semibold text-sky-600">{pct}%</span>
                  </div>
                  <ProgressBar value={current} max={target} tone="sky" />
                  <div className="mt-1.5 flex justify-between text-xs text-stone-400"><span>{RWF(current)} saved</span><span>Target {RWF(target)}</span></div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
