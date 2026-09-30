import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useFamilyData } from "@/lib/useFamilyData";
import { useFamily } from "@/lib/FamilyContext";
import { StatCard, SectionCard, Badge, ProgressBar, EmptyState } from "@/Components/uiBits";
import {
  RWF, inPeriod, daysUntil, priorityDot, priorityLabel, statusColor, statusLabel, formatDate
} from "@/lib/famNestUtils";
import {
  Users, ClipboardList, CheckSquare, Calendar, MessageSquare,
  TrendingUp, TrendingDown, PiggyBank, Wallet, AlertCircle, Activity, ArrowRight
} from "lucide-react";

const PERIODS = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
];

export default function Dashboard() {
  const { family, members } = useFamily();
  const d = useFamilyData();
  const [period, setPeriod] = useState("month");

  const totals = useMemo(() => {
    const income = d.income.filter((i) => inPeriod(i.date, period)).reduce((s, i) => s + i.amount, 0);
    const expenses = d.expenses.filter((i) => inPeriod(i.date, period)).reduce((s, i) => s + i.amount, 0);
    const savings = d.savingsContributions.filter((i) => inPeriod(i.date, period)).reduce((s, i) => s + i.amount, 0);
    const available = income - expenses - savings;
    return { income, expenses, savings, available };
  }, [d, period]);

  const pendingReqs = d.requirements.filter((r) => r.status !== "completed");
  const tasksToday = d.tasks.filter((t) => t.status !== "done" && daysUntil(t.deadline) !== null && daysUntil(t.deadline) <= 0);
  const upcomingEvents = d.events.filter((e) => { const dd = daysUntil(e.date); return dd !== null && dd >= 0 && dd <= 14; }).sort((a, b) => new Date(a.date) - new Date(b.date));
  const pendingRequests = d.requests.filter((r) => r.status === "pending");

  const needsAttention = useMemo(() => {
    const items = [];
    d.bills.forEach((b) => {
      const dd = daysUntil(b.due_date);
      if (b.status !== "paid" && dd !== null && dd <= 3) {
        items.push({ id: b.id, title: b.name, detail: `${RWF(b.amount)} • due ${formatDate(b.due_date)}`, priority: dd < 0 ? "urgent" : "high", link: "/finance/bills" });
      }
    });
    d.requirements.forEach((r) => {
      if (r.status !== "completed") {
        const dd = daysUntil(r.deadline);
        if (dd !== null && dd <= 2) {
          items.push({ id: r.id, title: r.name, detail: `${r.category} • ${formatDate(r.deadline)}`, priority: dd < 0 ? "urgent" : r.priority, link: "/requirements" });
        }
      }
    });
    d.tasks.forEach((t) => {
      if (t.status !== "done") {
        const dd = daysUntil(t.deadline);
        if (dd !== null && dd < 0) {
          items.push({ id: t.id, title: t.title, detail: `Overdue • ${formatDate(t.deadline)}`, priority: "high", link: "/tasks" });
        }
      }
    });
    d.requests.forEach((r) => {
      if (r.status === "pending") {
        items.push({ id: r.id, title: `${r.requested_by} requested ${r.title}`, detail: RWF(r.estimated_cost), priority: "medium", link: "/requests" });
      }
    });
    d.savingsGoals.forEach((g) => {
      const pct = g.target_amount > 0 ? g.current_amount / g.target_amount : 0;
      const dd = daysUntil(g.deadline);
      if (pct < 0.5 && dd !== null && dd < 60) {
        items.push({ id: g.id, title: `${g.name} behind target`, detail: `${Math.round(pct * 100)}% saved`, priority: "medium", link: "/finance/savings" });
      }
    });
    d.documents.forEach((doc) => {
      const dd = daysUntil(doc.expiration_date);
      if (dd !== null && dd <= 30) {
        items.push({ id: doc.id, title: `${doc.name} expiring`, detail: `Expires ${formatDate(doc.expiration_date)}`, priority: dd < 0 ? "urgent" : "medium", link: "/documents" });
      }
    });
    return items.sort((a, b) => {
      const order = { urgent: 0, high: 1, medium: 2, low: 3 };
      return order[a.priority] - order[b.priority];
    }).slice(0, 8);
  }, [d]);

  if (d.loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Welcome back 👋</h1>
          <p className="text-sm text-stone-400">{family?.name} • here's your family overview</p>
        </div>
        <div className="flex gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
          {PERIODS.map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === p.key ? "bg-white dark:bg-stone-700 text-emerald-700 dark:text-emerald-300 shadow-sm" : "text-stone-500"}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Family overview */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Family Members" value={members.length} icon={Users} />
        <StatCard label="Pending Requirements" value={pendingReqs.length} icon={ClipboardList} tone="balance" />
        <StatCard label="Tasks Due Today" value={tasksToday.length} icon={CheckSquare} tone="expense" />
        <StatCard label="Upcoming Events" value={upcomingEvents.length} icon={Calendar} tone="savings" />
        <StatCard label="Pending Requests" value={pendingRequests.length} icon={MessageSquare} tone="balance" />
      </div>

      {/* Financial overview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-stone-800 dark:text-stone-100">Financial Overview</h2>
          <Link to="/finance" className="text-sm text-emerald-600 hover:underline flex items-center gap-1">Open Finance <ArrowRight size={14} /></Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Income" value={RWF(totals.income)} icon={TrendingUp} tone="income" />
          <StatCard label="Total Expenses" value={RWF(totals.expenses)} icon={TrendingDown} tone="expense" />
          <StatCard label="Total Savings" value={RWF(totals.savings)} icon={PiggyBank} tone="savings" />
          <StatCard label="Available Balance" value={RWF(totals.available)} icon={Wallet} tone={totals.available >= 0 ? "balance" : "expense"} />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Needs Attention */}
        <SectionCard title="Needs Attention" className="lg:col-span-2" action={<Badge className="bg-red-50 text-red-600">{needsAttention.length} items</Badge>}>
          {needsAttention.length === 0 ? (
            <EmptyState icon={AlertCircle} title="All clear!" subtitle="Nothing needs your attention right now." />
          ) : (
            <div className="space-y-2">
              {needsAttention.map((item) => (
                <Link key={item.id} to={item.link} className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                  <span className={`w-2.5 h-2.5 rounded-full ${priorityDot(item.priority)} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-stone-700 dark:text-stone-200 truncate">{item.title}</div>
                    <div className="text-xs text-stone-400 truncate">{item.detail}</div>
                  </div>
                  <Badge className={statusColor(item.priority === "urgent" ? "overdue" : "due_today")}>{priorityLabel(item.priority)}</Badge>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Activity timeline */}
        <SectionCard title="Recent Activity" action={<Activity size={16} className="text-stone-400" />}>
          {d.activity.length === 0 ? (
            <EmptyState title="No activity yet" />
          ) : (
            <div className="space-y-3">
              {d.activity.slice(0, 6).map((a) => (
                <div key={a.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-stone-700 dark:text-stone-200">{a.description}</div>
                    <div className="text-xs text-stone-400">{formatDate(a.date)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Upcoming events + savings snapshot */}
      <div className="grid lg:grid-cols-2 gap-5">
        <SectionCard title="Upcoming Events" action={<Link to="/calendar" className="text-sm text-emerald-600 hover:underline">View all</Link>}>
          {upcomingEvents.length === 0 ? <EmptyState icon={Calendar} title="No upcoming events" /> : (
            <div className="space-y-2">
              {upcomingEvents.slice(0, 5).map((e) => (
                <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex flex-col items-center justify-center text-xs font-semibold">
                    {new Date(e.date).getDate()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-stone-700 dark:text-stone-200 truncate">{e.title}</div>
                    <div className="text-xs text-stone-400 capitalize">{e.type} • {formatDate(e.date)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Savings Goals" action={<Link to="/finance/savings" className="text-sm text-emerald-600 hover:underline">View all</Link>}>
          {d.savingsGoals.length === 0 ? <EmptyState icon={PiggyBank} title="No savings goals yet" /> : (
            <div className="space-y-4">
              {d.savingsGoals.slice(0, 4).map((g) => {
                const pct = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0;
                return (
                  <div key={g.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-stone-700 dark:text-stone-200">{g.name}</span>
                      <span className="text-xs text-stone-400">{RWF(g.current_amount)} / {RWF(g.target_amount)}</span>
                    </div>
                    <ProgressBar value={g.current_amount} max={g.target_amount} tone="sky" />
                    <div className="text-xs text-stone-400 mt-1">{pct}% saved</div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}