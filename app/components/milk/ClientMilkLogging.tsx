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

  const handleDeleteSession = async (date: Date, sessionType: string) => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      const response = await deleteMilkLogSession(date, sessionType.toUpperCase());
      if (response.success) {
        toast(response.message, "success");
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
        // Reset amounts and switch to history
        setRecords(prev => prev.map(r => ({ ...r, amount: "" })));
        setActiveTab("history");
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
          <h1 className={styles.pageTitle}>Milk Production</h1>
          <p className={styles.subtitle}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
        </div>
      </header>

      {/* View Tabs */}
      <div className={styles.sessionToggle} role="tablist">
         <button
           className={`${styles.sessionBtn} ${activeTab === 'log' ? styles.activeSession : ''}`}
           onClick={() => setActiveTab('log')}
           role="tab"
           aria-selected={activeTab === 'log'}
         >
           🪣 Record Yield
         </button>
         <button
           className={`${styles.sessionBtn} ${activeTab === 'history' ? styles.activeSession : ''}`}
           onClick={() => setActiveTab('history')}
           role="tab"
           aria-selected={activeTab === 'history'}
         >
           <History size={16} /> History
         </button>
      </div>

      {activeTab === 'log' && (
        <>
          {/* Mobile-Friendly Date Selector */}
          <div style={{ backgroundColor: "var(--color-surface)", padding: "1rem", borderRadius: "12px", border: "1px solid var(--color-border)", marginBottom: "1rem" }}>
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

          {/* Search */}
          <div className={styles.searchBox}>
            <Search className={styles.searchIcon} size={20} />
            <input 
              type="text" 
              placeholder="Search by Tag ID or Name..." 
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Session Toggle (Morning, Mid-day, Evening) */}
          <div className={styles.sessionToggle} role="tablist">
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

          {/* Summary Card */}
          <div className={styles.summaryCard}>
            <div className={styles.summaryContent}>
              <span className={styles.summaryLabel}>Total {session} Yield ({logDate})</span>
              <strong className={styles.summaryTotal}>{totalYield} <small>Liters</small></strong>
            </div>
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

          {/* Save Button */}
          <div className={styles.stickyFooter}>
            <button 
              className={styles.submitBtn} 
              onClick={handleSaveSession}
              disabled={isSubmitting || totalYield === 0}
            >
              <CheckCircle2 size={20} />
              {isSubmitting ? "Saving..." : `Save ${session} Session`}
            </button>
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
    </div>
  );
}
