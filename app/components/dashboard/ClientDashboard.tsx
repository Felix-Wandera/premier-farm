"use client";
import Link from "next/link";
import styles from "../../../(dashboard)/page.module.css";
import { Bell, ChevronRight, Activity, TrendingUp, AlertTriangle, Droplet, DollarSign, HeartPulse } from "lucide-react";
import { ThemeToggle } from "../theme-toggle/ThemeToggle";
import AnimalIcon from "../ui/AnimalIcon";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatCurrency(c: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0
  }).format(c);
}

type DashboardStats = {
  herd: { total: number; dairy: number; indigenous: number };
  milk: { todayYield: number; yieldDiff: number };
  finance: { income: number; expenses: number };
  alerts: { type: "warning" | "info"; title: string; description: string }[];
};

export default function ClientDashboard({ stats }: { stats: DashboardStats }) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.greeting}>{getGreeting()}, Manager</h1>
          <p className={styles.date}>{today}</p>
        </div>
        <div className={styles.headerActions}>
           <div className={styles.mobileOnlyToggle}>
             <ThemeToggle className={styles.iconBtn} hideLabel={true} />
           </div>
           <button className={styles.iconBtn} aria-label="Notifications"><Bell size={20} /></button>
        </div>
      </header>
      
      {/* Mobile Priority: Quick Actions */}
      <section className={styles.quickActions}>
        <Link href="/milk" className={styles.actionCard}>
           <div className={styles.actionIcon}><Droplet size={24} /></div>
           <span>Record Milk</span>
        </Link>
        <Link href="/sales" className={styles.actionCard}>
           <div className={styles.actionIcon}><DollarSign size={24} /></div>
           <span>Add Sale</span>
        </Link>
        <Link href="/breeding" className={styles.actionCard}>
           <div className={styles.actionIcon}><HeartPulse size={24} /></div>
           <span>Log Health</span>
        </Link>
      </section>

      {/* At a Glance Stats */}
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
             <h3>Active Herd</h3>
             <ChevronRight size={18} className={styles.statIcon} />
          </div>
          <p className={styles.statValue}>{stats.herd.total}</p>
          <div className={styles.statFooter}>
             <span>{stats.herd.dairy} Dairy</span> • <span>{stats.herd.indigenous} Indigenous</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
             <h3>Today's Yield</h3>
             <ChevronRight size={18} className={styles.statIcon} />
          </div>
          <p className={styles.statValue}>{stats.milk.todayYield} <span className={styles.unit}>Liters</span></p>
          <div className={styles.statFooter}>
             <span className={stats.milk.yieldDiff >= 0 ? styles.positive : ''}>{stats.milk.yieldDiff > 0 ? '↑' : '↓'} {Math.abs(stats.milk.yieldDiff)}L</span> from yesterday
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
             <h3>Revenue</h3>
             <ChevronRight size={18} className={styles.statIcon} />
          </div>
          <p className={styles.statValue}>{formatCurrency(stats.finance.income)}</p>
          <div className={styles.statFooter}>
             Expenses: {formatCurrency(stats.finance.expenses)}
          </div>
        </div>
      </section>

      {/* Smart Alerts */}
      <section className={styles.alertsSection}>
        <h2 className={styles.sectionTitle}>Smart Alerts</h2>
        <div className={styles.alertsList}>
           {stats.alerts.length > 0 ? (
             stats.alerts.map((alert, i) => (
               <div key={i} className={`${styles.alertItem} ${alert.type === 'warning' ? styles.alertWarning : styles.alertInfo}`}>
                  {alert.type === 'warning' ? <AlertTriangle size={20} className={styles.alertIcon} /> : <Activity size={20} className={styles.alertIcon} />}
                  <div className={styles.alertContent}>
                     <h4>{alert.title}</h4>
                     <p>{alert.description}</p>
                  </div>
               </div>
             ))
           ) : (
             <div style={{ padding: '1rem', opacity: 0.6, textAlign: 'center' }}>No alerts — everything looks good!</div>
           )}
        </div>
      </section>
    </div>
  );
}
