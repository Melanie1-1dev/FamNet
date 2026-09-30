import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { db } from "@/api/db";
import { useFamily } from "@/lib/FamilyContext";
import { useFamilyData } from "@/lib/useFamilyData";
import FinanceNav from "@/Components/FinanceNav";
import FormModal from "@/Components/FormModal";
import { SectionCard, ProgressBar, EmptyState, Badge } from "@/Components/uiBits";
import { RWF, formatDate } from "@/lib/famNestUtils";
import { Plus, PiggyBank, Trash2, Loader2 } from "lucide-react";

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

  const emergency = d.savingsGoals.find((g) => g.category === "emergency");

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <FinanceNav />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Savings</h1>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"><Plus size={18} /> New Goal</button>
      </div>

      {emergency && (
        <SectionCard title="Emergency Fund" className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-stone-900 dark:to-stone-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-stone-500">{RWF(emergency.current_amount)} of {RWF(emergency.target_amount)}</span>
            <Badge className="bg-sky-100 text-sky-700">{Math.round(emergency.current_amount / emergency.target_amount * 100)}%</Badge>
          </div>
          <ProgressBar value={emergency.current_amount} max={emergency.target_amount} tone="sky" />
          <div className="text-xs text-stone-400 mt-2">Remaining: {RWF(emergency.target_amount - emergency.current_amount)}</div>
        </SectionCard>
      )}

      {d.savingsGoals.length === 0 ? (
        <SectionCard><EmptyState icon={PiggyBank} title="No savings goals" subtitle="Create a goal to start saving." /></SectionCard>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {d.savingsGoals.map((g) => {
            const pct = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0;
            const contribs = d.savingsContributions.filter((c) => c.savings_goal_id === g.id);
            return (
              <SectionCard key={g.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-stone-800 dark:text-stone-100">{g.name}</div>
                    <Badge className="bg-stone-100 text-stone-500 capitalize mt-1">{g.category.replace("_", " ")}</Badge>
                  </div>
                  <button onClick={() => del(g)} className="text-stone-300 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
                <div className="flex items-center justify-between mt-3 mb-1.5">
                  <span className="text-sm text-stone-500">{RWF(g.current_amount)} / {RWF(g.target_amount)}</span>
                  <span className="text-sm font-semibold text-sky-600">{pct}%</span>
                </div>
                <ProgressBar value={g.current_amount} max={g.target_amount} tone="sky" />
                {g.deadline && <div className="text-xs text-stone-400 mt-2">Deadline: {formatDate(g.deadline)}</div>}
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