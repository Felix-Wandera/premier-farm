"use client";

import React, { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { useToast } from "../ui/Toast";
import OutlierWarningModal from "../ui/OutlierWarningModal";
import { getEligibleDamAnimals } from "@/actions/animal.actions";
import { getSpeciesFamily } from "@/lib/validations";
import ResponsiveSheet from "../ui/ResponsiveSheet";
import sheetStyles from "../ui/ResponsiveSheet.module.css";

export interface EditableAnimalData {
  id: string;
  name: string;
  tagNumber?: string | null;
  species: string;
  breed?: string | null;
  gender: string;
  dateOfBirth?: Date | string | null;
  status: string;
  motherId?: string | null;
  mother?: { id: string; name: string; tagNumber?: string | null; isDeleted?: boolean } | null;
  fatherName?: string | null;
}

export interface EditAnimalPayload {
  tagNumber: string;
  name: string;
  species: string;
  breed: string;
  gender: string;
  dateOfBirth: string;
  status: string;
  motherId: string;
  sireName: string;
  overrideWarnings?: boolean;
}

export interface ActionMutationResult {
  success: boolean;
  message: string;
  code?: string;
  warnings?: string[];
  canOverride?: boolean;
}

interface DamOption {
  id: string;
  name: string;
  tagNumber: string | null;
  species: string;
}

interface EditAnimalModalProps {
  isOpen: boolean;
  onClose: () => void;
  animal: EditableAnimalData;
  onSave: (data: EditAnimalPayload) => Promise<ActionMutationResult>;
}

function EditAnimalForm({
  onClose,
  animal,
  onSave,
}: {
  onClose: () => void;
  animal: EditableAnimalData;
  onSave: (data: EditAnimalPayload) => Promise<ActionMutationResult>;
}) {
  const todayStr = new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState(() => ({
    tagNumber: animal.tagNumber || "",
    name: animal.name || "",
    species: animal.species || "DAIRY_COW",
    breed: animal.breed || "",
    gender: animal.gender || "FEMALE",
    dateOfBirth: animal.dateOfBirth
      ? new Date(animal.dateOfBirth).toISOString().split("T")[0]
      : "",
    status: animal.status || "ACTIVE",
    motherId: animal.mother?.isDeleted ? "" : animal.motherId || animal.mother?.id || "",
    sireName: animal.fatherName || "",
  }));

  const [eligibleDams, setEligibleDams] = useState<DamOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outlierState, setOutlierState] = useState<{
    warnings: string[];
    canOverride: boolean;
  } | null>(null);
  const toast = useToast();

  useEffect(() => {
    let active = true;
    getEligibleDamAnimals(animal.id)
      .then((dams) => {
        if (active) setEligibleDams(dams || []);
      })
      .catch(() => {
        if (active) setEligibleDams([]);
      });
    return () => {
      active = false;
    };
  }, [animal.id]);

  const handleSpeciesChange = (newSpecies: string) => {
    let nextGender = formData.gender;
    if (newSpecies === "BULL") nextGender = "MALE";
    if (newSpecies === "DAIRY_COW" || newSpecies === "HEIFER") nextGender = "FEMALE";

    const prevFamily = getSpeciesFamily(formData.species);
    const nextFamily = getSpeciesFamily(newSpecies);
    const nextMotherId = prevFamily === nextFamily ? formData.motherId : "";

    setFormData({
      ...formData,
      species: newSpecies,
      gender: nextGender,
      motherId: nextMotherId,
    });
  };

  const isGenderLocked =
    formData.species === "BULL" ||
    formData.species === "DAIRY_COW" ||
    formData.species === "HEIFER";

  const familyCompatibleDams = eligibleDams.filter(
    (d) => getSpeciesFamily(d.species) === getSpeciesFamily(formData.species)
  );

  const submitForm = async (overrideWarnings = false) => {
    if (!formData.name.trim()) {
      toast("Animal name is required.", "error");
      return;
    }

    setIsSubmitting(true);
    const res = await onSave({ ...formData, overrideWarnings });
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
        isOpen={true}
        onClose={onClose}
        size="md"
        title="Edit Animal Profile"
        subtitle={animal.name}
        disableClose={isSubmitting}
        footer={
          <button
            type="button"
            onClick={() => submitForm(false)}
            disabled={isSubmitting}
            className={sheetStyles.primaryBtn}
          >
            <Save size={18} />
            <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
          </button>
        }
      >
        <div className={`${sheetStyles.fieldRow} ${sheetStyles.fieldRowStackMobile}`}>
          <div className={sheetStyles.fieldGroup}>
            <label className={sheetStyles.label}>Animal Name *</label>
            <input
              type="text"
              className={sheetStyles.input}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Maridadi"
            />
          </div>

          <div className={sheetStyles.fieldGroup}>
            <label className={sheetStyles.label}>Tag Number (Optional)</label>
            <input
              type="text"
              className={sheetStyles.input}
              value={formData.tagNumber}
              onChange={(e) => setFormData({ ...formData, tagNumber: e.target.value })}
              placeholder="e.g. DC-024"
            />
          </div>
        </div>

        <div className={sheetStyles.fieldRow}>
          <div className={sheetStyles.fieldGroup}>
            <label className={sheetStyles.label}>Species *</label>
            <select
              className={sheetStyles.select}
              value={formData.species}
              onChange={(e) => handleSpeciesChange(e.target.value)}
            >
              <option value="DAIRY_COW">Dairy Cow</option>
              <option value="INDIGENOUS_COW">Indigenous</option>
              <option value="BULL">Bull</option>
              <option value="HEIFER">Heifer</option>
              <option value="SHEEP">Sheep</option>
              <option value="GOAT">Goat</option>
            </select>
          </div>

          <div className={sheetStyles.fieldGroup}>
            <label className={sheetStyles.label}>
              Gender {isGenderLocked ? "(Auto)" : "*"}
            </label>
            <select
              className={sheetStyles.select}
              style={{ opacity: isGenderLocked ? 0.7 : 1 }}
              value={formData.gender}
              disabled={isGenderLocked}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            >
              <option value="FEMALE">Female</option>
              <option value="MALE">Male</option>
            </select>
          </div>
        </div>

        <div className={`${sheetStyles.fieldRow} ${sheetStyles.fieldRowStackMobile}`}>
          <div className={sheetStyles.fieldGroup}>
            <label className={sheetStyles.label}>Breed (Optional)</label>
            <input
              type="text"
              className={sheetStyles.input}
              value={formData.breed}
              onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
              placeholder="e.g. Friesian, Ayrshire"
            />
          </div>

          <div className={sheetStyles.fieldGroup}>
            <label className={sheetStyles.label}>Date of Birth</label>
            <input
              type="date"
              max={todayStr}
              className={sheetStyles.input}
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            />
          </div>
        </div>

        <div className={sheetStyles.fieldGroup}>
          <label className={sheetStyles.label}>Health / Operational Status</label>
          <select
            className={sheetStyles.select}
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="ACTIVE">Active (Healthy)</option>
            <option value="SICK">Sick / Under Monitoring</option>
            {(animal.status === "SOLD" || animal.status === "DECEASED") && (
              <option value={animal.status}>
                Keep as {animal.status} (selecting Active restores animal)
              </option>
            )}
          </select>
          {(animal.status === "SOLD" || animal.status === "DECEASED") &&
            (formData.status === "ACTIVE" || formData.status === "SICK") && (
              <span className={sheetStyles.hint} style={{ color: "#d97706" }}>
                Restoring to {formData.status} will reverse its {animal.status.toLowerCase()} state
                {animal.status === "SOLD" ? " and void the linked animal sale entry." : "."}
              </span>
            )}
        </div>

        <div className={`${sheetStyles.fieldRow} ${sheetStyles.fieldRowStackMobile}`}>
          <div className={sheetStyles.fieldGroup}>
            <label className={sheetStyles.label}>Dam (Mother)</label>
            <select
              className={sheetStyles.select}
              value={formData.motherId}
              onChange={(e) => setFormData({ ...formData, motherId: e.target.value })}
            >
              <option value="">-- Unknown / External Dam --</option>
              {familyCompatibleDams.map((dam) => (
                <option key={dam.id} value={dam.id}>
                  {dam.name}
                  {dam.tagNumber ? ` (#${dam.tagNumber})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className={sheetStyles.fieldGroup}>
            <label className={sheetStyles.label}>Sire (Father / AI Bull)</label>
            <input
              type="text"
              className={sheetStyles.input}
              value={formData.sireName}
              onChange={(e) => setFormData({ ...formData, sireName: e.target.value })}
              placeholder="e.g. Titan AI-042"
            />
          </div>
        </div>
      </ResponsiveSheet>

      <OutlierWarningModal
        isOpen={!!outlierState}
        warnings={outlierState?.warnings || []}
        canOverride={outlierState?.canOverride || false}
        isSubmitting={isSubmitting}
        onCancel={() => setOutlierState(null)}
        onOverride={() => submitForm(true)}
      />
    </>
  );
}

export default function EditAnimalModal({
  isOpen,
  onClose,
  animal,
  onSave,
}: EditAnimalModalProps) {
  if (!isOpen) return null;
  return <EditAnimalForm key={animal.id} onClose={onClose} animal={animal} onSave={onSave} />;
}
