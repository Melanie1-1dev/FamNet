import React, { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useFamily } from "@/lib/FamilyContext";
import QuickAdd from "@/Components/QuickAdd";
import {
  Home, Users, ClipboardList, CheckSquare, Calendar, Wallet,
  ShoppingCart, Target, FileText, Bell, BarChart3, Settings,
  Menu, X, Plus, Search, LogOut
} from "lucide-react";
import { db } from "@/api/db";

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
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive(item.to) ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"}`}>
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
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
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
            <Link key={item.to} to={item.to} className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium ${isActive(item.to) ? "text-emerald-600" : "text-stone-400"}`}>
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <QuickAdd open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </div>
  );
}