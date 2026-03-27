"use client";
import React from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { ThemeToggle } from "../../components/theme-toggle/ThemeToggle";
import { ChevronRight, Download, Bell, Lock, HelpCircle, LogOut, Globe, Palette } from "lucide-react";
import { useToast } from "../../components/ui/Toast";

export default function SettingsPage() {
  const router = useRouter();
  const toast = useToast();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>Settings</h1>
      </header>

      {/* Farm Info */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Farm Profile</h2>
        <div className={styles.card}>
          <div className={styles.farmBanner}>
            <div className={styles.farmAvatar}>PF</div>
            <div>
              <h3 className={styles.farmName}>Premier Farm</h3>
              <p className={styles.farmSub}>Nakuru County, Kenya</p>
            </div>
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Appearance</h2>
        <div className={styles.card}>
          <div className={styles.settingRow}>
            <div className={styles.rowLeft}>
              <Palette size={20} className={styles.rowIcon} />
              <span>Theme</span>
            </div>
            <ThemeToggle />
          </div>

          <div className={styles.divider}></div>

          <div className={styles.settingRow}>
            <div className={styles.rowLeft}>
              <Globe size={20} className={styles.rowIcon} />
              <span>Language</span>
            </div>
            <div className={styles.rowRight}>
              <span className={styles.valueLabel}>English</span>
              <ChevronRight size={18} className={styles.chevron} />
            </div>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Notifications</h2>
        <div className={styles.card}>
          <div className={styles.settingRow}>
            <div className={styles.rowLeft}>
              <Bell size={20} className={styles.rowIcon} />
              <span>Push Notifications</span>
            </div>
            <div className={styles.rowRight}>
              <span className={styles.valueLabel}>On</span>
              <ChevronRight size={18} className={styles.chevron} />
            </div>
          </div>
        </div>
      </section>

      {/* Data */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Data & Privacy</h2>
        <div className={styles.card}>
          <button
            className={styles.settingRow}
            onClick={() => toast("Exporting farm data to CSV...", "info")}
          >
            <div className={styles.rowLeft}>
              <Download size={20} className={styles.rowIcon} />
              <span>Export Farm Data (CSV)</span>
            </div>
            <ChevronRight size={18} className={styles.chevron} />
          </button>

          <div className={styles.divider}></div>

          <button
            className={styles.settingRow}
            onClick={() => toast("Password reset enabled in next update", "info")}
          >
            <div className={styles.rowLeft}>
              <Lock size={20} className={styles.rowIcon} />
              <span>Change Password</span>
            </div>
            <ChevronRight size={18} className={styles.chevron} />
          </button>
        </div>
      </section>

      {/* Support */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Support</h2>
        <div className={styles.card}>
          <button
            className={styles.settingRow}
            onClick={() => toast("Opening help center...", "info")}
          >
            <div className={styles.rowLeft}>
              <HelpCircle size={20} className={styles.rowIcon} />
              <span>Help & FAQ</span>
            </div>
            <ChevronRight size={18} className={styles.chevron} />
          </button>
        </div>
      </section>

      {/* Logout */}
      <section className={styles.section}>
        <button
          className={`${styles.card} ${styles.logoutCard}`}
          onClick={() => {
            toast("Logging out...", "success");
            setTimeout(() => router.push("/login"), 1000);
          }}
        >
          <div className={styles.rowLeft}>
            <LogOut size={20} />
            <span>Log Out</span>
          </div>
        </button>
      </section>

      <p className={styles.version}>Premier Farm v1.0.0</p>
    </div>
  );
}
