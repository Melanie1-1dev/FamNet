import React from "react";
import { RWF, formatDate, daysUntil } from "@/lib/famNestUtils";
import { Badge } from "@/Components/uiBits";
import { Cake, CheckSquare, ClipboardList, Wallet, Calendar } from "lucide-react";

const age = (dob) => {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a >= 0 ? a : null;
};

export default function ChildProfileCard({ child, data }) {
  const tasks = data.tasks.filter((t) => t.assigned_to === child.name);
  const openTasks = tasks.filter((t) => t.status !== "done");
  const reqs = data.requirements.filter((r) => r.person_concerned === child.name && r.status !== "completed");
  const expenses = data.expenses.filter((e) => e.person === child.name);
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const events = data.events.filter((e) => {
    if (!e.date) return false;
    const dd = daysUntil(e.date);
    return dd !== null && dd >= 0 && dd <= 30;
  });

  const childAge = age(child.date_of_birth);
  const initials = child.name.charAt(0).toUpperCase();

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-400 to-teal-500 px-5 py-4 flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-white/25 backdrop-blur flex items-center justify-center text-2xl font-bold text-white">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-lg truncate">{child.name}</div>
          <div className="text-white/80 text-sm flex items-center gap-1.5">
            <Cake size={13} />
            {childAge !== null ? `${childAge} years old` : "Age not set"}
            {child.date_of_birth && <span className="text-white/60">• born {formatDate(child.date_of_birth)}</span>}
          </div>
        </div>
        <Badge className="bg-white/20 text-white capitalize">{child.role}</Badge>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {child.responsibilities && (
          <div className="text-sm text-stone-500 dark:text-stone-400 italic">"{child.responsibilities}"</div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-stone-50 dark:bg-stone-800/50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-1">
              <CheckSquare size={13} /> Tasks
            </div>
            <div className="text-lg font-semibold text-stone-800 dark:text-stone-100">
              {openTasks.length}<span className="text-sm font-normal text-stone-400"> / {tasks.length}</span>
            </div>
            <div className="text-xs text-stone-400">open</div>
          </div>
          <div className="rounded-xl bg-stone-50 dark:bg-stone-800/50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-1">
              <ClipboardList size={13} /> Needs
            </div>
            <div className="text-lg font-semibold text-stone-800 dark:text-stone-100">{reqs.length}</div>
            <div className="text-xs text-stone-400">pending</div>
          </div>
          <div className="rounded-xl bg-stone-50 dark:bg-stone-800/50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-1">
              <Wallet size={13} /> Spending
            </div>
            <div className="text-sm font-semibold text-stone-800 dark:text-stone-100">{RWF(expenseTotal)}</div>
            <div className="text-xs text-stone-400">{expenses.length} expenses</div>
          </div>
          <div className="rounded-xl bg-stone-50 dark:bg-stone-800/50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-1">
              <Calendar size={13} /> Events
            </div>
            <div className="text-lg font-semibold text-stone-800 dark:text-stone-100">{events.length}</div>
            <div className="text-xs text-stone-400">next 30 days</div>
          </div>
        </div>

        {/* Open tasks */}
        {openTasks.length > 0 && (
          <div>
            <div className="text-xs font-medium text-stone-400 mb-1.5">Open tasks</div>
            <div className="space-y-1">
              {openTasks.slice(0, 3).map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300">
                  <span className={`w-1.5 h-1.5 rounded-full ${t.priority === "urgent" ? "bg-red-500" : t.priority === "high" ? "bg-orange-500" : "bg-stone-300"}`} />
                  <span className="truncate">{t.title}</span>
                  {t.deadline && <span className="text-xs text-stone-400 ml-auto">{formatDate(t.deadline)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming events */}
        {events.length > 0 && (
          <div>
            <div className="text-xs font-medium text-stone-400 mb-1.5">Upcoming events</div>
            <div className="space-y-1">
              {events.slice(0, 3).map((e) => (
                <div key={e.id} className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300">
                  <Calendar size={13} className="text-emerald-500" />
                  <span className="truncate">{e.title}</span>
                  <span className="text-xs text-stone-400 ml-auto">{formatDate(e.date)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {openTasks.length === 0 && reqs.length === 0 && events.length === 0 && expenses.length === 0 && (
          <div className="text-center text-sm text-stone-400 py-2">No activity yet</div>
        )}
      </div>
    </div>
  );
}