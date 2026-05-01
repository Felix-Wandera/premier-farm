"use client";
import React, { useState, useEffect } from "react";
import { X, Save, Trash2 } from "lucide-react";
import { useToast } from "../ui/Toast";
import styles from "../../(dashboard)/inventory/page.module.css";
import { updateInventoryItem, deleteInventoryItem } from "@/actions/inventory.actions";

export default function EditItemModal({ isOpen, onClose, item }: { isOpen: boolean, onClose: () => void, item: any }) {
  const [formData, setFormData] = useState({
    name: "",
    category: "FEED",
    unit: "",
    minThreshold: "0"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        category: item.category,
        unit: item.unit,
        minThreshold: item.minThreshold?.toString() || "0"
      });
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSave = async () => {
    if (!formData.name || !formData.unit) {
      toast("Please fill all required fields", "error");
      return;
    }

    setIsSubmitting(true);
    const res = await updateInventoryItem(item.id, {
      ...formData,
      minThreshold: parseFloat(formData.minThreshold) || 0
    });
    setIsSubmitting(false);

    if (res.success) {
      toast(res.message, "success");
      onClose();
    } else {
      toast(res.message, "error");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${item.name}?`)) return;
    setIsDeleting(true);
    const res = await deleteInventoryItem(item.id);
    setIsDeleting(false);

    if (res.success) {
      toast(res.message, "success");
      onClose();
    } else {
      toast(res.message, "error");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", backgroundColor: "rgba(0,0,0,0.4)" }}>
      <div style={{ marginLeft: "auto", width: "100%", maxWidth: "400px", backgroundColor: "var(--color-surface)", height: "100%", display: "flex", flexDirection: "column", boxShadow: "-4px 0 15px rgba(0,0,0,0.1)" }}>

        <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600, color: "var(--color-text-main)" }}>Edit Item</h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={handleDelete} disabled={isDeleting} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }} title="Delete Item">
              <Trash2 size={20} />
            </button>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-sub)" }}><X size={24} /></button>
          </div>
        </div>

        <div style={{ padding: "1.5rem", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "var(--color-text-sub)" }}>Item Name *</label>
            <input type="text" style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)" }} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "var(--color-text-sub)" }}>Category</label>
            <select style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)" }} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
              <option value="FEED">Feed</option>
              <option value="MEDICINE">Medicine</option>
              <option value="EQUIPMENT">Equipment</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
             <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "var(--color-text-sub)" }}>Unit of Measurement *</label>
             <input type="text" style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)" }} value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
          </div>

          <div>
             <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "var(--color-text-sub)" }}>Restock Alert Threshold</label>
             <input type="number" style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)" }} value={formData.minThreshold} onChange={e => setFormData({...formData, minThreshold: e.target.value})} />
          </div>
        </div>

        <div style={{ padding: "1.5rem", borderTop: "1px solid var(--color-border)" }}>
          <button
             onClick={handleSave}
             disabled={isSubmitting}
             style={{ width: "100%", padding: "0.875rem", backgroundColor: "var(--color-primary)", color: "white", borderRadius: "8px", border: "none", fontWeight: 600, display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}
          >
             <Save size={20} />
             {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
