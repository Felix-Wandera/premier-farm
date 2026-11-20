"use client";
import React, { useState, useEffect } from "react";
import styles from "../../(dashboard)/milk/page.module.css";
import { CheckCircle2, History, Clock, Search, Info, Trash2, Download, ExternalLink } from "lucide-react";
import AnimalIcon from "../ui/AnimalIcon";
import { useToast } from "../ui/Toast";
import EmptyState from "../ui/EmptyState";
import { logBatchMilkSession, deleteMilkLogSession } from "@/actions/milk.actions";
import { useRouter } from "next/navigation";
import SessionDetailsModal from "./SessionDetailsModal";
import ConfirmationModal from "../ui/ConfirmationModal";

// Formatter helper
function formatSpecies(s: string) {
  if (s === "DAIRY_COW") return "Dairy Cow";
  if (s === "INDIGENOUS_COW") return "Indigenous";
  if (s === "BULL") return "Bull";
  if (s === "HEIFER") return "Heifer";
  if (s === "SHEEP") return "Sheep";
  if (s === "GOAT") return "Goat";
  return s;
}

export default function ClientMilkLogging({ 
  initialCows, 
  historyData 
}: { 
  initialCows: any[], 
  historyData: any[] 
}) {
  const [session, setSession] = useState<"Morning" | "Mid-day" | "Evening">("Morning");
  const todayStr = new Date().toISOString().split('T')[0];
  const [logDate, setLogDate] = useState<string>(todayStr);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<"log" | "history">("log");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSession, setSelectedSession] = useState<{ date: string; session: string } | null>(null);
  const [savedSummary, setSavedSummary] = useState<{
    session: "Morning" | "Mid-day" | "Evening";
    date: string;
    count: number;
    totalLiters: number;
  } | null>(null);
  const [deletingSession, setDeletingSession] = useState<{ date: Date; sessionType: string } | null>(null);
  const toast = useToast();
  const router = useRouter();

  // Convert initialCows to mutable records state
  const [records, setRecords] = useState(
    initialCows.map(cow => ({
      id: cow.id,
      tagNumber: cow.tagNumber,
      name: cow.name,
      species: formatSpecies(cow.species),
      amount: "" as number | "",
    }))
  );

  const filteredRecords = records.filter(rec => 
    (rec.tagNumber ? rec.tagNumber.toLowerCase().includes(searchQuery.toLowerCase()) : false) ||
    (rec.name ? rec.name.toLowerCase().includes(searchQuery.toLowerCase()) : false)
  );
  
  const handleAmountChange = (id: string, val: string) => {
    setRecords(prev => prev.map(rec => 
      rec.id === id 
        ? { ...rec, amount: val === "" ? "" : Number(val) } 
        : rec
    ));
  };

  const increment = (id: string) => {
    setRecords(prev => prev.map(rec => 
      rec.id === id 
        ? { ...rec, amount: (Number(rec.amount) || 0) + 1 } 
        : rec
    ));
  };

  const decrement = (id: string) => {
    setRecords(prev => prev.map(rec => {
      if (rec.id !== id) return rec;
      const current = Number(rec.amount) || 0;
      return { ...rec, amount: current > 0 ? current - 1 : 0 };
    }));
  };

  const totalYield = records.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const handleDeleteSession = (date: Date, sessionType: string) => {
    setDeletingSession({ date, sessionType });
  };

  const confirmDeleteSession = async () => {
    if (!deletingSession || isDeleting) return;
    setIsDeleting(true);

    try {
      const response = await deleteMilkLogSession(deletingSession.date, deletingSession.sessionType.toUpperCase());
      if (response.success) {
        toast(response.message, "success");
        setDeletingSession(null);
        router.refresh();
      } else {
        toast(response.message, "error");
      }
    } catch (e: any) {
      toast("An unexpected error occurred.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveSession = async () => {
    if (isSubmitting) return;

    // Build the payload
    const payloadRecords = records
      .filter(r => (Number(r.amount) || 0) > 0)
      .map(r => ({
        animalId: r.id,
        amount: Number(r.amount)
      }));

    if (payloadRecords.length === 0) {
      toast("No milk yields > 0 entered. Nothing to save.", "error"); // Wait, does useToast take 'error'? Assumed yes.
      return;
    }

    setIsSubmitting(true);
    try {
      const dbSession = session === "Mid-day" ? "MIDDAY" : session.toUpperCase();
      const response = await logBatchMilkSession({
        session: dbSession,
        date: logDate,
        records: payloadRecords
      });

      if (response.success) {
        toast(response.message, "success");
        setSavedSummary({
          session,
          date: logDate,
          count: payloadRecords.length,
          totalLiters: totalYield,
        });
        // Reset amounts and stay on current logging view
        setRecords(prev => prev.map(r => ({ ...r, amount: "" })));
        router.refresh(); // Refresh Server Components to pull latest history
      } else {
        toast(response.message, "error");
      }
    } catch (e: any) {
      toast("An unexpected error occurred.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>
            {activeTab === "history" ? "Milk History" : "Milk Production"}
          </h1>
          <p className={styles.subtitle}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab(prev => prev === 'log' ? 'history' : 'log')}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "0.55rem 0.95rem",
            borderRadius: "12px",
            border: "1px solid var(--color-border)",
            backgroundColor: activeTab === "history" ? "var(--color-primary)" : "var(--color-surface)",
            color: activeTab === "history" ? "white" : "var(--color-text-main)",
            fontWeight: 600,
            fontSize: "0.88rem",
            cursor: "pointer",
            boxShadow: "var(--shadow-sm)",
            transition: "all 0.15s ease",
          }}
          title={activeTab === 'log' ? "View Milk History" : "Back to Record Yield"}
        >
          {activeTab === 'log' ? (
            <>
              <History size={17} />
              <span>History</span>
            </>
          ) : (
            <>
              <span>← Record Yield</span>
            </>
          )}
        </button>
      </header>

      {activeTab === 'log' && (
        <>
          {/* Mobile-Friendly Date Selector */}
          <div style={{ backgroundColor: "var(--color-surface)", padding: "1rem", borderRadius: "12px", border: "1px solid var(--color-border)", marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-sub)" }}>Milking Date</span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => setLogDate(todayStr)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "99px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    border: "1px solid var(--color-border)",
                    backgroundColor: logDate === todayStr ? "var(--color-primary)" : "var(--color-bg)",
                    color: logDate === todayStr ? "white" : "var(--color-text-main)",
                    cursor: "pointer",
                  }}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    setLogDate(y.toISOString().split('T')[0]);
                  }}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "99px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    border: "1px solid var(--color-border)",
                    backgroundColor: logDate !== todayStr ? "var(--color-primary)" : "var(--color-bg)",
                    color: logDate !== todayStr ? "white" : "var(--color-text-main)",
                    cursor: "pointer",
                  }}
                >
                  Yesterday
                </button>
              </div>
            </div>
            <input
              type="date"
              max={todayStr}
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              style={{
                width: "100%",
                minHeight: "44px",
                padding: "0.6rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text-main)",
                fontSize: "0.95rem",
                fontWeight: 600,
              }}
            />
          </div>

          {/* Session Toggle (Morning, Mid-day, Evening) */}
          <div className={styles.sessionToggle} role="tablist" style={{ marginBottom: "0.75rem" }}>
            <button 
              className={`${styles.sessionBtn} ${session === 'Morning' ? styles.activeSession : ''}`}
              onClick={() => setSession('Morning')}
              role="tab"
              aria-selected={session === 'Morning'}
            >
              🌅 Morning
            </button>
            <button 
              className={`${styles.sessionBtn} ${session === 'Mid-day' ? styles.activeSession : ''}`}
              onClick={() => setSession('Mid-day')}
              role="tab"
              aria-selected={session === 'Mid-day'}
            >
              ☀️ Mid-day
            </button>
            <button 
              className={`${styles.sessionBtn} ${session === 'Evening' ? styles.activeSession : ''}`}
              onClick={() => setSession('Evening')}
              role="tab"
              aria-selected={session === 'Evening'}
            >
              🌃 Evening
            </button>
          </div>

          {/* Search Box Placed Directly Above Animals */}
          <div className={styles.searchBox} style={{ marginBottom: "0.75rem" }}>
            <Search className={styles.searchIcon} size={20} />
            <input 
              type="text" 
              placeholder="Search by Tag ID or Name..." 
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Batch Entry List */}
          {filteredRecords.length > 0 ? (
            <div className={styles.batchList}>
              <div className={styles.listHeader}>
                <span>Animal</span>
                <span>Amount (L)</span>
              </div>

              {filteredRecords.map(record => (
                <div key={record.id} className={styles.recordRow}>
                  <div className={styles.cowTag}>
                     <span className={styles.badge} style={{display: "flex", alignItems: "center", gap: "6px"}}>
                      <AnimalIcon species={record.species} size={16} />
                      {record.name || record.tagNumber} {record.tagNumber && record.name && <span style={{fontWeight: 500, opacity: 0.8}}>#{record.tagNumber}</span>}
                    </span>
                  </div>
                  
                  <div className={styles.inputControls}>
                    <button className={styles.qtyBtn} onClick={() => decrement(record.id)} aria-label="Decrease amount">-</button>
                    <input 
                      type="number" 
                      inputMode="numeric"
                      className={styles.qtyInput} 
                      value={record.amount} 
                      onChange={(e) => handleAmountChange(record.id, e.target.value)}
                      placeholder="0"
                      aria-label={`Amount for ${record.name || record.tagNumber || "animal"}`}
                    />
                    <button className={styles.qtyBtn} onClick={() => increment(record.id)} aria-label="Increase amount">+</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState 
              icon={<Info size={36} />}
              title="No cows found"
              description={searchQuery ? `No records matching "${searchQuery}"` : "You haven't added any active dairy animals to your herd yet."}
              actionLabel="Add Animal"
              onAction={() => router.push("/herd")}
            />
          )}

          {/* Sticky Footer Bar with Running Total and Save Action */}
          <div className={styles.stickyFooter}>
            <div
              style={{
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                backgroundColor: "var(--color-surface, #ffffff)",
                padding: "0.55rem 0.85rem 0.55rem 1.25rem",
                borderRadius: "20px",
                boxShadow: "0 12px 30px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.08)",
                border: "1px solid var(--color-border, #e2e8f0)",
                width: "100%",
                maxWidth: "540px",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-text-sub)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {session} Total
                </span>
                <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-text-main)", lineHeight: 1.15 }}>
                  {totalYield} <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-sub)" }}>Liters</span>
                </span>
              </div>

              <button 
                className={styles.submitBtn} 
                onClick={handleSaveSession}
                disabled={isSubmitting || totalYield === 0}
                style={{
                  padding: "0.75rem 1.25rem",
                  borderRadius: "14px",
                  margin: 0,
                }}
              >
                <CheckCircle2 size={18} />
                <span>{isSubmitting ? "Saving..." : `Save ${session}`}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {activeTab === 'history' && (
        <div className={styles.batchList}>
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 0.5rem 0.5rem" }}>
            <a
              href="/api/export?type=milk"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "var(--color-primary, #16a34a)",
                textDecoration: "none",
                padding: "0.4rem 0.8rem",
                borderRadius: "8px",
                backgroundColor: "rgba(22, 163, 74, 0.1)",
              }}
            >
              <Download size={14} /> Export Milk CSV
            </a>
          </div>

          {historyData.length === 0 ? (
             <div style={{padding: '2rem', textAlign: 'center', opacity: 0.6}}>No milk history found.</div>
          ) : (
            <>
              <div className={styles.listHeader}>
                <span>Date</span>
                <span>Session</span>
                <span>Total</span>
                <span style={{ textAlign: "right" }}>Actions</span>
              </div>
              {historyData.map((entry, i) => {
                // Determine 'Today', 'Yesterday', or Date String
                const entryDate = new Date(entry.date);
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                
                let dateStr = entryDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                if (entryDate.toDateString() === today.toDateString()) dateStr = "Today";
                else if (entryDate.toDateString() === yesterday.toDateString()) dateStr = "Yesterday";

                return (
                  <div key={i} className={styles.recordRow}>
                    <div className={styles.cowTag}>
                      <span className={styles.badge}><Clock size={14} /> {dateStr}</span>
                    </div>
                    <div className={styles.cowTag}>
                      <span className={styles.badge}>{entry.session === 'Morning' ? '🌅' : entry.session === 'Evening' ? '🌃' : ''} {entry.session}</span>
                    </div>
                    <div className={styles.cowTag}>
                      <strong>{entry.total} L</strong>
                    </div>
                    <div className={styles.cowTag} style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                      <button
                        onClick={() => setSelectedSession({ date: new Date(entry.date).toISOString(), session: entry.session })}
                        style={{
                          background: "none",
                          border: "1px solid var(--color-border, #cbd5e1)",
                          borderRadius: "6px",
                          cursor: "pointer",
                          color: "var(--color-primary, #16a34a)",
                          padding: "4px 8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                        }}
                        title="View and Edit Individual Cows"
                      >
                        <ExternalLink size={13} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteSession(entry.date, entry.session)}
                        disabled={isDeleting}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-sub)", padding: "4px" }}
                        title="Delete Entire Session"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                )
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

      {/* Confirmation Modal for Session Deletion */}
      <ConfirmationModal
        isOpen={!!deletingSession}
        onClose={() => setDeletingSession(null)}
        onConfirm={confirmDeleteSession}
        title="Delete Entire Milking Session"
        message={
          <span>
            Are you sure you want to delete all milk records for the{" "}
            <strong>{deletingSession?.sessionType}</strong> session on{" "}
            <strong>{deletingSession?.date ? new Date(deletingSession.date).toLocaleDateString() : ""}</strong>? This will permanently wipe all cow yields for this session.
          </span>
        }
        confirmText="Delete Session"
        isLoading={isDeleting}
      />

      {/* Post-Save Success Modal / Action Sheet */}
      {savedSummary && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            padding: "1rem",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSavedSummary(null);
            }
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "420px",
              backgroundColor: "var(--color-surface, #ffffff)",
              color: "var(--color-text-main, #0f172a)",
              borderRadius: "20px",
              padding: "1.75rem 1.5rem 1.5rem",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid var(--color-border, #e2e8f0)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              position: "relative",
            }}
          >
            <button
              onClick={() => setSavedSummary(null)}
              aria-label="Close"
              style={{
                position: "absolute",
                top: "14px",
                right: "14px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-text-muted, #94a3b8)",
                padding: "6px",
                borderRadius: "8px",
                fontSize: "1rem",
              }}
            >
              ✕
            </button>

            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
                backgroundColor: "rgba(22, 163, 74, 0.12)",
                color: "#16a34a",
              }}
            >
              <CheckCircle2 size={32} />
            </div>

            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", fontWeight: 700 }}>
              {savedSummary.session} Session Logged!
            </h3>

            <p style={{ margin: "0 0 1.5rem", fontSize: "0.92rem", color: "var(--color-text-secondary, #64748b)", lineHeight: 1.55 }}>
              Successfully recorded <strong>{savedSummary.count} {savedSummary.count === 1 ? "cow" : "cows"}</strong> for a total of{" "}
              <strong style={{ color: "#16a34a" }}>{savedSummary.totalLiters} Liters</strong> on {new Date(savedSummary.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", width: "100%" }}>
              <button
                type="button"
                onClick={() => {
                  const nextSession = savedSummary.session === "Morning" ? "Mid-day" : savedSummary.session === "Mid-day" ? "Evening" : "Morning";
                  setSession(nextSession);
                  setSavedSummary(null);
                }}
                style={{
                  width: "100%",
                  padding: "0.85rem 1rem",
                  borderRadius: "12px",
                  border: "none",
                  backgroundColor: "var(--color-primary, #16a34a)",
                  color: "white",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 4px 12px rgba(22, 163, 74, 0.3)",
                }}
              >
                Record Next Session ({savedSummary.session === "Morning" ? "☀️ Mid-day" : savedSummary.session === "Mid-day" ? "🌃 Evening" : "🌅 Morning"})
              </button>

              <button
                type="button"
                onClick={() => {
                  setSavedSummary(null);
                  setActiveTab("history");
                }}
                style={{
                  width: "100%",
                  padding: "0.8rem 1rem",
                  borderRadius: "12px",
                  border: "1px solid var(--color-border, #e2e8f0)",
                  backgroundColor: "var(--color-bg, #f8fafc)",
                  color: "var(--color-text-main, #334155)",
                  fontWeight: 600,
                  fontSize: "0.92rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <History size={16} /> View Milk History
              </button>

              <button
                type="button"
                onClick={() => setSavedSummary(null)}
                style={{
                  background: "none",
                  border: "none",
                  padding: "0.5rem",
                  fontSize: "0.85rem",
                  color: "var(--color-text-sub, #64748b)",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Stay on This Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
