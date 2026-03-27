"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "../../components/ui/Toast";

export default function ForgotPassword() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    // Mock API call
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setIsSuccess(true);
      toast("Reset link sent!", "success");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formSection}>
        <div className={styles.formWrapper}>
          <button 
            className={styles.backBtn}
            onClick={() => router.push("/login")}
          >
            <ArrowLeft size={18} /> Back to login
          </button>

          <div className={styles.header}>
            <h1>Forgot password?</h1>
            <p>No worries, we'll send you reset instructions.</p>
          </div>

          {isSuccess ? (
            <div className={styles.successState}>
              <div className={styles.successIcon}>
                <CheckCircle2 size={32} />
              </div>
              <h2>Check your email</h2>
              <p>We've sent a password reset link to <strong>{email}</strong></p>
              <button 
                className={styles.submitBtn}
                onClick={() => router.push("/login")}
              >
                Back to login
              </button>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              {error && <div className={styles.errorMessage}>{error}</div>}
              
              <div className={styles.inputGroup}>
                <label htmlFor="email">Email</label>
                <div className={styles.inputWrapper}>
                  <Mail className={styles.inputIcon} size={20} />
                  <input 
                    id="email" 
                    type="email" 
                    placeholder="Enter your email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    required 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className={styles.submitBtn}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>Sending... <Loader2 className={styles.spinner} size={18} /></>
                ) : (
                  "Reset password"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
