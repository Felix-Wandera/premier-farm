"use client";

import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { useToast } from "../ui/Toast";
import OutlierWarningModal from "../ui/OutlierWarningModal";
import { getEligibleDamAnimals } from "@/actions/animal.actions";
import { getSpeciesFamily } from "@/lib/validations";

interface EditAnimalModalProps {
  isOpen: boolean;
  onClose: () => void;
  animal: any;
  onSave: (data: any) => Promise<any>;
}

export default function EditAnimalModal({
  isOpen,
  onClose,
  animal,
  onSave,
}: EditAnimalModalProps) {
  const todayStr = new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState({
    tagNumber: animal.tagNumber || "",
    name: animal.name || "",
    species: animal.species || "DAIRY_COW",
    breed: animal.breed || "",
    gender: animal.gender || "FEMALE",
    dateOfBirth: animal.dateOfBirth
      ? new Date(animal.dateOfBirth).toISOString().split("T")[0]
      : "",
    status:
      animal.status === "SICK" || animal.status === "ACTIVE"
        ? animal.status
        : animal.status,
    motherId: animal.mother?.isDeleted ? "" : animal.motherId || animal.mother?.id || "",
    sireName: animal.fatherName || "",
  });

  const [eligibleDams, setEligibleDams] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outlierState, setOutlierState] = useState<{
    warnings: string[];
    canOverride: boolean;
  } | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (isOpen && animal) {
      setFormData({
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
      });

      getEligibleDamAnimals(animal.id)
        .then((dams) => setEligibleDams(dams || []))
        .catch(() => setEligibleDams([]));
    }
  }, [isOpen, animal]);

  if (!isOpen) return null;

  const handleSpeciesChange = (newSpecies: string) => {
    let nextGender = formData.gender;
    if (newSpecies === "BULL") nextGender = "MALE";
    if (newSpecies === "DAIRY_COW" || newSpecies === "HEIFER") nextGender = "FEMALE";

    // Clear motherId if changing across species families
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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.7rem 0.75rem",
    borderRadius: "8px",
    border: "1px solid var(--color-border)",
    background: "var(--color-bg)",
    color: "var(--color-text-main)",
    fontSize: "0.92rem",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "0.35rem",
    fontWeight: 600,
    fontSize: "0.84rem",
    color: "var(--color-text-sub)",
  };

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          padding: "1rem",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSubmitting) onClose();
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "500px",
            maxHeight: "90vh",
            backgroundColor: "var(--color-surface)",
            borderRadius: "16px",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid var(--color-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--color-text-main)" }}>
              Edit Animal Profile
            </h2>
            <button
              type="button"
              onClick={onClose}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-sub)" }}
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>

          <div
            style={{
              padding: "1.25rem 1.5rem",
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
              <div>
                <label style={labelStyle}>Animal Name *</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Maridadi"
                />
              </div>

              <div>
                <label style={labelStyle}>Tag Number (Optional)</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={formData.tagNumber}
                  onChange={(e) => setFormData({ ...formData, tagNumber: e.target.value })}
                  placeholder="e.g. DC-024"
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
              <div>
                <label style={labelStyle}>Species *</label>
                <select
                  style={inputStyle}
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

              <div>
                <label style={labelStyle}>
                  Gender {isGenderLocked ? "(Auto)" : "*"}
                </label>
                <select
                  style={{ ...inputStyle, opacity: isGenderLocked ? 0.75 : 1 }}
                  value={formData.gender}
                  disabled={isGenderLocked}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                >
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
              <div>
                <label style={labelStyle}>Breed (Optional)</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={formData.breed}
                  onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                  placeholder="e.g. Friesian, Ayrshire"
                />
              </div>

              <div>
                <label style={labelStyle}>Date of Birth</label>
                <input
                  type="date"
                  max={todayStr}
                  style={inputStyle}
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Health / Operational Status</label>
              <select
                style={inputStyle}
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="ACTIVE">Active (Healthy)</option>
                <option value="SICK">Sick / Under Monitoring</option>
                {(animal.status === "SOLD" || animal.status === "DECEASED") && (
                  <option value={animal.status}>
                    Keep as {animal.status} (selecting Active will restore animal)
                  </option>
                )}
              </select>
              {(animal.status === "SOLD" || animal.status === "DECEASED") &&
                (formData.status === "ACTIVE" || formData.status === "SICK") && (
                  <small style={{ display: "block", marginTop: "4px", color: "#d97706", fontSize: "0.76rem" }}>
                    Restoring this animal to {formData.status} will reverse its {animal.status.toLowerCase()} state
                    {animal.status === "SOLD" ? " and void the auto-generated animal sale entry." : "."}
                  </small>
                )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
              <div>
                <label style={labelStyle}>Dam (Mother)</label>
                <select
                  style={inputStyle}
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

              <div>
                <label style={labelStyle}>Sire (Father / AI Bull)</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={formData.sireName}
                  onChange={(e) => setFormData({ ...formData, sireName: e.target.value })}
                  placeholder="e.g. Titan AI-042"
                />
              </div>
            </div>
          </div>

          <div style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid var(--color-border)" }}>
            <button
              type="button"
              onClick={() => submitForm(false)}
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: "0.875rem",
                backgroundColor: "var(--color-primary)",
                color: "white",
                borderRadius: "10px",
                border: "none",
                fontWeight: 600,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              <Save size={19} />
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

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
