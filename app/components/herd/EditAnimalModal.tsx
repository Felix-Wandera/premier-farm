"use client";
import React, { useState } from "react";
import { X, Save } from "lucide-react";
import { useToast } from "../ui/Toast";
import styles from "../../(dashboard)/herd/[id]/page.module.css";

interface EditAnimalModalProps {
  isOpen: boolean;
  onClose: () => void;
  animal: any;
  onSave: (data: any) => Promise<any>;
}

export default function EditAnimalModal({ isOpen, onClose, animal, onSave }: EditAnimalModalProps) {
  const [formData, setFormData] = useState({
    tagNumber: animal.tagNumber || "",
    name: animal.name || "",
    species: animal.species || "DAIRY_COW",
    gender: animal.gender || "FEMALE",
    dateOfBirth: animal.dateOfBirth ? new Date(animal.dateOfBirth).toISOString().split('T')[0] : "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!formData.tagNumber) {
      toast("Tag Number is required.", "error");
      return;
    }

    setIsSubmitting(true);
    const res = await onSave(formData);
    setIsSubmitting(false);

    if (res.success) {
      toast(res.message, "success");
      onClose();
    } else {
      toast(res.message, "error");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div style={{ width: "100%", maxWidth: "450px", backgroundColor: "var(--color-surface)", borderRadius: "16px", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", border: "1px solid var(--color-border)", margin: "1rem" }}>

        <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text-main)" }}>Edit Animal</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-sub)" }}><X size={24} /></button>
        </div>

        <div style={{ padding: "1.5rem", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "var(--color-text-sub)" }}>Tag Number *</label>
            <input type="text" style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)" }} value={formData.tagNumber} onChange={e => setFormData({...formData, tagNumber: e.target.value})} />
          </div>

          <div>
             <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "var(--color-text-sub)" }}>Name</label>
             <input type="text" style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)" }} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "var(--color-text-sub)" }}>Species</label>
            <select style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)" }} value={formData.species} onChange={e => setFormData({...formData, species: e.target.value})}>
              <option value="DAIRY_COW">Dairy Cow</option>
              <option value="INDIGENOUS_COW">Indigenous</option>
              <option value="BULL">Bull</option>
              <option value="HEIFER">Heifer</option>
              <option value="SHEEP">Sheep</option>
              <option value="GOAT">Goat</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "var(--color-text-sub)" }}>Gender</label>
            <select style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)" }} value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
              <option value="FEMALE">Female</option>
              <option value="MALE">Male</option>
            </select>
          </div>

          <div>
             <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "var(--color-text-sub)" }}>Date of Birth</label>
             <input type="date" style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)" }} value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} />
          </div>
        </div>

        <div style={{ padding: "1.5rem", borderTop: "1px solid var(--color-border)" }}>
          <button
             onClick={handleSave}
             disabled={isSubmitting}
             style={{ width: "100%", padding: "0.875rem", backgroundColor: "var(--color-primary)", color: "white", borderRadius: "8px", border: "none", fontWeight: 600, display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}
          >
             <Save size={20} />
             {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
