import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { db } from "@/api/db";
import { useFamily } from "@/lib/FamilyContext";
import { useFamilyData } from "@/lib/useFamilyData";
import FinanceNav from "@/Components/FinanceNav";
import FormModal from "@/Components/FormModal";
import { StatCard, SectionCard, EmptyState } from "@/Components/uiBits";
import { RWF, formatDate, inPeriod, INCOME_SOURCES } from "@/lib/famNestUtils";
import { Plus, Trash2, TrendingUp, Loader2 } from "lucide-react";

const FIELDS = [
  { name: "name", label: "Income Name", required: true, placeholder: "e.g. Monthly Salary" },
  { name: "amount", label: "Amount (RWF)", type: "number", required: true },
  { name: "source", label: "Source", type: "select", options: INCOME_SOURCES },
  { name: "person_receiving", label: "Person Receiving" },
  { name: "date", label: "Date", type: "date", required: true },
  { name: "frequency", label: "Frequency", type: "select", options: ["one_time", "daily", "weekly", "monthly", "yearly", "custom"] },
  { name: "notes", label: "Notes", type: "textarea" },
];

export default function Income() {
  const { familyId } = useFamily();
  const d = useFamilyData();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState("month");

  useEffect(() => { if (params.get("new") === "income") setOpen(true); }, [params]);
  const close = () => { setOpen(false); params.delete("new"); setParams(params); };

  const submit = async (vals) => {
    await db.entities.Income.create({ ...vals, amount: Number(vals.amount || 0), family_id: familyId });
    await db.entities.ActivityLog.create({ family_id: familyId, action: "income_added", description: `Added income: ${vals.name} (${RWF(vals.amount)})`, date: new Date().toISOString() });
    close(); d.reload();
  };

  const del = async (id, name) => {
    if (!confirm(`Delete income "${name}"?`)) return;
    await db.entities.Income.delete(id);
    d.reload();
  };

  const list = d.income.filter((i) => inPeriod(i.date, period)).sort((a, b) => new Date(b.date) - new Date(a.date));
  const total = list.reduce((s, i) => s + i.amount, 0);

  if (d.loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <FinanceNav />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Income</h1>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"><Plus size={18} /> Add Income</button>
      </div>

      <div className="flex gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl w-fit">
        {[{ k: "week", l: "Week" }, { k: "month", l: "Month" }, { k: "year", l: "Year" }].map((p) => (
          <button key={p.k} onClick={() => setPeriod(p.k)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${period === p.k ? "bg-white dark:bg-stone-700 text-emerald-700 shadow-sm" : "text-stone-500"}`}>{p.l}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard label="Total Income" value={RWF(total)} icon={TrendingUp} tone="income" />
        <StatCard label="Records" value={list.length} />
        <StatCard label="Sources" value={new Set(list.map((i) => i.source)).size} />
      </div>

      {list.length === 0 ? (
        <SectionCard><EmptyState icon={TrendingUp} title="No income recorded" subtitle="Add your family's income sources." /></SectionCard>
      ) : (
        <SectionCard>
          <div className="space-y-2">
            {list.map((i) => (
              <div key={i.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><TrendingUp size={16} /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-stone-800 dark:text-stone-100">{i.name}</div>
                  <div className="text-xs text-stone-400">{i.source} • {i.person_receiving || "—"} • {formatDate(i.date)} • {i.frequency}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-emerald-600">{RWF(i.amount)}</div>
                </div>
                <button onClick={() => del(i.id, i.name)} className="text-stone-300 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <FormModal open={open} onClose={close} title="Add Income" fields={FIELDS} onSubmit={submit} />
    </div>
  );
}