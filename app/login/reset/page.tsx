"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "../forgot/page.module.css";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "../../components/ui/Toast";
import PasswordInput from "../../components/ui/PasswordInput";
import { resetPasswordWithToken } from "@/actions/settings.actions";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const toast = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
                <PasswordInput
                  id="newPassword"
                  iconSize={20}
                  autoComplete="new-password"
                  placeholder="Min. 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  isSubmitting={isSubmitting}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="confirmPassword">Confirm Password</label>
                <PasswordInput
                  id="confirmPassword"
                  iconSize={20}
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  isSubmitting={isSubmitting}
                  matchWithValue={newPassword}
                  showMatchStatus
                  required
                />
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.formSection}>
          <div className={styles.formWrapper} style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
            <Loader2 className={styles.spinner} size={24} />
          </div>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
