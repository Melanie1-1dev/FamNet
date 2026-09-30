import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { db } from "@/api/db";
import { useFamily } from "@/lib/FamilyContext";
import { useFamilyData } from "@/lib/useFamilyData";
import FormModal from "@/Components/FormModal";
import { SectionCard, Badge, EmptyState, ProgressBar } from "@/Components/uiBits";
import {
  RWF, formatDate, daysUntil, priorityColor, priorityLabel, statusColor, statusLabel,
  REQUIREMENT_CATEGORIES
} from "@/lib/famNestUtils";
import { ClipboardList, Plus, CheckCircle2, Circle, Loader2 } from "lucide-react";

const FIELDS = [
  { name: "name", label: "Requirement Name", required: true, placeholder: "e.g. School shoes for Sarah" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "category", label: "Category", type: "select", options: REQUIREMENT_CATEGORIES, required: true },
  { name: "person_concerned", label: "Person Concerned", placeholder: "e.g. Sarah" },
  { name: "estimated_cost", label: "Estimated Cost (RWF)", type: "number" },
  { name: "priority", label: "Priority", type: "select", options: ["urgent", "high", "medium", "low"] },
  { name: "deadline", label: "Deadline", type: "date" },
  { name: "assigned_person", label: "Assigned Person" },
  { name: "recurring", label: "Recurring", type: "select", options: ["No", "Yes"] },
  { name: "notes", label: "Notes", type: "textarea" },
];

export default function Requirements() {
  const { familyId, members } = useFamily();
  const d = useFamilyData();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => { if (params.get("new") === "requirement") setOpen(true); }, [params]);

  const close = () => { setOpen(false); params.delete("new"); setParams(params); };

  const submit = async (vals) => {
    await db.entities.Requirement.create({
      ...vals,
      estimated_cost: Number(vals.estimated_cost || 0),
      recurring: vals.recurring === "Yes",
      family_id: familyId,
      status: "open",
    });
    await db.entities.ActivityLog.create({ family_id: familyId, action: "requirement_added", description: `Added requirement: ${vals.name}`, date: new Date().toISOString() });
    close();
    d.reload();
  };

  const setStatus = async (r, status) => {
    await db.entities.Requirement.update(r.id, { status });
    if (status === "completed") await db.entities.ActivityLog.create({ family_id: familyId, action: "requirement_completed", description: `Requirement marked completed: ${r.name}`, date: new Date().toISOString() });
    d.reload();
  };

  const list = d.requirements.filter((r) => filter === "all" ? true : r.category === filter).sort((a, b) => (a.status === "completed" ? 1 : 0) - (b.status === "completed" ? 1 : 0));

  if (d.loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Family Requirements</h1>
          <p className="text-sm text-stone-400">Track what your family needs</p>
        </div>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
          <Plus size={18} /> Add Need
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {["all", ...REQUIREMENT_CATEGORIES].map((c) => (
          <button key={c} onClick={() => setFilter(c)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${filter === c ? "bg-emerald-600 text-white" : "bg-stone-100 dark:bg-stone-800 text-stone-500"}`}>
            {c === "all" ? "All" : c}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <SectionCard><EmptyState icon={ClipboardList} title="No requirements yet" subtitle="Add what your family needs." /></SectionCard>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {list.map((r) => {
            const dd = daysUntil(r.deadline);
            return (
              <div key={r.id} className={`rounded-2xl border p-4 bg-white dark:bg-stone-900 ${r.status === "completed" ? "border-stone-200 dark:border-stone-800 opacity-60" : "border-stone-200 dark:border-stone-800"}`}>
                <div className="flex items-start gap-2">
                  <button onClick={() => setStatus(r, r.status === "completed" ? "open" : "completed")} className="mt-0.5">
                    {r.status === "completed" ? <CheckCircle2 className="text-emerald-500" size={20} /> : <Circle className="text-stone-300" size={20} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-stone-800 dark:text-stone-100">{r.name}</div>
                    {r.description && <div className="text-sm text-stone-400 mt-0.5">{r.description}</div>}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge className={priorityColor(r.priority)}>{priorityLabel(r.priority)}</Badge>
                      <Badge className={statusColor(r.status)}>{statusLabel(r.status)}</Badge>
                      <Badge className="bg-stone-100 text-stone-600">{r.category}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-stone-400">
                      {r.estimated_cost > 0 && <span>{RWF(r.estimated_cost)}</span>}
                      {r.deadline && <span className={dd !== null && dd < 0 ? "text-red-500" : ""}>Due {formatDate(r.deadline)}</span>}
                      {r.assigned_person && <span>👤 {r.assigned_person}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <FormModal open={open} onClose={close} title="Add New Family Need" fields={FIELDS} onSubmit={submit} />
    </div>
  );
}