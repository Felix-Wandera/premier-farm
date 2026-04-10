"use client";
import React, { useState } from "react";
import { X, Save, User as UserIcon, Mail, Phone } from "lucide-react";
import { updateUserProfile } from "@/actions/settings.actions";
import { useToast } from "../ui/Toast";
import { useAuth } from "../auth/AuthProvider";

export default function EditProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, refreshSession } = useAuth();
  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phoneNumber: user?.phoneNumber || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName || !form.email) {
      toast("Name and Email are required.", "error");
      return;
    }

    setIsSubmitting(true);
    const res = await updateUserProfile(form);
    if (res.success) {
      await refreshSession(); // Update context globals
      toast(res.message, "success");
      onClose();
    } else {
      toast(res.message, "error");
    }
    setIsSubmitting(false);
  };

  const inputStyle: React.CSSProperties = { width: "100%", padding: "0.75rem", paddingLeft: "2.5rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.95rem", backgroundColor: "white", color: "#1e293b" };
  const labelStyle: React.CSSProperties = { display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.9rem", color: "#64748b" };
  const iconStyle: React.CSSProperties = { position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: "1rem" }}>
      <div style={{ backgroundColor: "#fff", borderRadius: "16px", width: "100%", maxWidth: "450px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        <div style={{ padding: "1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#1e293b" }}>Edit Profile</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}><X size={24} color="#64748b" /></button>
        </div>

        <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>First Name</label>
              <div style={{ position: "relative" }}>
                <UserIcon size={18} style={iconStyle} />
                <input type="text" style={inputStyle} value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Last Name</label>
              <div style={{ position: "relative" }}>
                <UserIcon size={18} style={iconStyle} />
                <input type="text" style={inputStyle} value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
              </div>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Email Address</label>
            <div style={{ position: "relative" }}>
              <Mail size={18} style={iconStyle} />
              <input type="email" style={inputStyle} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Phone Number</label>
            <div style={{ position: "relative" }}>
              <Phone size={18} style={iconStyle} />
              <input type="tel" style={inputStyle} value={form.phoneNumber} onChange={e => setForm({ ...form, phoneNumber: e.target.value })} placeholder="+254..." />
            </div>
          </div>
        </div>

        <div style={{ padding: "1.5rem", backgroundColor: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{ width: "100%", padding: "0.875rem", backgroundColor: "#22c55e", color: "#fff", borderRadius: "10px", border: "none", fontWeight: 700, display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", cursor: isSubmitting ? "not-allowed" : "pointer", transition: "all 0.2s" }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#16a34a"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#22c55e"}
          >
            <Save size={20} />
            {isSubmitting ? "Saving Changes..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
