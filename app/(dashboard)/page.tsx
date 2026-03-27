"use client";
import { useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { Bell, ChevronRight, Activity, TrendingUp, AlertTriangle, Droplet, DollarSign, HeartPulse } from "lucide-react";
import { ThemeToggle } from "../components/theme-toggle/ThemeToggle";
import AnimalIcon from "../components/ui/AnimalIcon";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
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
          <p className={styles.statValue}>142</p>
          <div className={styles.statFooter}>
             <span>80 Dairy</span> • <span>62 Indigenous</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
             <h3>Today's Yield</h3>
             <ChevronRight size={18} className={styles.statIcon} />
          </div>
          <p className={styles.statValue}>320 <span className={styles.unit}>Liters</span></p>
          <div className={styles.statFooter}>
             <span className={styles.positive}>↑ 24L</span> from yesterday
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
             <h3>Monthly Revenue</h3>
             <ChevronRight size={18} className={styles.statIcon} />
          </div>
          <p className={styles.statValue}>KES 425,000</p>
          <div className={styles.statFooter}>
             <span className={styles.positive}>↑ 12%</span> vs last month
          </div>
        </div>
      </section>

      {/* Smart Alerts */}
      <section className={styles.alertsSection}>
        <h2 className={styles.sectionTitle}>Smart Alerts</h2>
        <div className={styles.alertsList}>
           <div className={`${styles.alertItem} ${styles.alertWarning}`}>
              <AlertTriangle size={20} className={styles.alertIcon} />
              <div className={styles.alertContent}>
                 <h4>Low Feed Inventory</h4>
                 <p>High-Yield Dairy Meal is below minimum threshold (20 bags).</p>
              </div>
           </div>
           <div className={`${styles.alertItem} ${styles.alertInfo}`}>
              <Activity size={20} className={styles.alertIcon} />
              <div className={styles.alertContent}>
                 <h4>Upcoming Calving</h4>
                 <p style={{display:'flex',alignItems:'center',gap:'6px'}}><AnimalIcon species="Dairy Cow" size={16} /> DC-024 (Bella) is expected to calve tomorrow.</p>
              </div>
           </div>
        </div>
      </section>
    </div>
  );
}
