import React, { useState } from "react";
import { db } from "@/api/db";
import { useFamily } from "@/lib/FamilyContext";
import { useFamilyData } from "@/lib/useFamilyData";
import FormModal from "@/Components/FormModal";
import { SectionCard, EmptyState, Badge } from "@/Components/uiBits";
import { RWF, formatDate } from "@/lib/famNestUtils";
import { Plus, Users, Trash2, Loader2, Baby } from "lucide-react";
import ChildProfileCard from "@/Components/ChildProfileCard";

const FIELDS = [
  { name: "name", label: "Full Name", required: true },
  { name: "relationship", label: "Relationship", type: "select", options: ["parent", "spouse", "child", "sibling", "grandparent", "other"] },
  { name: "role", label: "Role", type: "select", options: ["admin", "member", "child"] },
  { name: "date_of_birth", label: "Date of Birth", type: "date" },
  { name: "contact", label: "Contact" },
  { name: "responsibilities", label: "Responsibilities", type: "textarea" },
  { name: "can_view_finance", label: "Can View Finance", type: "select", options: ["No", "Yes"] },
];

export default function Family() {
  const { familyId, family } = useFamily();
  const d = useFamilyData();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("all");

  const children = d.members.filter((m) => m.relationship === "child" || m.role === "child");

  const submit = async (vals) => {
    await db.entities.FamilyMember.create({ ...vals, can_view_finance: vals.can_view_finance === "Yes", family_id: familyId });
    await db.entities.ActivityLog.create({ family_id: familyId, action: "member_added", description: `Added family member: ${vals.name}`, date: new Date().toISOString() });
    setOpen(false); d.reload();
  };

  const del = async (m) => { if (!confirm(`Remove ${m.name}?`)) return; await db.entities.FamilyMember.delete(m.id); setSelected(null); d.reload(); };

  if (d.loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" /></div>;

  const memberStats = (name) => ({
    tasks: d.tasks.filter((t) => t.assigned_to === name).length,
    requirements: d.requirements.filter((r) => r.person_concerned === name || r.assigned_person === name).length,
    expenses: d.expenses.filter((e) => e.person === name).reduce((s, e) => s + e.amount, 0),
  });

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Family</h1>
          <p className="text-sm text-stone-400">{family?.name} • {d.members.length} members</p>
        </div>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"><Plus size={18} /> Add Member</button>
      </div>

      {d.members.length === 0 ? (
        <SectionCard><EmptyState icon={Users} title="No family members" /></SectionCard>
      ) : (
        <>
          <div className="flex gap-2">
            <button onClick={() => setTab("all")} className={`px-3.5 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 ${tab === "all" ? "bg-emerald-600 text-white" : "bg-stone-100 dark:bg-stone-800 text-stone-500"}`}>
              <Users size={15} /> All Members ({d.members.length})
            </button>
            <button onClick={() => setTab("children")} className={`px-3.5 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 ${tab === "children" ? "bg-emerald-600 text-white" : "bg-stone-100 dark:bg-stone-800 text-stone-500"}`}>
              <Baby size={15} /> Children ({children.length})
            </button>
          </div>

          {tab === "children" ? (
            children.length === 0 ? (
              <SectionCard><EmptyState icon={Baby} title="No children" subtitle="Add a child to see their profile here." /></SectionCard>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {children.map((c) => (
                  <ChildProfileCard key={c.id} child={c} data={d} />
                ))}
              </div>
            )
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {d.members.map((m) => {
                const s = memberStats(m.name);
                return (
                  <button key={m.id} onClick={() => setSelected(m)} className="text-left rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-lg font-semibold">{m.name.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-stone-800 dark:text-stone-100 truncate">{m.name}</div>
                        <Badge className="bg-stone-100 text-stone-500 capitalize">{m.relationship}</Badge>
                      </div>
                    </div>
                    <div className="flex justify-between mt-3 text-xs text-stone-400">
                      <span>{s.tasks} tasks</span>
                      <span>{s.requirements} needs</span>
                      <span>{RWF(s.expenses)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-xl font-semibold">{selected.name.charAt(0)}</div>
              <div>
                <div className="font-semibold text-stone-800 dark:text-stone-100">{selected.name}</div>
                <Badge className="bg-stone-100 text-stone-500 capitalize">{selected.role} • {selected.relationship}</Badge>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {selected.date_of_birth && <div className="text-stone-500">Born: {formatDate(selected.date_of_birth)}</div>}
              {selected.contact && <div className="text-stone-500">Contact: {selected.contact}</div>}
              {selected.responsibilities && <div className="text-stone-500">Responsibilities: {selected.responsibilities}</div>}
              <div className="text-stone-500">Finance access: <Badge className={selected.can_view_finance ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"}>{selected.can_view_finance ? "Yes" : "No"}</Badge></div>
            </div>
            <button onClick={() => del(selected)} className="w-full mt-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 flex items-center justify-center gap-1.5"><Trash2 size={15} /> Remove member</button>
          </div>
        </div>
      )}

      <FormModal open={open} onClose={() => setOpen(false)} title="Add Family Member" fields={FIELDS} onSubmit={submit} />
    </div>
  );
}