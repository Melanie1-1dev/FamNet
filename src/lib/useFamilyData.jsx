import { useState, useEffect, useCallback, useContext, createContext, useRef } from "react";
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
  const [clock, setClock] = useState(Date.now());
  const remindersInProgress = useRef(new Set());

  const load = useCallback(async () => {
    if (!familyId) return;
    setLoading(true);
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

  // Browser-only reminder delivery: while FamNest is open, create an in-app
  // notification when an event's scheduled date and time arrives.
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (loading || !familyId) return;
    const existing = new Set(data.notifications.flatMap((n) => [n.reminder_for_event_id, n.reminder_for_task_id]).filter(Boolean));
    const reminders = [
      ...data.events.map((event) => ({ ...event, reminderId: `event:${event.id}`, date: event.date, kind: "event" })),
      ...data.tasks.filter((task) => task.status !== "done").map((task) => ({ ...task, reminderId: `task:${task.id}`, date: task.deadline, kind: "task" })),
    ];
    const due = reminders.filter((item) => {
      if (!item.date || existing.has(item.id) || remindersInProgress.current.has(item.reminderId)) return false;
      const reminderTime = item.time || "09:00";
      const scheduled = new Date(`${item.date}T${reminderTime}`);
      return !Number.isNaN(scheduled.getTime()) && scheduled.getTime() <= clock;
    });
    if (!due.length) return;

    due.forEach((item) => remindersInProgress.current.add(item.reminderId));
    (async () => {
      try {
        await Promise.all(due.map((item) => db.entities.Notification.create({
          family_id: familyId,
          title: `${item.kind === "task" ? "Task due" : "Event reminder"}: ${item.title}`,
          message: `${item.title} is scheduled for ${formatDate(item.date)}${item.time ? ` at ${item.time}` : ""}.`,
          type: item.kind,
          ...(item.kind === "task" ? { reminder_for_task_id: item.id } : { reminder_for_event_id: item.id }),
        })));
        await load();
      } catch (error) {
        console.error("Could not create event reminder", error);
      } finally {
        due.forEach((item) => remindersInProgress.current.delete(item.reminderId));
      }
    })();
  }, [clock, data.events, data.notifications, data.tasks, familyId, load, loading]);

  return <DataContext.Provider value={{ ...data, loading, reload: load }}>{children}</DataContext.Provider>;
}

export function useFamilyData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useFamilyData must be inside DataProvider");
  return ctx;
}
