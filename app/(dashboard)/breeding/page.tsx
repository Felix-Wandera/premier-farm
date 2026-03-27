"use client";
import React from "react";
import styles from "./page.module.css";
import { Plus, Calendar, Activity, AlertCircle, CheckCircle2 } from "lucide-react";
import AnimalIcon from "../../components/ui/AnimalIcon";

export default function BreedingHub() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Breeding & Health</h1>
          <p className={styles.subtitle}>Upcoming events timeline</p>
        </div>
        <button className={styles.monthToggle}>
           <Calendar size={18} />
           <span>March</span>
        </button>
      </header>

      {/* Summary Row */}
      <div className={styles.summaryRow}>
         <div className={styles.summaryCard}>
            <span className={styles.num}>12</span>
            <span>Pregnant</span>
         </div>
         <div className={styles.summaryCard}>
            <span className={styles.num}>3</span>
            <span>Due this week</span>
         </div>
      </div>

      <div className={styles.timelineSection}>
        <h3 className={styles.timeGroup}>Next 7 Days</h3>
        <div className={styles.timeline}>
          {/* Card 1 */}
          <div className={styles.timelineCard}>
            <div className={`${styles.iconLine} ${styles.warningLine}`}>
              <AlertCircle size={20} className={styles.iconWarning} />
              <div className={styles.line}></div>
            </div>
            <div className={styles.cardContent}>
               <div className={styles.cardHeader}>
                  <span className={styles.dateBadge}>Tomorrow</span>
                  <span className={styles.cowTag} style={{display: "flex", alignItems: "center", gap: "6px"}}>
                    <AnimalIcon species="Dairy Cow" size={14} /> DC-024 (Bella)
                  </span>
               </div>
               <h4 className={styles.eventTitle}>Expected Calving</h4>
               <p className={styles.eventDesc}>Inseminated 9 months ago by Titan (Ext).</p>
               <button className={styles.actionBtn}>Mark Complete</button>
            </div>
          </div>

          {/* Card 2 */}
          <div className={styles.timelineCard}>
            <div className={`${styles.iconLine} ${styles.infoLine}`}>
              <Activity size={20} className={styles.iconInfo} />
              <div className={styles.line}></div>
            </div>
            <div className={styles.cardContent}>
               <div className={styles.cardHeader}>
                  <span className={styles.dateBadge}>Friday, 29 Mar</span>
                  <span className={styles.cowTag} style={{display: "flex", alignItems: "center", gap: "6px"}}>
                    <AnimalIcon species="Indigenous" size={14} /> IC-012
                  </span>
               </div>
               <h4 className={styles.eventTitle}>Pregnancy Check</h4>
               <p className={styles.eventDesc}>45 days since insemination.</p>
            </div>
          </div>
        </div>

        <h3 className={styles.timeGroup}>Next 30 Days</h3>
        <div className={styles.timeline}>
          {/* Card 3 */}
          <div className={styles.timelineCard}>
            <div className={`${styles.iconLine} ${styles.successLine}`}>
              <CheckCircle2 size={20} className={styles.iconSuccess} />
            </div>
            <div className={styles.cardContent}>
               <div className={styles.cardHeader}>
                  <span className={styles.dateBadge}>15 Apr</span>
                  <span className={styles.cowTag} style={{display: "flex", alignItems: "center", gap: "6px"}}>
                    <AnimalIcon species="Goat" size={14} /> GT-005 (Billy)
                  </span>
               </div>
               <h4 className={styles.eventTitle}>Routine Vaccination</h4>
               <p className={styles.eventDesc}>CDT Booster schedule.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button specifically for Event Insertion */}
      <button className={styles.fabMain} aria-label="Add Event">
         <Plus size={28} color="white" strokeWidth={2.5} />
      </button>
    </div>
  );
}
