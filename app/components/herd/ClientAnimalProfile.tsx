"use client";
import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Edit, Activity, Droplet, HeartPulse, Info } from "lucide-react";
import styles from "../../(dashboard)/herd/[id]/page.module.css";
import AnimalIcon from "../ui/AnimalIcon";

function calculateAge(dob: Date | null) {
  if (!dob) return "Unknown";
  const diff = Date.now() - new Date(dob).getTime();
  const ageDate = new Date(diff); 
  const years = Math.abs(ageDate.getUTCFullYear() - 1970);
  const months = ageDate.getUTCMonth();
  if (years > 0) return `${years} yrs ${months} mos`;
  if (months > 0) return `${months} mos`;
  return "Newborn";
}

function formatSpecies(s: string) {
  if (s === "DAIRY_COW") return "Dairy Cow";
  if (s === "INDIGENOUS_COW") return "Indigenous";
  if (s === "BULL") return "Bull";
  if (s === "HEIFER") return "Heifer";
  if (s === "SHEEP") return "Sheep";
  if (s === "GOAT") return "Goat";
  return s;
}

export default function ClientAnimalProfile({ initialData }: { initialData: any }) {
  const [activeTab, setActiveTab] = useState<"info" | "milk" | "health" | "breeding">("info");

  if (!initialData) {
    return <div style={{padding: '2rem', textAlign: 'center'}}>Animal not found.</div>;
  }

  const ageInfo = calculateAge(initialData.dateOfBirth);
  const prettySpecies = formatSpecies(initialData.species);
  const displayStatus = initialData.status.charAt(0).toUpperCase() + initialData.status.slice(1).toLowerCase();

  // Find last calving date
  const births = initialData.breedingEvents.filter((e: any) => e.eventType === "BIRTH" && e.actualDate);
  const lastCalved = births.length > 0 
    ? new Date(births[0].actualDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : "Never";

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
          <div className={`${styles.statusDot} ${initialData.status === 'SICK' ? styles.dotSick : ''}`}></div>
          {displayStatus}
        </div>
        <h1 className={styles.tagTitle} style={{display: "flex", alignItems: "center", gap: "12px", justifyContent: "center"}}>
          <AnimalIcon species={prettySpecies} size={38} />
          {initialData.tagNumber} {initialData.name && <span style={{fontSize: "0.6em", opacity: 0.8, fontWeight: 600}}>({initialData.name})</span>}
        </h1>
        <p className={styles.subtitle}>{prettySpecies}</p>
        
        <div className={styles.quickStats}>
          <div className={styles.statBox}>
             <span>Age</span><strong>{ageInfo}</strong>
          </div>
          <div className={styles.statBox}>
             <span>Last Calved</span><strong>{lastCalved}</strong>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <nav className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'info' ? styles.activeTab : ''}`} onClick={() => setActiveTab('info')}>
          <Info size={18} /> Info
        </button>
        {(initialData.species === "DAIRY_COW" || initialData.species === "INDIGENOUS_COW") && initialData.gender === "FEMALE" && (
          <button className={`${styles.tab} ${activeTab === 'milk' ? styles.activeTab : ''}`} onClick={() => setActiveTab('milk')}>
            <Droplet size={18} /> Milk
          </button>
        )}
        <button className={`${styles.tab} ${activeTab === 'health' ? styles.activeTab : ''}`} onClick={() => setActiveTab('health')}>
          <Activity size={18} /> Health
        </button>
        {initialData.gender === "FEMALE" && (
           <button className={`${styles.tab} ${activeTab === 'breeding' ? styles.activeTab : ''}`} onClick={() => setActiveTab('breeding')}>
             <HeartPulse size={18} /> Breeding
           </button>
        )}
      </nav>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'info' && (
          <div className={styles.panel}>
            <h3>Genealogy</h3>
            <div className={styles.genealogyTree}>
               <div className={styles.parent}>
                 <p className={styles.parentLabel}>Sire</p>
                 <div className={styles.parentCard}>{initialData.fatherName || "Unknown"}</div>
               </div>
               <div className={styles.parent}>
                 <p className={styles.parentLabel}>Dam</p>
                 <div className={styles.parentCard}>
                   {initialData.mother ? `${initialData.mother.tagNumber} ${initialData.mother.name ? `(${initialData.mother.name})` : ''}` : "Unknown"}
                 </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'milk' && (
           <div className={styles.panel}>
             {initialData.milkLogs.length === 0 ? (
               <div className={styles.emptyState}>
                 <Droplet size={48} className={styles.emptyIcon} />
                 <p>No recent milk records.</p>
                 <Link href="/milk" className={styles.primaryBtn} style={{textDecoration: 'none'}}>Log Milk</Link>
               </div>
             ) : (
               <div className={styles.timeline}>
                 {initialData.milkLogs.map((log: any) => (
                   <div key={log.id} className={styles.timelineItem}>
                      <div className={styles.timelineDot} style={{background: '#3b82f6'}}></div>
                      <div className={styles.timelineContent}>
                        <h4>{log.amountLiters} Liters</h4>
                        <p>{log.milkingTime} Session</p>
                        <span className={styles.date}>{new Date(log.date).toLocaleDateString()}</span>
                      </div>
                   </div>
                 ))}
               </div>
             )}
           </div>
        )}

         {activeTab === 'health' && (
           <div className={styles.panel}>
             {initialData.healthRecords.length === 0 ? (
               <div style={{opacity: 0.6, padding: '1rem'}}>No health records found.</div>
             ) : (
               <div className={styles.timeline}>
                 {initialData.healthRecords.map((hr: any) => (
                   <div key={hr.id} className={styles.timelineItem}>
                      <div className={styles.timelineDot} style={{background: '#ef4444'}}></div>
                      <div className={styles.timelineContent}>
                        <h4>{hr.recordType}</h4>
                        <p>{hr.description}</p>
                        <span className={styles.date}>{new Date(hr.date).toLocaleDateString()}</span>
                      </div>
                   </div>
                 ))}
               </div>
             )}
           </div>
        )}
        
        {activeTab === 'breeding' && (
           <div className={styles.panel}>
             {initialData.breedingEvents.length === 0 ? (
               <div style={{opacity: 0.6, padding: '1rem'}}>No breeding events found.</div>
             ) : (
               <div className={styles.timeline}>
                 {initialData.breedingEvents.map((ev: any) => (
                   <div key={ev.id} className={styles.timelineItem}>
                      <div className={styles.timelineDot} style={{background: '#ec4899'}}></div>
                      <div className={styles.timelineContent}>
                        <h4>{ev.eventType}</h4>
                        <p>Sire: {ev.sireDetails || "N/A"}</p>
                        <span className={styles.date}>{new Date(ev.date).toLocaleDateString()}</span>
                      </div>
                   </div>
                 ))}
               </div>
             )}
           </div>
        )}
      </div>
    </div>
  );
}
