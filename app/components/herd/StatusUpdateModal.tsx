"use client";
import React, { useState } from "react";
import { Save } from "lucide-react";
import { useToast } from "../ui/Toast";
import OutlierWarningModal from "../ui/OutlierWarningModal";
import ResponsiveSheet from "../ui/ResponsiveSheet";
import sheetStyles from "../ui/ResponsiveSheet.module.css";
import { ActionMutationResult, EditableAnimalData } from "./EditAnimalModal";

export interface StatusAdditionalPayload {
  date: string;
  overrideWarnings?: boolean;
  cause?: string;
  amount?: number;
  buyerName?: string;
  notes?: string;
}

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  animal: EditableAnimalData;
  onSave: (
    id: string,
    status: string,
    additionalData: StatusAdditionalPayload
  ) => Promise<ActionMutationResult>;
}

export default function StatusUpdateModal({
  isOpen,
  onClose,
  animal,
  onSave,
}: StatusUpdateModalProps) {
  const todayStr = new Date().toISOString().split("T")[0];
  const [status, setStatus] = useState("SOLD");
  const [date, setDate] = useState(todayStr);
  const [cause, setCause] = useState("");
  const [amount, setAmount] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outlierState, setOutlierState] = useState<{
    warnings: string[];
    canOverride: boolean;
  } | null>(null);
  const toast = useToast();

  const submitStatus = async (overrideWarnings = false) => {
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
    const payload: StatusAdditionalPayload = { date, overrideWarnings };
    if (status === "DECEASED") {
      payload.cause = cause.trim();
    } else if (status === "SOLD") {
      payload.amount = parseFloat(amount);
      payload.buyerName = buyerName.trim();
      payload.notes = notes.trim();
    }

    const res = await onSave(animal.id, status, payload);
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
      onClose();
    } else {
      toast(res.message, "error");
    }
  };

  return (
    <>
      <ResponsiveSheet
        isOpen={isOpen}
        onClose={onClose}
        size="sm"
        title="Update Animal Status"
        subtitle={`${animal.name} ${animal.tagNumber ? `(#${animal.tagNumber})` : ""}`}
        disableClose={isSubmitting}
        footer={
          <button
            type="button"
            onClick={() => submitStatus(false)}
            disabled={isSubmitting}
            className={sheetStyles.primaryBtn}
          >
            <Save size={18} />
            <span>{isSubmitting ? "Updating..." : "Confirm Status Update"}</span>
          </button>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
          {[
            { value: "SOLD", label: "Sold", color: "#d97706", bg: "rgba(245, 158, 11, 0.14)" },
            { value: "DECEASED", label: "Deceased", color: "#ef4444", bg: "rgba(239, 68, 68, 0.14)" },
          ].map((opt) => {
            const selected = status === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                style={{
                  minHeight: "46px",
                  borderRadius: "12px",
                  border: selected ? `2px solid ${opt.color}` : "1px solid var(--color-border)",
                  backgroundColor: selected ? opt.bg : "var(--color-bg)",
                  color: selected ? opt.color : "var(--color-text-sub)",
                  fontWeight: 700,
                  fontSize: "0.92rem",
                  cursor: "pointer",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className={sheetStyles.fieldGroup}>
          <label className={sheetStyles.label}>
            {status === "SOLD" ? "Date Sold *" : "Date of Passing *"}
          </label>
          <input
            type="date"
            max={todayStr}
            className={sheetStyles.input}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {status === "DECEASED" && (
          <div className={sheetStyles.fieldGroup}>
            <label className={sheetStyles.label}>Cause of Death *</label>
            <input
              type="text"
              placeholder="e.g. Bloat, East Coast Fever, Complications"
              className={sheetStyles.input}
              value={cause}
              onChange={(e) => setCause(e.target.value)}
            />
          </div>
        )}

        {status === "SOLD" && (
          <>
            <div className={sheetStyles.fieldGroup}>
              <label className={sheetStyles.label}>Sale Price (KES) *</label>
              <input
                type="number"
                inputMode="decimal"
                min="1"
                step="any"
                placeholder="e.g. 65000"
                className={`${sheetStyles.input} tabular-nums`}
                style={{ fontWeight: 700 }}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <span className={sheetStyles.hint}>
                Automatically records an Animal Sale entry in your Financial Ledger.
              </span>
            </div>

            <div className={sheetStyles.fieldGroup}>
              <label className={sheetStyles.label}>Buyer Name</label>
              <input
                type="text"
                placeholder="e.g. John Kiptoo / Trans-Nzoia Dairy"
                className={sheetStyles.input}
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
              />
            </div>

            <div className={sheetStyles.fieldGroup}>
              <label className={sheetStyles.label}>Notes / Remarks</label>
              <textarea
                rows={2}
                placeholder="e.g. Sold at Kitale livestock auction..."
                className={sheetStyles.textarea}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </>
        )}
      </ResponsiveSheet>

      <OutlierWarningModal
        isOpen={!!outlierState}
        warnings={outlierState?.warnings || []}
        canOverride={outlierState?.canOverride || false}
        isSubmitting={isSubmitting}
        onCancel={() => setOutlierState(null)}
        onOverride={() => submitStatus(true)}
      />
    </>
  );
}
