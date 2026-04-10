"use client";
import React, { useState } from "react";
import { X, Save, Eye, EyeOff } from "lucide-react";
import { changePassword } from "@/actions/settings.actions";
import { useToast } from "../ui/Toast";

export default function ChangePasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
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

  const inputStyle: React.CSSProperties = { width: "100%", padding: "0.75rem", paddingRight: "2.5rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.95rem" };
  const labelStyle: React.CSSProperties = { display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.9rem" };
  const toggleStyle: React.CSSProperties = { position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: "1rem" }}>
      <div style={{ backgroundColor: "#fff", borderRadius: "12px", width: "100%", maxWidth: "420px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
        <div style={{ padding: "1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 600 }}>Change Password</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={24} color="#64748b" /></button>
        </div>

        <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label style={labelStyle}>Current Password</label>
            <div style={{ position: "relative" }}>
              <input type={showCurrent ? "text" : "password"} style={inputStyle} value={form.currentPassword} onChange={e => setForm({ ...form, currentPassword: e.target.value })} placeholder="Enter current password" />
              <button style={toggleStyle} onClick={() => setShowCurrent(!showCurrent)} type="button">{showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>New Password</label>
            <div style={{ position: "relative" }}>
              <input type={showNew ? "text" : "password"} style={inputStyle} value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })} placeholder="Min. 6 characters" />
              <button style={toggleStyle} onClick={() => setShowNew(!showNew)} type="button">{showNew ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Confirm New Password</label>
            <input type="password" style={inputStyle} value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Re-enter new password" />
          </div>
        </div>

        <div style={{ padding: "1.5rem", borderTop: "1px solid #e2e8f0" }}>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{ width: "100%", padding: "0.875rem", backgroundColor: "#1e293b", color: "#fff", borderRadius: "8px", border: "none", fontWeight: 600, display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}
          >
            <Save size={18} />
            {isSubmitting ? "Updating..." : "Update Password"}
          </button>
        </div>
      </div>
    </div>
  );
}
