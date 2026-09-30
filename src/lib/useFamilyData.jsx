import { useState, useEffect, useCallback, useContext, createContext } from "react";
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

  return <DataContext.Provider value={{ ...data, loading, reload: load }}>{children}</DataContext.Provider>;
}

export function useFamilyData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useFamilyData must be inside DataProvider");
  return ctx;
}