"use client";
import React, { useState } from "react";
import { Save } from "lucide-react";
import { recordTransaction } from "@/actions/financial.actions";
import { useToast } from "../ui/Toast";
import OutlierWarningModal from "../ui/OutlierWarningModal";
import ResponsiveSheet from "../ui/ResponsiveSheet";
import sheetStyles from "../ui/ResponsiveSheet.module.css";

const INCOME_REASONS = [
  "Cooperative Milk Delivery",
  "Farm Gate / Local Retail Milk",
  "Animal Sale (Bull / Cow / Calf)",
  "Manure / Organic Fertilizer",
  "Surplus Hay / Silage",
  "Machinery / Equipment Hire",
  "Other",
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
  "Other",
];

export default function NewTransactionModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const todayStr = new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState({
    type: "income",
    category: "MILK",
    amount: "",
    date: todayStr,
    reason: INCOME_REASONS[0],
    customReason: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outlierState, setOutlierState] = useState<{
    warnings: string[];
    canOverride: boolean;
  } | null>(null);
  const toast = useToast();

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

    const finalReason =
      formData.reason === "Other"
        ? formData.customReason.trim() || "Other"
        : formData.reason;

    setIsSubmitting(true);
    const res = await recordTransaction({
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
        description: "",
      });
      onClose();
    } else {
      toast(res.message, "error");
    }
  };

  const yesterdayDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  })();

  return (
    <>
      <ResponsiveSheet
        isOpen={isOpen}
        onClose={onClose}
        variant="drawer"
        title="New Transaction"
        subtitle="Record ranch income or operating expense"
        disableClose={isSubmitting}
        footer={
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSubmitting}
            className={sheetStyles.primaryBtn}
          >
            <Save size={18} />
            <span>{isSubmitting ? "Saving..." : "Record Transaction"}</span>
          </button>
        }
      >
        {/* Segmented Type Selector */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
          <button
            type="button"
            onClick={() => handleTypeChange("income")}
            style={{
              minHeight: "46px",
              padding: "0.65rem",
              borderRadius: "12px",
              border:
                formData.type === "income"
                  ? "2px solid #10b981"
                  : "1px solid var(--color-border)",
              backgroundColor:
                formData.type === "income"
                  ? "rgba(16, 185, 129, 0.14)"
                  : "var(--color-bg)",
              fontWeight: 700,
              fontSize: "0.92rem",
              color: formData.type === "income" ? "#10b981" : "var(--color-text-sub)",
              cursor: "pointer",
            }}
          >
            + Income
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("expense")}
            style={{
              minHeight: "46px",
              padding: "0.65rem",
              borderRadius: "12px",
              border:
                formData.type === "expense"
                  ? "2px solid #ef4444"
                  : "1px solid var(--color-border)",
              backgroundColor:
                formData.type === "expense"
                  ? "rgba(239, 68, 68, 0.14)"
                  : "var(--color-bg)",
              fontWeight: 700,
              fontSize: "0.92rem",
              color: formData.type === "expense" ? "#ef4444" : "var(--color-text-sub)",
              cursor: "pointer",
            }}
          >
            − Expense
          </button>
        </div>

        {/* Amount First for Fast Mobile Entry */}
        <div className={sheetStyles.fieldGroup}>
          <label className={sheetStyles.label}>Amount (KES) *</label>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            className={`${sheetStyles.input} tabular-nums`}
            style={{ fontWeight: 700, fontSize: "1.1rem" }}
            placeholder="0"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          />
        </div>

        {/* Date Selector */}
        <div className={sheetStyles.fieldGroup}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label className={sheetStyles.label}>Transaction Date *</label>
            <div style={{ display: "flex", gap: "6px" }}>
              {[
                { label: "Today", value: todayStr },
                { label: "Yesterday", value: yesterdayDate },
              ].map((preset) => {
                const active = formData.date === preset.value;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setFormData({ ...formData, date: preset.value })}
                    style={{
                      padding: "3px 10px",
                      borderRadius: "99px",
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      border: active
                        ? "1px solid var(--color-primary)"
                        : "1px solid var(--color-border)",
                      backgroundColor: active ? "var(--color-primary)" : "var(--color-bg)",
                      color: active ? "#ffffff" : "var(--color-text-sub)",
                      cursor: "pointer",
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
          <input
            type="date"
            max={todayStr}
            className={sheetStyles.input}
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />
        </div>

        <div className={sheetStyles.fieldGroup}>
          <label className={sheetStyles.label}>Category *</label>
          <select
            className={sheetStyles.select}
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
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

        <div className={sheetStyles.fieldGroup}>
          <label className={sheetStyles.label}>Reason / Specifics</label>
          <select
            className={sheetStyles.select}
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          >
            {currentReasons.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {formData.reason === "Other" && (
            <input
              type="text"
              placeholder="Write custom reason..."
              className={sheetStyles.input}
              style={{ marginTop: "0.4rem" }}
              value={formData.customReason}
              onChange={(e) => setFormData({ ...formData, customReason: e.target.value })}
              autoFocus
            />
          )}
        </div>

        <div className={sheetStyles.fieldGroup}>
          <label className={sheetStyles.label}>Additional Notes (Optional)</label>
          <textarea
            rows={2}
            className={sheetStyles.textarea}
            placeholder="Invoice reference, buyer name, or details..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
      </ResponsiveSheet>

      <OutlierWarningModal
        isOpen={!!outlierState}
        warnings={outlierState?.warnings || []}
        canOverride={outlierState?.canOverride || false}
        isSubmitting={isSubmitting}
        onCancel={() => setOutlierState(null)}
        onOverride={() => handleSave(true)}
      />
    </>
  );
}
