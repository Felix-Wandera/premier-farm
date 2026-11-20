"use client";
import React, { useState, useEffect } from "react";
import { X, Save, Trash2 } from "lucide-react";
import { useToast } from "../ui/Toast";
import styles from "../../(dashboard)/inventory/page.module.css";
import { updateInventoryItem, deleteInventoryItem } from "@/actions/inventory.actions";
import ConfirmationModal from "../ui/ConfirmationModal";

export default function EditItemModal({ isOpen, onClose, item }: { isOpen: boolean, onClose: () => void, item: any }) {
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        category: item.category,
        unit: item.unit,
        minThreshold: item.minThreshold?.toString() || "0",
        linkToFinance: Boolean(item.linkToFinance),
        unitCost: item.unitCost != null ? String(item.unitCost) : "",
        unitRevenue: item.unitRevenue != null ? String(item.unitRevenue) : "",
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
      minThreshold: parseFloat(formData.minThreshold) || 0,
      linkToFinance: formData.linkToFinance,
      unitCost: formData.unitCost ? parseFloat(formData.unitCost) : null,
      unitRevenue: formData.unitRevenue ? parseFloat(formData.unitRevenue) : null,
    });
    setIsSubmitting(false);

    if (res.success) {
      toast(res.message, "success");
      onClose();
    } else {
      toast(res.message, "error");
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    const res = await deleteInventoryItem(item.id);
    setIsDeleting(false);
    setShowDeleteConfirm(false);

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

          {/* Financial Linkage Card */}
          <div style={{ backgroundColor: "var(--color-bg)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: 600, color: "var(--color-text-main)" }}>
              <input
                type="checkbox"
                checked={formData.linkToFinance}
                onChange={e => setFormData({ ...formData, linkToFinance: e.target.checked })}
                style={{ width: "18px", height: "18px", accentColor: "var(--color-primary)" }}
              />
              <span>Link to Sales & Finances</span>
            </label>
            <small style={{ color: "var(--color-text-sub)", display: "block", marginTop: "4px", fontSize: "0.8rem" }}>
              Automatically log Expense or Sale when this item is restocked or dispatched.
            </small>

            {formData.linkToFinance && (
              <div style={{ marginTop: "0.85rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", fontWeight: 500, color: "var(--color-text-sub)" }}>
                    Restock Cost (KES per {formData.unit || "unit"})
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 2500"
                    style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "6px", border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-main)" }}
                    value={formData.unitCost}
                    onChange={e => setFormData({ ...formData, unitCost: e.target.value })}
                  />
                  <small style={{ color: "var(--color-text-sub)", fontSize: "0.75rem" }}>Logs Expense on Stock In (leave empty for none).</small>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", fontWeight: 500, color: "var(--color-text-sub)" }}>
                    Selling Price (KES per {formData.unit || "unit"})
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 3000"
                    style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "6px", border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-main)" }}
                    value={formData.unitRevenue}
                    onChange={e => setFormData({ ...formData, unitRevenue: e.target.value })}
                  />
                  <small style={{ color: "var(--color-text-sub)", fontSize: "0.75rem" }}>Logs Sale on Stock Out (leave empty if internal farm use only).</small>
                </div>
              </div>
            )}
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

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Inventory Item"
        message={
          <span>
            Are you sure you want to delete <strong>{item?.name}</strong>? Its past transaction history will be preserved, but it will be removed from active inventory.
          </span>
        }
        confirmText="Delete Item"
        isLoading={isDeleting}
      />
    </div>
  );
}
