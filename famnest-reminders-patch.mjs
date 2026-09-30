#!/usr/bin/env node
/*
 * FamNest - event reminders patch (one file).
 * Run from the project folder (the one with package.json):   node famnest-reminders-patch.mjs
 * Then restart:  npm run dev
 * Replaces/creates the files listed in FILES below. Any file it replaces is first
 * copied into ./.famnest-backup-reminders/
 */
import fs from "node:fs";
import path from "node:path";

const FILES = {
  "src/lib/reminders.js": `// Pure helpers for event reminders (no React, easy to test).

// Label shown in the form -> minutes before the event (null = no reminder)
export const REMIND_OPTIONS = {
  "At event time": 0,
  "10 minutes before": 10,
  "30 minutes before": 30,
  "1 hour before": 60,
  "1 day before": 1440,
  "No reminder": null,
};
export const REMIND_LABELS = Object.keys(REMIND_OPTIONS);

const DEFAULT_TIME = "08:00"; // used when an event has a date but no time
const CATCH_UP_MS = 24 * 60 * 60 * 1000; // still notify up to 24h late (app was closed)

// "2026-09-30" -> local midnight (avoids the UTC shift of new Date("2026-09-30"))
export function localDate(d) {
  if (!d) return null;
  const dt = new Date(\`\${String(d).slice(0, 10)}T00:00:00\`);
  return isNaN(dt) ? null : dt;
}

export function localISO(date = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return \`\${date.getFullYear()}-\${p(date.getMonth() + 1)}-\${p(date.getDate())}\`;
}

export function eventStart(e) {
  if (!e?.date) return null;
  const time = /^\\d{2}:\\d{2}/.test(e.time || "") ? e.time.slice(0, 5) : DEFAULT_TIME;
  const dt = new Date(\`\${String(e.date).slice(0, 10)}T\${time}:00\`);
  return isNaN(dt) ? null : dt;
}

export function remindMinutes(e) {
  if (!e.remind || !(e.remind in REMIND_OPTIONS)) return 0; // older events: at event time
  return REMIND_OPTIONS[e.remind];
}

export function reminderTime(e) {
  const start = eventStart(e);
  const mins = remindMinutes(e);
  if (!start || mins === null) return null;
  return new Date(start.getTime() - mins * 60000);
}

// Events whose reminder should be sent now.
export function getDueEvents(events, now = new Date()) {
  return (events || []).filter((e) => {
    if (e.reminder_sent) return false;
    const due = reminderTime(e);
    const start = eventStart(e);
    if (!due || !start) return false;
    return now >= due && now.getTime() <= start.getTime() + CATCH_UP_MS;
  });
}

const fmtTime = (d) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const fmtDay = (d) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

const IN_PHRASE = {
  10: "in 10 minutes", 30: "in 30 minutes", 60: "in 1 hour", 1440: "tomorrow",
};

export function reminderMessage(e, now = new Date()) {
  const start = eventStart(e);
  const mins = remindMinutes(e) ?? 0;
  const when = \`\${fmtTime(start)} on \${fmtDay(start)}\`;
  if (now.getTime() > start.getTime() + 60000) {
    return { title: \`Missed: \${e.title}\`, message: \`"\${e.title}" was scheduled for \${when}.\` };
  }
  if (mins === 0) {
    return { title: \`Now: \${e.title}\`, message: \`"\${e.title}" is starting now (\${when}).\` };
  }
  return { title: \`Reminder: \${e.title}\`, message: \`"\${e.title}" starts \${IN_PHRASE[mins] || \`in \${mins} minutes\`} (\${when}).\` };
}
`,
  "src/Components/ReminderEngine.jsx": `import React, { useEffect, useRef, useState } from "react";
import { BellRing } from "lucide-react";
import { db } from "@/api/db";
import { useFamily } from "@/lib/FamilyContext";
import { useFamilyData } from "@/lib/useFamilyData";
import { toast } from "@/Components/ui/use-toast";
import { getDueEvents, reminderMessage } from "@/lib/reminders";

function browserNotify(title, body, tag) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, tag });
    }
  } catch { /* some browsers block the constructor; the in-app alert still shows */ }
}

/**
 * Checks the calendar every few seconds. When an event's reminder time arrives it:
 *  1) saves a Notification (shows on the Notifications page + red bell dot),
 *  2) shows an in-app toast,
 *  3) shows a desktop/browser notification if the user allowed it.
 * Renders nothing. Mounted once inside Layout.
 */
export default function ReminderEngine() {
  const { familyId } = useFamily();
  const d = useFamilyData();
  const eventsRef = useRef(d.events);
  const reloadRef = useRef(d.reload);
  const busy = useRef(false);
  eventsRef.current = d.events;
  reloadRef.current = d.reload;

  useEffect(() => {
    if (!familyId) return undefined;
    let stopped = false;

    const tick = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        let fired = false;
        for (const e of getDueEvents(eventsRef.current, new Date())) {
          // re-read so two open tabs never send the same reminder twice
          const fresh = await db.entities.FamilyEvent.get(e.id).catch(() => null);
          if (!fresh || fresh.reminder_sent) continue;
          await db.entities.FamilyEvent.update(e.id, { reminder_sent: true });
          const { title, message } = reminderMessage(fresh, new Date());
          await db.entities.Notification.create({
            family_id: familyId,
            title,
            message,
            type: fresh.type === "appointment" ? "appointment" : "event",
          });
          toast({ title, description: message });
          browserNotify(title, message, \`event-\${e.id}\`);
          fired = true;
        }
        if (fired && !stopped) reloadRef.current({ silent: true });
      } catch (err) {
        console.error("Reminder check failed", err);
      } finally {
        busy.current = false;
      }
    };

    tick();
    const timer = setInterval(tick, 15000);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [familyId]);

  return null;
}

/** Small banner to allow desktop alerts (browsers require a click to ask). */
export function EnableAlertsBanner() {
  const supported = typeof window !== "undefined" && "Notification" in window;
  const [perm, setPerm] = useState(supported ? Notification.permission : "unsupported");
  if (!supported || perm === "granted") return null;

  return (
    <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 text-sm">
      <BellRing size={18} className="text-amber-600 shrink-0" />
      <div className="flex-1 text-stone-600 dark:text-stone-300">
        {perm === "denied"
          ? "Desktop alerts are blocked. Allow notifications for this site in your browser's address-bar settings to get pop-ups when an event starts."
          : "Turn on desktop alerts to get a pop-up when an event's time arrives (works while FamNest is open in a browser tab)."}
      </div>
      {perm === "default" && (
        <button
          onClick={async () => setPerm(await Notification.requestPermission())}
          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium"
        >
          Turn on
        </button>
      )}
    </div>
  );
}
`,
  "src/lib/pages/Calendar.jsx": `import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { db } from "@/api/db";
import { useFamily } from "@/lib/FamilyContext";
import { useFamilyData } from "@/lib/useFamilyData";
import FormModal from "@/Components/FormModal";
import { SectionCard, EmptyState } from "@/Components/uiBits";
import { formatDate, daysUntil } from "@/lib/famNestUtils";
import { REMIND_LABELS, eventStart, localDate, localISO } from "@/lib/reminders";
import { Plus, Calendar as CalIcon, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const FIELDS = [
  { name: "title", label: "Event Title", required: true },
  { name: "description", label: "Description", type: "textarea" },
  { name: "date", label: "Date", type: "date", required: true },
  { name: "time", label: "Time (hour)", type: "time", required: true },
  { name: "remind", label: "Notify me", type: "select", options: REMIND_LABELS },
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
    await db.entities.FamilyEvent.create({ ...vals, remind: vals.remind || "At event time", reminder_sent: false, family_id: familyId });
    close(); d.reload();
  };

  const allEvents = useMemo(() => {
    const list = [...d.events];
    d.bills.forEach((b) => list.push({ id: \`bill-\${b.id}\`, title: \`Bill: \${b.name}\`, date: b.due_date, type: "bill" }));
    d.tasks.forEach((t) => t.deadline && list.push({ id: \`task-\${t.id}\`, title: \`Task: \${t.title}\`, date: t.deadline, type: "task" }));
    return list;
  }, [d]);

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const startDay = monthStart.getDay();
  const days = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let i = 1; i <= monthEnd.getDate(); i++) days.push(i);

  const eventsOn = (day) => allEvents.filter((e) => { const dt = localDate(e.date); return dt && dt.getFullYear() === cursor.getFullYear() && dt.getMonth() === cursor.getMonth() && dt.getDate() === day; });

  const upcoming = allEvents.filter((e) => { const dd = daysUntil(e.date); return dd !== null && dd >= 0; }).sort((a, b) => (eventStart(a) || 0) - (eventStart(b) || 0)).slice(0, 8);

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
                <div key={i} className={\`min-h-[60px] p-1.5 rounded-lg border \${isToday ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950" : "border-stone-100 dark:border-stone-800"}\`}>
                  <div className={\`text-xs font-medium \${isToday ? "text-emerald-700" : "text-stone-500"}\`}>{day}</div>
                  <div className="space-y-0.5 mt-1">
                    {evs.slice(0, 2).map((e) => (
                      <div key={e.id} className={\`text-[10px] px-1 py-0.5 rounded truncate \${TYPE_COLORS[e.type] || TYPE_COLORS.other}\`}>{e.time ? \`\${e.time} \` : ""}{e.title}</div>
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
                  <div className={\`text-[10px] px-1.5 py-0.5 rounded \${TYPE_COLORS[e.type] || TYPE_COLORS.other} capitalize\`}>{e.type}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-stone-700 dark:text-stone-200 truncate">{e.title}</div>
                    <div className="text-xs text-stone-400">{formatDate(e.date)}{e.time ? \` · \${e.time}\` : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <FormModal open={open} onClose={close} title="New Event" fields={FIELDS} onSubmit={submit} initial={{ date: localISO(), time: "", remind: "At event time" }} />
    </div>
  );
}`,
  "src/lib/pages/Notifications.jsx": `import React from "react";
import { db } from "@/api/db";
import { useFamily } from "@/lib/FamilyContext";
import { useFamilyData } from "@/lib/useFamilyData";
import { SectionCard, EmptyState } from "@/Components/uiBits";
import { formatDate } from "@/lib/famNestUtils";
import { Bell, Loader2, CheckCheck } from "lucide-react";
import { EnableAlertsBanner } from "@/Components/ReminderEngine";

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

      <EnableAlertsBanner />

      {d.notifications.length === 0 ? (
        <SectionCard><EmptyState icon={Bell} title="No notifications" /></SectionCard>
      ) : (
        <div className="space-y-2">
          {[...d.notifications].reverse().map((n) => (
            <button key={n.id} onClick={() => toggle(n)} className={\`w-full flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-colors \${n.read ? "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900" : "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/30"}\`}>
              <div className="text-xl">{TYPE_ICON[n.type] || "🔔"}</div>
              <div className="flex-1 min-w-0">
                <div className={\`text-sm \${n.read ? "text-stone-600 dark:text-stone-300" : "font-semibold text-stone-800 dark:text-stone-100"}\`}>{n.title}</div>
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
}`,
  "src/Components/Layout.jsx": `import React, { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useFamily } from "@/lib/FamilyContext";
import QuickAdd from "@/Components/QuickAdd";
import {
  Home, Users, ClipboardList, CheckSquare, Calendar, Wallet,
  ShoppingCart, Target, FileText, Bell, BarChart3, Settings,
  Menu, X, Plus, Search, LogOut
} from "lucide-react";
import { db } from "@/api/db";
import { useFamilyData } from "@/lib/useFamilyData";
import ReminderEngine from "@/Components/ReminderEngine";

const NAV = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/family", label: "Family", icon: Users },
  { to: "/requirements", label: "Requirements", icon: ClipboardList },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/finance", label: "Finance", icon: Wallet },
  { to: "/shopping", label: "Shopping", icon: ShoppingCart },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Layout() {
  const { family, user } = useFamily();
  const { notifications } = useFamilyData();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const isActive = (to) => to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  const handleLogout = async () => {
    await db.auth.logout();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex">
      {/* Sidebar - desktop */}
      <aside className={\`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 flex flex-col transition-transform duration-300 \${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}\`}>
        <div className="h-16 flex items-center gap-2 px-5 border-b border-stone-200 dark:border-stone-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">F</div>
          <div>
            <div className="font-semibold text-stone-800 dark:text-stone-100 leading-tight">FamNest</div>
            <div className="text-[11px] text-stone-400">{family?.name || "Family Hub"}</div>
          </div>
          <button className="ml-auto lg:hidden text-stone-400" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}
                className={\`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors \${isActive(item.to) ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"}\`}>
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-stone-600 dark:text-stone-300 text-sm font-semibold">
              {(user?.full_name || user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-stone-700 dark:text-stone-200 truncate">{user?.full_name || "User"}</div>
              <div className="text-[11px] text-stone-400 truncate">{user?.email}</div>
            </div>
            <button onClick={handleLogout} className="text-stone-400 hover:text-red-500" title="Sign out"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 sticky top-0 z-20 bg-white/80 dark:bg-stone-900/80 backdrop-blur border-b border-stone-200 dark:border-stone-800 flex items-center gap-3 px-4 lg:px-6">
          <button className="lg:hidden text-stone-500" onClick={() => setSidebarOpen(true)}><Menu size={22} /></button>
          <Link to="/search" className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-400 text-sm w-64 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">
            <Search size={16} />
            <span>Search everything…</span>
          </Link>
          <div className="flex-1" />
          <Link to="/notifications" className="relative p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500">
            <Bell size={20} />
            {unreadCount > 0 && <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </Link>
          <button onClick={() => setQuickAddOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-colors">
            <Plus size={18} />
            <span className="hidden sm:inline">Add</span>
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex items-center justify-around px-1 py-1.5">
        {[NAV[0], NAV[5], NAV[3], NAV[2], NAV[6]].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to} className={\`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium \${isActive(item.to) ? "text-emerald-600" : "text-stone-400"}\`}>
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <ReminderEngine />
      <QuickAdd open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </div>
  );
}`,
  "src/Components/FormModal.jsx": `import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Textarea } from "@/Components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/Components/ui/select";

export default function FormModal({ open, onClose, title, fields, onSubmit, initial = {} }) {
  const [values, setValues] = useState(initial);

  useEffect(() => { setValues(initial); }, [JSON.stringify(initial)]);

  if (!open) return null;

  const setField = (k, v) => setValues((s) => ({ ...s, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">{title}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          {fields.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label className="text-sm font-medium text-stone-600 dark:text-stone-300">{f.label}{f.required && <span className="text-red-500"> *</span>}</Label>
              {f.type === "textarea" ? (
                <Textarea required={f.required} value={values[f.name] || ""} onChange={(e) => setField(f.name, e.target.value)} placeholder={f.placeholder} rows={3} />
              ) : f.type === "select" ? (
                <Select value={values[f.name] || ""} onValueChange={(v) => setField(f.name, v)}>
                  <SelectTrigger><SelectValue placeholder={f.placeholder || "Select…"} /></SelectTrigger>
                  <SelectContent>
                    {f.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input type={f.type || "text"} required={f.required} value={values[f.name] || ""} onChange={(e) => setField(f.name, e.target.value)} placeholder={f.placeholder} />
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 justify-end mt-6">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Save</Button>
        </div>
      </form>
    </div>
  );
}`,
  "src/lib/useFamilyData.jsx": `import { useState, useEffect, useCallback, useContext, createContext } from "react";
import { db } from "@/api/db";

const DataContext = createContext(null);

const EMPTY = {
  requirements: [], tasks: [], income: [], expenses: [],
  savingsGoals: [], savingsContributions: [], financialGoals: [],
  budgets: [], bills: [], events: [], shoppingItems: [],
  requests: [], documents: [], notifications: [], activity: [], members: [],
};

export function DataProvider({ familyId, children }) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  // load({ silent: true }) refreshes without showing the loading spinner
  const load = useCallback(async (opts) => {
    if (!familyId) return;
    if (!opts?.silent) setLoading(true);
    try {
      const [
        requirements, tasks, income, expenses, savingsGoals,
        savingsContributions, financialGoals, budgets, bills, events,
        shoppingItems, requests, documents, notifications, activity, members
      ] = await Promise.all([
        db.entities.Requirement.filter({ family_id: familyId }),
        db.entities.Task.filter({ family_id: familyId }),
        db.entities.Income.filter({ family_id: familyId }),
        db.entities.Expense.filter({ family_id: familyId }),
        db.entities.SavingsGoal.filter({ family_id: familyId }),
        db.entities.SavingsContribution.filter({ family_id: familyId }),
        db.entities.FinancialGoal.filter({ family_id: familyId }),
        db.entities.Budget.filter({ family_id: familyId }),
        db.entities.Bill.filter({ family_id: familyId }),
        db.entities.FamilyEvent.filter({ family_id: familyId }),
        db.entities.ShoppingItem.filter({ family_id: familyId }),
        db.entities.FamilyRequest.filter({ family_id: familyId }),
        db.entities.Document.filter({ family_id: familyId }),
        db.entities.Notification.filter({ family_id: familyId }),
        db.entities.ActivityLog.filter({ family_id: familyId }, "-created_date", 50),
        db.entities.FamilyMember.filter({ family_id: familyId }),
      ]);
      setData({ requirements, tasks, income, expenses, savingsGoals, savingsContributions, financialGoals, budgets, bills, events, shoppingItems, requests, documents, notifications, activity, members });
    } catch (e) {
      console.error("data load error", e);
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => { load(); }, [load]);

  return <DataContext.Provider value={{ ...data, loading, reload: load }}>{children}</DataContext.Provider>;
}

export function useFamilyData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useFamilyData must be inside DataProvider");
  return ctx;
}`,
  "src/api/db.js": `// Local, browser-only data layer (localStorage). No server or account needed.
// Exposes: db.entities.<Name>.{filter,list,get,create,bulkCreate,update,bulkUpdate,delete,deleteMany},
//          db.auth.{me,getCurrentUser,register,login,loginWithGoogle,logout,resetPassword}, db.files.upload

const PREFIX = "famnest:";

const DEFAULTS = {
  Bill: { amount: 0, frequency: "monthly", status: "upcoming" },
  Budget: { budgeted_amount: 0, period: "monthly" },
  Document: { type: "other" },
  Expense: { amount: 0, recurring: false },
  Family: { currency: "RWF", is_demo: false },
  FamilyEvent: { type: "other", reminder_sent: false },
  FamilyMember: { role: "member", can_view_finance: false },
  FamilyRequest: { estimated_cost: 0, status: "pending" },
  FinancialGoal: { target_amount: 0, current_amount: 0, priority: "medium" },
  Income: { amount: 0, frequency: "one_time" },
  Notification: { type: "event", read: false },
  Requirement: { estimated_cost: 0, priority: "medium", recurring: false, status: "open" },
  SavingsContribution: { amount: 0 },
  SavingsGoal: { target_amount: 0, current_amount: 0, category: "custom" },
  ShoppingItem: { estimated_price: 0, actual_price: 0, category: "groceries", purchased: false },
  Task: { priority: "medium", status: "todo", recurring: false },
};

const MAX_FILE_BYTES = 2 * 1024 * 1024;

function makeError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    throw makeError("Browser storage is full. Delete some data or documents and try again.", 507);
  }
}

function newId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/* ---------------------------------- auth ---------------------------------- */

async function hashPassword(password) {
  if (window.crypto?.subtle) {
    const bytes = new TextEncoder().encode("famnest|" + password);
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback for non-secure contexts (plain http on a LAN address)
  let h = 5381;
  const s = "famnest|" + password;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return "weak-" + (h >>> 0).toString(16);
}

function decodeJwt(token) {
  const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(payload + "=".repeat((4 - (payload.length % 4)) % 4));
  const json = decodeURIComponent(
    Array.from(bin).map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")
  );
  return JSON.parse(json);
}

const publicUser = (u) => (u ? { id: u.id, email: u.email, full_name: u.full_name, picture: u.picture || null, role: u.role, created_date: u.created_date } : null);
const users = () => read("users", []);
const normEmail = (e) => String(e || "").trim().toLowerCase();

function currentUserSync() {
  const session = read("session", null);
  if (!session) return null;
  return publicUser(users().find((u) => u.id === session.userId));
}

const auth = {
  getCurrentUser: currentUserSync,

  async me() {
    const u = currentUserSync();
    if (!u) throw makeError("Not signed in", 401);
    return u;
  },

  async register({ email, password, full_name }) {
    const e = normEmail(email);
    if (!e || !password) throw makeError("Email and password are required", 400);
    if (password.length < 6) throw makeError("Password must be at least 6 characters", 400);
    const list = users();
    if (list.some((u) => u.email === e)) throw makeError("An account with this email already exists", 409);
    const user = {
      id: newId(),
      email: e,
      full_name: (full_name || "").trim() || e.split("@")[0],
      role: list.length === 0 ? "admin" : "user",
      password_hash: await hashPassword(password),
      created_date: new Date().toISOString(),
    };
    write("users", [...list, user]);
    write("session", { userId: user.id });
    return publicUser(user);
  },

  async login(email, password) {
    const user = users().find((u) => u.email === normEmail(email));
    if (!user || user.password_hash !== (await hashPassword(password))) {
      throw makeError("Invalid email or password", 401);
    }
    write("session", { userId: user.id });
    return publicUser(user);
  },

  // Google Identity Services returns a signed ID token (JWT) in the browser.
  // There is no server here to verify the signature, so the claims are checked
  // locally (issuer, audience, expiry, verified email). Fine for a local app.
  async loginWithGoogle(credential, clientId) {
    let claims;
    try {
      claims = decodeJwt(credential);
    } catch {
      throw makeError("Invalid Google response. Please try again.", 400);
    }
    const okIssuer = claims.iss === "accounts.google.com" || claims.iss === "https://accounts.google.com";
    if (!okIssuer || claims.aud !== clientId || !claims.exp || claims.exp * 1000 < Date.now()) {
      throw makeError("Google sign-in could not be verified. Please try again.", 401);
    }
    if (!claims.email || claims.email_verified === false) {
      throw makeError("Your Google email address is not verified.", 401);
    }
    const e = normEmail(claims.email);
    const list = users();
    let user = list.find((u) => u.email === e);
    if (!user) {
      user = {
        id: newId(),
        email: e,
        full_name: claims.name || e.split("@")[0],
        picture: claims.picture || null,
        provider: "google",
        role: list.length === 0 ? "admin" : "user",
        created_date: new Date().toISOString(),
      };
      write("users", [...list, user]);
    }
    write("session", { userId: user.id });
    return publicUser(user);
  },

  async logout() {
    try { window.localStorage.removeItem(PREFIX + "session"); } catch { /* ignore */ }
  },

  // No email service exists, so a reset is done directly on this device.
  async resetPassword({ email, newPassword }) {
    if (!newPassword || newPassword.length < 6) throw makeError("Password must be at least 6 characters", 400);
    const list = users();
    const idx = list.findIndex((u) => u.email === normEmail(email));
    if (idx === -1) throw makeError("No account found with this email on this device", 404);
    list[idx] = { ...list[idx], password_hash: await hashPassword(newPassword) };
    write("users", list);
  },
};

/* -------------------------------- entities -------------------------------- */

function matches(record, query) {
  if (!query) return true;
  return Object.entries(query).every(([field, cond]) => {
    const v = record[field];
    if (cond && typeof cond === "object" && !Array.isArray(cond)) {
      return Object.entries(cond).every(([op, arg]) => {
        switch (op) {
          case "$ne": return v !== arg;
          case "$in": return Array.isArray(arg) && arg.includes(v);
          case "$nin": return Array.isArray(arg) && !arg.includes(v);
          case "$gt": return v > arg;
          case "$gte": return v >= arg;
          case "$lt": return v < arg;
          case "$lte": return v <= arg;
          default: return false;
        }
      });
    }
    return v === cond;
  });
}

function sortRecords(list, sort) {
  if (!sort) return list;
  const desc = sort.startsWith("-");
  const field = desc ? sort.slice(1) : sort;
  return [...list].sort((a, b) => {
    const x = a[field], y = b[field];
    if (x === y) return 0;
    if (x === undefined || x === null) return 1;
    if (y === undefined || y === null) return -1;
    return (x > y ? 1 : -1) * (desc ? -1 : 1);
  });
}

function makeEntity(name) {
  const key = "entity:" + name;
  const all = () => read(key, []);

  const build = (data) => {
    const now = new Date().toISOString();
    const user = currentUserSync();
    return {
      ...(DEFAULTS[name] || {}),
      ...data,
      id: newId(),
      created_date: now,
      updated_date: now,
      created_by: user?.email || null,
      created_by_id: user?.id || null,
    };
  };

  return {
    async filter(query, sort, limit) {
      let rows = sortRecords(all().filter((r) => matches(r, query)), sort);
      if (limit) rows = rows.slice(0, limit);
      return rows;
    },
    async list(sort, limit) {
      let rows = sortRecords(all(), sort);
      if (limit) rows = rows.slice(0, limit);
      return rows;
    },
    async get(id) {
      const row = all().find((r) => r.id === id);
      if (!row) throw makeError(\`\${name} not found\`, 404);
      return row;
    },
    async create(data) {
      const row = build(data);
      write(key, [...all(), row]);
      return row;
    },
    async bulkCreate(items) {
      const rows = (items || []).map(build);
      write(key, [...all(), ...rows]);
      return rows;
    },
    async update(id, patch) {
      const rows = all();
      const idx = rows.findIndex((r) => r.id === id);
      if (idx === -1) throw makeError(\`\${name} not found\`, 404);
      rows[idx] = { ...rows[idx], ...patch, id, updated_date: new Date().toISOString() };
      write(key, rows);
      return rows[idx];
    },
    async bulkUpdate(items) {
      const rows = all();
      const now = new Date().toISOString();
      const updated = [];
      for (const { id, ...patch } of items || []) {
        const idx = rows.findIndex((r) => r.id === id);
        if (idx === -1) continue;
        rows[idx] = { ...rows[idx], ...patch, id, updated_date: now };
        updated.push(rows[idx]);
      }
      write(key, rows);
      return updated;
    },
    async delete(id) {
      write(key, all().filter((r) => r.id !== id));
      return { success: true };
    },
    async deleteMany(query) {
      const rows = all();
      const kept = rows.filter((r) => !matches(r, query));
      write(key, kept);
      return { deleted: rows.length - kept.length };
    },
  };
}

const entityCache = {};
const entities = new Proxy({}, {
  get(_, name) {
    if (typeof name !== "string") return undefined;
    if (!entityCache[name]) entityCache[name] = makeEntity(name);
    return entityCache[name];
  },
});

/* ---------------------------------- files --------------------------------- */

const files = {
  // Stores the file inside the browser as a data URL (max 2 MB).
  async upload(file) {
    if (file.size > MAX_FILE_BYTES) throw makeError("File is too large (maximum 2 MB).", 413);
    const file_url = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(makeError("Could not read the file.", 400));
      reader.readAsDataURL(file);
    });
    return { file_url };
  },
};

export const db = { entities, auth, files };
`,
};

const ROOT = process.cwd();
if (!fs.existsSync(path.join(ROOT, "package.json")) || !fs.existsSync(path.join(ROOT, "src"))) {
  console.error("Run this from your project folder (it must contain package.json and src/).");
  process.exit(1);
}
const BACKUP = path.join(ROOT, ".famnest-backup-reminders");
let n = 0;
for (const [rel, text] of Object.entries(FILES)) {
  const dest = path.join(ROOT, rel);
  if (fs.existsSync(dest)) {
    if (fs.readFileSync(dest, "utf8").replace(/\r\n/g, "\n") === text) continue;
    const b = path.join(BACKUP, rel);
    fs.mkdirSync(path.dirname(b), { recursive: true });
    fs.copyFileSync(dest, b);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, text, "utf8");
  n++;
  console.log("  wrote", rel);
}
console.log(`\nDone: ${n} file(s) updated. Restart the dev server (npm run dev).`);
