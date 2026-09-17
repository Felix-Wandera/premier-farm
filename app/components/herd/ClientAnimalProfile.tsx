"use client";
import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Edit, Activity, Droplet, HeartPulse, Info, DollarSign, Skull } from "lucide-react";
import styles from "../../(dashboard)/herd/[id]/page.module.css";
import AnimalIcon from "../ui/AnimalIcon";
import EditAnimalModal from "./EditAnimalModal";
import StatusUpdateModal from "./StatusUpdateModal";
import { updateAnimal, updateAnimalStatus } from "@/actions/animal.actions";

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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  if (!initialData) {
    return <div style={{padding: '2rem', textAlign: 'center'}}>Animal not found.</div>;
  }

  const ageInfo = calculateAge(initialData.dateOfBirth);
  const prettySpecies = formatSpecies(initialData.species);
  const displayStatus = initialData.status.charAt(0).toUpperCase() + initialData.status.slice(1).toLowerCase();

  // Find last calving date
  const births = initialData.breedingEvents?.filter((e: any) => e.eventType === "BIRTH" && e.actualDate) || [];
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
           <button className={styles.iconBtn} aria-label="Edit Profile" onClick={() => setIsEditModalOpen(true)}><Edit size={20} /></button>
        </div>
      </header>

      <EditAnimalModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        animal={initialData}
        onSave={(data) => updateAnimal(initialData.id, data)}
      />

      <StatusUpdateModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        animal={initialData}
        onSave={(id, status, data) => updateAnimalStatus(id, status, data)}
      />

      {/* Cover Profile */}
      <section className={styles.cover}>
        <div
          className={styles.profileBadge}
          onClick={() => {
            if (initialData.status !== "DECEASED" && initialData.status !== "SOLD") {
              setIsStatusModalOpen(true);
            }
          }}
          style={{ cursor: (initialData.status !== "DECEASED" && initialData.status !== "SOLD") ? "pointer" : "default" }}
        >
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

        {/* Sale Banner if SOLD */}
        {initialData.status === "SOLD" && (
          <div
            style={{
              marginTop: "1.25rem",
              padding: "0.85rem 1.25rem",
              borderRadius: "12px",
              backgroundColor: "rgba(234, 179, 8, 0.12)",
              border: "1px solid rgba(234, 179, 8, 0.35)",
              color: "var(--color-text-main)",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              textAlign: "left",
            }}
          >
            <div style={{ padding: "0.5rem", borderRadius: "50%", backgroundColor: "rgba(234, 179, 8, 0.2)", color: "#ca8a04" }}>
              <DollarSign size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#ca8a04" }}>
                Sold for KES {initialData.sale?.amount ? initialData.sale.amount.toLocaleString() : "N/A"}
              </div>
              <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>
                {initialData.sale?.buyerName ? `Buyer: ${initialData.sale.buyerName} • ` : ""}
                {initialData.sale?.date ? new Date(initialData.sale.date).toLocaleDateString() : ""}
                {initialData.sale?.notes && ` • ${initialData.sale.notes}`}
              </div>
            </div>
          </div>
        )}

        {/* Deceased Banner if DECEASED */}
        {initialData.status === "DECEASED" && (
          <div
            style={{
              marginTop: "1.25rem",
              padding: "0.85rem 1.25rem",
              borderRadius: "12px",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "var(--color-text-main)",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              textAlign: "left",
            }}
          >
            <div style={{ padding: "0.5rem", borderRadius: "50%", backgroundColor: "rgba(239, 68, 68, 0.2)", color: "#dc2626" }}>
              <Skull size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#dc2626" }}>
                Deceased
              </div>
              <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>
                {initialData.causeOfDeath ? `Cause: ${initialData.causeOfDeath} • ` : ""}
                {initialData.dateOfDeath ? new Date(initialData.dateOfDeath).toLocaleDateString() : ""}
              </div>
            </div>
          </div>
        )}
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
                 {initialData.mother?.id ? (
                   <Link
                     href={`/herd/${initialData.mother.id}`}
                     className={styles.parentCard}
                     style={{ textDecoration: "none", color: "inherit", display: "block" }}
                   >
                     {initialData.mother.tagNumber} {initialData.mother.name ? `(${initialData.mother.name})` : ''} &rarr;
                   </Link>
                 ) : (
                   <div className={styles.parentCard}>
                     {initialData.mother ? `${initialData.mother.tagNumber} ${initialData.mother.name ? `(${initialData.mother.name})` : ''}` : "Unknown"}
                   </div>
                 )}
               </div>
            </div>

            {/* Offspring / Progeny List */}
            <div style={{ marginTop: "2rem", borderTop: "1px solid var(--color-border)", paddingTop: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Offspring & Progeny</h3>
                <span style={{ fontSize: "0.85rem", opacity: 0.6, fontWeight: 500 }}>
                  {initialData.offspring?.length || 0} recorded
                </span>
              </div>

              {initialData.offspring && initialData.offspring.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
                  {initialData.offspring.map((child: any) => (
                    <Link
                      key={child.id}
                      href={`/herd/${child.id}`}
                      style={{
                        padding: "0.85rem 1rem",
                        borderRadius: "10px",
                        border: "1px solid var(--color-border)",
                        backgroundColor: "var(--color-bg)",
                        textDecoration: "none",
                        color: "inherit",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        transition: "transform 0.15s ease, border-color 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{child.tagNumber}</span>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            padding: "2px 7px",
                            borderRadius: "99px",
                            backgroundColor: child.status === "ACTIVE" ? "rgba(22, 163, 74, 0.15)" : "rgba(100, 116, 139, 0.15)",
                            color: child.status === "ACTIVE" ? "#16a34a" : "inherit",
                            fontWeight: 600,
                          }}
                        >
                          {child.status}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                        {child.name ? `${child.name} • ` : ""}{formatSpecies(child.species)} ({child.gender.toLowerCase()})
                      </div>
                      {child.dateOfBirth && (
                        <div style={{ fontSize: "0.75rem", opacity: 0.6, marginTop: "2px" }}>
                          Born: {new Date(child.dateOfBirth).toLocaleDateString()}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.6 }}>No offspring recorded for this animal.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'milk' && (
           <div className={styles.panel}>
             {(!initialData.milkLogs || initialData.milkLogs.length === 0) ? (
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
             {(!initialData.healthRecords || initialData.healthRecords.length === 0) ? (
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
             {(!initialData.breedingEvents || initialData.breedingEvents.length === 0) ? (
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
