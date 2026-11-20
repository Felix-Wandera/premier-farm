"use client";
import React, { useState } from "react";
import { X, Save } from "lucide-react";
import { addInventoryItem } from "@/actions/inventory.actions";
import { useToast } from "../ui/Toast";
import styles from "../../(dashboard)/inventory/page.module.css"; 

export default function NewItemModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: "",
    category: "FEED",
    unit: "",
    minThreshold: "0",
    linkToFinance: false,
    unitCost: "",
    unitRevenue: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!formData.name || !formData.unit) {
      toast("Please fill all required fields", "error");
      return;
    }
    
    setIsSubmitting(true);
    const res = await addInventoryItem({
      ...formData,
      minThreshold: parseFloat(formData.minThreshold) || 0,
      linkToFinance: formData.linkToFinance,
      unitCost: formData.unitCost ? parseFloat(formData.unitCost) : null,
      unitRevenue: formData.unitRevenue ? parseFloat(formData.unitRevenue) : null,
    });
    setIsSubmitting(false);

    if (res.success) {
      toast(res.message, "success");
      setFormData({ name: "", category: "FEED", unit: "", minThreshold: "0", linkToFinance: false, unitCost: "", unitRevenue: "" });
      onClose();
    } else {
      toast(res.message, "error");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", backgroundColor: "rgba(0,0,0,0.4)" }}>
      {/* Sidebar style modal on right side */}
      <div style={{ marginLeft: "auto", width: "100%", maxWidth: "420px", backgroundColor: "#fff", height: "100%", display: "flex", flexDirection: "column", boxShadow: "-4px 0 15px rgba(0,0,0,0.1)" }}>
        
        <div style={{ padding: "1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>New Inventory Item</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={24} color="#64748b" /></button>
        </div>

        <div style={{ padding: "1.5rem", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className={styles.inputGroup}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Item Name *</label>
            <input type="text" className={styles.searchInput} style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }} placeholder="e.g. Dairy Meal" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>

          <div className={styles.inputGroup}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Category</label>
            <select style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "white" }} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
              <option value="FEED">Feed</option>
              <option value="MEDICINE">Medicine</option>
              <option value="EQUIPMENT">Equipment</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className={styles.inputGroup}>
             <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Unit of Measurement *</label>
             <input type="text" style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }} placeholder="e.g. bags, kgs, liters" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
          </div>

          <div className={styles.inputGroup}>
             <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Restock Alert Threshold</label>
             <input type="number" style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }} value={formData.minThreshold} onChange={e => setFormData({...formData, minThreshold: e.target.value})} />
             <small style={{ color: "#64748b", marginTop: "4px", display: "block" }}>System will alert when quantity drops below this number.</small>
          </div>

          {/* Financial Linkage Card */}
          <div style={{ backgroundColor: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={formData.linkToFinance}
                onChange={e => setFormData({ ...formData, linkToFinance: e.target.checked })}
                style={{ width: "18px", height: "18px", accentColor: "#1e293b" }}
              />
              <span>Link to Sales & Finances</span>
            </label>
            <small style={{ color: "#64748b", display: "block", marginTop: "4px" }}>
              Automatically log corresponding Expense or Sale when this item is restocked or dispatched.
            </small>

            {formData.linkToFinance && (
              <div style={{ marginTop: "0.85rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", fontWeight: 500 }}>
                    Restock Cost (KES per {formData.unit || "unit"})
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 2500"
                    style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                    value={formData.unitCost}
                    onChange={e => setFormData({ ...formData, unitCost: e.target.value })}
                  />
                  <small style={{ color: "#64748b", fontSize: "0.75rem" }}>Logs Expense on Stock In (leave empty for none).</small>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", fontWeight: 500 }}>
                    Selling Price (KES per {formData.unit || "unit"})
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 3000"
                    style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                    value={formData.unitRevenue}
                    onChange={e => setFormData({ ...formData, unitRevenue: e.target.value })}
                  />
                  <small style={{ color: "#64748b", fontSize: "0.75rem" }}>Logs Sale on Stock Out (leave empty if internal farm use only).</small>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: "1.5rem", borderTop: "1px solid #e2e8f0" }}>
          <button 
             onClick={handleSave}
             disabled={isSubmitting}
             style={{ width: "100%", padding: "0.875rem", backgroundColor: "#1e293b", color: "#fff", borderRadius: "8px", border: "none", fontWeight: 600, display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}
          >
             <Save size={20} />
             {isSubmitting ? "Saving..." : "Save Item"}
          </button>
        </div>
      </div>
    </div>
  );
}
