"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Save, Sparkles } from "lucide-react";
import { createBreedingEvent } from "@/actions/event.actions";
import { useToast } from "../ui/Toast";
import OutlierWarningModal from "../ui/OutlierWarningModal";
import bsStyles from "../ui/BottomSheetModal.module.css";

interface Animal {
  id: string;
  tagNumber: string | null;
  name: string | null;
  species: string;
  breed: string | null;
}

const GESTATION_DAYS: Record<string, number> = {
  DAIRY_COW: 283,
  INDIGENOUS_COW: 283,
  HEIFER: 283,
  GOAT: 150,
  SHEEP: 150,
};

type BreedingEventTypeOption = "INSEMINATION" | "NATURAL_MATING" | "PREGNANCY_CHECK" | "BIRTH";

function computeAutoExpectedDate(
  animals: Animal[],
  animalId: string,
  eventType: BreedingEventTypeOption,
  dateStr: string
): string {
  if (!dateStr || !animalId) return "";
  const selectedAnimal = animals.find((a) => a.id === animalId);
  if (!selectedAnimal) return "";

  const eventDate = new Date(dateStr);
  if (isNaN(eventDate.getTime())) return "";

  if (eventType === "INSEMINATION" || eventType === "NATURAL_MATING") {
    const days = GESTATION_DAYS[selectedAnimal.species] || 283;
    const expected = new Date(eventDate.getTime() + days * 24 * 60 * 60 * 1000);
    return expected.toISOString().split("T")[0];
  }
  if (eventType === "PREGNANCY_CHECK") {
    const checkReminder = new Date(eventDate.getTime() + 60 * 24 * 60 * 60 * 1000);
    return checkReminder.toISOString().split("T")[0];
  }
  return "";
}

export default function NewBreedingEventModal({
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
    eventType: "INSEMINATION" as BreedingEventTypeOption,
    date: todayStr,
    sireDetails: "",
    expectedDate: "",
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outlierState, setOutlierState] = useState<{ warnings: string[]; canOverride: boolean } | null>(null);

  if (!isOpen) return null;

  const submitEvent = async (overrideWarnings = false) => {
    if (!formData.animalId) {
      toast("Please select a female animal.", "error");
      return;
    }
    if (!formData.date) {
      toast("Please select the event date.", "error");
      return;
    }

    setIsSubmitting(true);
    const res = await createBreedingEvent({ ...formData, overrideWarnings });
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
        eventType: "INSEMINATION",
        date: todayStr,
        sireDetails: "",
        expectedDate: "",
        notes: "",
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
    await submitEvent(false);
  };

  return (
    <div className={bsStyles.backdrop} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={bsStyles.sheet}>
        <div className={bsStyles.dragHandle} />

        {/* Header */}
        <div className={bsStyles.header}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>Record Breeding Event</h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", opacity: 0.7 }}>
              Track inseminations, pregnancy checks & calvings
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
              Female Animal *
            </label>
            <select
              required
              value={formData.animalId}
              onChange={(e) => {
                const nextAnimalId = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  animalId: nextAnimalId,
                  expectedDate: computeAutoExpectedDate(
                    animals,
                    nextAnimalId,
                    prev.eventType,
                    prev.date
                  ),
                }));
              }}
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
                </option>
              ))}
            </select>
          </div>

          {/* Event Type Selector */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 600 }}>
              Event Type *
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              {(
                [
                  { value: "INSEMINATION", label: "Insemination (A.I.)" },
                  { value: "NATURAL_MATING", label: "Natural Mating" },
                  { value: "PREGNANCY_CHECK", label: "Pregnancy Check" },
                  { value: "BIRTH", label: "Calving / Birth" },
                ] as const
              ).map((opt) => {
                const isSelected = formData.eventType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        eventType: opt.value,
                        expectedDate: computeAutoExpectedDate(
                          animals,
                          prev.animalId,
                          opt.value,
                          prev.date
                        ),
                      }))
                    }
                    style={{
                      padding: "0.65rem 0.5rem",
                      borderRadius: "8px",
                      border: isSelected
                        ? "2px solid var(--color-primary, #16a34a)"
                        : "1px solid var(--color-border, #cbd5e1)",
                      backgroundColor: isSelected ? "rgba(22, 163, 74, 0.1)" : "transparent",
                      color: isSelected ? "var(--color-primary, #16a34a)" : "inherit",
                      fontSize: "0.85rem",
                      fontWeight: isSelected ? 700 : 500,
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Event Date */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 600 }}>
              Date of Event *
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => {
                const nextDate = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  date: nextDate,
                  expectedDate: computeAutoExpectedDate(
                    animals,
                    prev.animalId,
                    prev.eventType,
                    nextDate
                  ),
                }));
              }}
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

          {/* Sire Details */}
          {(formData.eventType === "INSEMINATION" || formData.eventType === "NATURAL_MATING") && (
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 600 }}>
                Sire Details (Bull Name or A.I. Straw Code)
              </label>
              <input
                type="text"
                placeholder="e.g. World Wide Sires Bull 014HO07223"
                value={formData.sireDetails}
                onChange={(e) => setFormData({ ...formData, sireDetails: e.target.value })}
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
          )}

          {/* Expected Due Date Preview */}
          {(formData.eventType === "INSEMINATION" ||
            formData.eventType === "NATURAL_MATING" ||
            formData.eventType === "PREGNANCY_CHECK") && (
            <div
              style={{
                padding: "1rem",
                borderRadius: "8px",
                backgroundColor: "rgba(59, 130, 246, 0.08)",
                border: "1px solid rgba(59, 130, 246, 0.2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#2563eb",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  marginBottom: "6px",
                }}
              >
                <Sparkles size={16} />
                <span>
                  {formData.eventType === "PREGNANCY_CHECK"
                    ? "Recommended Follow-up Date"
                    : "Auto-Calculated Expected Due Date"}
                </span>
              </div>
              <input
                type="date"
                value={formData.expectedDate}
                onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                style={{
                  width: "100%",
                  padding: "0.6rem",
                  borderRadius: "6px",
                  border: "1px solid var(--color-border, #cbd5e1)",
                  backgroundColor: "var(--color-surface, #ffffff)",
                  color: "inherit",
                  fontSize: "0.9rem",
                }}
              />
              <p style={{ margin: "6px 0 0", fontSize: "0.75rem", opacity: 0.7 }}>
                Cattle gestation ~283 days; Goats/Sheep ~150 days. You can adjust this date if needed.
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 600 }}>
              Notes / Observations
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Standing heat observed at 6:00 AM, in-calf confirmed on left horn"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "8px",
                border: "1px solid var(--color-border, #cbd5e1)",
                backgroundColor: "var(--color-bg, #ffffff)",
                color: "inherit",
                fontSize: "0.95rem",
                resize: "vertical",
              }}
            />
          </div>

          {/* Submit Button */}
          <div className={bsStyles.stickyFooter}>
            <button
              type="submit"
              disabled={isSubmitting}
              className={bsStyles.primarySubmitBtn}
            >
              <Save size={18} />
              <span>{isSubmitting ? "Saving..." : "Save Breeding Event"}</span>
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
        onOverride={() => submitEvent(true)}
      />
    </div>
  );
}
