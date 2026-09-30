import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { db } from "@/api/db";
import { useFamily } from "@/lib/FamilyContext";
import { useFamilyData } from "@/lib/useFamilyData";
import FinanceNav from "@/Components/FinanceNav";
import FormModal from "@/Components/FormModal";
import { SectionCard, ProgressBar, EmptyState, Badge } from "@/Components/uiBits";
import { RWF, inPeriod, EXPENSE_CATEGORIES } from "@/lib/famNestUtils";
import { Plus, Wallet, Loader2, AlertTriangle } from "lucide-react";

const FIELDS = [
  { name: "category", label: "Category", type: "select", options: EXPENSE_CATEGORIES, required: true },
  { name: "budgeted_amount", label: "Budgeted Amount (RWF)", type: "number", required: true },
  { name: "period", label: "Period", type: "select", options: ["monthly", "weekly", "yearly"] },
];

export default function Budgets() {
  const { familyId } = useFamily();
  const d = useFamilyData();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => { if (params.get("new") === "budget") setOpen(true); }, [params]);
  const close = () => { setOpen(false); params.delete("new"); setParams(params); };

  const submit = async (vals) => {
    await db.entities.Budget.create({ ...vals, budgeted_amount: Number(vals.budgeted_amount || 0), family_id: familyId });
    close(); d.reload();
  };

  const spentFor = (cat) => d.expenses.filter((e) => e.category === cat && inPeriod(e.date, "month")).reduce((s, e) => s + e.amount, 0);

  if (d.loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" /></div>;

  const totalBudget = d.budgets.reduce((s, b) => s + b.budgeted_amount, 0);
  const totalSpent = d.budgets.reduce((s, b) => s + spentFor(b.category), 0);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <FinanceNav />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Budgets</h1>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"><Plus size={18} /> Set Budget</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <SectionCard><div className="text-xs text-stone-400">Total Budget</div><div className="text-lg font-bold text-stone-800 dark:text-stone-100">{RWF(totalBudget)}</div></SectionCard>
        <SectionCard><div className="text-xs text-stone-400">Total Spent</div><div className="text-lg font-bold text-rose-600">{RWF(totalSpent)}</div></SectionCard>
        <SectionCard><div className="text-xs text-stone-400">Remaining</div><div className={`text-lg font-bold ${totalBudget - totalSpent >= 0 ? "text-emerald-600" : "text-red-600"}`}>{RWF(totalBudget - totalSpent)}</div></SectionCard>
      </div>

      {d.budgets.length === 0 ? (
        <SectionCard><EmptyState icon={Wallet} title="No budgets set" subtitle="Set monthly budgets for your categories." /></SectionCard>
      ) : (
        <div className="space-y-3">
          {d.budgets.map((b) => {
            const spent = spentFor(b.category);
            const over = spent > b.budgeted_amount;
            return (
              <SectionCard key={b.id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-stone-800 dark:text-stone-100">{b.category}</span>
                    <Badge className="bg-stone-100 text-stone-500 capitalize">{b.period}</Badge>
                    {over && <Badge className="bg-red-100 text-red-600 flex items-center gap-1"><AlertTriangle size={11} /> Over budget</Badge>}
                  </div>
                  <div className="text-sm text-stone-500">{RWF(spent)} / {RWF(b.budgeted_amount)}</div>
                </div>
                <ProgressBar value={spent} max={b.budgeted_amount} tone={over ? "rose" : "emerald"} />
                <div className="text-xs text-stone-400 mt-1.5">Remaining: {RWF(b.budgeted_amount - spent)}</div>
              </SectionCard>
            );
          })}
        </div>
      )}

      <FormModal open={open} onClose={close} title="Set Budget" fields={FIELDS} onSubmit={submit} />
    </div>
  );
}