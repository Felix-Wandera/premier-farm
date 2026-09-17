"use client";
import React, { useState } from "react";
import { X, Save, DollarSign } from "lucide-react";
import { useToast } from "../ui/Toast";

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
  const [amount, setAmount] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!date) {
      toast("Date is required.", "error");
      return;
    }

    if (status === "DECEASED" && !cause.trim()) {
      toast("Cause of death is required.", "error");
      return;
    }

    if (status === "SOLD") {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        toast("Please enter a valid sale price greater than 0.", "error");
        return;
      }
    }

    setIsSubmitting(true);
    const payload: any = { date };
    if (status === "DECEASED") {
      payload.cause = cause.trim();
    } else if (status === "SOLD") {
      payload.amount = parseFloat(amount);
      payload.buyerName = buyerName.trim();
      payload.notes = notes.trim();
    }

    const res = await onSave(animal.id, status, payload);
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
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "var(--color-text-main)" }}>New Status</label>
            <select
              style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)", fontSize: "0.95rem" }}
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <option value="DECEASED">Deceased</option>
              <option value="SOLD">Sold</option>
            </select>
          </div>

          <div>
             <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "var(--color-text-main)" }}>
               {status === "SOLD" ? "Date Sold *" : "Date of Passing *"}
             </label>
             <input
               type="date"
               style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)", fontSize: "0.95rem" }}
               value={date}
               onChange={e => setDate(e.target.value)}
             />
          </div>

          {status === "DECEASED" && (
            <div>
               <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "var(--color-text-main)" }}>Cause of Death *</label>
               <input
                 type="text"
                 placeholder="e.g. Bloat, Old Age, Complications"
                 style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)", fontSize: "0.95rem" }}
                 value={cause}
                 onChange={e => setCause(e.target.value)}
               />
            </div>
          )}

          {status === "SOLD" && (
            <>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "var(--color-text-main)" }}>Sale Price (KES) *</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="e.g. 65000"
                    style={{ width: "100%", padding: "0.75rem 0.75rem 0.75rem 2.25rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)", fontSize: "0.95rem" }}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                  />
                  <DollarSign size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} />
                </div>
                <p style={{ margin: "4px 0 0", fontSize: "0.75rem", opacity: 0.6 }}>
                  This will automatically record an ANIMAL sale in your Financial Ledger.
                </p>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "var(--color-text-main)" }}>Buyer Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe / Rift Dairy Farm"
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)", fontSize: "0.95rem" }}
                  value={buyerName}
                  onChange={e => setBuyerName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "var(--color-text-main)" }}>Notes / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Sold at local livestock auction..."
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)", fontSize: "0.95rem", fontFamily: "inherit", resize: "vertical" }}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <div style={{ padding: "1.5rem", borderTop: "1px solid var(--color-border)" }}>
          <button
             onClick={handleSave}
             disabled={isSubmitting}
             style={{ width: "100%", padding: "0.875rem", backgroundColor: "var(--color-primary)", color: "white", borderRadius: "8px", border: "none", fontWeight: 600, display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}
          >
             <Save size={20} />
             {isSubmitting ? "Updating..." : "Update Status"}
          </button>
        </div>
      </div>
    </div>
  );
}
