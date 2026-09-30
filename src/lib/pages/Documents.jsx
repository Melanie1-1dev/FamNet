import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { db } from "@/api/db";
import { useFamily } from "@/lib/FamilyContext";
import { useFamilyData } from "@/lib/useFamilyData";
import FormModal from "@/Components/FormModal";
import { SectionCard, EmptyState, Badge } from "@/Components/uiBits";
import { formatDate, daysUntil } from "@/lib/famNestUtils";
import { Plus, FileText, Trash2, Upload, Loader2, AlertTriangle } from "lucide-react";

const FIELDS = [
  { name: "name", label: "Document Name", required: true },
  { name: "type", label: "Type", type: "select", options: ["birth_certificate", "school", "medical", "insurance", "receipt", "id", "other"] },
  { name: "expiration_date", label: "Expiration Date", type: "date" },
  { name: "notes", label: "Notes", type: "textarea" },
];

export default function Documents() {
  const { familyId } = useFamily();
  const d = useFamilyData();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingDoc, setPendingDoc] = useState(null);

  useEffect(() => { if (params.get("new") === "document") setOpen(true); }, [params]);
  const close = () => { setOpen(false); setPendingDoc(null); params.delete("new"); setParams(params); };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await db.files.upload({ file });
      setPendingDoc((p) => ({ ...p, file_url }));
    } catch (err) { alert(err?.message || "Upload failed"); }
    setUploading(false);
  };

  const submit = async (vals) => {
    await db.entities.Document.create({ ...vals, file_url: pendingDoc?.file_url || "", family_id: familyId });
    close(); d.reload();
  };

  const del = async (id, name) => { if (!confirm(`Delete document "${name}"?`)) return; await db.entities.Document.delete(id); d.reload(); };

  if (d.loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Family Documents</h1>
          <p className="text-sm text-stone-400">Securely store important family records</p>
        </div>
        <button onClick={() => { setPendingDoc({}); setOpen(true); }} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"><Plus size={18} /> Upload</button>
      </div>

      {d.documents.length === 0 ? (
        <SectionCard><EmptyState icon={FileText} title="No documents" subtitle="Upload birth certificates, IDs, receipts and more." /></SectionCard>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {d.documents.map((doc) => {
            const dd = daysUntil(doc.expiration_date);
            return (
              <div key={doc.id} className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><FileText size={18} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-stone-800 dark:text-stone-100">{doc.name}</div>
                    <Badge className="bg-stone-100 text-stone-500 capitalize mt-1">{doc.type.replace("_", " ")}</Badge>
                    {doc.expiration_date && (
                      <div className={`text-xs mt-1.5 flex items-center gap-1 ${dd !== null && dd <= 30 ? "text-red-500" : "text-stone-400"}`}>
                        {dd !== null && dd <= 30 && <AlertTriangle size={11} />}
                        Expires {formatDate(doc.expiration_date)}
                      </div>
                    )}
                  </div>
                  <button onClick={() => del(doc.id, doc.name)} className="text-stone-300 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
                {doc.file_url && <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 hover:underline mt-2 inline-block">View file →</a>}
              </div>
            );
          })}
        </div>
      )}

      <FormModal open={open} onClose={close} title="Upload Document" fields={FIELDS} onSubmit={submit} initial={pendingDoc || {}}>
        {/* file upload handled separately below the modal fields via the pendingDoc state */}
      </FormModal>

      {open && (
        <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-stone-900 rounded-xl shadow-lg border border-stone-200 dark:border-stone-800 p-3 flex items-center gap-2">
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium cursor-pointer">
            <Upload size={15} /> {uploading ? "Uploading…" : pendingDoc?.file_url ? "File attached ✓" : "Choose file"}
            <input type="file" className="hidden" onChange={onFile} disabled={uploading} />
          </label>
        </div>
      )}
    </div>
  );
}