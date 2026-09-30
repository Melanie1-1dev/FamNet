import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { db } from "@/api/db";
import { useFamily } from "@/lib/FamilyContext";
import { useFamilyData } from "@/lib/useFamilyData";
import FinanceNav from "@/Components/FinanceNav";
import FormModal from "@/Components/FormModal";
import { StatCard, SectionCard, EmptyState, Badge } from "@/Components/uiBits";
import { RWF, formatDate, inPeriod, EXPENSE_CATEGORIES } from "@/lib/famNestUtils";
import { Plus, Trash2, TrendingDown, Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const FIELDS = [
  { name: "name", label: "Expense Name", required: true },
  { name: "amount", label: "Amount (RWF)", type: "number", required: true },
  { name: "category", label: "Category", type: "select", options: EXPENSE_CATEGORIES, required: true },
  { name: "date", label: "Date", type: "date", required: true },
  { name: "person", label: "Person" },
  { name: "payment_method", label: "Payment Method", type: "select", options: ["Cash", "Bank", "Mobile Money", "Card", "Other"] },
  { name: "description", label: "Description", type: "textarea" },
  { name: "recurring", label: "Recurring", type: "select", options: ["No", "Yes"] },
];

const COLORS = ["#f43f5e", "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#6366f1", "#14b8a6", "#eab308", "#a855f7", "#64748b", "#fb7185"];

export default function Expenses() {
  const { familyId } = useFamily();
  const d = useFamilyData();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState("month");

  useEffect(() => { if (params.get("new") === "expense") setOpen(true); }, [params]);
  const close = () => { setOpen(false); params.delete("new"); setParams(params); };

  const submit = async (vals) => {
    await db.entities.Expense.create({ ...vals, amount: Number(vals.amount || 0), recurring: vals.recurring === "Yes", family_id: familyId });
    await db.entities.ActivityLog.create({ family_id: familyId, action: "expense_added", description: `Recorded expense: ${vals.name} (${RWF(vals.amount)})`, date: new Date().toISOString() });
    close(); d.reload();
  };

  const del = async (id, name) => { if (!confirm(`Delete expense "${name}"?`)) return; await db.entities.Expense.delete(id); d.reload(); };

  const list = d.expenses.filter((i) => inPeriod(i.date, period)).sort((a, b) => new Date(b.date) - new Date(a.date));
  const total = list.reduce((s, i) => s + i.amount, 0);
  const byCat = useMemo(() => {
    const map = {};
    list.forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [list]);

  if (d.loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <FinanceNav />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Expenses</h1>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"><Plus size={18} /> Add Expense</button>
      </div>

      <div className="flex gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl w-fit">
        {[{ k: "week", l: "Week" }, { k: "month", l: "Month" }, { k: "year", l: "Year" }].map((p) => (
          <button key={p.k} onClick={() => setPeriod(p.k)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${period === p.k ? "bg-white dark:bg-stone-700 text-emerald-700 shadow-sm" : "text-stone-500"}`}>{p.l}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard label="Total Expenses" value={RWF(total)} icon={TrendingDown} tone="expense" />
        <StatCard label="Records" value={list.length} />
        <StatCard label="Top Category" value={byCat[0]?.name || "—"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <SectionCard title="By Category" className="lg:col-span-1">
          {byCat.length === 0 ? <EmptyState icon={TrendingDown} title="No data" /> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={byCat} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                  {byCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => RWF(v)} contentStyle={{ borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Recent Expenses" className="lg:col-span-2">
          {list.length === 0 ? <EmptyState icon={TrendingDown} title="No expenses" /> : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {list.map((e) => (
                <div key={e.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-stone-800 dark:text-stone-100 text-sm">{e.name}</div>
                    <div className="text-xs text-stone-400">{e.person || "—"} • {formatDate(e.date)} {e.payment_method ? `• ${e.payment_method}` : ""}</div>
                  </div>
                  <Badge className="bg-stone-100 text-stone-600">{e.category}</Badge>
                  <div className="font-semibold text-rose-600 text-sm">{RWF(e.amount)}</div>
                  <button onClick={() => del(e.id, e.name)} className="text-stone-300 hover:text-red-500"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <FormModal open={open} onClose={close} title="Add Expense" fields={FIELDS} onSubmit={submit} />
    </div>
  );
}