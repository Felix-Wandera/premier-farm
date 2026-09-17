"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Coins,
  User,
  Mail,
  Lock,
  Phone,
  ArrowRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { registerFarm } from "@/actions/tenant.actions";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { useToast } from "@/app/components/ui/Toast";
import styles from "./page.module.css";

export default function RegisterFarmPage() {
  const router = useRouter();
  const toast = useToast();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    farmName: "",
    location: "",
    currencySymbol: "KES",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      if (form.password !== form.confirmPassword) {
        toast("Passwords do not match.", "error");
        return;
      }
      if (!form.email || !form.password) {
        toast("Please enter your email and password.", "error");
        return;
      }
    }

    if (!form.farmName.trim()) {
      toast("Please provide a name for your farm.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerFarm({
        farmName: form.farmName.trim(),
        location: form.location.trim() || undefined,
        currencySymbol: form.currencySymbol,
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        email: form.email.trim().toLowerCase() || undefined,
        password: form.password || undefined,
        phoneNumber: form.phoneNumber.trim() || undefined,
      });

      if (res.success) {
        toast(res.message, "success");
        // Redirect to dashboard with new organization active
        window.location.href = "/";
      } else {
        toast(res.message || "Failed to register farm.", "error");
      }
    } catch (err: any) {
      toast(err?.message || "An unexpected error occurred.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.setupCard}>
        <div className={styles.header}>
          <div className={styles.badge}>
            <Sparkles size={14} />
            <span>Multi-Farm Cloud</span>
          </div>
          <h1>{isAuthenticated ? "Launch a New Farm" : "Get Started with Premier Farm"}</h1>
          <p>
            {isAuthenticated
              ? `You are logged in as ${user?.email}. Set up an additional farm organization.`
              : "Register your farm organization and create your administrator account."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.sectionTitle}>Farm Organization Details</div>

          <div className={styles.inputGroup}>
            <label htmlFor="farmName">Farm Name *</label>
            <div className={styles.inputWrapper}>
              <Building2 size={18} className={styles.inputIcon} />
              <input
                id="farmName"
                name="farmName"
                type="text"
                placeholder="e.g. Green Pastures Dairy"
                value={form.farmName}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <label htmlFor="location">Location / Region</label>
              <div className={styles.inputWrapper}>
                <MapPin size={18} className={styles.inputIcon} />
                <input
                  id="location"
                  name="location"
                  type="text"
                  placeholder="e.g. Nakuru, Kenya"
                  value={form.location}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="currencySymbol">Operating Currency</label>
              <div className={styles.inputWrapper}>
                <Coins size={18} className={styles.inputIcon} />
                <select
                  id="currencySymbol"
                  name="currencySymbol"
                  value={form.currencySymbol}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  <option value="KES">KES (Kenyan Shilling)</option>
                  <option value="USD">USD ($ US Dollar)</option>
                  <option value="EUR">EUR (€ Euro)</option>
                  <option value="UGX">UGX (Ugandan Shilling)</option>
                  <option value="TZS">TZS (Tanzanian Shilling)</option>
                  <option value="GBP">GBP (£ British Pound)</option>
                </select>
              </div>
            </div>
          </div>

          {!isAuthenticated && (
            <>
              <div className={styles.sectionTitle} style={{ marginTop: "1rem" }}>
                Farm Owner Account
              </div>

              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <label htmlFor="firstName">First Name</label>
                  <div className={styles.inputWrapper}>
                    <User size={18} className={styles.inputIcon} />
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="e.g. Jane"
                      value={form.firstName}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="lastName">Last Name</label>
                  <div className={styles.inputWrapper}>
                    <User size={18} className={styles.inputIcon} />
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      placeholder="e.g. Wanjiku"
                      value={form.lastName}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <label htmlFor="email">Email Address *</label>
                  <div className={styles.inputWrapper}>
                    <Mail size={18} className={styles.inputIcon} />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="jane@greenpastures.com"
                      value={form.email}
                      onChange={handleChange}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="phoneNumber">Phone Number</label>
                  <div className={styles.inputWrapper}>
                    <Phone size={18} className={styles.inputIcon} />
                    <input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      placeholder="+254 700 000 000"
                      value={form.phoneNumber}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <label htmlFor="password">Password *</label>
                  <div className={styles.inputWrapper}>
                    <Lock size={18} className={styles.inputIcon} />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={handleChange}
                      required
                      minLength={6}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="confirmPassword">Confirm Password *</label>
                  <div className={styles.inputWrapper}>
                    <Lock size={18} className={styles.inputIcon} />
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      required
                      minLength={6}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Creating Farm Organization...</span>
              </>
            ) : (
              <>
                <span>Launch Farm</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className={styles.footerNote}>
          {isAuthenticated ? (
            <span>
              Return to your <Link href="/" className={styles.link}>Dashboard</Link>
            </span>
          ) : (
            <span>
              Already have an account? <Link href="/login" className={styles.link}>Sign in</Link>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
