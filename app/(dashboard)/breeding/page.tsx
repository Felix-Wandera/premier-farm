"use client";

import React, { useState } from "react";
import styles from "./page.module.css";
import { Plus, Calendar, Activity, AlertCircle, CheckCircle2, Search, Info } from "lucide-react";
import AnimalIcon from "../../components/ui/AnimalIcon";
import QuickAddMenu from "../../components/quick-add/QuickAddMenu";
import EmptyState from "../../components/ui/EmptyState";
import { useToast } from "../../components/ui/Toast";

type BreedingEvent = {
  id: string;
  date: string;
  tagNumber: string;
  animalName?: string;
  species: string;
  title: string;
  description: string;
  type: "warning" | "info" | "success";
  timeframe: "Next 7 Days" | "Next 30 Days";
};

const MOCK_EVENTS: BreedingEvent[] = [
  {
    id: "1",
    date: "Tomorrow",
    tagNumber: "DC-024",
    animalName: "Bella",
    species: "Dairy Cow",
    title: "Expected Calving",
    description: "Inseminated 9 months ago by Titan (Ext).",
    type: "warning",
    timeframe: "Next 7 Days"
  },
  {
    id: "2",
    date: "Friday, 29 Mar",
    tagNumber: "IC-012",
    species: "Indigenous",
    title: "Pregnancy Check",
    description: "45 days since insemination.",
    type: "info",
    timeframe: "Next 7 Days"
  },
  {
    id: "3",
    date: "15 Apr",
    tagNumber: "GT-005",
    animalName: "Billy",
    species: "Goat",
    title: "Routine Vaccination",
    description: "CDT Booster schedule.",
    type: "success",
    timeframe: "Next 30 Days"
  }
];

export default function BreedingHub() {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const toast = useToast();

  const filteredEvents = MOCK_EVENTS.filter(event =>
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
                            <AnimalIcon species={event.species} size={14} /> {event.tagNumber} {event.animalName && `(${event.animalName})`}
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
                            <AnimalIcon species={event.species} size={14} /> {event.tagNumber} {event.animalName && `(${event.animalName})`}
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
