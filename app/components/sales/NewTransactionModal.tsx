"use client";
import React, { useState } from "react";
import { X, Save } from "lucide-react";
import { recordTransaction } from "@/actions/financial.actions";
import { useToast } from "../ui/Toast";

export default function NewTransactionModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [formData, setFormData] = useState({
    type: "income",
    category: "OTHER",
    amount: "",
    description: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!formData.amount) {
      toast("Please enter an amount", "error");
      return;
    }
    
    setIsSubmitting(true);
    const res = await recordTransaction({
      ...formData,
      amount: parseFloat(formData.amount) || 0
    });
    setIsSubmitting(false);

    if (res.success) {
      toast(res.message, "success");
      setFormData({ type: "income", category: "OTHER", amount: "", description: "" });
      onClose();
    } else {
      toast(res.message, "error");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", backgroundColor: "rgba(0,0,0,0.4)" }}>
      {/* Sidebar style modal on right side */}
      <div style={{ marginLeft: "auto", width: "100%", maxWidth: "400px", backgroundColor: "#fff", height: "100%", display: "flex", flexDirection: "column", boxShadow: "-4px 0 15px rgba(0,0,0,0.1)" }}>
        
        <div style={{ padding: "1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>New Transaction</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={24} color="#64748b" /></button>
        </div>

        <div style={{ padding: "1.5rem", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          
          <div style={{ display: "flex", gap: "1rem", marginBottom: "0.5rem" }}>
             <button 
                onClick={() => setFormData({...formData, type: "income"})}
                style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", border: formData.type === "income" ? "2px solid #22c55e" : "1px solid #e2e8f0", backgroundColor: formData.type === "income" ? "#f0fdf4" : "#fff", fontWeight: 600, color: formData.type === "income" ? "#16a34a" : "#64748b", cursor: "pointer" }}>
               Income
             </button>
             <button 
                onClick={() => setFormData({...formData, type: "expense"})}
                style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", border: formData.type === "expense" ? "2px solid #ef4444" : "1px solid #e2e8f0", backgroundColor: formData.type === "expense" ? "#fef2f2" : "#fff", fontWeight: 600, color: formData.type === "expense" ? "#dc2626" : "#64748b", cursor: "pointer" }}>
               Expense
             </button>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Category *</label>
            <select style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "white" }} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
              {formData.type === "income" ? (
                <>
                  <option value="MILK">Milk Sales</option>
                  <option value="ANIMAL">Animal Sales</option>
                  <option value="OTHER">Other Income</option>
                </>
              ) : (
                <>
                  <option value="INVENTORY_PURCHASE">Feed / Inventory Purchase</option>
                  <option value="VET_SERVICES">Veterinary / Medical</option>
                  <option value="LABOR">Labor & Wages</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="OTHER">Other Expense</option>
                </>
              )}
            </select>
          </div>

          <div>
             <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Amount (KES) *</label>
             <input type="number" style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }} placeholder="0" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
          </div>

          <div>
             <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Description (Optional)</label>
             <textarea rows={3} style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", resize: "none" }} placeholder="Enter details..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
          </div>
        </div>

        <div style={{ padding: "1.5rem", borderTop: "1px solid #e2e8f0" }}>
          <button 
             onClick={handleSave}
             disabled={isSubmitting}
             style={{ width: "100%", padding: "0.875rem", backgroundColor: "#1e293b", color: "#fff", borderRadius: "8px", border: "none", fontWeight: 600, display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}
          >
             <Save size={20} />
             {isSubmitting ? "Saving..." : "Record Transaction"}
          </button>
        </div>
      </div>
    </div>
  );
}
