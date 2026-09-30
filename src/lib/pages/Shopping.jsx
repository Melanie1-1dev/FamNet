import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { db } from "@/api/db";
import { useFamily } from "@/lib/FamilyContext";
import { useFamilyData } from "@/lib/useFamilyData";
import FormModal from "@/Components/FormModal";
import { SectionCard, EmptyState, Badge } from "@/Components/uiBits";
import { RWF } from "@/lib/famNestUtils";
import { Plus, ShoppingCart, Check, Trash2, Loader2 } from "lucide-react";

const FIELDS = [
  { name: "name", label: "Item Name", required: true },
  { name: "quantity", label: "Quantity", placeholder: "e.g. 10kg" },
  { name: "estimated_price", label: "Estimated Price (RWF)", type: "number" },
  { name: "category", label: "Category", type: "select", options: ["groceries", "household", "school", "clothing", "health", "custom"] },
];

export default function Shopping() {
  const { familyId } = useFamily();
  const d = useFamilyData();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => { if (params.get("new") === "item") setOpen(true); }, [params]);
  const close = () => { setOpen(false); params.delete("new"); setParams(params); };

  const submit = async (vals) => {
    await db.entities.ShoppingItem.create({ ...vals, estimated_price: Number(vals.estimated_price || 0), family_id: familyId, purchased: false });
    close(); d.reload();
  };

  const toggle = async (item) => {
    if (!item.purchased) {
      const actual = prompt(`Actual price for "${item.name}" (estimated ${RWF(item.estimated_price)}):`, item.estimated_price);
      if (actual === null) return;
      const amt = Number(actual) || 0;
      const exp = await db.entities.Expense.create({ family_id: familyId, name: item.name, amount: amt, category: "Shopping", date: new Date().toISOString().slice(0, 10), payment_method: "Cash" });
      await db.entities.ShoppingItem.update(item.id, { purchased: true, actual_price: amt, related_expense_id: exp.id });
      await db.entities.ActivityLog.create({ family_id: familyId, action: "shopping_purchased", description: `Purchased ${item.name} (${RWF(amt)})`, date: new Date().toISOString() });
    } else {
      await db.entities.ShoppingItem.update(item.id, { purchased: false });
    }
    d.reload();
  };

  const del = async (id, name) => { if (!confirm(`Delete "${name}"?`)) return; await db.entities.ShoppingItem.delete(id); d.reload(); };

  if (d.loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" /></div>;

  const pending = d.shoppingItems.filter((i) => !i.purchased);
  const done = d.shoppingItems.filter((i) => i.purchased);
  const totalEst = pending.reduce((s, i) => s + i.estimated_price, 0);

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Shopping List</h1>
          <p className="text-sm text-stone-400">Shared family shopping • estimated total {RWF(totalEst)}</p>
        </div>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"><Plus size={18} /> Add Item</button>
      </div>

      {d.shoppingItems.length === 0 ? (
        <SectionCard><EmptyState icon={ShoppingCart} title="Shopping list is empty" /></SectionCard>
      ) : (
        <>
          <SectionCard title="To Buy">
            {pending.length === 0 ? <EmptyState title="Everything purchased!" /> : (
              <div className="space-y-2">
                {pending.map((i) => (
                  <div key={i.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800">
                    <button onClick={() => toggle(i)} className="w-5 h-5 rounded-md border-2 border-stone-300 hover:border-emerald-500" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-stone-800 dark:text-stone-100">{i.name}</div>
                      <div className="text-xs text-stone-400">{i.quantity} • <Badge className="bg-stone-100 text-stone-500 capitalize">{i.category}</Badge></div>
                    </div>
                    <div className="text-sm text-stone-500">{RWF(i.estimated_price)}</div>
                    <button onClick={() => del(i.id, i.name)} className="text-stone-300 hover:text-red-500"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {done.length > 0 && (
            <SectionCard title="Purchased">
              <div className="space-y-2">
                {done.map((i) => (
                  <div key={i.id} className="flex items-center gap-3 p-3 rounded-xl opacity-60">
                    <button onClick={() => toggle(i)} className="w-5 h-5 rounded-md bg-emerald-500 text-white flex items-center justify-center"><Check size={12} /></button>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-stone-800 dark:text-stone-100 line-through">{i.name}</div>
                      <div className="text-xs text-stone-400">{i.quantity} • Actual {RWF(i.actual_price)}</div>
                    </div>
                    <button onClick={() => del(i.id, i.name)} className="text-stone-300 hover:text-red-500"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </>
      )}

      <FormModal open={open} onClose={close} title="Add Shopping Item" fields={FIELDS} onSubmit={submit} />
    </div>
  );
}