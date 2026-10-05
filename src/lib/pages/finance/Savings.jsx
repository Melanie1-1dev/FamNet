import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { db } from "@/api/db";
import { useFamily } from "@/lib/FamilyContext";
import { useFamilyData } from "@/lib/useFamilyData";
import FinanceNav from "@/Components/FinanceNav";
import FormModal from "@/Components/FormModal";
import { SectionCard, ProgressBar, EmptyState, Badge, StatCard } from "@/Components/uiBits";
import { RWF, formatDate } from "@/lib/famNestUtils";
import { Plus, PiggyBank, Trash2, Loader2, TrendingUp, Target } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const FIELDS = [
  { name: "name", label: "Goal Name", required: true, placeholder: "e.g. Emergency Fund" },
  { name: "target_amount", label: "Target Amount (RWF)", type: "number", required: true },
  { name: "current_amount", label: "Current Amount (RWF)", type: "number" },
  { name: "category", label: "Category", type: "select", options: ["emergency", "education", "house", "car", "vacation", "school_fees", "business", "wedding", "medical", "laptop", "custom"] },
  { name: "deadline", label: "Deadline", type: "date" },
  { name: "notes", label: "Notes", type: "textarea" },
];

const CONTRIB_FIELDS = [
  { name: "amount", label: "Contribution Amount (RWF)", type: "number", required: true },
  { name: "contributor", label: "Contributor" },
  { name: "date", label: "Date", type: "date", required: true },
  { name: "notes", label: "Notes" },
];

export default function Savings() {
  const { familyId } = useFamily();
  const d = useFamilyData();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [contribFor, setContribFor] = useState(null);

  const savingsTrend = React.useMemo(() => {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    const months = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - offset, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      months.push({ key, name: date.toLocaleDateString("en-GB", { month: "short" }) });
    }
    let cumulative = 0;
    return months.map((month) => {
      const amount = d.savingsContributions
        .filter((item) => String(item.date || "").slice(0, 7) === month.key)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
      cumulative += amount;
      return { ...month, amount, total: cumulative };
    });
  }, [d.savingsContributions]);

  useEffect(() => { if (params.get("new") === "saving") setOpen(true); }, [params]);
  const close = () => { setOpen(false); params.delete("new"); setParams(params); };

  const submit = async (vals) => {
    await db.entities.SavingsGoal.create({ ...vals, target_amount: Number(vals.target_amount || 0), current_amount: Number(vals.current_amount || 0), family_id: familyId });
    await db.entities.ActivityLog.create({ family_id: familyId, action: "savings_goal", description: `Created savings goal: ${vals.name}`, date: new Date().toISOString() });
    close(); d.reload();
  };

  const contribute = async (vals) => {
    const amt = Number(vals.amount || 0);
    await db.entities.SavingsContribution.create({ ...vals, amount: amt, family_id: familyId, savings_goal_id: contribFor.id });
    await db.entities.SavingsGoal.update(contribFor.id, { current_amount: contribFor.current_amount + amt });
    await db.entities.ActivityLog.create({ family_id: familyId, action: "savings_contribution", description: `${RWF(amt)} added to ${contribFor.name}`, date: new Date().toISOString() });
    setContribFor(null); d.reload();
  };

  const del = async (g) => { if (!confirm(`Delete savings goal "${g.name}"?`)) return; await db.entities.SavingsGoal.delete(g.id); d.reload(); };

  if (d.loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" /></div>;

  const totalSaved = d.savingsGoals.reduce((sum, goal) => sum + Number(goal.current_amount || 0), 0);
  const totalTarget = d.savingsGoals.reduce((sum, goal) => sum + Number(goal.target_amount || 0), 0);
  const recentGrowth = savingsTrend.reduce((sum, month) => sum + month.amount, 0);
  const hasRecentContributions = savingsTrend.some((month) => month.amount > 0);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <FinanceNav />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Savings</h1>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"><Plus size={18} /> New Goal</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Saved across goals" value={RWF(totalSaved)} icon={PiggyBank} tone="savings" />
        <StatCard label="Combined goal targets" value={RWF(totalTarget)} icon={Target} />
        <StatCard label="Contributed in 6 months" value={RWF(recentGrowth)} icon={TrendingUp} tone="income" />
      </div>

      <SectionCard title="Savings growth" className="overflow-hidden">
        <p className="mb-3 text-xs text-stone-400">Cumulative contributions recorded in the last six months. Starting balances without contribution records are not included in this trend.</p>
        {!hasRecentContributions ? <EmptyState icon={TrendingUp} title="No recent contributions recorded" subtitle="Add a contribution to a goal to see your savings growth here." /> : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={savingsTrend} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="savingsGrowthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} width={42} />
              <Tooltip formatter={(value) => RWF(value)} contentStyle={{ borderRadius: 12 }} />
              <Area type="monotone" dataKey="total" name="Cumulative contributions" stroke="#0284c7" strokeWidth={2.5} fill="url(#savingsGrowthFill)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {d.savingsGoals.length === 0 ? (
        <SectionCard><EmptyState icon={PiggyBank} title="No savings goals" subtitle="Create a goal to start saving." /></SectionCard>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {d.savingsGoals.map((g) => {
            const current = Number(g.current_amount || 0);
            const target = Number(g.target_amount || 0);
            const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
            const contribs = d.savingsContributions.filter((c) => c.savings_goal_id === g.id).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
            return (
              <SectionCard key={g.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-stone-800 dark:text-stone-100">{g.name}</div>
                    <Badge className="bg-stone-100 text-stone-500 capitalize mt-1">{String(g.category || "custom").replaceAll("_", " ")}</Badge>
                  </div>
                  <button onClick={() => del(g)} className="text-stone-300 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
                <div className="flex items-center justify-between mt-3 mb-1.5">
                  <span className="text-sm text-stone-500">{RWF(current)} / {RWF(target)}</span>
                  <span className="text-sm font-semibold text-sky-600">{pct}%</span>
                </div>
                <ProgressBar value={current} max={target} tone="sky" />
                <div className="mt-1.5 text-xs text-stone-400">{RWF(Math.max(0, target - current))} remaining</div>
                {g.deadline && <div className="text-xs text-stone-400 mt-1">Deadline: {formatDate(g.deadline)}</div>}
                {contribs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                    <div className="text-xs text-stone-400 mb-1">Recent contributions</div>
                    {contribs.slice(0, 3).map((c) => (
                      <div key={c.id} className="flex justify-between text-xs text-stone-500">
                        <span>{c.contributor || "—"} • {formatDate(c.date)}</span>
                        <span className="text-emerald-600">+{RWF(c.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => setContribFor(g)} className="w-full mt-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100">+ Contribute</button>
              </SectionCard>
            );
          })}
        </div>
      )}

      <FormModal open={open} onClose={close} title="New Savings Goal" fields={FIELDS} onSubmit={submit} />
      <FormModal open={!!contribFor} onClose={() => setContribFor(null)} title={`Contribute to ${contribFor?.name || ""}`} fields={CONTRIB_FIELDS} onSubmit={contribute} initial={{ date: new Date().toISOString().slice(0, 10) }} />
    </div>
  );
}
