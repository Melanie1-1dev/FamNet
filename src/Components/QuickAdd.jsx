import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList, CheckSquare, TrendingUp, TrendingDown, PiggyBank,
  Target, Receipt, Calendar, MessageSquare, ShoppingCart, FileText, X
} from "lucide-react";

const OPTIONS = [
  { label: "New Requirement", icon: ClipboardList, to: "/requirements?new=requirement", color: "text-blue-600 bg-blue-50" },
  { label: "New Task", icon: CheckSquare, to: "/tasks?new=task", color: "text-emerald-600 bg-emerald-50" },
  { label: "New Income", icon: TrendingUp, to: "/finance/income?new=income", color: "text-green-600 bg-green-50" },
  { label: "New Expense", icon: TrendingDown, to: "/finance/expenses?new=expense", color: "text-red-600 bg-red-50" },
  { label: "New Saving", icon: PiggyBank, to: "/finance/savings?new=saving", color: "text-teal-600 bg-teal-50" },
  { label: "New Financial Goal", icon: Target, to: "/goals?new=goal", color: "text-purple-600 bg-purple-50" },
  { label: "New Bill", icon: Receipt, to: "/finance/bills?new=bill", color: "text-orange-600 bg-orange-50" },
  { label: "New Event", icon: Calendar, to: "/calendar?new=event", color: "text-indigo-600 bg-indigo-50" },
  { label: "New Request", icon: MessageSquare, to: "/requests?new=request", color: "text-pink-600 bg-pink-50" },
  { label: "Shopping Item", icon: ShoppingCart, to: "/shopping?new=item", color: "text-cyan-600 bg-cyan-50" },
  { label: "Upload Document", icon: FileText, to: "/documents?new=document", color: "text-amber-600 bg-amber-50" },
];

export default function QuickAdd({ open, onClose }) {
  const navigate = useNavigate();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">Quick Add</h2>
            <p className="text-sm text-stone-400">Add anything to your family hub</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400"><X size={20} /></button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button key={opt.label} onClick={() => { onClose(); navigate(opt.to); }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-emerald-300 hover:shadow-sm transition-all">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${opt.color}`}>
                  <Icon size={20} />
                </div>
                <span className="text-xs font-medium text-stone-700 dark:text-stone-200 text-center">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}