"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { ThemeToggle } from "../../components/theme-toggle/ThemeToggle";
import { ChevronRight, Download, Bell, Lock, HelpCircle, LogOut, Globe, Palette, User, Phone, Mail } from "lucide-react";
import { useToast } from "../../components/ui/Toast";
import { useAuth } from "../../components/auth/AuthProvider";
import ChangePasswordModal from "../../components/settings/ChangePasswordModal";
import EditProfileModal from "../../components/settings/EditProfileModal";
import EditFarmProfileModal from "../../components/settings/EditFarmProfileModal";
import HelpGuideModal from "../../components/settings/HelpGuideModal";
import DataExportModal from "../../components/settings/DataExportModal";
import { subscribeUser, unsubscribeUser } from "../../components/notifications/NotificationManager";
import { sendTestNotification } from "@/actions/push.actions";
import { getFarmSettings } from "@/actions/settings.actions";

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isFarmModalOpen, setIsFarmModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [farmSettings, setFarmSettings] = useState({
    id: "default",
    farmName: "Premier Farm",
    location: "Nakuru County, Kenya",
    phoneNumber: "+254 700 000 000",
    email: "info@premierfarm.com",
    currencySymbol: "KES",
  });

  // Sync push status & fetch farm settings on mount
  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setIsPushEnabled(!!sub);
        });
      });
    }

    getFarmSettings().then(res => {
      if (res.success && res.data) {
        setFarmSettings(res.data);
      }
    });
  }, []);

  const handlePushToggle = async () => {
    try {
      if (isPushEnabled) {
        await unsubscribeUser();
        setIsPushEnabled(false);
        toast("Push notifications disabled.", "info");
      } else {
        const ok = await subscribeUser();
        if (ok) {
          setIsPushEnabled(true);
          toast("Push notifications enabled!", "success");
        }
      }
    } catch (err: any) {
      toast(err.message || "Failed to toggle notifications.", "error");
    }
  };

  const handleTestPush = async () => {
    if (!isPushEnabled) return toast("Enable notifications first!", "warning");
    setIsSendingTest(true);
    const res = await sendTestNotification();
    if (res.success) toast("Test notification sent!", "success");
    else toast("Failed to send test. Check logs.", "error");
    setIsSendingTest(false);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>Settings</h1>
      </header>

      {/* User Info */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Personal Profile</h2>
        <div className={styles.card}>
          <div className={styles.settingRow} style={{ borderBottom: '1px solid var(--color-border)', cursor: 'default' }}>
            <div className={styles.rowLeft}>
              <User size={20} className={styles.rowIcon} />
              <span>Full Name</span>
            </div>
            <span className={styles.valueLabel}>{user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Not set' : '...'}</span>
          </div>
          <div className={styles.settingRow} style={{ borderBottom: '1px solid var(--color-border)', cursor: 'default' }}>
            <div className={styles.rowLeft}>
              <Mail size={20} className={styles.rowIcon} />
              <span>Email</span>
            </div>
            <span className={styles.valueLabel}>{user?.email || '...'}</span>
          </div>
          <div className={styles.settingRow} style={{ cursor: 'default' }}>
            <div className={styles.rowLeft}>
              <Phone size={20} className={styles.rowIcon} />
              <span>Phone</span>
            </div>
            <span className={styles.valueLabel}>{user?.phoneNumber || 'Not linked'}</span>
          </div>
          <button
            onClick={() => setIsProfileModalOpen(true)}
            style={{ width: '100%', padding: '0.85rem', color: 'var(--color-primary)', fontWeight: 600, border: 'none', background: 'var(--color-bg)', borderTop: '1px solid var(--color-border)', cursor: 'pointer' }}
          >
            Edit Profile Details
          </button>
        </div>
      </section>

      {/* Farm Info */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Farm Profile</h2>
        <div className={styles.card}>
          <div className={styles.farmBanner}>
            <div className={styles.farmAvatar}>
              {farmSettings.farmName
                ? farmSettings.farmName
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()
                : "PF"}
            </div>
            <div style={{ flex: 1 }}>
              <h3 className={styles.farmName}>{farmSettings.farmName}</h3>
              <p className={styles.farmSub}>{farmSettings.location}</p>
              <div style={{ display: "flex", gap: "1rem", marginTop: "0.35rem", fontSize: "0.8rem", color: "var(--color-text-sub)" }}>
                {farmSettings.phoneNumber && <span>📞 {farmSettings.phoneNumber}</span>}
                {farmSettings.currencySymbol && <span>💰 Currency: {farmSettings.currencySymbol}</span>}
              </div>
            </div>
          </div>
          {user?.role === "ADMIN" && (
            <button
              onClick={() => setIsFarmModalOpen(true)}
              style={{
                width: "100%",
                padding: "0.85rem",
                color: "var(--color-primary)",
                fontWeight: 600,
                border: "none",
                background: "var(--color-bg)",
                borderTop: "1px solid var(--color-border)",
                cursor: "pointer",
              }}
            >
              Edit Farm Details
            </button>
          )}
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
            <ThemeToggle className={styles.themeToggle} />
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

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Notifications</h2>
        <div className={styles.card}>
          <div className={styles.settingRow}>
            <div className={styles.rowLeft}>
              <Bell size={20} className={styles.rowIcon} />
              <span>Push Notifications</span>
            </div>
            <div className={styles.rowRight}>
              <button
                onClick={handlePushToggle}
                style={{
                  padding: '0.4rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  backgroundColor: isPushEnabled ? 'var(--color-primary-light)' : 'var(--color-bg)',
                  color: isPushEnabled ? 'var(--color-primary-dark)' : 'var(--color-text-sub)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer'
                }}
              >
                {isPushEnabled ? "Enabled" : "Enable"}
              </button>
            </div>
          </div>
          {isPushEnabled && (
            <>
              <div className={styles.divider}></div>
              <button
                className={styles.settingRow}
                onClick={handleTestPush}
                disabled={isSendingTest}
              >
                <div className={styles.rowLeft}>
                  <Bell size={20} className={styles.rowIcon} />
                  <span>Send Test Notification</span>
                </div>
                <ChevronRight size={18} className={styles.chevron} />
              </button>
            </>
          )}
        </div>
      </section>

      {/* Data */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Data & Privacy</h2>
        <div className={styles.card}>
          <button
            className={styles.settingRow}
            onClick={() => setIsExportModalOpen(true)}
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
            onClick={() => setIsPasswordModalOpen(true)}
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
            onClick={() => setIsHelpModalOpen(true)}
          >
            <div className={styles.rowLeft}>
              <HelpCircle size={20} className={styles.rowIcon} />
              <span>Help & FAQ (Operations Guide)</span>
            </div>
            <ChevronRight size={18} className={styles.chevron} />
          </button>
        </div>
      </section>

      {/* Logout */}
      <section className={styles.section}>
        <button
          className={`${styles.card} ${styles.logoutCard}`}
          onClick={async () => {
            toast("Logging out...", "success");
            await fetch("/api/auth/logout", { method: "POST" });
            setTimeout(() => router.push("/login"), 500);
          }}
        >
          <div className={styles.rowLeft}>
            <LogOut size={20} />
            <span>Log Out</span>
          </div>
        </button>
      </section>

      <p className={styles.version}>{farmSettings.farmName} Operations Portal</p>

      <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
      <EditProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      <EditFarmProfileModal
        isOpen={isFarmModalOpen}
        onClose={() => setIsFarmModalOpen(false)}
        initialData={farmSettings}
        onSuccess={(updated) => setFarmSettings(updated)}
      />
      <HelpGuideModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
      <DataExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
    </div>
  );
}
