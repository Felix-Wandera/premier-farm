"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { Lock, Mail, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "../components/ui/Toast";

export default function Login() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid email or password.");
      }

      toast("Welcome back!", "success");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.imageSection}>
        <div className={styles.imageOverlay}>
          <h2>Premier Farm</h2>
          <p>Next-generation herd and farm management, brought to the palm of your hand.</p>
        </div>
      </div>

      <div className={styles.formSection}>
        <div className={styles.formWrapper}>
          <div className={styles.mobileLogo}>
            <div className={styles.logoMark}></div>
            <h2>PremierFarm</h2>
          </div>

          <div className={styles.header}>
            <h1>Welcome back</h1>
            <p>Please enter your details to sign in.</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            {error && <div className={styles.errorMessage}>{error}</div>}
            
            <div className={styles.inputGroup}>
              <label htmlFor="email">Email</label>
              <div className={styles.inputWrapper}>
                <Mail className={styles.inputIcon} size={20} />
                <input 
                  id="email" 
                  type="email" 
                  placeholder="manager@premierfarm.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required 
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password">Password</label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} size={20} />
                <input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  required 
                />
              </div>
            </div>

            <div className={styles.formOptions}>
              <label className={styles.checkbox}>
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <button 
                type="button" 
                className={styles.forgotBtn}
                onClick={() => router.push("/login/forgot")}
              >
                Forgot password?
              </button>
            </div>

            <button 
              type="submit" 
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>Logging in... <Loader2 className={styles.spinner} size={18} /></>
              ) : (
                <>Sign In <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          <p className={styles.footerText}>
            Don't have an account? <a href="#">Contact admin</a>
          </p>
        </div>
      </div>
    </div>
  );
}
