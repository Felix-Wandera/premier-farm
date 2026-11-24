"use client";
import React, { useState, useEffect } from "react";
import styles from "../../(dashboard)/milk/page.module.css";
import {
  CheckCircle2,
  History,
  Clock,
  Search,
  Info,
  Trash2,
  Download,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import AnimalIcon from "../ui/AnimalIcon";
import { useToast } from "../ui/Toast";
import EmptyState from "../ui/EmptyState";
import { logBatchMilkSession, deleteMilkLogSession } from "@/actions/milk.actions";
import { useRouter } from "next/navigation";
import SessionDetailsModal from "./SessionDetailsModal";
import ConfirmationModal from "../ui/ConfirmationModal";
import OutlierWarningModal from "../ui/OutlierWarningModal";
import ResponsiveSheet from "../ui/ResponsiveSheet";
import sheetStyles from "../ui/ResponsiveSheet.module.css";
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

interface MilkingCowItem {
  id: string;
  tagNumber: string | null;
  name: string;
  species: string;
  status?: string;
  hasRecentTreatment?: boolean;
}

interface MilkHistoryEntry {
  date: Date;
  session: string;
  total: number;
}

export default function ClientMilkLogging({
  initialCows,
  historyData,
}: {
  initialCows: MilkingCowItem[];
  historyData: MilkHistoryEntry[];
}) {
  const { hasPermission } = useAuth();
  const canLogMilk = hasPermission("milk:log");
  const canManageHistory = hasPermission("milk:manage_history");
  const canExport = hasPermission("exports:download");

  const [session, setSession] = useState<"Morning" | "Mid-day" | "Evening">("Morning");
  const todayStr = new Date().toISOString().split("T")[0];
  const [logDate, setLogDate] = useState<string>(todayStr);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<"log" | "history">("log");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outlierState, setOutlierState] = useState<{
    warnings: string[];
    canOverride: boolean;
  } | null>(null);
  const [selectedSession, setSelectedSession] = useState<{
    date: string;
    session: string;
  } | null>(null);
  const [savedSummary, setSavedSummary] = useState<{
    session: "Morning" | "Mid-day" | "Evening";
    date: string;
    count: number;
    totalLiters: number;
  } | null>(null);
  const [deletingSession, setDeletingSession] = useState<{
    date: Date;
    sessionType: string;
  } | null>(null);
  const toast = useToast();
  const router = useRouter();

  const [records, setRecords] = useState(
    initialCows.map((cow) => ({
      id: cow.id,
      tagNumber: cow.tagNumber,
      name: cow.name,
      species: formatSpecies(cow.species),
      status: cow.status || "ACTIVE",
      hasRecentTreatment: Boolean(cow.hasRecentTreatment),
      amount: "" as number | "",
    }))
  );

  useEffect(() => {
    const handleQuickAction = (e: Event) => {
      const detail = (e as CustomEvent<{ action: QuickActionId }>).detail;
      if (detail?.action === "log-milk") {
        setActiveTab("log");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    window.addEventListener(QUICK_ACTION_EVENT, handleQuickAction);
    return () => window.removeEventListener(QUICK_ACTION_EVENT, handleQuickAction);
  }, []);

  const filteredRecords = records.filter(
    (rec) =>
      !searchQuery.trim() ||
      (rec.tagNumber ? rec.tagNumber.toLowerCase().includes(searchQuery.toLowerCase()) : false) ||
      (rec.name ? rec.name.toLowerCase().includes(searchQuery.toLowerCase()) : false)
  );

  const handleAmountChange = (id: string, val: string) => {
    setRecords((prev) =>
      prev.map((rec) =>
        rec.id === id ? { ...rec, amount: val === "" ? "" : Number(val) } : rec
      )
    );
  };

  const increment = (id: string) => {
    setRecords((prev) =>
      prev.map((rec) =>
        rec.id === id
          ? { ...rec, amount: Math.round(((Number(rec.amount) || 0) + 1) * 10) / 10 }
          : rec
      )
    );
  };

  const decrement = (id: string) => {
    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.id !== id) return rec;
        const current = Number(rec.amount) || 0;
        const next = Math.max(0, Math.round((current - 1) * 10) / 10);
        return { ...rec, amount: next === 0 ? "" : next };
      })
    );
  };

  const totalYield =
    Math.round(records.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) * 10) / 10;

  const confirmDeleteSession = async () => {
    if (!deletingSession || isDeleting) return;
    setIsDeleting(true);

    try {
      const response = await deleteMilkLogSession(
        deletingSession.date,
        deletingSession.sessionType.toUpperCase()
      );
      if (response.success) {
        toast(response.message, "success");
        setDeletingSession(null);
        router.refresh();
      } else {
        toast(response.message, "error");
      }
    } catch {
      toast("An unexpected error occurred.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveSession = async (overrideWarnings = false) => {
    if (isSubmitting) return;

    const payloadRecords = records
      .filter((r) => (Number(r.amount) || 0) > 0)
      .map((r) => ({
        animalId: r.id,
        amount: Number(r.amount),
      }));

    if (payloadRecords.length === 0) {
      toast("No milk yields > 0 entered. Nothing to save.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const dbSession = session === "Mid-day" ? "MIDDAY" : session.toUpperCase();
      const response = await logBatchMilkSession({
        session: dbSession,
        date: logDate,
        overrideWarnings,
        records: payloadRecords,
      });

      if (response.code === "OUTLIER_WARNING" && response.warnings) {
        setOutlierState({
          warnings: response.warnings,
          canOverride: Boolean(response.canOverride),
        });
        return;
      }

      setOutlierState(null);

      if (response.success) {
        toast(response.message, "success");
        setSavedSummary({
          session,
          date: logDate,
          count: payloadRecords.length,
          totalLiters: totalYield,
        });
        setRecords((prev) => prev.map((r) => ({ ...r, amount: "" })));
        router.refresh();
      } else {
        toast(response.message, "error");
      }
    } catch {
      toast("An unexpected error occurred.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const yesterdayStr = (() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return y.toISOString().split("T")[0];
  })();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>
            {activeTab === "history" ? "Milk History" : "Milk Production"}
          </h1>
          <p className={styles.subtitle}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab((prev) => (prev === "log" ? "history" : "log"))}
          className={styles.historyBtn}
          aria-label={activeTab === "log" ? "View Milk History" : "Back to Record Yield"}
        >
          {activeTab === "log" ? (
            <>
              <History size={17} />
              <span>History</span>
            </>
          ) : (
            <>
              <ArrowLeft size={17} />
              <span>Log Milk</span>
            </>
          )}
        </button>
      </header>

      {activeTab === "log" && (
        <>
          {/* Compact Unified Control Deck (Date + Session) */}
          <div className={styles.controlDeck}>
            <div className={styles.dateBar}>
              <div className={styles.datePresets}>
                <button
                  type="button"
                  onClick={() => setLogDate(todayStr)}
                  className={`${styles.presetPill} ${
                    logDate === todayStr ? styles.presetActive : ""
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setLogDate(yesterdayStr)}
                  className={`${styles.presetPill} ${
                    logDate === yesterdayStr ? styles.presetActive : ""
                  }`}
                >
                  Yesterday
                </button>
              </div>
              <input
                type="date"
                max={todayStr}
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className={styles.dateInput}
                aria-label="Milking date"
              />
            </div>

            <div className={styles.sessionToggle} role="tablist">
              {(
                [
                  { id: "Morning", emoji: "🌅", label: "Morning" },
                  { id: "Mid-day", emoji: "☀️", label: "Mid-day" },
                  { id: "Evening", emoji: "🌃", label: "Evening" },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`${styles.sessionBtn} ${
                    session === s.id ? styles.activeSession : ""
                  }`}
                  onClick={() => setSession(s.id)}
                  role="tab"
                  aria-selected={session === s.id}
                >
                  <span>{s.emoji}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className={styles.searchBox}>
            <Search className={styles.searchIcon} size={18} />
            <input
              type="text"
              placeholder="Filter cows by name or ear tag..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Batch Entry List */}
          {filteredRecords.length > 0 ? (
            <div className={styles.batchList}>
              <div className={styles.listHeader}>
                <span>Cow</span>
                <span>Yield (Liters)</span>
              </div>

              {filteredRecords.map((record) => (
                <div key={record.id} className={styles.recordRow}>
                  <div className={styles.cowInfo}>
                    <div className={styles.cowAvatar}>
                      <AnimalIcon species={record.species} size={20} />
                    </div>
                    <div className={styles.cowMeta}>
                      <div className={styles.cowNameRow}>
                        <span className={styles.cowName}>
                          {record.name || record.tagNumber}
                        </span>
                        {record.tagNumber && record.name && (
                          <span className={`${styles.cowTagPill} tabular-nums`}>
                            #{record.tagNumber}
                          </span>
                        )}
                      </div>
                      {(record.status === "SICK" || record.hasRecentTreatment) && (
                        <span className={styles.withdrawalBadge}>
                          {record.status === "SICK" ? "Sick" : "Withdrawal?"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.inputControls}>
                    <button
                      type="button"
                      className={styles.qtyBtn}
                      onClick={() => decrement(record.id)}
                      aria-label={`Decrease yield for ${record.name}`}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      min="0"
                      className={`${styles.qtyInput} tabular-nums`}
                      value={record.amount}
                      onChange={(e) => handleAmountChange(record.id, e.target.value)}
                      placeholder="0"
                      aria-label={`Yield in liters for ${record.name || record.tagNumber}`}
                    />
                    <button
                      type="button"
                      className={styles.qtyBtn}
                      onClick={() => increment(record.id)}
                      aria-label={`Increase yield for ${record.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Info size={36} />}
              title="No milking cows found"
              description={
                searchQuery
                  ? `No cows matched "${searchQuery}".`
                  : "Register active female dairy or indigenous cows to start logging milk."
              }
              actionLabel="Go to Herd"
              onAction={() => router.push("/herd")}
            />
          )}

          {/* Sticky Footer Bar */}
          <div className={styles.stickyFooter}>
            <div className={styles.stickyBar}>
              <div className={styles.footerYieldInfo}>
                <span className={styles.footerYieldLabel}>{session} Total</span>
                <span className={`${styles.footerYieldValue} tabular-nums`}>
                  {totalYield} <span className={styles.footerYieldUnit}>Liters</span>
                </span>
              </div>

              <button
                type="button"
                className={styles.submitBtn}
                onClick={() => handleSaveSession(false)}
                disabled={isSubmitting || totalYield === 0 || !canLogMilk}
              >
                <CheckCircle2 size={17} />
                <span>{isSubmitting ? "Saving..." : `Save ${session}`}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {activeTab === "history" && (
        <div className={styles.batchList}>
          {canExport && (
            <div style={{ display: "flex", justifyContent: "flex-end", paddingBottom: "0.4rem" }}>
              <a
                href="/api/export?type=milk"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.csvLink}
              >
                <Download size={14} /> Export Milk CSV
              </a>
            </div>
          )}

          {historyData.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-sub)" }}>
              No milk history logged yet.
            </div>
          ) : (
            <>
              <div className={styles.listHeader}>
                <span>Session</span>
                <span>Date</span>
                <span style={{ textAlign: "right" }}>Actions</span>
              </div>
              {historyData.map((entry, i) => {
                const entryDate = new Date(entry.date);
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);

                let dateStr = entryDate.toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "short",
                });
                if (entryDate.toDateString() === today.toDateString()) dateStr = "Today";
                else if (entryDate.toDateString() === yesterday.toDateString())
                  dateStr = "Yesterday";

                const sessionEmoji =
                  entry.session === "Morning"
                    ? "🌅"
                    : entry.session === "Evening"
                    ? "🌃"
                    : "☀️";

                return (
                  <div key={i} className={styles.historyCard}>
                    <div className={styles.historyCardTop}>
                      <div className={styles.historySessionBadge}>
                        <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>{sessionEmoji}</span>
                        <span>{entry.session} Session</span>
                      </div>
                      <div className={`${styles.historyYield} tabular-nums`}>
                        <strong>{entry.total}</strong> <small>Liters</small>
                      </div>
                    </div>

                    <div className={styles.historyCardMeta}>
                      <span className={styles.historyDateBadge}>
                        <Clock size={13} /> {dateStr}
                      </span>
                    </div>

                    <div className={styles.historyCardActions}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedSession({
                            date: new Date(entry.date).toISOString(),
                            session: entry.session,
                          })
                        }
                        className={styles.historyEditBtn}
                      >
                        <ExternalLink size={14} />
                        <span>View Breakdown</span>
                      </button>
                      {canManageHistory && (
                        <button
                          type="button"
                          onClick={() =>
                            setDeletingSession({ date: entry.date, sessionType: entry.session })
                          }
                          disabled={isDeleting}
                          className={styles.historyDeleteBtn}
                          title="Delete Entire Session"
                          aria-label="Delete Entire Session"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {selectedSession && (
        <SessionDetailsModal
          isOpen={true}
          sessionDate={selectedSession.date}
          sessionName={selectedSession.session}
          onClose={() => setSelectedSession(null)}
          onUpdated={() => router.refresh()}
        />
      )}

      <ConfirmationModal
        isOpen={!!deletingSession}
        onClose={() => setDeletingSession(null)}
        onConfirm={confirmDeleteSession}
        title="Delete Entire Milking Session"
        message={
          <span>
            Are you sure you want to delete all milk records for the{" "}
            <strong>{deletingSession?.sessionType}</strong> session on{" "}
            <strong>
              {deletingSession?.date
                ? new Date(deletingSession.date).toLocaleDateString()
                : ""}
            </strong>
            ? This will permanently wipe all cow yields for this session.
          </span>
        }
        confirmText="Delete Session"
        isLoading={isDeleting}
      />

      <OutlierWarningModal
        isOpen={!!outlierState}
        warnings={outlierState?.warnings || []}
        canOverride={outlierState?.canOverride || false}
        isSubmitting={isSubmitting}
        onCancel={() => setOutlierState(null)}
        onOverride={() => handleSaveSession(true)}
      />

      {/* Post-Save Summary Sheet */}
      <ResponsiveSheet
        isOpen={!!savedSummary}
        onClose={() => setSavedSummary(null)}
        size="sm"
        title={savedSummary ? `${savedSummary.session} Session Logged!` : "Session Saved"}
      >
        {savedSummary && (
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(16, 185, 129, 0.14)",
                color: "#10b981",
              }}
            >
              <CheckCircle2 size={30} />
            </div>

            <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--color-text-sub)", lineHeight: 1.55 }}>
              Recorded <strong>{savedSummary.count} {savedSummary.count === 1 ? "cow" : "cows"}</strong> totaling{" "}
              <strong style={{ color: "var(--color-primary)" }} className="tabular-nums">
                {savedSummary.totalLiters} Liters
              </strong>{" "}
              on{" "}
              {new Date(savedSummary.date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
              .
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", width: "100%", marginTop: "0.25rem" }}>
              <button
                type="button"
                onClick={() => {
                  const nextSession =
                    savedSummary.session === "Morning"
                      ? "Mid-day"
                      : savedSummary.session === "Mid-day"
                      ? "Evening"
                      : "Morning";
                  setSession(nextSession);
                  setSavedSummary(null);
                }}
                className={sheetStyles.primaryBtn}
              >
                Log Next Session (
                {savedSummary.session === "Morning"
                  ? "☀️ Mid-day"
                  : savedSummary.session === "Mid-day"
                  ? "🌃 Evening"
                  : "🌅 Morning"}
                )
              </button>

              <button
                type="button"
                onClick={() => {
                  setSavedSummary(null);
                  setActiveTab("history");
                }}
                className={sheetStyles.secondaryBtn}
                style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              >
                <History size={16} /> View Milk History
              </button>
            </div>
          </div>
        )}
      </ResponsiveSheet>
    </div>
  );
}
