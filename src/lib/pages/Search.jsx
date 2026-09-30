import React, { useState } from "react";
import { useFamily } from "@/lib/FamilyContext";
import { useFamilyData } from "@/lib/useFamilyData";
import { SectionCard, Badge } from "@/Components/uiBits";
import { Search as SearchIcon, Loader2, X } from "lucide-react";

export default function Search() {
  const { familyId } = useFamily();
  const d = useFamilyData();
  const [q, setQ] = useState("");

  if (d.loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" /></div>;

  const query = q.toLowerCase().trim();
  const results = [];
  if (query) {
    const match = (s) => (s || "").toLowerCase().includes(query);
    d.members.forEach((m) => match(m.name) && results.push({ type: "Member", title: m.name, sub: m.relationship, link: "/family" }));
    d.requirements.forEach((r) => (match(r.name) || match(r.category)) && results.push({ type: "Requirement", title: r.name, sub: r.category, link: "/requirements" }));
    d.tasks.forEach((t) => match(t.title) && results.push({ type: "Task", title: t.title, sub: t.assigned_to, link: "/tasks" }));
    d.income.forEach((i) => match(i.name) && results.push({ type: "Income", title: i.name, sub: `${i.amount} RWF`, link: "/finance/income" }));
    d.expenses.forEach((e) => (match(e.name) || match(e.category)) && results.push({ type: "Expense", title: e.name, sub: e.category, link: "/finance/expenses" }));
    d.savingsGoals.forEach((g) => match(g.name) && results.push({ type: "Savings", title: g.name, sub: "savings goal", link: "/finance/savings" }));
    d.financialGoals.forEach((g) => match(g.name) && results.push({ type: "Goal", title: g.name, sub: "financial goal", link: "/goals" }));
    d.events.forEach((e) => match(e.title) && results.push({ type: "Event", title: e.title, sub: e.type, link: "/calendar" }));
    d.requests.forEach((r) => (match(r.title) || match(r.requested_by)) && results.push({ type: "Request", title: r.title, sub: r.requested_by, link: "/requests" }));
    d.documents.forEach((doc) => match(doc.name) && results.push({ type: "Document", title: doc.name, sub: doc.type, link: "/documents" }));
    d.bills.forEach((b) => match(b.name) && results.push({ type: "Bill", title: b.name, sub: "bill", link: "/finance/bills" }));
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Search</h1>
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members, requirements, tasks, expenses…"
          className="w-full pl-10 pr-10 py-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        {q && <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"><X size={18} /></button>}
      </div>

      {!query ? (
        <SectionCard><div className="text-center py-8 text-stone-400 text-sm">Start typing to search across your family hub.</div></SectionCard>
      ) : results.length === 0 ? (
        <SectionCard><div className="text-center py-8 text-stone-400 text-sm">No results for "{q}"</div></SectionCard>
      ) : (
        <div className="space-y-2">
          {results.slice(0, 30).map((r, i) => (
            <a key={i} href={r.link} className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:shadow-sm">
              <Badge className="bg-emerald-50 text-emerald-700">{r.type}</Badge>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-stone-800 dark:text-stone-100 truncate">{r.title}</div>
                <div className="text-xs text-stone-400">{r.sub}</div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}