"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { User, Mail, Phone, Lock, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { validateInviteToken, completeInvitedSetup } from "@/actions/user.actions";
import { useToast } from "@/app/components/ui/Toast";
import styles from "./page.module.css";
import Link from "next/link";

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteData, setInviteData] = useState<{ email: string; role: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided.");
      setIsLoading(false);
      return;
    }

    const verify = async () => {
      const res = await validateInviteToken(token);
      if (res.success && res.data) {
        setInviteData(res.data);
      } else {
        setError(res.message || "Invalid or expired invitation.");
      }
      setIsLoading(false);
    };

    verify();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast("Passwords do not match.", "error");
      return;
    }

    setIsSubmitting(true);
    const res = await completeInvitedSetup(token!, form);
    setIsSubmitting(false);

    if (res.success) {
      toast(res.message, "success");
      router.push("/login?message=Account setup complete! Please login.");
    } else {
      toast(res.message, "error");
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.setupCard} style={{ textAlign: "center" }}>
          <Loader2 className="animate-spin" size={48} color="#10b981" style={{ margin: "0 auto 1.5rem auto" }} />
          <p>Verifying your invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.setupCard}>
          <div className={styles.errorState}>
            <AlertCircle className={styles.errorIcon} size={64} />
            <h1>Invitation Error</h1>
            <p>{error}</p>
            <Link href="/login" className={styles.backBtn}>
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.setupCard}>
        <div className={styles.header}>
          <span className={styles.logo}>Premier Farm</span>
          <h1>Setup Your Account</h1>
          <p>Complete your profile to join the team as a <strong>{inviteData?.role}</strong>.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label>Work Email</label>
            <div className={styles.inputWrapper}>
              <Mail className={styles.inputIcon} size={18} />
              <input type="email" value={inviteData?.email} disabled style={{ opacity: 0.6, cursor: "not-allowed" }} />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <label>First Name</label>
              <div className={styles.inputWrapper}>
                <User className={styles.inputIcon} size={18} />
                <input
                  type="text"
                  placeholder="e.g. John"
                  required
                  value={form.firstName}
                  onChange={e => setForm({ ...form, firstName: e.target.value })}
                />
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label>Last Name</label>
              <div className={styles.inputWrapper}>
                <User className={styles.inputIcon} size={18} />
                <input
                  type="text"
                  placeholder="e.g. Doe"
                  required
                  value={form.lastName}
                  onChange={e => setForm({ ...form, lastName: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>Phone Number</label>
            <div className={styles.inputWrapper}>
              <Phone className={styles.inputIcon} size={18} />
              <input
                type="tel"
                placeholder="+254..."
                required
                value={form.phoneNumber}
                onChange={e => setForm({ ...form, phoneNumber: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>Create Password</label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} size={18} />
              <input
                type="password"
                placeholder="Min. 6 characters"
                required
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>Confirm Password</label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} size={18} />
              <input
                type="password"
                placeholder="Repeat password"
                required
                value={form.confirmPassword}
                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
              />
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                Complete Setup <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AcceptInviteContent />
    </Suspense>
  );
}
