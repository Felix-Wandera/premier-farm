"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Edit, Activity, Droplet, HeartPulse, Info } from "lucide-react";
import styles from "./page.module.css";
import AnimalIcon from "../../../components/ui/AnimalIcon";

export default function AnimalProfile() {
  const params = useParams();
  const id = params.id as string;
  const [activeTab, setActiveTab] = useState<"info" | "milk" | "health" | "breeding">("info");

  // In a real app, fetch animal details based on 'id'
  const animal = { tagNumber: "DC-024", name: "Bella", species: "Dairy Cow", status: "Active", age: "3 yrs 2 mos", weight: "450 kg", lastCalved: "10 Oct 2025" };

  return (
    <div className={styles.container}>
      {/* Sticky Mobile Header */}
      <header className={styles.header}>
        <Link href="/herd" className={styles.backBtn}>
          <ArrowLeft size={24} />
        </Link>
        <div className={styles.headerActions}>
           <button className={styles.iconBtn} aria-label="Edit Profile"><Edit size={20} /></button>
        </div>
      </header>

      {/* Cover Profile */}
      <section className={styles.cover}>
        <div className={styles.profileBadge}>
          <div className={styles.statusDot}></div>
          {animal.status}
        </div>
        <h1 className={styles.tagTitle} style={{display: "flex", alignItems: "center", gap: "12px", justifyContent: "center"}}>
          <AnimalIcon species={animal.species} size={38} />
          {animal.tagNumber} {animal.name && <span style={{fontSize: "0.6em", opacity: 0.8, fontWeight: 600}}>({animal.name})</span>}
        </h1>
        <p className={styles.subtitle}>{animal.species}</p>
        
        <div className={styles.quickStats}>
          <div className={styles.statBox}>
             <span>Age</span><strong>{animal.age}</strong>
          </div>
          <div className={styles.statBox}>
             <span>Weight</span><strong>{animal.weight}</strong>
          </div>
          <div className={styles.statBox}>
             <span>Last Calved</span><strong>{animal.lastCalved}</strong>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <nav className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'info' ? styles.activeTab : ''}`} onClick={() => setActiveTab('info')}>
          <Info size={18} /> Info
        </button>
        <button className={`${styles.tab} ${activeTab === 'milk' ? styles.activeTab : ''}`} onClick={() => setActiveTab('milk')}>
          <Droplet size={18} /> Milk
        </button>
        <button className={`${styles.tab} ${activeTab === 'health' ? styles.activeTab : ''}`} onClick={() => setActiveTab('health')}>
          <Activity size={18} /> Health
        </button>
        <button className={`${styles.tab} ${activeTab === 'breeding' ? styles.activeTab : ''}`} onClick={() => setActiveTab('breeding')}>
          <HeartPulse size={18} /> Breeding
        </button>
      </nav>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'info' && (
          <div className={styles.panel}>
            <h3>Genealogy</h3>
            <div className={styles.genealogyTree}>
               <div className={styles.parent}>
                 <p className={styles.parentLabel}>Sire</p>
                 <div className={styles.parentCard}>Titan (External)</div>
               </div>
               <div className={styles.parent}>
                 <p className={styles.parentLabel}>Dam</p>
                 <div className={styles.parentCard}>DC-002 "Bessie"</div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'milk' && (
           <div className={styles.panel}>
             <div className={styles.emptyState}>
                <Droplet size={48} className={styles.emptyIcon} />
                <p>No recent milk records.</p>
                <button className={styles.primaryBtn}>Log Milk</button>
             </div>
           </div>
        )}

         {activeTab === 'health' && (
           <div className={styles.panel}>
              <div className={styles.timeline}>
                <div className={styles.timelineItem}>
                   <div className={styles.timelineDot}></div>
                   <div className={styles.timelineContent}>
                     <h4>Routine Vaccination</h4>
                     <p>Administered Foot and Mouth disease vaccine.</p>
                     <span className={styles.date}>12 Mar 2026</span>
                   </div>
                </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
