import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { db } from "@/api/db";
import { useFamily } from "@/lib/FamilyContext";
import { useFamilyData } from "@/lib/useFamilyData";
import FormModal from "@/Components/FormModal";
import { SectionCard, Badge, EmptyState } from "@/Components/uiBits";
import { formatDate, daysUntil, priorityColor, priorityLabel, statusColor, statusLabel } from "@/lib/famNestUtils";
import { CheckSquare, Plus, Circle, CheckCircle2, Loader2, Clock } from "lucide-react";

const FIELDS = [
  { name: "title", label: "Task Title", required: true },
  { name: "description", label: "Description", type: "textarea" },
  { name: "assigned_to", label: "Assigned To", placeholder: "Family member name" },
  { name: "deadline", label: "Deadline", type: "date" },
  { name: "priority", label: "Priority", type: "select", options: ["urgent", "high", "medium", "low"] },
  { name: "recurring", label: "Recurring", type: "select", options: ["No", "Yes"] },
];

export default function Tasks() {
  const { familyId } = useFamily();
  const d = useFamilyData();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => { if (params.get("new") === "task") setOpen(true); }, [params]);
  const close = () => { setOpen(false); params.delete("new"); setParams(params); };

  const submit = async (vals) => {
    await db.entities.Task.create({ ...vals, recurring: vals.recurring === "Yes", family_id: familyId, status: "todo" });
    await db.entities.ActivityLog.create({ family_id: familyId, action: "task_added", description: `Added task: ${vals.title}`, date: new Date().toISOString() });
    close(); d.reload();
  };

  const cycle = async (t) => {
    const next = t.status === "todo" ? "in_progress" : t.status === "in_progress" ? "done" : "todo";
    await db.entities.Task.update(t.id, { status: next });
    if (next === "done") await db.entities.ActivityLog.create({ family_id: familyId, action: "task_done", description: `Task completed: ${t.title}`, date: new Date().toISOString() });
    d.reload();
  };

  const filtered = d.tasks.filter((t) => filter === "all" ? true : t.status === filter);

  if (d.loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Tasks</h1>
          <p className="text-sm text-stone-400">Assign and track family tasks</p>
        </div>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
          <Plus size={18} /> New Task
        </button>
      </div>

      <div className="flex gap-2">
        {["all", "todo", "in_progress", "done"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${filter === f ? "bg-emerald-600 text-white" : "bg-stone-100 dark:bg-stone-800 text-stone-500"}`}>
            {f === "all" ? "All" : statusLabel(f)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <SectionCard><EmptyState icon={CheckSquare} title="No tasks" subtitle="Create a task to get started." /></SectionCard>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const dd = daysUntil(t.deadline);
            return (
              <div key={t.id} className="flex items-center gap-3 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
                <button onClick={() => cycle(t)}>
                  {t.status === "done" ? <CheckCircle2 className="text-emerald-500" size={22} /> : t.status === "in_progress" ? <Clock className="text-amber-500" size={22} /> : <Circle className="text-stone-300" size={22} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium ${t.status === "done" ? "line-through text-stone-400" : "text-stone-800 dark:text-stone-100"}`}>{t.title}</div>
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-stone-400">
                    {t.assigned_to && <span>👤 {t.assigned_to}</span>}
                    {t.deadline && <span className={dd !== null && dd < 0 && t.status !== "done" ? "text-red-500" : ""}><Clock size={11} className="inline" /> {formatDate(t.deadline)}</span>}
                    <Badge className={priorityColor(t.priority)}>{priorityLabel(t.priority)}</Badge>
                    <Badge className={statusColor(t.status)}>{statusLabel(t.status)}</Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <FormModal open={open} onClose={close} title="New Task" fields={FIELDS} onSubmit={submit} />
    </div>
  );
}