"use client";

import React, { useState } from "react";
import { X, Save, Home, MapPin, Phone, Mail, DollarSign } from "lucide-react";
import { updateFarmSettings } from "@/actions/settings.actions";
import { useToast } from "../ui/Toast";
import styles from "./SettingsModal.module.css";

interface FarmProfile {
  id: string;
  farmName: string;
  location: string;
  phoneNumber: string;
  email: string;
  currencySymbol: string;
}

interface EditFarmProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: FarmProfile;
  onSuccess: (updated: FarmProfile) => void;
}

export default function EditFarmProfileModal({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}: EditFarmProfileModalProps) {
  const [form, setForm] = useState<FarmProfile>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.farmName.trim() || !form.location.trim()) {
      toast("Farm name and location are required.", "error");
      return;
    }

    setIsSubmitting(true);
    const res = await updateFarmSettings(form);

    if (res.success && res.data) {
      toast(res.message, "success");
      onSuccess({
        id: res.data.id,
        farmName: res.data.farmName,
        location: res.data.location,
        phoneNumber: res.data.phoneNumber || "",
        email: res.data.email || "",
        currencySymbol: res.data.currencySymbol || "KES",
      });
      onClose();
    } else {
      toast(res.message, "error");
    }
    setIsSubmitting(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem",
    paddingLeft: "2.5rem",
    borderRadius: "8px",
    border: "1px solid var(--color-border)",
    fontSize: "0.95rem",
    backgroundColor: "var(--color-surface)",
    color: "var(--color-text-main)",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "0.4rem",
    fontWeight: 600,
    fontSize: "0.85rem",
    color: "var(--color-text-sub)",
  };

  const iconStyle: React.CSSProperties = {
    position: "absolute",
    left: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--color-text-sub)",
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <div className={styles.dragHandle} />
        <div className={styles.modalHeader}>
          <h2>Edit Farm Profile</h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
            aria-label="Close"
          >
            <X size={24} color="var(--color-text-sub)" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div>
              <label style={labelStyle}>Farm Name *</label>
              <div style={{ position: "relative" }}>
                <Home size={18} style={iconStyle} />
                <input
                  type="text"
                  required
                  style={inputStyle}
                  placeholder="e.g. Premier Farm"
                  value={form.farmName}
                  onChange={(e) => setForm({ ...form, farmName: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Location / County *</label>
              <div style={{ position: "relative" }}>
                <MapPin size={18} style={iconStyle} />
                <input
                  type="text"
                  required
                  style={inputStyle}
                  placeholder="e.g. Nakuru County, Kenya"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={labelStyle}>Official Phone</label>
                <div style={{ position: "relative" }}>
                  <Phone size={18} style={iconStyle} />
                  <input
                    type="text"
                    style={inputStyle}
                    placeholder="+254 700 000 000"
                    value={form.phoneNumber}
                    onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Currency</label>
                <div style={{ position: "relative" }}>
                  <DollarSign size={18} style={iconStyle} />
                  <input
                    type="text"
                    required
                    style={inputStyle}
                    placeholder="KES"
                    value={form.currencySymbol}
                    onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Official Farm Email</label>
              <div style={{ position: "relative" }}>
                <Mail size={18} style={iconStyle} />
                <input
                  type="email"
                  style={inputStyle}
                  placeholder="info@premierfarm.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className={styles.modalFooter} style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.6rem 1.25rem",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                background: "transparent",
                color: "var(--color-text-sub)",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.6rem 1.25rem",
                borderRadius: "8px",
                border: "none",
                background: "var(--color-primary)",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              <Save size={16} />
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
