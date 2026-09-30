import React from "react";
import { db } from "@/api/db";
import { useFamily } from "@/lib/FamilyContext";
import { useFamilyData } from "@/lib/useFamilyData";
import { SectionCard, EmptyState } from "@/Components/uiBits";
import { formatDate } from "@/lib/famNestUtils";
import { Bell, Loader2, CheckCheck } from "lucide-react";

const TYPE_ICON = {
  bill: "🧾", request: "💬", requirement: "📋", task: "✅", savings: "🐷",
  budget: "💰", appointment: "📅", income: "📈", expense: "📉", event: "🎈", document: "📄",
};

export default function Notifications() {
  const { familyId } = useFamily();
  const d = useFamilyData();

  const markAll = async () => {
    const unread = d.notifications.filter((n) => !n.read);
    await db.entities.Notification.bulkUpdate(unread.map((n) => ({ id: n.id, read: true })));
    d.reload();
  };

  const toggle = async (n) => { await db.entities.Notification.update(n.id, { read: !n.read }); d.reload(); };

  if (d.loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" /></div>;

  const unread = d.notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Notifications</h1>
          <p className="text-sm text-stone-400">{unread} unread</p>
        </div>
        {unread > 0 && <button onClick={markAll} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 text-sm font-medium hover:bg-stone-200"><CheckCheck size={16} /> Mark all read</button>}
      </div>

      {d.notifications.length === 0 ? (
        <SectionCard><EmptyState icon={Bell} title="No notifications" /></SectionCard>
      ) : (
        <div className="space-y-2">
          {[...d.notifications].reverse().map((n) => (
            <button key={n.id} onClick={() => toggle(n)} className={`w-full flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-colors ${n.read ? "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900" : "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/30"}`}>
              <div className="text-xl">{TYPE_ICON[n.type] || "🔔"}</div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${n.read ? "text-stone-600 dark:text-stone-300" : "font-semibold text-stone-800 dark:text-stone-100"}`}>{n.title}</div>
                <div className="text-xs text-stone-400 mt-0.5">{n.message}</div>
                <div className="text-xs text-stone-300 mt-1">{formatDate(n.created_date)}</div>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}