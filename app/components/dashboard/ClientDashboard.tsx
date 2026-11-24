"use client";
import React, { useState } from "react";
import Link from "next/link";
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
  const { hasPermission } = useAuth();
  const farmName = stats.farmName || APP_BRAND_NAME;
  const currency = stats.currencySymbol || "KES";
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <span className={styles.brandTag}>{farmName}</span>
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
            >
              <BarChart3 size={19} />
            </Link>
          )}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="Notifications"
              onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            >
              <Bell size={19} />
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

      {/* Quick Actions (Permission-Gated) */}
      <section className={styles.quickActions}>
        {hasPermission("milk:log") && (
          <Link href="/milk" className={styles.actionCard}>
            <div className={`${styles.actionIcon} ${styles.toneBlue}`}>
              <Droplet size={21} />
            </div>
            <span>Log Milk</span>
          </Link>
        )}
        {hasPermission("finances:manage") ? (
          <Link href="/sales?action=record-transaction" className={styles.actionCard}>
            <div className={`${styles.actionIcon} ${styles.toneAmber}`}>
              <DollarSign size={21} />
            </div>
            <span>Record Sale</span>
          </Link>
        ) : (
          hasPermission("inventory:transact") && (
            <Link href="/inventory?action=record-stock" className={styles.actionCard}>
              <div className={`${styles.actionIcon} ${styles.tonePurple}`}>
                <Package size={21} />
              </div>
              <span>Stock In/Out</span>
            </Link>
          )
        )}
        {hasPermission("health:manage") ? (
          <Link href="/breeding?action=log-health" className={styles.actionCard}>
            <div className={`${styles.actionIcon} ${styles.toneRose}`}>
              <HeartPulse size={21} />
            </div>
            <span>Log Health</span>
          </Link>
        ) : (
          hasPermission("analytics:view") && (
            <Link href="/analytics" className={styles.actionCard}>
              <div className={`${styles.actionIcon} ${styles.toneEmerald}`}>
                <BarChart3 size={21} />
              </div>
              <span>Analytics</span>
            </Link>
          )
        )}
      </section>

      {/* At a Glance KPI Bento Grid */}
      <section className={styles.statsGrid}>
        <Link href="/herd" className={styles.statCard}>
          <div className={styles.statHeader}>
            <h3>Active Herd</h3>
            <ChevronRight size={17} className={styles.statIcon} />
          </div>
          <p className={`${styles.statValue} tabular-nums`}>{stats.herd.total}</p>
          <div className={styles.statFooter}>
            <span>{stats.herd.dairy} Dairy</span> • <span>{stats.herd.indigenous} Indigenous</span>
            {stats.herd.sick ? (
              <span className={styles.sickHighlight}> • {stats.herd.sick} Sick</span>
            ) : (
              ""
            )}
          </div>
        </Link>

        <Link href="/milk" className={styles.statCard}>
          <div className={styles.statHeader}>
            <h3>Today&apos;s Yield</h3>
            <ChevronRight size={17} className={styles.statIcon} />
          </div>
          <p className={`${styles.statValue} tabular-nums`}>
            {stats.milk.todayYield} <span className={styles.unit}>Liters</span>
          </p>
          <div className={styles.statFooter}>
            <span className={stats.milk.yieldDiff >= 0 ? styles.positive : styles.negative}>
              {stats.milk.yieldDiff >= 0 ? "↑" : "↓"} {Math.abs(stats.milk.yieldDiff)}L
            </span>{" "}
            vs yesterday
          </div>
        </Link>

        {stats.finance !== null ? (
          <Link href="/sales" className={`${styles.statCard} ${styles.statCardWideMobile}`}>
            <div className={styles.statHeader}>
              <h3>Month Revenue</h3>
              <ChevronRight size={17} className={styles.statIcon} />
            </div>
            <p className={`${styles.statValue} tabular-nums`}>
              {formatCurrency(stats.finance.income, currency)}
            </p>
            <div className={`${styles.statFooter} tabular-nums`}>
              Expenses: {formatCurrency(stats.finance.expenses, currency)}
            </div>
          </Link>
        ) : (
          <Link href="/breeding" className={`${styles.statCard} ${styles.statCardWideMobile}`}>
            <div className={styles.statHeader}>
              <h3>Upcoming Schedule</h3>
              <ChevronRight size={17} className={styles.statIcon} />
            </div>
            <p className={`${styles.statValue} tabular-nums`}>
              {stats.operations?.pendingEvents ?? 0}
            </p>
            <div className={styles.statFooter}>
              <span>30-day events</span> •{" "}
              <span>{stats.operations?.lowStockCount ?? 0} low stock</span>
            </div>
          </Link>
        )}
      </section>

      {/* Smart Alerts */}
      <section className={styles.alertsSection}>
        <div className={styles.alertsHeader}>
          <h2 className={styles.sectionTitle}>Smart Ranch Alerts</h2>
          {stats.alerts.length > 0 && (
            <span className={`${styles.alertCountPill} tabular-nums`}>
              {stats.alerts.length}
            </span>
          )}
        </div>
        <div className={styles.alertsList}>
          {stats.alerts.length > 0 ? (
            stats.alerts.map((alert, i) => (
              <div
                key={i}
                className={`${styles.alertItem} ${
                  alert.type === "warning" ? styles.alertWarning : styles.alertInfo
                }`}
              >
                <div className={styles.alertIconBadge}>
                  {alert.type === "warning" ? (
                    <AlertTriangle size={18} />
                  ) : (
                    <Activity size={18} />
                  )}
                </div>
                <div className={styles.alertContent}>
                  <h4>{alert.title}</h4>
                  <p>{alert.description}</p>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.alertsEmpty}>
              No active alerts — operations are running smoothly.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
