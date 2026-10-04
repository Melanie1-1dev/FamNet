import React, { useEffect, useState } from "react";
import { db } from "@/api/db";
import { useFamily } from "@/lib/FamilyContext";
import { useFamilyData } from "@/lib/useFamilyData";
import { SectionCard, Badge } from "@/Components/uiBits";
import { Trash2, AlertTriangle, Activity, Loader2, Mail } from "lucide-react";
import { Switch } from "@/Components/ui/switch";
import { getReminderSettings, supabaseConfigured, updateReminderSettings } from "@/api/supabase";

export default function Settings() {
  const { family, user, refresh } = useFamily();
  const d = useFamilyData();
  const [confirming, setConfirming] = useState(false);
  const [reminderSettings, setReminderSettings] = useState(null);
  const [reminderLoading, setReminderLoading] = useState(true);
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderError, setReminderError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!supabaseConfigured || !user?.id) {
      setReminderLoading(false);
      return () => { cancelled = true; };
    }
    getReminderSettings(user.id)
      .then((settings) => { if (!cancelled) setReminderSettings(settings); })
      .catch((error) => { if (!cancelled) setReminderError(error.message || "Could not load reminder settings."); })
      .finally(() => { if (!cancelled) setReminderLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const setBillRemindersEnabled = async (enabled) => {
    if (!user?.id) return;
    setReminderSaving(true);
    setReminderError("");
    try {
      const updated = await updateReminderSettings(user.id, { enabled });
      setReminderSettings(updated);
    } catch (error) {
      setReminderError(error.message || "Could not update reminder settings.");
    } finally {
      setReminderSaving(false);
    }
  };

  const clearDemo = async () => {
    if (!confirming) { setConfirming(true); return; }
    // delete demo data for this family
    const fid = family.id;
    await Promise.all([
      db.entities.Requirement.deleteMany({ family_id: fid }),
      db.entities.Task.deleteMany({ family_id: fid }),
      db.entities.Income.deleteMany({ family_id: fid }),
      db.entities.Expense.deleteMany({ family_id: fid }),
      db.entities.SavingsGoal.deleteMany({ family_id: fid }),
      db.entities.SavingsContribution.deleteMany({ family_id: fid }),
      db.entities.FinancialGoal.deleteMany({ family_id: fid }),
      db.entities.Budget.deleteMany({ family_id: fid }),
      db.entities.Bill.deleteMany({ family_id: fid }),
      db.entities.FamilyEvent.deleteMany({ family_id: fid }),
      db.entities.ShoppingItem.deleteMany({ family_id: fid }),
      db.entities.FamilyRequest.deleteMany({ family_id: fid }),
      db.entities.Notification.deleteMany({ family_id: fid }),
      db.entities.ActivityLog.deleteMany({ family_id: fid }),
    ]);
    setConfirming(false);
    d.reload();
    refresh();
  };

  if (d.loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Settings</h1>

      <SectionCard title="Family">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-stone-400">Family name</span><span className="font-medium text-stone-700 dark:text-stone-200">{family?.name}</span></div>
          <div className="flex justify-between"><span className="text-stone-400">Currency</span><span className="font-medium text-stone-700 dark:text-stone-200">{family?.currency || "RWF"}</span></div>
          <div className="flex justify-between"><span className="text-stone-400">Members</span><span className="font-medium text-stone-700 dark:text-stone-200">{d.members.length}</span></div>
          <div className="flex justify-between"><span className="text-stone-400">Demo data</span><Badge className={family?.is_demo ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-500"}>{family?.is_demo ? "Yes" : "No"}</Badge></div>
        </div>
      </SectionCard>

      <SectionCard title="Bill email reminders">
        {!supabaseConfigured ? (
          <div className="flex items-start gap-3 text-sm">
            <Mail size={18} className="mt-0.5 text-stone-400" />
            <div>
              <div className="font-medium text-stone-700 dark:text-stone-200">Not connected</div>
              <p className="mt-1 text-stone-400">Connect Supabase and configure the scheduled email service to enable bill reminders.</p>
            </div>
          </div>
        ) : reminderLoading ? (
          <div className="flex items-center gap-2 text-sm text-stone-400"><Loader2 size={16} className="animate-spin" /> Loading reminder settings…</div>
        ) : reminderSettings ? (
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 text-sm">
              <Mail size={18} className="mt-0.5 text-emerald-600" />
              <div>
                <div className="flex items-center gap-2 font-medium text-stone-700 dark:text-stone-200">
                  <span>{reminderSettings.enabled ? "Email reminders: On" : "Email reminders: Off"}</span>
                  <Badge className={reminderSettings.enabled ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"}>{reminderSettings.enabled ? "Enabled" : "Paused"}</Badge>
                </div>
                <p className="mt-1 text-stone-400">{reminderSettings.enabled ? `Sending to ${reminderSettings.recipient_email} after 9:00 AM (${reminderSettings.timezone}).` : `Emails to ${reminderSettings.recipient_email} are paused.`}</p>
                <p className="mt-1 text-stone-400">Only unpaid bills due today through three days ahead are included.</p>
                <p className="mt-1 text-xs text-stone-400">Delivery also requires the Supabase email function and schedule to be deployed.</p>
              </div>
            </div>
            <Switch
              checked={!!reminderSettings.enabled}
              onCheckedChange={setBillRemindersEnabled}
              disabled={reminderSaving}
              aria-label="Enable daily bill reminder emails"
            />
          </div>
        ) : (
          <p className="text-sm text-stone-400">Reminder settings are not available. Apply the Supabase migration and sign in again.</p>
        )}
        {reminderError && <p role="alert" className="mt-3 text-sm text-red-600">{reminderError}</p>}
      </SectionCard>

      <SectionCard title="Account">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-stone-400">Name</span><span className="font-medium text-stone-700 dark:text-stone-200">{user?.full_name || "—"}</span></div>
          <div className="flex justify-between"><span className="text-stone-400">Email</span><span className="font-medium text-stone-700 dark:text-stone-200">{user?.email}</span></div>
          <div className="flex justify-between"><span className="text-stone-400">Role</span><Badge className="bg-emerald-100 text-emerald-700 capitalize">{user?.role || "user"}</Badge></div>
        </div>
      </SectionCard>

      <SectionCard title="Activity Log">
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {d.activity.length === 0 ? <div className="text-sm text-stone-400 text-center py-4">No activity</div> : d.activity.map((a) => (
            <div key={a.id} className="flex gap-2 text-sm">
              <Activity size={14} className="text-emerald-500 mt-0.5 shrink-0" />
              <div className="flex-1"><span className="text-stone-700 dark:text-stone-200">{a.description}</span></div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Danger Zone" className="border-red-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-red-500 mt-0.5" size={20} />
          <div className="flex-1">
            <div className="font-medium text-stone-800 dark:text-stone-100">Clear all family data</div>
            <div className="text-sm text-stone-400 mt-0.5">Removes all requirements, tasks, income, expenses, savings, budgets, bills, events, requests and notifications for this family.</div>
            <button onClick={clearDemo} className={`mt-3 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium ${confirming ? "bg-red-600 text-white hover:bg-red-700" : "bg-red-50 text-red-600 hover:bg-red-100"}`}>
              <Trash2 size={15} /> {confirming ? "Click again to confirm" : "Clear all data"}
            </button>
            {confirming && <button onClick={() => setConfirming(false)} className="ml-2 text-sm text-stone-400">Cancel</button>}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
