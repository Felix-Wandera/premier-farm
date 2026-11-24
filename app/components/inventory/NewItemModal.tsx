"use client";
import React, { useState } from "react";
import { Save } from "lucide-react";
import { addInventoryItem } from "@/actions/inventory.actions";
import { useToast } from "../ui/Toast";
import { useAuth } from "../auth/AuthProvider";
import ResponsiveSheet from "../ui/ResponsiveSheet";
import sheetStyles from "../ui/ResponsiveSheet.module.css";

export default function NewItemModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
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
  const { hasPermission } = useAuth();
  const canViewFinances = hasPermission("finances:view");

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
      setFormData({
        name: "",
        category: "FEED",
        unit: "",
        minThreshold: "0",
        linkToFinance: false,
        unitCost: "",
        unitRevenue: "",
      });
      onClose();
    } else {
      toast(res.message, "error");
    }
  };

  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onClose={onClose}
      variant="drawer"
      title="New Inventory Item"
      subtitle="Add a feed, veterinary medicine, or equipment supply"
      disableClose={isSubmitting}
      footer={
        <button
          type="button"
          onClick={handleSave}
          disabled={isSubmitting}
          className={sheetStyles.primaryBtn}
        >
          <Save size={18} />
          <span>{isSubmitting ? "Saving..." : "Save Item"}</span>
        </button>
      }
    >
      <div className={sheetStyles.fieldGroup}>
        <label className={sheetStyles.label}>Item Name *</label>
        <input
          type="text"
          className={sheetStyles.input}
          placeholder="e.g. Dairy Meal"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div className={sheetStyles.fieldRow}>
        <div className={sheetStyles.fieldGroup}>
          <label className={sheetStyles.label}>Category</label>
          <select
            className={sheetStyles.select}
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            <option value="FEED">Feed</option>
            <option value="MEDICINE">Medicine</option>
            <option value="EQUIPMENT">Equipment</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div className={sheetStyles.fieldGroup}>
          <label className={sheetStyles.label}>Unit *</label>
          <input
            type="text"
            className={sheetStyles.input}
            placeholder="bags, kgs, liters"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
          />
        </div>
      </div>

      <div className={sheetStyles.fieldGroup}>
        <label className={sheetStyles.label}>Restock Alert Threshold</label>
        <input
          type="number"
          inputMode="decimal"
          className={sheetStyles.input}
          value={formData.minThreshold}
          onChange={(e) => setFormData({ ...formData, minThreshold: e.target.value })}
        />
        <span className={sheetStyles.hint}>
          Ranch alerts trigger when stock drops below this quantity.
        </span>
      </div>

      {canViewFinances && (
        <div className={sheetStyles.cardBox}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.92rem",
              color: "var(--color-text-main)",
            }}
          >
            <input
              type="checkbox"
              checked={formData.linkToFinance}
              onChange={(e) => setFormData({ ...formData, linkToFinance: e.target.checked })}
              style={{ width: "18px", height: "18px", accentColor: "var(--color-primary)" }}
            />
            <span>Link to Sales &amp; Finances</span>
          </label>
          <span className={sheetStyles.hint} style={{ display: "block", marginTop: "4px" }}>
            Automatically log an Expense or Sale when this item is restocked or dispatched.
          </span>

          {formData.linkToFinance && (
            <div style={{ marginTop: "0.9rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div className={sheetStyles.fieldGroup}>
                <label className={sheetStyles.label}>
                  Restock Cost (KES per {formData.unit || "unit"})
                </label>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder="e.g. 2500"
                  className={sheetStyles.input}
                  value={formData.unitCost}
                  onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                />
                <span className={sheetStyles.hint}>Logs Expense on Stock In (leave empty for none).</span>
              </div>

              <div className={sheetStyles.fieldGroup}>
                <label className={sheetStyles.label}>
                  Selling Price (KES per {formData.unit || "unit"})
                </label>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder="e.g. 3000"
                  className={sheetStyles.input}
                  value={formData.unitRevenue}
                  onChange={(e) => setFormData({ ...formData, unitRevenue: e.target.value })}
                />
                <span className={sheetStyles.hint}>
                  Logs Sale on Stock Out (leave empty if internal ranch use only).
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </ResponsiveSheet>
  );
}
