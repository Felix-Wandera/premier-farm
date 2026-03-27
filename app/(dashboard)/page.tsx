import styles from "./page.module.css";
import { Plus, Bell, ChevronRight, Activity, TrendingUp, AlertTriangle } from "lucide-react";
import { ThemeToggle } from "../components/theme-toggle/ThemeToggle";

export default function Dashboard() {
  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.greeting}>Good morning, Manager</h1>
          <p className={styles.date}>Thursday, March 27</p>
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
        <div className={styles.actionCard}>
           <div className={styles.actionIcon}><Plus size={24} /></div>
           <span>Record Milk</span>
        </div>
        <div className={styles.actionCard}>
           <div className={styles.actionIcon}><TrendingUp size={24} /></div>
           <span>Add Sale</span>
        </div>
        <div className={styles.actionCard}>
           <div className={styles.actionIcon}><Activity size={24} /></div>
           <span>Log Health</span>
        </div>
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
          <p className={styles.statValue}>$4,250</p>
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
                 <p>Dairy meal is below minimum threshold (200kg).</p>
              </div>
           </div>
           <div className={`${styles.alertItem} ${styles.alertInfo}`}>
              <Activity size={20} className={styles.alertIcon} />
              <div className={styles.alertContent}>
                 <h4>Upcoming Calving</h4>
                 <p>Cow Tag #024 is expected to calve tomorrow.</p>
              </div>
           </div>
        </div>
      </section>
    </div>
  );
}
