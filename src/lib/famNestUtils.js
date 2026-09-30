// FamNest shared helpers

export const RWF = (n) => {
  const v = Number(n || 0);
  return `${v.toLocaleString("en-US")} RWF`;
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const formatDate = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date)) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export const daysUntil = (d) => {
  if (!d) return null;
  const date = new Date(d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.round((date - now) / 86400000);
};

export const priorityColor = (p) => ({
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-green-100 text-green-700 border-green-200",
}[p] || "bg-gray-100 text-gray-700 border-gray-200");

export const priorityDot = (p) => ({
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
}[p] || "bg-gray-400");

export const priorityLabel = (p) => ({
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
}[p] || p);

export const statusColor = (s) => ({
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  todo: "bg-gray-100 text-gray-700",
  done: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  info_requested: "bg-blue-100 text-blue-700",
  upcoming: "bg-blue-100 text-blue-700",
  due_today: "bg-orange-100 text-orange-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
}[s] || "bg-gray-100 text-gray-700");

export const statusLabel = (s) => s?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || s;

// Period filtering
export const inPeriod = (dateStr, period, customStart, customEnd) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  if (period === "week") {
    start.setDate(now.getDate() - now.getDay());
    end.setDate(start.getDate() + 6);
  } else if (period === "month") {
    start.setDate(1);
    end.setMonth(start.getMonth() + 1, 0);
  } else if (period === "year") {
    start.setMonth(0, 1);
    end.setMonth(11, 31);
  } else if (period === "custom") {
    if (customStart) start.setTime(new Date(customStart).getTime());
    if (customEnd) end.setTime(new Date(customEnd).getTime());
  } else if (period === "today") {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return d >= start && d <= end;
};

export const monthKey = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const monthLabel = (key) => {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
};

export const REQUIREMENT_CATEGORIES = [
  "Education", "Food & Groceries", "Health", "Household", "Clothing",
  "Transportation", "Family Events", "Financial", "Custom"
];

export const EXPENSE_CATEGORIES = [
  "Food", "Education", "Health", "Housing", "Transportation", "Utilities",
  "Clothing", "Entertainment", "Family events", "Shopping", "Debt",
  "Insurance", "Emergency", "Other"
];

export const INCOME_SOURCES = [
  "Salary", "Business", "Freelance", "Farming", "Rental", "Investments",
  "Allowances", "Gifts", "Other"
];

export const BILL_CATEGORIES = [
  "Rent", "Electricity", "Water", "Internet", "School fees", "Insurance",
  "Subscriptions", "Loan", "Other"
];