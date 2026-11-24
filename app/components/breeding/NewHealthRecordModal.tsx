"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Save, ShieldPlus, Stethoscope, Syringe, DollarSign } from "lucide-react";
import { createHealthRecord } from "@/actions/event.actions";
import { useToast } from "../ui/Toast";
import OutlierWarningModal from "../ui/OutlierWarningModal";
import bsStyles from "../ui/BottomSheetModal.module.css";

interface Animal {
  id: string;
  tagNumber: string | null;
  name: string | null;
  species: string;
  breed: string | null;
  gender?: string;
}

export default function NewHealthRecordModal({
  isOpen,
  onClose,
  animals,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  animals: Animal[];
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const todayStr = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState({
    animalId: "",
    recordType: "VACCINATION" as "VACCINATION" | "TREATMENT" | "CHECKUP",
    description: "",
    cost: "",
    date: todayStr,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outlierState, setOutlierState] = useState<{ warnings: string[]; canOverride: boolean } | null>(null);

  if (!isOpen) return null;

  const submitHealthRecord = async (overrideWarnings = false) => {
    if (!formData.animalId) {
      toast("Please select an animal.", "error");
      return;
    }
    if (!formData.description.trim()) {
      toast("Please provide a description of the treatment or vaccination.", "error");
      return;
    }
    if (!formData.date) {
      toast("Please select the date.", "error");
      return;
    }

    setIsSubmitting(true);
    const parsedCost = formData.cost ? parseFloat(formData.cost) : undefined;
    const res = await createHealthRecord({
      animalId: formData.animalId,
      recordType: formData.recordType,
      description: formData.description,
      cost: parsedCost,
      date: formData.date,
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
        animalId: "",
        recordType: "VACCINATION",
        description: "",
        cost: "",
        date: todayStr,
      });
      router.refresh();
      onSuccess?.();
      onClose();
    } else {
      toast(res.message, "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitHealthRecord(false);
  };

  const recordTypeIcons = {
    VACCINATION: <Syringe size={18} />,
    TREATMENT: <ShieldPlus size={18} />,
    CHECKUP: <Stethoscope size={18} />,
  };

  return (
    <div className={bsStyles.backdrop} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={bsStyles.sheet}>
        <div className={bsStyles.dragHandle} />

        {/* Header */}
        <div className={bsStyles.header}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>Log Health Record</h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", opacity: 0.7 }}>
              Record treatments, vaccinations & vet visits
            </p>
          </div>
          <button
            onClick={onClose}
            className={bsStyles.closeBtn}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: "1.5rem",
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          {/* Animal Selector */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 600 }}>
              Animal *
            </label>
            <select
              required
              value={formData.animalId}
              onChange={(e) => setFormData({ ...formData, animalId: e.target.value })}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "8px",
                border: "1px solid var(--color-border, #cbd5e1)",
                backgroundColor: "var(--color-bg, #ffffff)",
                color: "inherit",
                fontSize: "0.95rem",
              }}
            >
              <option value="">-- Select Animal --</option>
              {animals.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name || a.tagNumber} {a.tagNumber && a.name ? `(#${a.tagNumber})` : ""} — {a.species.replace("_", " ")}
                  {a.gender ? ` (${a.gender.toLowerCase()})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Record Type Selector */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 600 }}>
              Record Type *
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
              {(
                [
                  { value: "VACCINATION", label: "Vaccination" },
                  { value: "TREATMENT", label: "Treatment" },
                  { value: "CHECKUP", label: "Checkup" },
                ] as const
              ).map((opt) => {
                const isSelected = formData.recordType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, recordType: opt.value })}
                    style={{
                      padding: "0.65rem 0.25rem",
                      borderRadius: "8px",
                      border: isSelected
                        ? "2px solid var(--color-primary, #16a34a)"
                        : "1px solid var(--color-border, #cbd5e1)",
                      backgroundColor: isSelected ? "rgba(22, 163, 74, 0.1)" : "transparent",
                      color: isSelected ? "var(--color-primary, #16a34a)" : "inherit",
                      fontSize: "0.85rem",
                      fontWeight: isSelected ? 700 : 500,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {recordTypeIcons[opt.value]}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 600 }}>
              Treatment / Procedure Details *
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Foot and Mouth Disease Booster, Mastitis intramammary infusion..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "8px",
                border: "1px solid var(--color-border, #cbd5e1)",
                backgroundColor: "var(--color-bg, #ffffff)",
                color: "inherit",
                fontSize: "0.95rem",
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
          </div>

          {/* Treatment Date */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 600 }}>
              Date Administered *
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: "1px solid var(--color-border, #cbd5e1)",
                  backgroundColor: "var(--color-bg, #ffffff)",
                  color: "inherit",
                  fontSize: "0.95rem",
                }}
              />
            </div>
          </div>

          {/* Medication / Vet Cost */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 600 }}>
              Associated Cost (KES) <span style={{ opacity: 0.6, fontWeight: 400 }}>(Optional)</span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                style={{
                  width: "100%",
                  padding: "0.75rem 0.75rem 0.75rem 2.25rem",
                  borderRadius: "8px",
                  border: "1px solid var(--color-border, #cbd5e1)",
                  backgroundColor: "var(--color-bg, #ffffff)",
                  color: "inherit",
                  fontSize: "0.95rem",
                }}
              />
              <DollarSign
                size={16}
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  opacity: 0.5,
                }}
              />
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "0.75rem", opacity: 0.6 }}>
              Costs entered here will automatically log a &quot;VET_SERVICES&quot; expense in Financials.
            </p>
          </div>

          {/* Submit Button */}
          <div className={bsStyles.stickyFooter}>
            <button
              type="submit"
              disabled={isSubmitting}
              className={bsStyles.primarySubmitBtn}
            >
              <Save size={18} />
              <span>{isSubmitting ? "Recording..." : "Save Health Record"}</span>
            </button>
          </div>
        </form>
      </div>

      <OutlierWarningModal
        isOpen={!!outlierState}
        warnings={outlierState?.warnings || []}
        canOverride={outlierState?.canOverride || false}
        isSubmitting={isSubmitting}
        onCancel={() => setOutlierState(null)}
        onOverride={() => submitHealthRecord(true)}
      />
    </div>
  );
}
