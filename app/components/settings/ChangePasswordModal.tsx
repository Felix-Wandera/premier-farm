"use client";
import React, { useState } from "react";
import { X, Save } from "lucide-react";
import { changePassword } from "@/actions/settings.actions";
import { useToast } from "../ui/Toast";
import PasswordInput from "../ui/PasswordInput";
import styles from "./SettingsModal.module.css";

export default function ChangePasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      toast("Please fill all fields.", "error");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast("New passwords do not match.", "error");
      return;
    }
    if (form.newPassword.length < 6) {
      toast("New password must be at least 6 characters.", "error");
      return;
    }

    setIsSubmitting(true);
    const res = await changePassword(form);
    setIsSubmitting(false);

    if (res.success) {
      toast(res.message, "success");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      onClose();
    } else {
      toast(res.message, "error");
    }
  };

  const labelStyle: React.CSSProperties = { display: "block", marginBottom: "0.5rem", fontWeight: 600, fontSize: "0.88rem", color: "var(--color-text-main)" };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <div className={styles.dragHandle} />
        <div className={styles.modalHeader}>
          <h2>Change Password</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={24} color="var(--color-text-sub)" /></button>
        </div>

        <div className={styles.modalBody}>
          <div>
            <label style={labelStyle}>Current Password</label>
            <PasswordInput
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={e => setForm({ ...form, currentPassword: e.target.value })}
              placeholder="Enter current password"
              isSubmitting={isSubmitting}
            />
          </div>

          <div>
            <label style={labelStyle}>New Password</label>
            <PasswordInput
              autoComplete="new-password"
              value={form.newPassword}
              onChange={e => setForm({ ...form, newPassword: e.target.value })}
              placeholder="Min. 6 characters"
              isSubmitting={isSubmitting}
            />
          </div>

          <div>
            <label style={labelStyle}>Confirm New Password</label>
            <PasswordInput
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder="Re-enter new password"
              isSubmitting={isSubmitting}
              matchWithValue={form.newPassword}
              showMatchStatus
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{ width: "100%", padding: "0.875rem", backgroundColor: "var(--color-primary)", color: "#fff", borderRadius: "8px", border: "none", fontWeight: 600, display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}
          >
            <Save size={18} />
            {isSubmitting ? "Updating..." : "Update Password"}
          </button>
        </div>
      </div>
    </div>
  );
}
