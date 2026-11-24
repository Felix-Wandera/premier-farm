"use client";
import React, { useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { useToast } from "../ui/Toast";
import { updateInventoryItem, deleteInventoryItem } from "@/actions/inventory.actions";
import ConfirmationModal from "../ui/ConfirmationModal";
import { useAuth } from "../auth/AuthProvider";
import ResponsiveSheet from "../ui/ResponsiveSheet";
import sheetStyles from "../ui/ResponsiveSheet.module.css";

export interface InventoryItemSummary {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  minThreshold?: number | null;
  linkToFinance?: boolean;
  unitCost?: number | null;
  unitRevenue?: number | null;
}

function EditItemForm({
  item,
  onClose,
}: {
  item: InventoryItemSummary;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState(() => ({
    name: item.name,
    category: item.category,
    unit: item.unit,
    minThreshold: item.minThreshold?.toString() || "0",
    linkToFinance: Boolean(item.linkToFinance),
    unitCost: item.unitCost != null ? String(item.unitCost) : "",
    unitRevenue: item.unitRevenue != null ? String(item.unitRevenue) : "",
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const toast = useToast();
  const { hasPermission } = useAuth();
  const canViewFinances = hasPermission("finances:view");

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
    <>
      <ResponsiveSheet
        isOpen={true}
        onClose={onClose}
        variant="drawer"
        title="Edit Inventory Item"
        subtitle={item.name}
        disableClose={isSubmitting || isDeleting}
        headerRight={
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            className={sheetStyles.dangerIconBtn}
            title="Delete Item"
            aria-label="Delete Item"
          >
            <Trash2 size={17} />
          </button>
        }
        footer={
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className={sheetStyles.primaryBtn}
          >
            <Save size={18} />
            <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
          </button>
        }
      >
        <div className={sheetStyles.fieldGroup}>
          <label className={sheetStyles.label}>Item Name *</label>
          <input
            type="text"
            className={sheetStyles.input}
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
              Automatically log Expense or Sale when this item is restocked or dispatched.
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
                </div>
              </div>
            )}
          </div>
        )}
      </ResponsiveSheet>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Inventory Item"
        message={
          <span>
            Are you sure you want to delete <strong>{item.name}</strong>? Its past transaction
            history will be preserved, but it will be removed from active inventory.
          </span>
        }
        confirmText="Delete Item"
        isLoading={isDeleting}
      />
    </>
  );
}

export default function EditItemModal({
  isOpen,
  onClose,
  item,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItemSummary | null;
}) {
  if (!isOpen || !item) return null;
  return <EditItemForm key={item.id} item={item} onClose={onClose} />;
}
