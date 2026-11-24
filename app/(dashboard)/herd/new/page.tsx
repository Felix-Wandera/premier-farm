"use client";
import React, { useState, useEffect } from "react";
import {
  checkAnimalIdentityAvailability,
  createAnimal,
  getEligibleDamAnimals,
} from "@/actions/animal.actions";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronRight, Loader2, X } from "lucide-react";
import styles from "./page.module.css";
import AnimalIcon from "../../../components/ui/AnimalIcon";
import { useToast } from "../../../components/ui/Toast";
import OutlierWarningModal from "../../../components/ui/OutlierWarningModal";
import { getSpeciesFamily, parseSpecies } from "@/lib/validations";

export default function NewAnimalWizard() {
  const router = useRouter();
  const toast = useToast();
  const todayStr = new Date().toISOString().split("T")[0];
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    species: "Dairy Cow",
    gender: "FEMALE" as "MALE" | "FEMALE",
    tagNumber: "",
    name: "",
    breed: "",
    dateOfBirth: "",
    status: "ACTIVE",
    motherId: "",
    motherTag: "",
    sireName: "",
  });

  const [eligibleDams, setEligibleDams] = useState<any[]>([]);
  const [isCheckingStep2, setIsCheckingStep2] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [tagError, setTagError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outlierState, setOutlierState] = useState<{
    warnings: string[];
    canOverride: boolean;
  } | null>(null);

  useEffect(() => {
    getEligibleDamAnimals()
      .then((dams) => setEligibleDams(dams || []))
      .catch(() => setEligibleDams([]));
  }, []);

  const handleSelectSpecies = (s: string) => {
    let nextGender: "MALE" | "FEMALE" = formData.gender;
    if (s === "Bull") nextGender = "MALE";
    if (s === "Dairy Cow" || s === "Heifer") nextGender = "FEMALE";
    setFormData((prev) => ({
      ...prev,
      species: s,
      gender: nextGender,
      motherId: "",
    }));
  };

  const isGenderLocked =
    formData.species === "Bull" ||
    formData.species === "Dairy Cow" ||
    formData.species === "Heifer";

  const handleNextFromStep2 = async () => {
    setNameError(null);
    setTagError(null);

    if (!formData.name.trim()) {
      setNameError("Animal name is required.");
      return;
    }

    if (formData.dateOfBirth && formData.dateOfBirth > todayStr) {
      toast("Date of Birth cannot be in the future.", "error");
      return;
    }

    setIsCheckingStep2(true);
    try {
      const check = await checkAnimalIdentityAvailability({
        name: formData.name,
        tagNumber: formData.tagNumber || undefined,
      });

      if (!check.nameAvailable) {
        setNameError(check.nameError);
      }
      if (!check.tagAvailable) {
        setTagError(check.tagError);
      }

      if (!check.nameAvailable || !check.tagAvailable) {
        toast(check.nameError || check.tagError || "Duplicate animal record detected.", "error");
        return;
      }

      setStep(3);
    } catch {
      setStep(3);
    } finally {
      setIsCheckingStep2(false);
    }
  };

  const nextStep = () => {
    if (step === 2) {
      handleNextFromStep2();
    } else {
      setStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const handleSave = async (overrideWarnings = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const response = await createAnimal({ ...formData, overrideWarnings });

      if (response.code === "OUTLIER_WARNING" && response.warnings) {
        setOutlierState({
          warnings: response.warnings,
          canOverride: Boolean(response.canOverride),
        });
        return;
      }

      setOutlierState(null);

      if (response.success) {
        toast(response.message, "success");
        setTimeout(() => router.push("/herd"), 600);
      } else {
        if (response.fieldErrors?.name || response.fieldErrors?.tagNumber) {
          setNameError(response.fieldErrors.name?.[0] || null);
          setTagError(response.fieldErrors.tagNumber?.[0] || null);
          setStep(2);
        }
        toast(response.message, "error");
      }
    } catch {
      toast("An unexpected connection error occurred.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSpeciesEnum = parseSpecies(formData.species) || "DAIRY_COW";
  const compatibleDams = eligibleDams.filter(
    (d) => getSpeciesFamily(d.species) === getSpeciesFamily(selectedSpeciesEnum)
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.closeBtn} aria-label="Cancel">
          <X size={24} strokeWidth={2.5} />
        </button>
        <div className={styles.progressTracker}>
          <div className={`${styles.stepDot} ${step >= 1 ? styles.activeDot : ""}`}>1</div>
          <div className={`${styles.stepLine} ${step >= 2 ? styles.activeLine : ""}`}></div>
          <div className={`${styles.stepDot} ${step >= 2 ? styles.activeDot : ""}`}>2</div>
          <div className={`${styles.stepLine} ${step >= 3 ? styles.activeLine : ""}`}></div>
          <div className={`${styles.stepDot} ${step >= 3 ? styles.activeDot : ""}`}>3</div>
        </div>
      </header>

      <main className={styles.mainContent}>
        {step === 1 && (
          <div className={styles.stepPanel}>
            <h2 className={styles.stepTitle}>Classification</h2>
            <p className={styles.stepSubtitle}>Select the animal&apos;s species and gender.</p>

            <div className={styles.fieldGroup}>
              <label>Species</label>
              <div className={styles.cardGrid}>
                {["Dairy Cow", "Indigenous", "Bull", "Heifer", "Sheep", "Goat"].map((s) => (
                  <div
                    key={s}
                    className={`${styles.selectionCard} ${formData.species === s ? styles.selectedCard : ""}`}
                    onClick={() => handleSelectSpecies(s)}
                  >
                    <div className={styles.iconWrapper}>
                      <AnimalIcon species={s} size={28} />
                    </div>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.fieldGroup} style={{ marginTop: "2rem" }}>
              <label>Gender {isGenderLocked ? `(Auto-set for ${formData.species})` : ""}</label>
              <div className={styles.genderToggle}>
                <button
                  type="button"
                  disabled={isGenderLocked && formData.gender !== "MALE"}
                  className={formData.gender === "MALE" ? styles.activeGender : ""}
                  onClick={() => setFormData({ ...formData, gender: "MALE" })}
                  style={{ opacity: isGenderLocked && formData.gender !== "MALE" ? 0.45 : 1 }}
                >
                  Male
                </button>
                <button
                  type="button"
                  disabled={isGenderLocked && formData.gender !== "FEMALE"}
                  className={formData.gender === "FEMALE" ? styles.activeGender : ""}
                  onClick={() => setFormData({ ...formData, gender: "FEMALE" })}
                  style={{ opacity: isGenderLocked && formData.gender !== "FEMALE" ? 0.45 : 1 }}
                >
                  Female
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={styles.stepPanel}>
            <h2 className={styles.stepTitle}>Identification &amp; Naming</h2>
            <p className={styles.stepSubtitle}>
              Each animal in your organization must have a unique name.
            </p>

            <div className={styles.formSection}>
              <div className={styles.inputGroup}>
                <label>Animal Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Maridadi, Bella"
                  className={styles.textInput}
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (nameError) setNameError(null);
                  }}
                  style={nameError ? { borderColor: "#ef4444" } : undefined}
                  autoFocus
                />
                {nameError && (
                  <small style={{ color: "#ef4444", fontWeight: 600, marginTop: "4px", display: "block" }}>
                    {nameError}
                  </small>
                )}
              </div>

              <div className={styles.inputGroup}>
                <label>Official Tag Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. DC-024 (leave blank if untagged)"
                  className={styles.textInput}
                  value={formData.tagNumber}
                  onChange={(e) => {
                    setFormData({ ...formData, tagNumber: e.target.value });
                    if (tagError) setTagError(null);
                  }}
                  style={tagError ? { borderColor: "#ef4444" } : undefined}
                />
                {tagError && (
                  <small style={{ color: "#ef4444", fontWeight: 600, marginTop: "4px", display: "block" }}>
                    {tagError}
                  </small>
                )}
              </div>

              <div className={styles.inputGroup}>
                <label>Breed (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Friesian, Ayrshire, Boran"
                  className={styles.textInput}
                  value={formData.breed}
                  onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Date of Birth / Acquisition</label>
                <input
                  type="date"
                  max={todayStr}
                  className={styles.textInput}
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={styles.stepPanel}>
            <h2 className={styles.stepTitle}>Background &amp; Lineage</h2>
            <p className={styles.stepSubtitle}>Lineage and starting status.</p>

            <div className={styles.formSection}>
              <div className={styles.inputGroup}>
                <label>Current Status</label>
                <select
                  className={styles.selectInput}
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="ACTIVE">Active (Healthy)</option>
                  <option value="SICK">Sick / Monitoring</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label>Dam (Mother)</label>
                <select
                  className={styles.selectInput}
                  value={formData.motherId}
                  onChange={(e) => setFormData({ ...formData, motherId: e.target.value, motherTag: "" })}
                >
                  <option value="">-- Unknown / External Dam --</option>
                  {compatibleDams.map((dam) => (
                    <option key={dam.id} value={dam.id}>
                      {dam.name}
                      {dam.tagNumber ? ` (#${dam.tagNumber})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label>Sire (Father&apos;s Name or AI Code)</label>
                <input
                  type="text"
                  placeholder="e.g. Titan (AI) or Bull tag"
                  className={styles.textInput}
                  value={formData.sireName}
                  onChange={(e) => setFormData({ ...formData, sireName: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className={styles.stickyFooter}>
        {step > 1 ? (
          <button className={styles.secondaryBtn} onClick={prevStep} disabled={isSubmitting}>
            Back
          </button>
        ) : (
          <div></div>
        )}

        {step < 3 ? (
          <button
            className={styles.primaryBtn}
            onClick={nextStep}
            disabled={(step === 2 && !formData.name.trim()) || isCheckingStep2}
          >
            {isCheckingStep2 ? (
              <>
                Checking... <Loader2 size={18} className="animate-spin" />
              </>
            ) : (
              <>
                Next <ChevronRight size={20} />
              </>
            )}
          </button>
        ) : (
          <button
            className={styles.successBtn}
            onClick={() => handleSave(false)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Animal"} <CheckCircle2 size={20} />
          </button>
        )}
      </footer>

      <OutlierWarningModal
        isOpen={!!outlierState}
        warnings={outlierState?.warnings || []}
        canOverride={outlierState?.canOverride || false}
        isSubmitting={isSubmitting}
        onCancel={() => setOutlierState(null)}
        onOverride={() => handleSave(true)}
      />
    </div>
  );
}
