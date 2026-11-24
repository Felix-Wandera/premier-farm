"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../../(dashboard)/page.module.css";
import {
  Bell,
  ChevronRight,
  Activity,
  AlertTriangle,
  Droplet,
  DollarSign,
  HeartPulse,
  BarChart3,
  Package,
} from "lucide-react";
import NotificationPopover from "./NotificationPopover";
import { updateFarmName } from "@/actions/settings.actions";
import { useToast } from "../ui/Toast";
import { useAuth } from "../auth/AuthProvider";
import { APP_BRAND_NAME } from "@/lib/branding";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatCurrency(c: number, currency = "KES") {
  try {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(c);
  } catch {
    return `${currency} ${Math.round(c).toLocaleString()}`;
  }
}

type DashboardStats = {
  userName: string | null;
  farmName?: string;
  currencySymbol?: string;
  herd: { total: number; dairy: number; indigenous: number; sick?: number };
  milk: { todayYield: number; yieldDiff: number };
  finance: { income: number; expenses: number } | null;
  operations?: { pendingEvents: number; lowStockCount: number };
  alerts: { type: "warning" | "info"; title: string; description: string }[];
};

export default function ClientDashboard({ stats }: { stats: DashboardStats }) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [farmName, setFarmName] = useState(stats.farmName || APP_BRAND_NAME);
  const [isEditingFarmName, setIsEditingFarmName] = useState(false);
  const [editFarmNameInput, setEditFarmNameInput] = useState(stats.farmName || APP_BRAND_NAME);
  const [isSavingFarmName, setIsSavingFarmName] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const currency = stats.currencySymbol || "KES";
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const handleSaveFarmName = async () => {
    if (!editFarmNameInput.trim()) {
      toast("Farm name cannot be empty.", "error");
      return;
    }
    setIsSavingFarmName(true);
    const res = await updateFarmName(editFarmNameInput.trim());
    setIsSavingFarmName(false);
    if (res.success) {
      toast(res.message, "success");
      setFarmName(editFarmNameInput.trim());
      setIsEditingFarmName(false);
      router.refresh();
    } else {
      toast(res.message, "error");
    }
  };

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span
              style={{
                fontSize: "1.1rem",
                fontWeight: 800,
                letterSpacing: "-0.01em",
                color: "var(--color-primary)",
              }}
            >
              {farmName}
            </span>
          </div>
          <h1 className={styles.greeting}>
            {getGreeting()}
            {stats.userName ? `, ${stats.userName}` : ""}
          </h1>
          <p className={styles.date}>{today}</p>
        </div>
        <div className={styles.headerActions}>
          {hasPermission("analytics:view") && (
            <Link
              href="/analytics"
              className={styles.iconBtn}
              title="Analytics & Reports"
              aria-label="Analytics & Reports"
              style={{ textDecoration: "none", color: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
            >
              <BarChart3 size={20} />
            </Link>
          )}
          <div style={{ position: "relative" }}>
            <button
              className={styles.iconBtn}
              aria-label="Notifications"
              onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            >
              <Bell size={20} />
              {stats.alerts.length > 0 && <span className={styles.pulseBadge} />}
            </button>
            {isPopoverOpen && (
              <NotificationPopover
                alerts={stats.alerts}
                onClose={() => setIsPopoverOpen(false)}
              />
            )}
          </div>
        </div>
      </header>

      {isEditingFarmName && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div style={{ width: "100%", maxWidth: "400px", backgroundColor: "var(--color-surface)", padding: "1.5rem", borderRadius: "16px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)", border: "1px solid var(--color-border)", margin: "1rem" }}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.2rem", fontWeight: 700, color: "var(--color-text-main)" }}>Edit Ranch Name</h3>
            <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-sub)" }}>Ranch / Farm Name *</label>
            <input
              type="text"
              value={editFarmNameInput}
              onChange={(e) => setEditFarmNameInput(e.target.value)}
              placeholder={`e.g. ${APP_BRAND_NAME}`}
              style={{ width: "100%", minHeight: "44px", padding: "0.6rem 0.75rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)", fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem" }}
              autoFocus
            />
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setIsEditingFarmName(false)}
                style={{ padding: "0.6rem 1rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "transparent", color: "var(--color-text-main)", cursor: "pointer", fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFarmName}
                disabled={isSavingFarmName}
                style={{ padding: "0.6rem 1.25rem", borderRadius: "8px", border: "none", backgroundColor: "var(--color-primary)", color: "white", cursor: isSavingFarmName ? "not-allowed" : "pointer", fontWeight: 600 }}
              >
                {isSavingFarmName ? "Saving..." : "Save Name"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Priority: Quick Actions (Permission-Gated) */}
      <section className={styles.quickActions}>
        {hasPermission("milk:log") && (
          <Link href="/milk" className={styles.actionCard}>
            <div className={styles.actionIcon}><Droplet size={24} /></div>
            <span>Record Milk</span>
          </Link>
        )}
        {hasPermission("finances:manage") ? (
          <Link href="/sales" className={styles.actionCard}>
            <div className={styles.actionIcon}><DollarSign size={24} /></div>
            <span>Add Sale</span>
          </Link>
        ) : (
          hasPermission("inventory:transact") && (
            <Link href="/inventory" className={styles.actionCard}>
              <div className={styles.actionIcon}><Package size={24} /></div>
              <span>Update Stock</span>
            </Link>
          )
        )}
        {hasPermission("health:manage") ? (
          <Link href="/breeding?action=health" className={styles.actionCard}>
            <div className={styles.actionIcon}><HeartPulse size={24} /></div>
            <span>Log Health</span>
          </Link>
        ) : (
          hasPermission("analytics:view") && (
            <Link href="/analytics" className={styles.actionCard}>
              <div className={styles.actionIcon}><BarChart3 size={24} /></div>
              <span>Analytics</span>
            </Link>
          )
        )}
      </section>

      {/* At a Glance Stats */}
      <section className={styles.statsGrid}>
        <Link href="/herd" className={styles.statCard} style={{ textDecoration: "none", color: "inherit" }}>
          <div className={styles.statHeader}>
            <h3>Active Herd</h3>
            <ChevronRight size={18} className={styles.statIcon} />
          </div>
          <p className={styles.statValue}>{stats.herd.total}</p>
          <div className={styles.statFooter}>
            <span>{stats.herd.dairy} Dairy</span> • <span>{stats.herd.indigenous} Indigenous</span>
            {stats.herd.sick ? ` • ${stats.herd.sick} Sick` : ""}
          </div>
        </Link>

        <Link href="/milk" className={styles.statCard} style={{ textDecoration: "none", color: "inherit" }}>
          <div className={styles.statHeader}>
            <h3>Today&apos;s Yield</h3>
            <ChevronRight size={18} className={styles.statIcon} />
          </div>
          <p className={styles.statValue}>
            {stats.milk.todayYield} <span className={styles.unit}>Liters</span>
          </p>
          <div className={styles.statFooter}>
            <span className={stats.milk.yieldDiff >= 0 ? styles.positive : ""}>
              {stats.milk.yieldDiff >= 0 ? "↑" : "↓"} {Math.abs(stats.milk.yieldDiff)}L
            </span>{" "}
            from yesterday
          </div>
        </Link>

        {stats.finance !== null ? (
          <Link href="/sales" className={styles.statCard} style={{ textDecoration: "none", color: "inherit" }}>
            <div className={styles.statHeader}>
              <h3>This Month Revenue</h3>
              <ChevronRight size={18} className={styles.statIcon} />
            </div>
            <p className={styles.statValue}>{formatCurrency(stats.finance.income, currency)}</p>
            <div className={styles.statFooter}>
              Expenses: {formatCurrency(stats.finance.expenses, currency)}
            </div>
          </Link>
        ) : (
          <Link href="/breeding" className={styles.statCard} style={{ textDecoration: "none", color: "inherit" }}>
            <div className={styles.statHeader}>
              <h3>Upcoming Schedule</h3>
              <ChevronRight size={18} className={styles.statIcon} />
            </div>
            <p className={styles.statValue}>{stats.operations?.pendingEvents ?? 0}</p>
            <div className={styles.statFooter}>
              <span>30-day events</span> • <span>{stats.operations?.lowStockCount ?? 0} low stock</span>
            </div>
          </Link>
        )}
      </section>

      {/* Smart Alerts */}
      <section className={styles.alertsSection}>
        <h2 className={styles.sectionTitle}>Smart Alerts</h2>
        <div className={styles.alertsList}>
          {stats.alerts.length > 0 ? (
            stats.alerts.map((alert, i) => (
              <div key={i} className={`${styles.alertItem} ${alert.type === "warning" ? styles.alertWarning : styles.alertInfo}`}>
                {alert.type === "warning" ? (
                  <AlertTriangle size={20} className={styles.alertIcon} />
                ) : (
                  <Activity size={20} className={styles.alertIcon} />
                )}
                <div className={styles.alertContent}>
                  <h4>{alert.title}</h4>
                  <p>{alert.description}</p>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: "1rem", opacity: 0.6, textAlign: "center" }}>
              No alerts — everything looks good!
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
