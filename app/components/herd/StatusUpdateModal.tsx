"use client";
import React, { useState } from "react";
import { X, Save } from "lucide-react";
import { useToast } from "../ui/Toast";
import styles from "../../(dashboard)/herd/[id]/page.module.css";

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  animal: any;
  onSave: (id: string, status: string, additionalData: any) => Promise<any>;
}

export default function StatusUpdateModal({ isOpen, onClose, animal, onSave }: StatusUpdateModalProps) {
  const [status, setStatus] = useState("DECEASED");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [cause, setCause] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!date) {
      toast("Date is required.", "error");
      return;
    }

    if (status === "DECEASED" && !cause) {
      toast("Cause is required.", "error");
      return;
    }

    setIsSubmitting(true);
    const res = await onSave(animal.id, status, { date, cause });
    setIsSubmitting(false);

    if (res.success) {
      toast(res.message, "success");
      onClose();
    } else {
      toast(res.message, "error");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div style={{ width: "100%", maxWidth: "450px", backgroundColor: "var(--color-surface)", borderRadius: "16px", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", border: "1px solid var(--color-border)", margin: "1rem" }}>

        <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text-main)" }}>Update Animal Status</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-sub)" }}><X size={24} /></button>
        </div>

        <div style={{ padding: "1.5rem", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "var(--color-text-sub)" }}>New Status</label>
            <select style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)" }} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="DECEASED">Deceased</option>
              <option value="SOLD">Sold</option>
            </select>
          </div>

          <div>
             <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "var(--color-text-sub)" }}>Date</label>
             <input type="date" style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)" }} value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {status === "DECEASED" && (
            <div>
               <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "var(--color-text-sub)" }}>Cause of Death</label>
               <input type="text" style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)" }} value={cause} onChange={e => setCause(e.target.value)} />
            </div>
          )}
        </div>

        <div style={{ padding: "1.5rem", borderTop: "1px solid var(--color-border)" }}>
          <button
             onClick={handleSave}
             disabled={isSubmitting}
             style={{ width: "100%", padding: "0.875rem", backgroundColor: "var(--color-primary)", color: "white", borderRadius: "8px", border: "none", fontWeight: 600, display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}
          >
             <Save size={20} />
             {isSubmitting ? "Saving..." : "Update Status"}
          </button>
        </div>
      </div>
    </div>
  );
}
