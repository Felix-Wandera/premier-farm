"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import styles from "../../(dashboard)/breeding/page.module.css";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Search,
  Info,
  Sparkles,
  HeartPulse,
} from "lucide-react";
import AnimalIcon from "../ui/AnimalIcon";
import EmptyState from "../ui/EmptyState";
import { useToast } from "../ui/Toast";
import NewBreedingEventModal from "./NewBreedingEventModal";
import NewHealthRecordModal from "./NewHealthRecordModal";
import { completeBreedingEvent } from "@/actions/event.actions";
import { useAuth } from "../auth/AuthProvider";
import { QUICK_ACTION_EVENT, QuickActionId } from "@/lib/quick-actions";

function formatSpecies(s: string) {
  if (s === "DAIRY_COW") return "Dairy Cow";
  if (s === "INDIGENOUS_COW") return "Indigenous";
  if (s === "BULL") return "Bull";
  if (s === "HEIFER") return "Heifer";
  if (s === "SHEEP") return "Sheep";
  if (s === "GOAT") return "Goat";
  return s;
}

interface BreedingTimelineEvent {
  id: string;
  type: "warning" | "info" | "success" | string;
  date: string;
  species: string;
  animalName?: string | null;
  tagNumber?: string | null;
  title: string;
  description: string;
  timeframe: string;
}

interface AnimalSummaryOption {
  id: string;
  name: string;
  tagNumber: string | null;
  species: string;
  breed: string | null;
  gender?: string;
}

export default function ClientBreedingHub({
  initialEvents,
  breedingAnimals = [],
  healthAnimals = [],
}: {
  initialEvents: BreedingTimelineEvent[];
  breedingAnimals?: AnimalSummaryOption[];
  healthAnimals?: AnimalSummaryOption[];
}) {
  const searchParams = useSearchParams();
  const initialAction = searchParams.get("action");

  const [isBreedingModalOpen, setIsBreedingModalOpen] = useState(
    () => initialAction === "breeding" || initialAction === "log-breeding"
  );
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(
    () => initialAction === "health" || initialAction === "log-health"
  );
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const toast = useToast();
  const { hasPermission } = useAuth();
  const canManageHealth = hasPermission("health:manage");

  useEffect(() => {
    const handleQuickAction = (e: Event) => {
      const detail = (e as CustomEvent<{ action: QuickActionId }>).detail;
      if (detail?.action === "log-breeding") {
        setIsBreedingModalOpen(true);
      } else if (detail?.action === "log-health") {
        setIsHealthModalOpen(true);
      }
    };
    window.addEventListener(QUICK_ACTION_EVENT, handleQuickAction);
    return () => window.removeEventListener(QUICK_ACTION_EVENT, handleQuickAction);
  }, []);

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

  const filteredEvents = initialEvents.filter(
    (event) =>
      !searchQuery.trim() ||
      (event.tagNumber ? event.tagNumber.toLowerCase().includes(searchQuery.toLowerCase()) : false) ||
      (event.animalName ? event.animalName.toLowerCase().includes(searchQuery.toLowerCase()) : false) ||
      (event.title ? event.title.toLowerCase().includes(searchQuery.toLowerCase()) : false)
  );

  const upcomingSoon = filteredEvents.filter((e) => e.timeframe === "Next 7 Days");
  const upcomingLater = filteredEvents.filter((e) => e.timeframe === "Next 30 Days");

  const renderEventCard = (event: BreedingTimelineEvent) => (
    <div key={event.id} className={styles.timelineCard}>
      <div className={styles.iconBadgeWrap}>
        {event.type === "warning" && (
          <div className={`${styles.eventIconBadge} ${styles.badgeWarn}`}>
            <AlertCircle size={17} />
          </div>
        )}
        {event.type === "info" && (
          <div className={`${styles.eventIconBadge} ${styles.badgeInfo}`}>
            <Activity size={17} />
          </div>
        )}
        {event.type === "success" && (
          <div className={`${styles.eventIconBadge} ${styles.badgeSuccess}`}>
            <CheckCircle2 size={17} />
          </div>
        )}
        <div className={styles.line} />
      </div>

      <div className={styles.cardContent}>
        <div className={styles.cardHeader}>
          <span className={styles.dateBadge}>{event.date}</span>
          <span className={styles.cowTag}>
            <AnimalIcon species={formatSpecies(event.species)} size={15} />
            <span>
              {event.animalName || event.tagNumber}
              {event.tagNumber && event.animalName ? ` (#${event.tagNumber})` : ""}
            </span>
          </span>
        </div>
        <h4 className={styles.eventTitle}>{event.title}</h4>
        <p className={styles.eventDesc}>{event.description}</p>
        {canManageHealth && event.type === "warning" && (
          <button
            type="button"
            className={styles.actionBtn}
            disabled={completingId === event.id}
            onClick={() => handleComplete(event.id)}
          >
            {completingId === event.id ? "Completing..." : "Mark Complete"}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Breeding &amp; Health</h1>
          <p className={styles.subtitle}>Upcoming schedule &amp; veterinary timeline</p>
        </div>

        {/* Desktop Header Actions (Mobile uses BottomNav '+' Quick Actions) */}
        {canManageHealth && (
          <div className={styles.desktopHeaderActions}>
            <button
              type="button"
              onClick={() => setIsBreedingModalOpen(true)}
              className={styles.primaryHeaderBtn}
            >
              <Sparkles size={16} />
              <span>Log Breeding</span>
            </button>

            <button
              type="button"
              onClick={() => setIsHealthModalOpen(true)}
              className={styles.secondaryHeaderBtn}
            >
              <HeartPulse size={16} color="#e11d48" />
              <span>Log Health</span>
            </button>
          </div>
        )}
      </header>

      {/* Summary Row */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span className={`${styles.num} tabular-nums`}>{initialEvents.length}</span>
          <span>Pending Events</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={`${styles.num} tabular-nums`}>{upcomingSoon.length}</span>
          <span>Due This Week</span>
        </div>
      </div>

      {/* Search */}
      <div className={styles.searchBox}>
        <Search className={styles.searchIcon} size={18} />
        <input
          type="text"
          placeholder="Search by animal name, tag, or event..."
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
                <div className={styles.timeline}>{upcomingSoon.map(renderEventCard)}</div>
              </>
            )}

            {upcomingLater.length > 0 && (
              <>
                <h3 className={styles.timeGroup}>Next 30 Days</h3>
                <div className={styles.timeline}>{upcomingLater.map(renderEventCard)}</div>
              </>
            )}
          </>
        ) : (
          <EmptyState
            icon={<Info size={36} />}
            title="No events found"
            description={
              searchQuery
                ? `No breeding or health events matched "${searchQuery}".`
                : "Clean bill of health! No pending breeding or veterinary events."
            }
            actionLabel={canManageHealth ? "Log Breeding Event" : undefined}
            onAction={canManageHealth ? () => setIsBreedingModalOpen(true) : undefined}
          />
        )}
      </div>

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
    </div>
  );
}
