import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { db } from "@/api/db";
import { useFamily } from "@/lib/FamilyContext";
import { useFamilyData } from "@/lib/useFamilyData";
import FormModal from "@/Components/FormModal";
import { SectionCard, ProgressBar, EmptyState, Badge } from "@/Components/uiBits";
import { RWF, formatDate, priorityColor, priorityLabel } from "@/lib/famNestUtils";
import { Plus, Target, Trash2, Loader2 } from "lucide-react";

const FIELDS = [
  { name: "name", label: "Goal Name", required: true, placeholder: "e.g. Buy a house" },
  { name: "target_amount", label: "Target Amount (RWF)", type: "number", required: true },
  { name: "current_amount", label: "Current Amount (RWF)", type: "number" },
  { name: "deadline", label: "Deadline", type: "date" },
  { name: "priority", label: "Priority", type: "select", options: ["urgent", "high", "medium", "low"] },
  { name: "notes", label: "Notes", type: "textarea" },
];

export default function Goals() {
  const { familyId } = useFamily();
  const d = useFamilyData();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => { if (params.get("new") === "goal") setOpen(true); }, [params]);
  const close = () => { setOpen(false); params.delete("new"); setParams(params); };

  const submit = async (vals) => {
    await db.entities.FinancialGoal.create({ ...vals, target_amount: Number(vals.target_amount || 0), current_amount: Number(vals.current_amount || 0), family_id: familyId });
    close(); d.reload();
  };

  const update = async (g) => {
    const add = Number(prompt(`Add amount to "${g.name}":`, "0"));
    if (!add || add <= 0) return;
    await db.entities.FinancialGoal.update(g.id, { current_amount: g.current_amount + add });
    await db.entities.ActivityLog.create({ family_id: familyId, action: "goal_progress", description: `${RWF(add)} added to goal ${g.name}`, date: new Date().toISOString() });
    d.reload();
  };

  const del = async (g) => { if (!confirm(`Delete goal "${g.name}"?`)) return; await db.entities.FinancialGoal.delete(g.id); d.reload(); };

  if (d.loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Financial Goals</h1>
          <p className="text-sm text-stone-400">Long-term goals your family is working toward</p>
        </div>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"><Plus size={18} /> New Goal</button>
      </div>

      {d.financialGoals.length === 0 ? (
        <SectionCard><EmptyState icon={Target} title="No goals yet" subtitle="Create a long-term financial goal." /></SectionCard>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {d.financialGoals.map((g) => {
            const pct = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0;
            return (
              <SectionCard key={g.id}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-stone-800 dark:text-stone-100">{g.name}</div>
                    <div className="flex gap-1.5 mt-1">
                      <Badge className={priorityColor(g.priority)}>{priorityLabel(g.priority)}</Badge>
                      {g.deadline && <Badge className="bg-stone-100 text-stone-500">{formatDate(g.deadline)}</Badge>}
                    </div>
                  </div>
                  <button onClick={() => del(g)} className="text-stone-300 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
                <div className="flex justify-between mt-3 mb-1.5 text-sm">
                  <span className="text-stone-500">{RWF(g.current_amount)} / {RWF(g.target_amount)}</span>
                  <span className="font-semibold text-violet-600">{pct}%</span>
                </div>
                <ProgressBar value={g.current_amount} max={g.target_amount} tone="violet" />
                {g.notes && <div className="text-xs text-stone-400 mt-2">{g.notes}</div>}
                <button onClick={() => update(g)} className="w-full mt-3 py-2 rounded-xl bg-violet-50 text-violet-700 text-sm font-medium hover:bg-violet-100">+ Add Progress</button>
              </SectionCard>
            );
          })}
        </div>
      )}

      <FormModal open={open} onClose={close} title="New Financial Goal" fields={FIELDS} onSubmit={submit} />
    </div>
  );
}