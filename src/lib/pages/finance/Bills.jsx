import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { db } from "@/api/db";
import { useFamily } from "@/lib/FamilyContext";
import { useFamilyData } from "@/lib/useFamilyData";
import FinanceNav from "@/Components/FinanceNav";
import FormModal from "@/Components/FormModal";
import { SectionCard, Badge, EmptyState } from "@/Components/uiBits";
import { RWF, formatDate, daysUntil, statusColor, statusLabel, BILL_CATEGORIES } from "@/lib/famNestUtils";
import { Plus, Receipt, Trash2, Check, Loader2 } from "lucide-react";

const FIELDS = [
  { name: "name", label: "Bill Name", required: true },
  { name: "amount", label: "Amount (RWF)", type: "number", required: true },
  { name: "due_date", label: "Due Date", type: "date", required: true },
  { name: "frequency", label: "Frequency", type: "select", options: ["one_time", "weekly", "monthly", "quarterly", "yearly"] },
  { name: "category", label: "Category", type: "select", options: BILL_CATEGORIES },
  { name: "responsible_person", label: "Responsible Person" },
];

export default function Bills() {
  const { familyId } = useFamily();
  const d = useFamilyData();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => { if (params.get("new") === "bill") setOpen(true); }, [params]);
  const close = () => { setOpen(false); params.delete("new"); setParams(params); };

  const submit = async (vals) => {
    await db.entities.Bill.create({ ...vals, amount: Number(vals.amount || 0), family_id: familyId, status: "upcoming" });
    await db.entities.Notification.create({ family_id: familyId, title: `Bill due: ${vals.name}`, message: `${vals.name} of ${RWF(vals.amount)} is due ${formatDate(vals.due_date)}`, type: "bill" });
    close(); d.reload();
  };

  const markPaid = async (b) => {
    await db.entities.Bill.update(b.id, { status: "paid" });
    await db.entities.Expense.create({ family_id: familyId, name: b.name, amount: b.amount, category: b.category || "Other", date: new Date().toISOString().slice(0, 10), person: b.responsible_person, payment_method: "Bill" });
    await db.entities.ActivityLog.create({ family_id: familyId, action: "bill_paid", description: `Paid bill: ${b.name} (${RWF(b.amount)})`, date: new Date().toISOString() });
    d.reload();
  };

  const del = async (id, name) => { if (!confirm(`Delete bill "${name}"?`)) return; await db.entities.Bill.delete(id); d.reload(); };

  const computeStatus = (b) => {
    if (b.status === "paid") return "paid";
    const dd = daysUntil(b.due_date);
    if (dd === null) return b.status;
    if (dd < 0) return "overdue";
    if (dd === 0) return "due_today";
    return "upcoming";
  };

  if (d.loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" /></div>;

  const sorted = [...d.bills].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <FinanceNav />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Bills & Recurring Payments</h1>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"><Plus size={18} /> Add Bill</button>
      </div>

      {sorted.length === 0 ? (
        <SectionCard><EmptyState icon={Receipt} title="No bills" subtitle="Add your recurring bills and payments." /></SectionCard>
      ) : (
        <div className="space-y-2">
          {sorted.map((b) => {
            const st = computeStatus(b);
            const dd = daysUntil(b.due_date);
            return (
              <div key={b.id} className="flex items-center gap-3 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center"><Receipt size={16} /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-stone-800 dark:text-stone-100">{b.name}</div>
                  <div className="text-xs text-stone-400">{b.category} • {b.frequency} • {b.responsible_person || "—"} • Due {formatDate(b.due_date)} {dd !== null && dd >= 0 && dd <= 3 && st !== "paid" && `(${dd === 0 ? "today" : `in ${dd}d`})`}</div>
                </div>
                <div className="font-semibold text-stone-700 dark:text-stone-200">{RWF(b.amount)}</div>
                <Badge className={statusColor(st)}>{statusLabel(st)}</Badge>
                {st !== "paid" && <button onClick={() => markPaid(b)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100" title="Mark paid"><Check size={16} /></button>}
                <button onClick={() => del(b.id, b.name)} className="text-stone-300 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
            );
          })}
        </div>
      )}

      <FormModal open={open} onClose={close} title="Add Bill" fields={FIELDS} onSubmit={submit} />
    </div>
  );
}