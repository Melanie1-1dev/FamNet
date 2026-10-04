import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { db } from "@/api/db";
import { DataProvider } from "@/lib/useFamilyData";
import { supabaseConfigured } from "@/api/supabase";

const FamilyContext = createContext(null);

export function FamilyProvider({ children }) {
  const [family, setFamily] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const me = await db.auth.me();
      setUser(me);
      let fams = await db.entities.Family.filter({ created_by_id: me.id });
      let fam = fams[0];
      // Keep this browser's existing family and linked local records when the
      // owner signs in through Supabase with the same email address.
      if (!fam && supabaseConfigured && me.email) {
        const legacy = await db.entities.Family.filter({ created_by: me.email });
        if (legacy[0]) fam = await db.entities.Family.update(legacy[0].id, { created_by_id: me.id });
      }
      if (!fam) {
        fam = await db.entities.Family.create({ name: `${me.full_name || me.email || "My"} Family`, currency: "RWF", is_demo: true });
      }
      // Seed demo data whenever a demo family has no members yet. This also
      // repairs a family whose earlier seeding was interrupted.
      let mems = await db.entities.FamilyMember.filter({ family_id: fam.id });
      if (fam.is_demo && mems.length === 0) {
        try {
          await seedDemoData(fam.id, me);
          mems = await db.entities.FamilyMember.filter({ family_id: fam.id });
        } catch (seedErr) {
          console.error("Demo data seeding failed", seedErr);
        }
      }
      await db.entities.Bill.importLocal(fam.id);
      setFamily(fam);
      setMembers(mems);
    } catch (e) {
      console.error("Family load error", e);
      setError(e?.message || "Could not load your family");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = {
    family, members, user, loading, refresh,
    familyId: family?.id,
    setFamily,
  };
  return (
    <FamilyContext.Provider value={value}>
      {family ? (
        <DataProvider familyId={family.id}>{children}</DataProvider>
      ) : loading ? (
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="fixed inset-0 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-3">
            <h1 className="text-xl font-semibold">Could not load your family</h1>
            <p className="text-sm text-stone-500 break-words">{error || "Something went wrong."}</p>
            <button
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium"
              onClick={() => { setLoading(true); refresh(); }}
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error("useFamily must be inside FamilyProvider");
  return ctx;
}

async function seedDemoData(familyId, me) {
  const today = new Date();
  const iso = (offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  const name = me?.full_name || "Parent";

  const members = await db.entities.FamilyMember.bulkCreate([
    { family_id: familyId, name: name, relationship: "parent", role: "admin", can_view_finance: true },
    { family_id: familyId, name: "Claire Uwase", relationship: "spouse", role: "admin", can_view_finance: true },
    { family_id: familyId, name: "Sarah Uwase", relationship: "child", role: "child", date_of_birth: "2014-05-12", can_view_finance: false },
    { family_id: familyId, name: "Eric Uwase", relationship: "child", role: "child", date_of_birth: "2018-09-03", can_view_finance: false },
  ]);

  await db.entities.Income.bulkCreate([
    { family_id: familyId, name: "Monthly Salary", amount: 800000, source: "Salary", person_receiving: name, date: iso(-5), frequency: "monthly" },
    { family_id: familyId, name: "Small Business", amount: 500000, source: "Business", person_receiving: "Claire Uwase", date: iso(-2), frequency: "monthly" },
    { family_id: familyId, name: "Freelance Project", amount: 200000, source: "Freelance", person_receiving: name, date: iso(-10), frequency: "one_time" },
  ]);

  await db.entities.Expense.bulkCreate([
    { family_id: familyId, name: "Monthly Groceries", amount: 220000, category: "Food", date: iso(-3), person: "Claire Uwase", payment_method: "Cash" },
    { family_id: familyId, name: "School Fees", amount: 150000, category: "Education", date: iso(-7), person: name, payment_method: "Bank" },
    { family_id: familyId, name: "Transport", amount: 80000, category: "Transportation", date: iso(-1), person: name, payment_method: "Cash" },
    { family_id: familyId, name: "Electricity", amount: 35000, category: "Utilities", date: iso(-4), person: "Claire Uwase", payment_method: "Mobile Money" },
    { family_id: familyId, name: "Internet", amount: 25000, category: "Utilities", date: iso(-6), person: name, payment_method: "Mobile Money" },
    { family_id: familyId, name: "Medical Checkup", amount: 40000, category: "Health", date: iso(-12), person: "Sarah Uwase", payment_method: "Bank" },
  ]);

  const goals = await db.entities.SavingsGoal.bulkCreate([
    { family_id: familyId, name: "Emergency Fund", target_amount: 2000000, current_amount: 750000, category: "emergency", deadline: "2027-12-31" },
    { family_id: familyId, name: "Children's Education", target_amount: 3000000, current_amount: 1200000, category: "education", deadline: "2030-01-01" },
    { family_id: familyId, name: "New Laptop", target_amount: 1500000, current_amount: 600000, category: "laptop", deadline: "2027-12-01" },
  ]);

  await db.entities.SavingsContribution.bulkCreate([
    { family_id: familyId, savings_goal_id: goals[0].id, amount: 50000, date: iso(-2), contributor: name, notes: "Monthly contribution" },
    { family_id: familyId, savings_goal_id: goals[1].id, amount: 100000, date: iso(-5), contributor: "Claire Uwase" },
    { family_id: familyId, savings_goal_id: goals[2].id, amount: 30000, date: iso(-1), contributor: name },
  ]);

  await db.entities.Requirement.bulkCreate([
    { family_id: familyId, name: "School supplies for Sarah", description: "Books, pens, notebooks for new term", category: "Education", person_concerned: "Sarah Uwase", estimated_cost: 45000, priority: "high", deadline: iso(3), assigned_person: "Claire Uwase", status: "open" },
    { family_id: familyId, name: "Monthly Groceries", description: "Restock food supplies", category: "Food & Groceries", person_concerned: "Family", estimated_cost: 250000, priority: "medium", deadline: iso(2), assigned_person: "Claire Uwase", status: "open" },
    { family_id: familyId, name: "Electricity Bill", description: "Prepaid electricity token", category: "Household", person_concerned: "Family", estimated_cost: 35000, priority: "urgent", deadline: iso(1), assigned_person: name, status: "open" },
  ]);

  await db.entities.Task.bulkCreate([
    { family_id: familyId, title: "Buy groceries", assigned_to: "Claire Uwase", deadline: iso(2), priority: "medium", status: "todo" },
    { family_id: familyId, title: "Pay school fees", assigned_to: name, deadline: iso(1), priority: "high", status: "todo" },
    { family_id: familyId, title: "Take Sarah to doctor", assigned_to: name, deadline: iso(0), priority: "urgent", status: "in_progress" },
    { family_id: familyId, title: "Clean the house", assigned_to: "Eric Uwase", deadline: iso(-1), priority: "low", status: "todo" },
  ]);

  await db.entities.Bill.bulkCreate([
    { family_id: familyId, name: "Rent", amount: 300000, due_date: iso(5), frequency: "monthly", category: "Rent", responsible_person: name, status: "upcoming" },
    { family_id: familyId, name: "Electricity", amount: 35000, due_date: iso(1), frequency: "monthly", category: "Electricity", responsible_person: name, status: "due_today" },
    { family_id: familyId, name: "Internet", amount: 25000, due_date: iso(-2), frequency: "monthly", category: "Internet", responsible_person: name, status: "overdue" },
    { family_id: familyId, name: "School Fees", amount: 150000, due_date: iso(10), frequency: "monthly", category: "School fees", responsible_person: name, status: "upcoming" },
  ]);

  await db.entities.Budget.bulkCreate([
    { family_id: familyId, category: "Food", budgeted_amount: 250000, period: "monthly" },
    { family_id: familyId, category: "Education", budgeted_amount: 150000, period: "monthly" },
    { family_id: familyId, category: "Transportation", budgeted_amount: 100000, period: "monthly" },
    { family_id: familyId, category: "Utilities", budgeted_amount: 80000, period: "monthly" },
    { family_id: familyId, category: "Health", budgeted_amount: 50000, period: "monthly" },
  ]);

  await db.entities.FamilyRequest.bulkCreate([
    { family_id: familyId, requested_by: "Sarah Uwase", title: "New school shoes", description: "Need new school shoes", estimated_cost: 30000, reason: "Current shoes are too small", status: "pending" },
    { family_id: familyId, requested_by: "Eric Uwase", title: "School bag", description: "Need a new school bag", estimated_cost: 35000, reason: "Bag is damaged", status: "pending" },
  ]);

  await db.entities.ShoppingItem.bulkCreate([
    { family_id: familyId, name: "Rice", quantity: "10kg", estimated_price: 20000, category: "groceries", purchased: false },
    { family_id: familyId, name: "Cooking oil", quantity: "5L", estimated_price: 15000, category: "groceries", purchased: false },
    { family_id: familyId, name: "Notebooks", quantity: "6", estimated_price: 12000, category: "school", purchased: false },
  ]);

  await db.entities.FamilyEvent.bulkCreate([
    { family_id: familyId, title: "Sarah's Birthday", date: iso(20), type: "birthday" },
    { family_id: familyId, title: "Parent-teacher meeting", date: iso(4), type: "school" },
    { family_id: familyId, title: "Dental appointment", date: iso(6), type: "appointment" },
  ]);

  await db.entities.ActivityLog.bulkCreate([
    { family_id: familyId, action: "income_added", description: `${name} added monthly salary: 800,000 RWF`, user: name, date: new Date().toISOString() },
    { family_id: familyId, action: "expense_added", description: "Claire recorded electricity expense: 35,000 RWF", user: "Claire Uwase", date: new Date().toISOString() },
    { family_id: familyId, action: "request_submitted", description: "Sarah requested new school shoes", user: "Sarah Uwase", date: new Date().toISOString() },
    { family_id: familyId, action: "savings_contribution", description: "50,000 RWF added to Emergency Fund", user: name, date: new Date().toISOString() },
  ]);

  await db.entities.Notification.bulkCreate([
    { family_id: familyId, title: "Electricity bill due today", message: "Your electricity bill of 35,000 RWF is due today.", type: "bill" },
    { family_id: familyId, title: "New request from Sarah", message: "Sarah requested new school shoes (30,000 RWF).", type: "request" },
    { family_id: familyId, title: "Internet bill overdue", message: "Your internet bill of 25,000 RWF is overdue.", type: "bill" },
  ]);
}
