"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import styles from "../../(dashboard)/breeding/page.module.css";
import { Plus, Calendar, Activity, AlertCircle, CheckCircle2, Search, Info, Sparkles, HeartPulse } from "lucide-react";
import AnimalIcon from "../ui/AnimalIcon";
import QuickAddMenu from "../quick-add/QuickAddMenu";
import EmptyState from "../ui/EmptyState";
import { useToast } from "../ui/Toast";
import NewBreedingEventModal from "./NewBreedingEventModal";
import NewHealthRecordModal from "./NewHealthRecordModal";
import { completeBreedingEvent } from "@/actions/event.actions";

function formatSpecies(s: string) {
  if (s === "DAIRY_COW") return "Dairy Cow";
  if (s === "INDIGENOUS_COW") return "Indigenous";
  if (s === "BULL") return "Bull";
  if (s === "HEIFER") return "Heifer";
  if (s === "SHEEP") return "Sheep";
  if (s === "GOAT") return "Goat";
  return s;
}

export default function ClientBreedingHub({
  initialEvents,
  breedingAnimals = [],
  healthAnimals = [],
}: {
  initialEvents: any[];
  breedingAnimals?: any[];
  healthAnimals?: any[];
}) {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isBreedingModalOpen, setIsBreedingModalOpen] = useState(false);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const searchParams = useSearchParams();
  const toast = useToast();

  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "health") {
      setIsHealthModalOpen(true);
    } else if (action === "breeding") {
      setIsBreedingModalOpen(true);
    }
  }, [searchParams]);

  const handleComplete = async (eventId: string) => {
    setCompletingId(eventId);
    const res = await completeBreedingEvent(eventId);
    setCompletingId(null);

    if (res.success) {
      toast(res.message, "success");
    } else {
      toast(res.message, "error");
    }
  };

  const filteredEvents = initialEvents.filter((event) =>
    event.tagNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (event.animalName && event.animalName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    event.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const upcomingSoon = filteredEvents.filter((e) => e.timeframe === "Next 7 Days");
  const upcomingLater = filteredEvents.filter((e) => e.timeframe === "Next 30 Days");

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Breeding & Health</h1>
          <p className={styles.subtitle}>Upcoming events & herd health timeline</p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setIsBreedingModalOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "var(--color-primary, #16a34a)",
              color: "#ffffff",
              border: "none",
              padding: "0.5rem 0.9rem",
              borderRadius: "99px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(22, 163, 74, 0.25)",
              transition: "all 0.2s ease",
            }}
          >
            <Sparkles size={16} />
            <span>Log Breeding</span>
          </button>

          <button
            onClick={() => setIsHealthModalOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "var(--color-surface, #ffffff)",
              color: "var(--color-text-main, #0f172a)",
              border: "1px solid var(--color-border, #e2e8f0)",
              padding: "0.5rem 0.9rem",
              borderRadius: "99px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
              boxShadow: "var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05))",
              transition: "all 0.2s ease",
            }}
          >
            <HeartPulse size={16} color="#e11d48" />
            <span>Log Health</span>
          </button>
        </div>
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
                  {upcomingSoon.map((event) => (
                    <div key={event.id} className={styles.timelineCard}>
                      <div className={`${styles.iconLine} ${styles[event.type + "Line"]}`}>
                        {event.type === "warning" && <AlertCircle size={20} className={styles.iconWarning} />}
                        {event.type === "info" && <Activity size={20} className={styles.iconInfo} />}
                        {event.type === "success" && <CheckCircle2 size={20} className={styles.iconSuccess} />}
                        <div className={styles.line}></div>
                      </div>
                      <div className={styles.cardContent}>
                        <div className={styles.cardHeader}>
                          <span className={styles.dateBadge}>{event.date}</span>
                          <span className={styles.cowTag} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <AnimalIcon species={formatSpecies(event.species)} size={14} /> {event.tagNumber}{" "}
                            {event.animalName && `(${event.animalName})`}
                          </span>
                        </div>
                        <h4 className={styles.eventTitle}>{event.title}</h4>
                        <p className={styles.eventDesc}>{event.description}</p>
                        {event.type === "warning" && (
                          <button
                            className={styles.actionBtn}
                            disabled={completingId === event.id}
                            onClick={() => handleComplete(event.id)}
                          >
                            {completingId === event.id ? "Completing..." : "Mark Complete"}
                          </button>
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
                  {upcomingLater.map((event) => (
                    <div key={event.id} className={styles.timelineCard}>
                      <div className={`${styles.iconLine} ${styles[event.type + "Line"]}`}>
                        {event.type === "warning" && <AlertCircle size={20} className={styles.iconWarning} />}
                        {event.type === "info" && <Activity size={20} className={styles.iconInfo} />}
                        {event.type === "success" && <CheckCircle2 size={20} className={styles.iconSuccess} />}
                        <div className={styles.line}></div>
                      </div>
                      <div className={styles.cardContent}>
                        <div className={styles.cardHeader}>
                          <span className={styles.dateBadge}>{event.date}</span>
                          <span className={styles.cowTag} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <AnimalIcon species={formatSpecies(event.species)} size={14} /> {event.tagNumber}{" "}
                            {event.animalName && `(${event.animalName})`}
                          </span>
                        </div>
                        <h4 className={styles.eventTitle}>{event.title}</h4>
                        <p className={styles.eventDesc}>{event.description}</p>
                        {event.type === "warning" && (
                          <button
                            className={styles.actionBtn}
                            disabled={completingId === event.id}
                            onClick={() => handleComplete(event.id)}
                          >
                            {completingId === event.id ? "Completing..." : "Mark Complete"}
                          </button>
                        )}
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
            description={
              searchQuery
                ? `No breeding or health events matching "${searchQuery}"`
                : "Your farm holds a clean bill of health! No pending upcoming events."
            }
            actionLabel="Record Breeding Event"
            onAction={() => setIsBreedingModalOpen(true)}
          />
        )}
      </div>

      {/* Floating Action Button specifically for Event Insertion */}
      <button className={styles.fabMain} aria-label="Add Event" onClick={() => setIsQuickAddOpen(true)}>
        <Plus size={28} color="white" strokeWidth={2.5} />
      </button>

      {/* Modals */}
      <NewBreedingEventModal
        isOpen={isBreedingModalOpen}
        onClose={() => setIsBreedingModalOpen(false)}
        animals={breedingAnimals}
      />

      <NewHealthRecordModal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
        animals={healthAnimals}
      />

      <QuickAddMenu isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />
    </div>
  );
}
