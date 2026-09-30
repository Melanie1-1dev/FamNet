import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { db } from "@/api/db";
import { useFamily } from "@/lib/FamilyContext";
import { useFamilyData } from "@/lib/useFamilyData";
import FormModal from "@/Components/FormModal";
import { SectionCard, EmptyState } from "@/Components/uiBits";
import { formatDate, daysUntil } from "@/lib/famNestUtils";
import { Plus, Calendar as CalIcon, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const FIELDS = [
  { name: "title", label: "Event Title", required: true },
  { name: "description", label: "Description", type: "textarea" },
  { name: "date", label: "Date", type: "date", required: true },
  { name: "time", label: "Time", type: "time" },
  { name: "type", label: "Type", type: "select", options: ["appointment", "school", "birthday", "bill", "meeting", "holiday", "task", "other"] },
];

const TYPE_COLORS = {
  appointment: "bg-rose-100 text-rose-700", school: "bg-blue-100 text-blue-700",
  birthday: "bg-pink-100 text-pink-700", bill: "bg-orange-100 text-orange-700",
  meeting: "bg-violet-100 text-violet-700", holiday: "bg-emerald-100 text-emerald-700",
  task: "bg-amber-100 text-amber-700", other: "bg-stone-100 text-stone-700",
};

export default function CalendarPage() {
  const { familyId } = useFamily();
  const d = useFamilyData();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(new Date());

  useEffect(() => { if (params.get("new") === "event") setOpen(true); }, [params]);
  const close = () => { setOpen(false); params.delete("new"); setParams(params); };

  const submit = async (vals) => {
    await db.entities.FamilyEvent.create({ ...vals, family_id: familyId });
    close(); d.reload();
  };

  const allEvents = useMemo(() => {
    const list = [...d.events];
    d.bills.forEach((b) => list.push({ id: `bill-${b.id}`, title: `Bill: ${b.name}`, date: b.due_date, type: "bill" }));
    d.tasks.forEach((t) => t.deadline && list.push({ id: `task-${t.id}`, title: `Task: ${t.title}`, date: t.deadline, type: "task" }));
    return list;
  }, [d]);

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const startDay = monthStart.getDay();
  const days = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let i = 1; i <= monthEnd.getDate(); i++) days.push(i);

  const eventsOn = (day) => allEvents.filter((e) => { const dt = new Date(e.date); return dt.getFullYear() === cursor.getFullYear() && dt.getMonth() === cursor.getMonth() && dt.getDate() === day; });

  const upcoming = allEvents.filter((e) => { const dd = daysUntil(e.date); return dd !== null && dd >= 0; }).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 8);

  if (d.loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Family Calendar</h1>
          <p className="text-sm text-stone-400">Appointments, events, bills and deadlines</p>
        </div>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"><Plus size={18} /> New Event</button>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <SectionCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-stone-800 dark:text-stone-100 capitalize">{cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</h3>
            <div className="flex gap-1">
              <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"><ChevronLeft size={18} /></button>
              <button onClick={() => setCursor(new Date())} className="px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-stone-100 dark:hover:bg-stone-800">Today</button>
              <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"><ChevronRight size={18} /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-stone-400 mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              if (!day) return <div key={i} />;
              const evs = eventsOn(day);
              const isToday = new Date().toDateString() === new Date(cursor.getFullYear(), cursor.getMonth(), day).toDateString();
              return (
                <div key={i} className={`min-h-[60px] p-1.5 rounded-lg border ${isToday ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950" : "border-stone-100 dark:border-stone-800"}`}>
                  <div className={`text-xs font-medium ${isToday ? "text-emerald-700" : "text-stone-500"}`}>{day}</div>
                  <div className="space-y-0.5 mt-1">
                    {evs.slice(0, 2).map((e) => (
                      <div key={e.id} className={`text-[10px] px-1 py-0.5 rounded truncate ${TYPE_COLORS[e.type] || TYPE_COLORS.other}`}>{e.title}</div>
                    ))}
                    {evs.length > 2 && <div className="text-[10px] text-stone-400">+{evs.length - 2} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Upcoming">
          {upcoming.length === 0 ? <EmptyState icon={CalIcon} title="No upcoming events" /> : (
            <div className="space-y-2">
              {upcoming.map((e) => (
                <div key={e.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800">
                  <div className={`text-[10px] px-1.5 py-0.5 rounded ${TYPE_COLORS[e.type] || TYPE_COLORS.other} capitalize`}>{e.type}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-stone-700 dark:text-stone-200 truncate">{e.title}</div>
                    <div className="text-xs text-stone-400">{formatDate(e.date)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <FormModal open={open} onClose={close} title="New Event" fields={FIELDS} onSubmit={submit} initial={{ date: new Date().toISOString().slice(0, 10) }} />
    </div>
  );
}