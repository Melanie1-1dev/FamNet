import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Textarea } from "@/Components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/Components/ui/select";

export default function FormModal({ open, onClose, title, fields, onSubmit, initial = {} }) {
  const [values, setValues] = useState(initial);

  useEffect(() => { setValues(initial); }, [JSON.stringify(initial)]);

  if (!open) return null;

  const setField = (k, v) => setValues((s) => ({ ...s, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">{title}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          {fields.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label className="text-sm font-medium text-stone-600 dark:text-stone-300">{f.label}{f.required && <span className="text-red-500"> *</span>}</Label>
              {f.type === "textarea" ? (
                <Textarea value={values[f.name] || ""} onChange={(e) => setField(f.name, e.target.value)} placeholder={f.placeholder} rows={3} />
              ) : f.type === "select" ? (
                <Select value={values[f.name] || ""} onValueChange={(v) => setField(f.name, v)}>
                  <SelectTrigger><SelectValue placeholder={f.placeholder || "Select…"} /></SelectTrigger>
                  <SelectContent>
                    {f.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input type={f.type || "text"} value={values[f.name] || ""} onChange={(e) => setField(f.name, e.target.value)} placeholder={f.placeholder} />
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 justify-end mt-6">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Save</Button>
        </div>
      </form>
    </div>
  );
}