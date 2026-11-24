"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { ThemeToggle } from "../../components/theme-toggle/ThemeToggle";
import {
  ChevronRight,
  Download,
  Bell,
  Lock,
  HelpCircle,
  LogOut,
  Palette,
  User,
  Phone,
  Mail,
} from "lucide-react";
import { useToast } from "../../components/ui/Toast";
import { useAuth } from "../../components/auth/AuthProvider";
import ChangePasswordModal from "../../components/settings/ChangePasswordModal";
import EditProfileModal from "../../components/settings/EditProfileModal";
import EditFarmProfileModal from "../../components/settings/EditFarmProfileModal";
import HelpGuideModal from "../../components/settings/HelpGuideModal";
import DataExportModal from "../../components/settings/DataExportModal";
import {
  subscribeUser,
  unsubscribeUser,
} from "../../components/notifications/NotificationManager";
import { sendTestNotification } from "@/actions/push.actions";
import { getFarmSettings } from "@/actions/settings.actions";
import {
  APP_BRAND_NAME,
  DEFAULT_CURRENCY,
  DEFAULT_FARM_EMAIL,
  DEFAULT_FARM_LOCATION,
  DEFAULT_FARM_PHONE,
} from "@/lib/branding";

export default function SettingsPage() {
  const { user, hasPermission, refreshSession } = useAuth();
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
    farmName: APP_BRAND_NAME,
    location: DEFAULT_FARM_LOCATION,
    phoneNumber: DEFAULT_FARM_PHONE,
    email: DEFAULT_FARM_EMAIL,
    currencySymbol: DEFAULT_CURRENCY,
  });

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsPushEnabled(!!sub);
        });
      });
    }

    getFarmSettings().then((res) => {
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
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to toggle notifications.", "error");
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

      {/* Personal Profile */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Personal Profile</h2>
        <div className={styles.card}>
          <div
            className={styles.settingRow}
            style={{ borderBottom: "1px solid var(--color-border)", cursor: "default" }}
          >
            <div className={styles.rowLeft}>
              <User size={19} className={styles.rowIcon} />
              <span>Full Name</span>
            </div>
            <span className={styles.valueLabel}>
              {user
                ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Not set"
                : "..."}
            </span>
          </div>
          <div
            className={styles.settingRow}
            style={{ borderBottom: "1px solid var(--color-border)", cursor: "default" }}
          >
            <div className={styles.rowLeft}>
              <Mail size={19} className={styles.rowIcon} />
              <span>Email</span>
            </div>
            <span className={styles.valueLabel}>{user?.email || "..."}</span>
          </div>
          <div className={styles.settingRow} style={{ cursor: "default" }}>
            <div className={styles.rowLeft}>
              <Phone size={19} className={styles.rowIcon} />
              <span>Phone</span>
            </div>
            <span className={styles.valueLabel}>{user?.phoneNumber || "Not linked"}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            className={styles.cardFooterBtn}
          >
            Edit Profile Details
          </button>
        </div>
      </section>

      {/* Farm Profile */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Ranch Profile</h2>
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
                : "PR"}
            </div>
            <div className={styles.farmInfo}>
              <h3 className={styles.farmName}>{farmSettings.farmName}</h3>
              <p className={styles.farmSub}>{farmSettings.location}</p>
              <div className={styles.farmMetaPills}>
                {farmSettings.phoneNumber && <span>📞 {farmSettings.phoneNumber}</span>}
                {farmSettings.currencySymbol && (
                  <span>💰 Currency: {farmSettings.currencySymbol}</span>
                )}
              </div>
            </div>
          </div>
          {hasPermission("settings:manage") && (
            <button
              type="button"
              onClick={() => setIsFarmModalOpen(true)}
              className={styles.cardFooterBtn}
            >
              Edit Ranch Details
            </button>
          )}
        </div>
      </section>

      {/* Appearance (Language row removed) */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Appearance</h2>
        <div className={styles.card}>
          <div className={styles.settingRow} style={{ cursor: "default" }}>
            <div className={styles.rowLeft}>
              <Palette size={19} className={styles.rowIcon} />
              <span>Color Theme</span>
            </div>
            <ThemeToggle className={styles.themeToggle} />
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Notifications</h2>
        <div className={styles.card}>
          <div className={styles.settingRow} style={{ cursor: "default" }}>
            <div className={styles.rowLeft}>
              <Bell size={19} className={styles.rowIcon} />
              <span>Push Notifications</span>
            </div>
            <div className={styles.rowRight}>
              <button
                type="button"
                onClick={handlePushToggle}
                className={`${styles.pushToggleBtn} ${
                  isPushEnabled ? styles.pushEnabled : ""
                }`}
              >
                {isPushEnabled ? "Enabled" : "Enable"}
              </button>
            </div>
          </div>
          {isPushEnabled && (
            <>
              <div className={styles.divider} />
              <button
                type="button"
                className={styles.settingRow}
                onClick={handleTestPush}
                disabled={isSendingTest}
              >
                <div className={styles.rowLeft}>
                  <Bell size={19} className={styles.rowIcon} />
                  <span>Send Test Notification</span>
                </div>
                <ChevronRight size={18} className={styles.chevron} />
              </button>
            </>
          )}
        </div>
      </section>

      {/* Data & Security */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Data &amp; Security</h2>
        <div className={styles.card}>
          {hasPermission("exports:download") && (
            <>
              <button
                type="button"
                className={styles.settingRow}
                onClick={() => setIsExportModalOpen(true)}
              >
                <div className={styles.rowLeft}>
                  <Download size={19} className={styles.rowIcon} />
                  <span>Export Ranch Data (CSV)</span>
                </div>
                <ChevronRight size={18} className={styles.chevron} />
              </button>
              <div className={styles.divider} />
            </>
          )}

          <button
            type="button"
            className={styles.settingRow}
            onClick={() => setIsPasswordModalOpen(true)}
          >
            <div className={styles.rowLeft}>
              <Lock size={19} className={styles.rowIcon} />
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
            type="button"
            className={styles.settingRow}
            onClick={() => setIsHelpModalOpen(true)}
          >
            <div className={styles.rowLeft}>
              <HelpCircle size={19} className={styles.rowIcon} />
              <span>Operations Guide &amp; FAQ</span>
            </div>
            <ChevronRight size={18} className={styles.chevron} />
          </button>
        </div>
      </section>

      {/* Logout */}
      <section className={styles.section}>
        <button
          type="button"
          className={`${styles.card} ${styles.logoutCard}`}
          onClick={async () => {
            toast("Logging out...", "success");
            await fetch("/api/auth/logout", { method: "POST" });
            setTimeout(() => router.push("/login"), 400);
          }}
        >
          <div className={styles.rowLeft}>
            <LogOut size={19} />
            <span>Log Out</span>
          </div>
        </button>
      </section>

      <p className={styles.version}>{APP_BRAND_NAME} Operations Portal</p>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
      <EditProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
      <EditFarmProfileModal
        isOpen={isFarmModalOpen}
        onClose={() => setIsFarmModalOpen(false)}
        initialData={farmSettings}
        onSuccess={(updated) => {
          setFarmSettings(updated);
          refreshSession();
        }}
      />
      <HelpGuideModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
      <DataExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
}
