"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "../forgot/page.module.css";
import { Lock, ArrowLeft, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useToast } from "../../components/ui/Toast";
import { resetPasswordWithToken } from "@/actions/settings.actions";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const toast = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className={styles.container}>
        <div className={styles.formSection}>
          <div className={styles.formWrapper}>
            <div className={styles.header}>
              <h1>Invalid Link</h1>
              <p>This password reset link is missing or malformed. Please request a new one.</p>
            </div>
            <button className={styles.submitBtn} onClick={() => router.push("/login/forgot")}>
              Request New Link
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resetPasswordWithToken(token, newPassword);
      if (res.success) {
        setIsSuccess(true);
        toast(res.message, "success");
      } else {
        setError(res.message);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formSection}>
        <div className={styles.formWrapper}>
          <button className={styles.backBtn} onClick={() => router.push("/login")}>
            <ArrowLeft size={18} /> Back to login
          </button>

          <div className={styles.header}>
            <h1>Set New Password</h1>
            <p>Enter your new password below.</p>
          </div>

          {isSuccess ? (
            <div className={styles.successState}>
              <div className={styles.successIcon}>
                <CheckCircle2 size={32} />
              </div>
              <h2>Password Updated!</h2>
              <p>You can now log in with your new password.</p>
              <button className={styles.submitBtn} onClick={() => router.push("/login")}>
                Go to Login
              </button>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              {error && <div className={styles.errorMessage}>{error}</div>}

              <div className={styles.inputGroup}>
                <label htmlFor="newPassword">New Password</label>
                <div className={styles.inputWrapper} style={{ position: "relative" }}>
                  <Lock className={styles.inputIcon} size={20} />
                  <input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className={styles.inputWrapper}>
                  <Lock className={styles.inputIcon} size={20} />
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>Resetting... <Loader2 className={styles.spinner} size={18} /></>
                ) : "Set New Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
