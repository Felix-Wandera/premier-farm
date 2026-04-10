"use client";

import React, { useState } from "react";
import styles from "../../../(dashboard)/breeding/page.module.css";
import { Plus, Calendar, Activity, AlertCircle, CheckCircle2, Search, Info } from "lucide-react";
import AnimalIcon from "../ui/AnimalIcon";
import QuickAddMenu from "../quick-add/QuickAddMenu";
import EmptyState from "../ui/EmptyState";
import { useToast } from "../ui/Toast";

function formatSpecies(s: string) {
  if (s === "DAIRY_COW") return "Dairy Cow";
  if (s === "INDIGENOUS_COW") return "Indigenous";
  if (s === "BULL") return "Bull";
  if (s === "HEIFER") return "Heifer";
  if (s === "SHEEP") return "Sheep";
  if (s === "GOAT") return "Goat";
  return s;
}

export default function ClientBreedingHub({ initialEvents }: { initialEvents: any[] }) {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const toast = useToast();

  const filteredEvents = initialEvents.filter(event =>
    event.tagNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (event.animalName && event.animalName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    event.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const upcomingSoon = filteredEvents.filter(e => e.timeframe === "Next 7 Days");
  const upcomingLater = filteredEvents.filter(e => e.timeframe === "Next 30 Days");

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Breeding & Health</h1>
          <p className={styles.subtitle}>Upcoming events timeline</p>
        </div>
        <button className={styles.monthToggle} aria-label="Select Month">
          <Calendar size={18} />
          <span>Agenda</span>
        </button>
      </header>

      {/* Summary Row */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span className={styles.num}>{initialEvents.length}</span>
          <span>Pending Events</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.num}>{upcomingSoon.length}</span>
          <span>Due this week</span>
        </div>
      </div>

      {/* Search */}
      <div className={styles.searchBox}>
        <Search className={styles.searchIcon} size={20} />
        <input 
          type="text" 
          placeholder="Search by Tag, Name or Event..." 
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className={styles.timelineSection}>
        {filteredEvents.length > 0 ? (
          <>
            {upcomingSoon.length > 0 && (
              <>
                <h3 className={styles.timeGroup}>Next 7 Days</h3>
                <div className={styles.timeline}>
                  {upcomingSoon.map(event => (
                    <div key={event.id} className={styles.timelineCard}>
                      <div className={`${styles.iconLine} ${styles[event.type + 'Line']}`}>
                        {event.type === 'warning' && <AlertCircle size={20} className={styles.iconWarning} />}
                        {event.type === 'info' && <Activity size={20} className={styles.iconInfo} />}
                        {event.type === 'success' && <CheckCircle2 size={20} className={styles.iconSuccess} />}
                        <div className={styles.line}></div>
                      </div>
                      <div className={styles.cardContent}>
                        <div className={styles.cardHeader}>
                          <span className={styles.dateBadge}>{event.date}</span>
                          <span className={styles.cowTag} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <AnimalIcon species={formatSpecies(event.species)} size={14} /> {event.tagNumber} {event.animalName && `(${event.animalName})`}
                          </span>
                        </div>
                        <h4 className={styles.eventTitle}>{event.title}</h4>
                        <p className={styles.eventDesc}>{event.description}</p>
                        {event.type === 'warning' && (
                          <button className={styles.actionBtn} onClick={() => toast("Event marked complete", "success")}>Mark Complete</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {upcomingLater.length > 0 && (
              <>
                <h3 className={styles.timeGroup}>Next 30 Days</h3>
                <div className={styles.timeline}>
                  {upcomingLater.map(event => (
                    <div key={event.id} className={styles.timelineCard}>
                      <div className={`${styles.iconLine} ${styles[event.type + 'Line']}`}>
                        {event.type === 'warning' && <AlertCircle size={20} className={styles.iconWarning} />}
                        {event.type === 'info' && <Activity size={20} className={styles.iconInfo} />}
                        {event.type === 'success' && <CheckCircle2 size={20} className={styles.iconSuccess} />}
                        <div className={styles.line}></div>
                      </div>
                      <div className={styles.cardContent}>
                        <div className={styles.cardHeader}>
                          <span className={styles.dateBadge}>{event.date}</span>
                          <span className={styles.cowTag} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <AnimalIcon species={formatSpecies(event.species)} size={14} /> {event.tagNumber} {event.animalName && `(${event.animalName})`}
                          </span>
                        </div>
                        <h4 className={styles.eventTitle}>{event.title}</h4>
                        <p className={styles.eventDesc}>{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <EmptyState
            icon={<Info size={36} />}
            title="No events found"
            description={searchQuery ? `No breeding or health events matching "${searchQuery}"` : "Your farm holds a clean bill of health! No upcoming events."}
            actionLabel="Add New Event"
            onAction={() => setIsQuickAddOpen(true)}
          />
        )}
      </div>

      {/* Floating Action Button specifically for Event Insertion */}
      <button className={styles.fabMain} aria-label="Add Event" onClick={() => setIsQuickAddOpen(true)}>
        <Plus size={28} color="white" strokeWidth={2.5} />
      </button>

      <QuickAddMenu isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />
    </div>
  );
}
