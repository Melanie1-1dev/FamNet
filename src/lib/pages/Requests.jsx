import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { db } from "@/api/db";
import { useFamily } from "@/lib/FamilyContext";
import { useFamilyData } from "@/lib/useFamilyData";
import FormModal from "@/Components/FormModal";
import { SectionCard, Badge, EmptyState } from "@/Components/uiBits";
import { RWF, formatDate, statusColor, statusLabel } from "@/lib/famNestUtils";
import { MessageSquare, Plus, Check, X, HelpCircle, Loader2 } from "lucide-react";

const FIELDS = [
  { name: "requested_by", label: "Requested By", required: true, placeholder: "Family member name" },
  { name: "title", label: "Request", required: true, placeholder: "e.g. New school bag" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "estimated_cost", label: "Estimated Cost (RWF)", type: "number" },
  { name: "reason", label: "Reason", type: "textarea" },
];

export default function Requests() {
  const { familyId } = useFamily();
  const d = useFamilyData();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => { if (params.get("new") === "request") setOpen(true); }, [params]);
  const close = () => { setOpen(false); params.delete("new"); setParams(params); };

  const submit = async (vals) => {
    await db.entities.FamilyRequest.create({ ...vals, estimated_cost: Number(vals.estimated_cost || 0), family_id: familyId, status: "pending" });
    await db.entities.ActivityLog.create({ family_id: familyId, action: "request_submitted", description: `${vals.requested_by} requested ${vals.title}`, date: new Date().toISOString() });
    await db.entities.Notification.create({ family_id: familyId, title: `New request from ${vals.requested_by}`, message: `${vals.requested_by} requested ${vals.title} (${RWF(vals.estimated_cost || 0)})`, type: "request" });
    close(); d.reload();
  };

  const decide = async (r, status) => {
    await db.entities.FamilyRequest.update(r.id, { status });
    await db.entities.ActivityLog.create({ family_id: familyId, action: `request_${status}`, description: `Request ${status}: ${r.title}`, date: new Date().toISOString() });
    if (status === "approved") {
      const req = await db.entities.Requirement.create({
        family_id: familyId, name: r.title, description: r.description || r.reason || "",
        category: "Custom", person_concerned: r.requested_by, estimated_cost: r.estimated_cost,
        priority: "medium", status: "open", related_request_id: r.id,
      });
      await db.entities.ActivityLog.create({ family_id: familyId, action: "request_to_requirement", description: `Request converted to requirement: ${r.title}`, date: new Date().toISOString() });
    }
    d.reload();
  };

  if (d.loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Family Requests</h1>
          <p className="text-sm text-stone-400">Review and approve requests from family members</p>
        </div>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
          <Plus size={18} /> New Request
        </button>
      </div>

      {d.requests.length === 0 ? (
        <SectionCard><EmptyState icon={MessageSquare} title="No requests yet" /></SectionCard>
      ) : (
        <div className="space-y-3">
          {d.requests.map((r) => (
            <div key={r.id} className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-stone-800 dark:text-stone-100">{r.title}</div>
                  {r.description && <div className="text-sm text-stone-400 mt-0.5">{r.description}</div>}
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-stone-400">
                    <span>👤 {r.requested_by}</span>
                    {r.estimated_cost > 0 && <span>{RWF(r.estimated_cost)}</span>}
                    {r.reason && <span>• {r.reason}</span>}
                  </div>
                </div>
                <Badge className={statusColor(r.status)}>{statusLabel(r.status)}</Badge>
              </div>
              {r.status === "pending" && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => decide(r, "approved")} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"><Check size={14} /> Approve</button>
                  <button onClick={() => decide(r, "rejected")} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 text-xs font-medium hover:bg-stone-200"><X size={14} /> Reject</button>
                  <button onClick={() => decide(r, "info_requested")} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 text-xs font-medium hover:bg-stone-200"><HelpCircle size={14} /> Ask more</button>
                </div>
              )}
              {r.status === "approved" && <div className="text-xs text-emerald-600 mt-2">✓ Converted to a requirement</div>}
            </div>
          ))}
        </div>
      )}

      <FormModal open={open} onClose={close} title="New Request" fields={FIELDS} onSubmit={submit} />
    </div>
  );
}