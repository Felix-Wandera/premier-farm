"use client";
import React, { useState } from "react";
import { X, Save } from "lucide-react";
import { recordTransaction } from "@/actions/financial.actions";
import { useToast } from "../ui/Toast";
import OutlierWarningModal from "../ui/OutlierWarningModal";
import styles from "./NewTransactionModal.module.css";

const INCOME_REASONS = [
  "Cooperative Milk Delivery",
  "Farm Gate / Local Retail Milk",
  "Animal Sale (Bull / Cow / Calf)",
  "Manure / Organic Fertilizer",
  "Surplus Hay / Silage",
  "Machinery / Equipment Hire",
  "Other"
];

const EXPENSE_REASONS = [
  "Commercial Feed Purchase (Dairy Meal, Bran)",
  "Veterinary Drugs & Treatment",
  "AI Straws & Inseminator Fee",
  "Labor Wages & Allowances",
  "Fencing / Barn Repairs",
  "Fuel & Transport",
  "Utilities (Electricity, Water)",
  "Milking Consumables (Dips, Salve)",
  "Other"
];

export default function NewTransactionModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    type: "income",
    category: "OTHER",
    amount: "",
    date: todayStr,
    reason: INCOME_REASONS[0],
    customReason: "",
    description: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outlierState, setOutlierState] = useState<{ warnings: string[]; canOverride: boolean } | null>(null);
  const toast = useToast();

  if (!isOpen) return null;

  const currentReasons = formData.type === "income" ? INCOME_REASONS : EXPENSE_REASONS;

  const handleTypeChange = (newType: "income" | "expense") => {
    setFormData({
      ...formData,
      type: newType,
      category: newType === "income" ? "MILK" : "FEED",
      reason: newType === "income" ? INCOME_REASONS[0] : EXPENSE_REASONS[0],
      customReason: "",
    });
  };

  const handleSave = async (overrideWarnings = false) => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast("Please enter a valid amount", "error");
      return;
    }
    
    const finalReason = formData.reason === "Other" 
      ? (formData.customReason.trim() || "Other") 
      : formData.reason;

    setIsSubmitting(true);
    const res: any = await recordTransaction({
      type: formData.type,
      category: formData.category,
      amount: parseFloat(formData.amount) || 0,
      date: formData.date,
      reason: finalReason,
      description: formData.description,
      overrideWarnings,
    });
    setIsSubmitting(false);

    if (res.code === "OUTLIER_WARNING" && res.warnings) {
      setOutlierState({
        warnings: res.warnings,
        canOverride: Boolean(res.canOverride),
      });
      return;
    }

    setOutlierState(null);

    if (res.success) {
      toast(res.message, "success");
      setFormData({
        type: "income",
        category: "MILK",
        amount: "",
        date: todayStr,
        reason: INCOME_REASONS[0],
        customReason: "",
        description: ""
      });
      onClose();
    } else {
      toast(res.message, "error");
    }
  };

  return (
    <div className={styles.backdrop} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modalSheet}>
        <div className={styles.dragHandle} />
        
        <div className={styles.header}>
          <h2 className={styles.title}>New Transaction</h2>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className={styles.body}>
          
          <div style={{ display: "flex", gap: "1rem" }}>
             <button 
                type="button"
                onClick={() => handleTypeChange("income")}
                style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", border: formData.type === "income" ? "2px solid #22c55e" : "1px solid #e2e8f0", backgroundColor: formData.type === "income" ? "#f0fdf4" : "#fff", fontWeight: 600, color: formData.type === "income" ? "#16a34a" : "#64748b", cursor: "pointer" }}>
               Income
             </button>
             <button 
                type="button"
                onClick={() => handleTypeChange("expense")}
                style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", border: formData.type === "expense" ? "2px solid #ef4444" : "1px solid #e2e8f0", backgroundColor: formData.type === "expense" ? "#fef2f2" : "#fff", fontWeight: 600, color: formData.type === "expense" ? "#dc2626" : "#64748b", cursor: "pointer" }}>
               Expense
             </button>
          </div>

          {/* Mobile-Friendly Date Selector */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
              <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "#334155" }}>Transaction Date *</label>
              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, date: todayStr })}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "99px",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    border: "1px solid #cbd5e1",
                    backgroundColor: formData.date === todayStr ? "#1e293b" : "#fff",
                    color: formData.date === todayStr ? "#fff" : "#475569",
                    cursor: "pointer"
                  }}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    setFormData({ ...formData, date: y.toISOString().split('T')[0] });
                  }}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "99px",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    border: "1px solid #cbd5e1",
                    backgroundColor: formData.date !== todayStr ? "#1e293b" : "#fff",
                    color: formData.date !== todayStr ? "#fff" : "#475569",
                    cursor: "pointer"
                  }}
                >
                  Yesterday
                </button>
              </div>
            </div>
            <input
              type="date"
              max={todayStr}
              style={{ width: "100%", minHeight: "44px", padding: "0.6rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.95rem", fontWeight: 600 }}
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 500, fontSize: "0.85rem" }}>Category *</label>
            <select style={{ width: "100%", minHeight: "44px", padding: "0.65rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "white" }} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
              {formData.type === "income" ? (
                <>
                  <option value="MILK">Milk Sales</option>
                  <option value="ANIMAL">Animal Sales</option>
                  <option value="OTHER">Other Income</option>
                </>
              ) : (
                <>
                  <option value="FEED">Feed &amp; Silage</option>
                  <option value="INVENTORY_PURCHASE">Inventory / Supplies Purchase</option>
                  <option value="VET_SERVICES">Veterinary / Medical</option>
                  <option value="LABOR">Labor &amp; Wages</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="OTHER">Other Expense</option>
                </>
              )}
            </select>
          </div>

          {/* Reason Dropdown + Custom Allowance */}
          <div>
            <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 500, fontSize: "0.85rem" }}>Reason / Specifics</label>
            <select
              style={{ width: "100%", minHeight: "44px", padding: "0.65rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "white", fontSize: "0.9rem" }}
              value={formData.reason}
              onChange={e => setFormData({ ...formData, reason: e.target.value })}
            >
              {currentReasons.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {formData.reason === "Other" && (
              <input
                type="text"
                placeholder="Write your custom reason..."
                style={{ width: "100%", marginTop: "0.5rem", minHeight: "40px", padding: "0.6rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                value={formData.customReason}
                onChange={e => setFormData({ ...formData, customReason: e.target.value })}
                autoFocus
              />
            )}
          </div>

          <div>
             <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 500, fontSize: "0.85rem" }}>Amount (KES) *</label>
             <input type="number" style={{ width: "100%", minHeight: "44px", padding: "0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "1rem", fontWeight: 700 }} placeholder="0" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
          </div>

          <div>
             <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 500, fontSize: "0.85rem" }}>Additional Notes (Optional)</label>
             <textarea rows={2} style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", resize: "none" }} placeholder="Enter any extra details or invoice reference..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
          </div>
        </div>

        <div className={styles.footer}>
          <button 
             onClick={() => handleSave(false)}
             disabled={isSubmitting}
             className={styles.submitBtn}
          >
             <Save size={18} />
             <span>{isSubmitting ? "Saving..." : "Record Transaction"}</span>
          </button>
        </div>
      </div>

      <OutlierWarningModal
        isOpen={!!outlierState}
        warnings={outlierState?.warnings || []}
        canOverride={outlierState?.canOverride || false}
        isSubmitting={isSubmitting}
        onCancel={() => setOutlierState(null)}
        onOverride={() => handleSave(true)}
      />
    </div>
  );
}
