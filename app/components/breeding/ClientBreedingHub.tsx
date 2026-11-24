"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "../../(dashboard)/breeding/page.module.css";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Search,
  Info,
  Sparkles,
  HeartPulse,
  CalendarClock,
  Syringe,
  Stethoscope,
  ShieldPlus,
} from "lucide-react";
import AnimalIcon from "../ui/AnimalIcon";
import EmptyState from "../ui/EmptyState";
import { useToast } from "../ui/Toast";
import NewBreedingEventModal from "./NewBreedingEventModal";
import NewHealthRecordModal from "./NewHealthRecordModal";
import {
  completeBreedingEvent,
  type BreedingScheduleItem,
  type BreedingLogItem,
  type HealthLogItem,
} from "@/actions/event.actions";
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

function formatBreedingTypeLabel(t: string) {
  if (t === "INSEMINATION") return "Artificial Insemination";
  if (t === "NATURAL_MATING") return "Natural Mating";
  if (t === "PREGNANCY_CHECK") return "Pregnancy Check";
  if (t === "BIRTH") return "Birth / Calving";
  return t.replace(/_/g, " ");
}

function formatHealthTypeLabel(t: string) {
  if (t === "VACCINATION") return "Vaccination";
  if (t === "TREATMENT") return "Treatment";
  if (t === "CHECKUP") return "Vet Checkup";
  return t;
}

interface AnimalSummaryOption {
  id: string;
  name: string;
  tagNumber: string | null;
  species: string;
  breed: string | null;
  gender?: string;
}

type HubTab = "schedule" | "breeding" | "health";

export default function ClientBreedingHub({
  scheduleEvents = [],
  breedingRecords = [],
  healthRecords = [],
  canViewFinances = false,
  currencySymbol = "KES",
  breedingAnimals = [],
  healthAnimals = [],
}: {
  scheduleEvents?: BreedingScheduleItem[];
  breedingRecords?: BreedingLogItem[];
  healthRecords?: HealthLogItem[];
  canViewFinances?: boolean;
  currencySymbol?: string;
  breedingAnimals?: AnimalSummaryOption[];
  healthAnimals?: AnimalSummaryOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialAction = searchParams.get("action");
  const initialTabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<HubTab>(() => {
    if (initialTabParam === "health" || initialAction === "health" || initialAction === "log-health") {
      return "health";
    }
    if (initialTabParam === "breeding") return "breeding";
    return "schedule";
  });

  const [breedingFilter, setBreedingFilter] = useState<string>("ALL");
  const [healthFilter, setHealthFilter] = useState<string>("ALL");

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
      router.refresh();
    } else {
      toast(res.message, "error");
    }
  };

  const query = searchQuery.trim().toLowerCase();

  // 1. Filtered Schedule & Gestations
  const filteredSchedule = scheduleEvents.filter(
    (ev) =>
      !query ||
      (ev.tagNumber && ev.tagNumber.toLowerCase().includes(query)) ||
      (ev.animalName && ev.animalName.toLowerCase().includes(query)) ||
      ev.title.toLowerCase().includes(query) ||
      ev.description.toLowerCase().includes(query)
  );

  const urgentSchedule = filteredSchedule.filter(
    (e) => e.bucket === "overdue" || e.bucket === "due_30d"
  );
  const futureGestations = filteredSchedule.filter((e) => e.bucket === "gestation");

  // 2. Filtered Breeding Records
  const filteredBreedingLogs = breedingRecords.filter((rec) => {
    if (breedingFilter !== "ALL" && rec.eventType !== breedingFilter) return false;
    if (!query) return true;
    return (
      rec.animalName.toLowerCase().includes(query) ||
      (rec.tagNumber && rec.tagNumber.toLowerCase().includes(query)) ||
      formatBreedingTypeLabel(rec.eventType).toLowerCase().includes(query) ||
      (rec.sireDetails && rec.sireDetails.toLowerCase().includes(query)) ||
      (rec.notes && rec.notes.toLowerCase().includes(query))
    );
  });

  // 3. Filtered Health Records
  const filteredHealthLogs = healthRecords.filter((rec) => {
    if (healthFilter !== "ALL" && rec.recordType !== healthFilter) return false;
    if (!query) return true;
    return (
      rec.animalName.toLowerCase().includes(query) ||
      (rec.tagNumber && rec.tagNumber.toLowerCase().includes(query)) ||
      formatHealthTypeLabel(rec.recordType).toLowerCase().includes(query) ||
      rec.description.toLowerCase().includes(query)
    );
  });

  const renderScheduleCard = (event: BreedingScheduleItem) => (
    <div key={event.id} className={styles.timelineCard}>
      <div className={styles.iconBadgeWrap}>
        {event.isOverdue ? (
          <div className={`${styles.eventIconBadge} ${styles.badgeWarn}`}>
            <AlertCircle size={17} />
          </div>
        ) : event.bucket === "due_30d" ? (
          <div className={`${styles.eventIconBadge} ${styles.badgeWarn}`}>
            <CalendarClock size={17} />
          </div>
        ) : (
          <div className={`${styles.eventIconBadge} ${styles.badgeInfo}`}>
            <Activity size={17} />
          </div>
        )}
        <div className={styles.line} />
      </div>

      <div className={styles.cardContent}>
        <div className={styles.cardHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
            <span className={styles.dateBadge}>Due {event.dueDateLabel}</span>
            {event.isOverdue ? (
              <span className={styles.statusPillOverdue}>Overdue</span>
            ) : (
              <span className={styles.statusPillOpen}>{event.countdownText}</span>
            )}
          </div>
          <Link href={`/herd/${event.animalId}`} className={styles.cowLink}>
            <AnimalIcon species={formatSpecies(event.species)} size={15} />
            <span>
              {event.animalName}
              {event.tagNumber ? ` (#${event.tagNumber})` : ""}
            </span>
          </Link>
        </div>

        <h4 className={styles.eventTitle}>{event.title}</h4>
        <p className={styles.eventDesc}>{event.description}</p>

        {canManageHealth && (
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
          <p className={styles.subtitle}>
            Gestation schedule, breeding history &amp; veterinary logs
          </p>
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

      {/* Clickable Summary KPI Cards */}
      <div className={styles.summaryRow}>
        <button
          type="button"
          onClick={() => setActiveTab("schedule")}
          className={`${styles.summaryCard} ${
            activeTab === "schedule" ? styles.summaryCardActive : ""
          }`}
        >
          <span className={`${styles.num} tabular-nums`}>{scheduleEvents.length}</span>
          <span>Open Gestations</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("breeding")}
          className={`${styles.summaryCard} ${
            activeTab === "breeding" ? styles.summaryCardActive : ""
          }`}
        >
          <span className={`${styles.num} tabular-nums`}>{breedingRecords.length}</span>
          <span>Breeding Logs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("health")}
          className={`${styles.summaryCard} ${
            activeTab === "health" ? styles.summaryCardActive : ""
          }`}
        >
          <span className={`${styles.num} tabular-nums`}>{healthRecords.length}</span>
          <span>Health Records</span>
        </button>
      </div>

      {/* Primary Section Tabs */}
      <div className={styles.tabsBar} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "schedule"}
          onClick={() => setActiveTab("schedule")}
          className={`${styles.tabBtn} ${activeTab === "schedule" ? styles.tabBtnActive : ""}`}
        >
          <span>Schedule</span>
          <span className={`${styles.tabCountBadge} tabular-nums`}>{scheduleEvents.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "breeding"}
          onClick={() => setActiveTab("breeding")}
          className={`${styles.tabBtn} ${activeTab === "breeding" ? styles.tabBtnActive : ""}`}
        >
          <span>Breeding</span>
          <span className={`${styles.tabCountBadge} tabular-nums`}>{breedingRecords.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "health"}
          onClick={() => setActiveTab("health")}
          className={`${styles.tabBtn} ${activeTab === "health" ? styles.tabBtnActive : ""}`}
        >
          <span>Health</span>
          <span className={`${styles.tabCountBadge} tabular-nums`}>{healthRecords.length}</span>
        </button>
      </div>

      {/* Search */}
      <div className={styles.searchBox}>
        <Search className={styles.searchIcon} size={18} />
        <input
          type="text"
          placeholder={
            activeTab === "health"
              ? "Search health logs by animal, tag, or treatment..."
              : "Search by animal name, ear tag, sire, or event..."
          }
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Sub-Filters for Breeding or Health Tabs */}
      {activeTab === "breeding" && (
        <div className={styles.subFilters}>
          {[
            { id: "ALL", label: "All Events" },
            { id: "INSEMINATION", label: "Insemination" },
            { id: "NATURAL_MATING", label: "Natural Mating" },
            { id: "PREGNANCY_CHECK", label: "Pregnancy Check" },
            { id: "BIRTH", label: "Birth / Calving" },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setBreedingFilter(pill.id)}
              className={`${styles.subFilterPill} ${
                breedingFilter === pill.id ? styles.subFilterPillActive : ""
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === "health" && (
        <div className={styles.subFilters}>
          {[
            { id: "ALL", label: "All Records" },
            { id: "VACCINATION", label: "Vaccinations" },
            { id: "TREATMENT", label: "Treatments" },
            { id: "CHECKUP", label: "Vet Checkups" },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setHealthFilter(pill.id)}
              className={`${styles.subFilterPill} ${
                healthFilter === pill.id ? styles.subFilterPillActive : ""
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      )}

      {/* TAB 1: SCHEDULE & GESTATIONS */}
      {activeTab === "schedule" && (
        <div className={styles.timelineSection}>
          {filteredSchedule.length > 0 ? (
            <>
              {urgentSchedule.length > 0 && (
                <>
                  <h3 className={styles.timeGroup}>Overdue &amp; Due Within 30 Days</h3>
                  <div className={styles.timeline}>
                    {urgentSchedule.map(renderScheduleCard)}
                  </div>
                </>
              )}

              {futureGestations.length > 0 && (
                <>
                  <h3 className={styles.timeGroup}>Active Gestations &amp; Scheduled Checks</h3>
                  <div className={styles.timeline}>
                    {futureGestations.map(renderScheduleCard)}
                  </div>
                </>
              )}
            </>
          ) : (
            <EmptyState
              icon={<Info size={36} />}
              title="No open gestations or due dates"
              description={
                searchQuery
                  ? `No scheduled breeding events matched "${searchQuery}".`
                  : "All recorded events are complete, or no upcoming calvings/checks are currently open."
              }
              actionLabel={canManageHealth ? "Log Breeding Event" : undefined}
              onAction={canManageHealth ? () => setIsBreedingModalOpen(true) : undefined}
            />
          )}
        </div>
      )}

      {/* TAB 2: ALL BREEDING RECORDS */}
      {activeTab === "breeding" && (
        <div className={styles.timelineSection}>
          {filteredBreedingLogs.length > 0 ? (
            <div className={styles.timeline}>
              {filteredBreedingLogs.map((rec) => (
                <div key={rec.id} className={styles.timelineCard}>
                  <div className={styles.iconBadgeWrap}>
                    <div
                      className={`${styles.eventIconBadge} ${
                        rec.isCompleted ? styles.badgeSuccess : styles.badgeInfo
                      }`}
                    >
                      {rec.isCompleted ? <CheckCircle2 size={17} /> : <Sparkles size={17} />}
                    </div>
                    <div className={styles.line} />
                  </div>

                  <div className={styles.cardContent}>
                    <div className={styles.cardHeader}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <span className={styles.dateBadge}>{rec.dateLabel}</span>
                        {rec.eventType === "BIRTH" ? (
                          <span className={styles.statusPillDone}>Birth Recorded</span>
                        ) : rec.isCompleted ? (
                          <span className={styles.statusPillDone}>
                            Completed {rec.actualDateLabel ? `(${rec.actualDateLabel})` : ""}
                          </span>
                        ) : (
                          <span className={styles.statusPillOpen}>Open / In Gestation</span>
                        )}
                      </div>

                      <Link href={`/herd/${rec.animalId}`} className={styles.cowLink}>
                        <AnimalIcon species={formatSpecies(rec.species)} size={15} />
                        <span>
                          {rec.animalName}
                          {rec.tagNumber ? ` (#${rec.tagNumber})` : ""}
                        </span>
                      </Link>
                    </div>

                    <h4 className={styles.eventTitle}>
                      {formatBreedingTypeLabel(rec.eventType)}
                    </h4>

                    <div className={styles.metaRow}>
                      {rec.sireDetails && <span>Sire / Straw: {rec.sireDetails}</span>}
                      {rec.expectedDateLabel && !rec.isCompleted && (
                        <span>• Expected Due: {rec.expectedDateLabel}</span>
                      )}
                    </div>

                    {rec.notes && <p className={styles.eventDesc}>{rec.notes}</p>}

                    {canManageHealth && !rec.isCompleted && (
                      <button
                        type="button"
                        className={styles.actionBtn}
                        disabled={completingId === rec.id}
                        onClick={() => handleComplete(rec.id)}
                      >
                        {completingId === rec.id ? "Completing..." : "Mark Complete"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Sparkles size={36} />}
              title="No breeding records found"
              description={
                searchQuery
                  ? `No breeding records matched "${searchQuery}".`
                  : "No inseminations, matings, pregnancy checks, or births recorded yet."
              }
              actionLabel={canManageHealth ? "Log Breeding Event" : undefined}
              onAction={canManageHealth ? () => setIsBreedingModalOpen(true) : undefined}
            />
          )}
        </div>
      )}

      {/* TAB 3: VETERINARY & HEALTH RECORDS */}
      {activeTab === "health" && (
        <div className={styles.timelineSection}>
          {filteredHealthLogs.length > 0 ? (
            <div className={styles.timeline}>
              {filteredHealthLogs.map((rec) => {
                const icon =
                  rec.recordType === "VACCINATION" ? (
                    <Syringe size={17} />
                  ) : rec.recordType === "TREATMENT" ? (
                    <ShieldPlus size={17} />
                  ) : (
                    <Stethoscope size={17} />
                  );

                const badgeClass =
                  rec.recordType === "TREATMENT"
                    ? styles.badgeRose
                    : rec.recordType === "VACCINATION"
                      ? styles.badgeSuccess
                      : styles.badgeInfo;

                return (
                  <div key={rec.id} className={styles.timelineCard}>
                    <div className={styles.iconBadgeWrap}>
                      <div className={`${styles.eventIconBadge} ${badgeClass}`}>{icon}</div>
                      <div className={styles.line} />
                    </div>

                    <div className={styles.cardContent}>
                      <div className={styles.cardHeader}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <span className={styles.dateBadge}>{rec.dateLabel}</span>
                          {canViewFinances && rec.cost !== null && rec.cost > 0 && (
                            <span className={`${styles.costBadge} tabular-nums`}>
                              {currencySymbol} {rec.cost.toLocaleString()}
                            </span>
                          )}
                        </div>

                        <Link href={`/herd/${rec.animalId}`} className={styles.cowLink}>
                          <AnimalIcon species={formatSpecies(rec.species)} size={15} />
                          <span>
                            {rec.animalName}
                            {rec.tagNumber ? ` (#${rec.tagNumber})` : ""}
                          </span>
                        </Link>
                      </div>

                      <h4 className={styles.eventTitle}>
                        {formatHealthTypeLabel(rec.recordType)}
                      </h4>
                      <p className={styles.eventDesc}>{rec.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<HeartPulse size={36} />}
              title="No health records found"
              description={
                searchQuery
                  ? `No health records matched "${searchQuery}".`
                  : "No vaccinations, treatments, or veterinary checkups recorded yet."
              }
              actionLabel={canManageHealth ? "Log Health Record" : undefined}
              onAction={canManageHealth ? () => setIsHealthModalOpen(true) : undefined}
            />
          )}
        </div>
      )}

      {/* Modals */}
      <NewBreedingEventModal
        isOpen={isBreedingModalOpen}
        onClose={() => setIsBreedingModalOpen(false)}
        animals={breedingAnimals}
        onSuccess={() => setActiveTab("breeding")}
      />

      <NewHealthRecordModal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
        animals={healthAnimals}
        onSuccess={() => setActiveTab("health")}
      />
    </div>
  );
}
