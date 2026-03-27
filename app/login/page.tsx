import styles from "./page.module.css";
import { Lock, Mail, ArrowRight } from "lucide-react";

export default function Login() {
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

          <form className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="email">Email</label>
              <div className={styles.inputWrapper}>
                <Mail className={styles.inputIcon} size={20} />
                <input id="email" type="email" placeholder="manager@premierfarm.com" required />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password">Password</label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} size={20} />
                <input id="password" type="password" placeholder="••••••••" required />
              </div>
            </div>

            <div className={styles.formOptions}>
              <label className={styles.checkbox}>
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="#" className={styles.forgot}>Forgot password?</a>
            </div>

            <button type="button" className={styles.submitBtn}>
              Sign In <ArrowRight size={18} />
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
