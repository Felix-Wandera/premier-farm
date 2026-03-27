"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronRight, X } from "lucide-react";
import styles from "./page.module.css";
import AnimalIcon from "../../../components/ui/AnimalIcon";

export default function NewAnimalWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    species: "Dairy Cow",
    gender: "FEMALE",
    tagNumber: "",
    name: "",
    dateOfBirth: "",
    status: "ACTIVE",
    motherTag: "",
    sireName: ""
  });

  const nextStep = () => setStep(prev => Math.min(prev + 1, 3));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const handleSave = () => {
    // Mock save logic for UI demonstration
    console.log("Saving animal...", formData);
    router.push("/herd"); // Redirect back to herd directory upon completion
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.closeBtn} aria-label="Cancel">
          <X size={24} strokeWidth={2.5} />
        </button>
        <div className={styles.progressTracker}>
          <div className={`${styles.stepDot} ${step >= 1 ? styles.activeDot : ''}`}>1</div>
          <div className={`${styles.stepLine} ${step >= 2 ? styles.activeLine : ''}`}></div>
          <div className={`${styles.stepDot} ${step >= 2 ? styles.activeDot : ''}`}>2</div>
          <div className={`${styles.stepLine} ${step >= 3 ? styles.activeLine : ''}`}></div>
          <div className={`${styles.stepDot} ${step >= 3 ? styles.activeDot : ''}`}>3</div>
        </div>
      </header>

      <main className={styles.mainContent}>
        {step === 1 && (
          <div className={styles.stepPanel}>
            <h2 className={styles.stepTitle}>Classification</h2>
            <p className={styles.stepSubtitle}>Select the animal's species and gender.</p>

            <div className={styles.fieldGroup}>
              <label>Species</label>
              <div className={styles.cardGrid}>
                {["Dairy Cow", "Indigenous", "Bull", "Heifer", "Sheep", "Goat"].map(s => (
                  <div
                    key={s}
                    className={`${styles.selectionCard} ${formData.species === s ? styles.selectedCard : ''}`}
                    onClick={() => setFormData({ ...formData, species: s })}
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
              <label>Gender</label>
              <div className={styles.genderToggle}>
                <button
                  className={formData.gender === 'MALE' ? styles.activeGender : ''}
                  onClick={() => setFormData({ ...formData, gender: 'MALE' })}
                >
                  Male
                </button>
                <button
                  className={formData.gender === 'FEMALE' ? styles.activeGender : ''}
                  onClick={() => setFormData({ ...formData, gender: 'FEMALE' })}
                >
                  Female
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={styles.stepPanel}>
            <h2 className={styles.stepTitle}>Identification</h2>
            <p className={styles.stepSubtitle}>Provide official tag credentials.</p>

            <div className={styles.formSection}>
              <div className={styles.inputGroup}>
                <label>Official Tag Number *</label>
                <input
                  type="text"
                  placeholder="e.g. DC-024"
                  className={styles.textInput}
                  value={formData.tagNumber}
                  onChange={(e) => setFormData({ ...formData, tagNumber: e.target.value })}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Common Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Bella"
                  className={styles.textInput}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Date of Birth / Acquisition</label>
                <input
                  type="date"
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
            <h2 className={styles.stepTitle}>Background</h2>
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
                <label>Dam (Mother's Tag ID)</label>
                <input
                  type="text"
                  placeholder="Search existing tags..."
                  className={styles.textInput}
                  value={formData.motherTag}
                  onChange={(e) => setFormData({ ...formData, motherTag: e.target.value })}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Sire (Father's Name or ID)</label>
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
          <button className={styles.secondaryBtn} onClick={prevStep}>
            Back
          </button>
        ) : <div></div>}

        {step < 3 ? (
          <button className={styles.primaryBtn} onClick={nextStep} disabled={step === 2 && !formData.tagNumber}>
            Next <ChevronRight size={20} />
          </button>
        ) : (
          <button className={styles.successBtn} onClick={handleSave}>
            Save Animal <CheckCircle2 size={20} />
          </button>
        )}
      </footer>
    </div>
  );
}
