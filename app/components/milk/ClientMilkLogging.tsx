"use client";
import React, { useState, useEffect } from "react";
import styles from "../../../(dashboard)/milk/page.module.css";
import { CheckCircle2, History, Clock, Search, Info } from "lucide-react";
import AnimalIcon from "../ui/AnimalIcon";
import { useToast } from "../ui/Toast";
import EmptyState from "../ui/EmptyState";
import { logBatchMilkSession } from "@/actions/milk.actions";
import { useRouter } from "next/navigation";

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
  const [session, setSession] = useState<"Morning" | "Evening">("Morning");
  const [activeTab, setActiveTab] = useState<"log" | "history">("log");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    rec.tagNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (rec.name && rec.name.toLowerCase().includes(searchQuery.toLowerCase()))
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
      const response = await logBatchMilkSession({
        session: session.toUpperCase(),
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
           🪣 Log Today
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

          {/* Session Toggle */}
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
              <span className={styles.summaryLabel}>Total Session Yield</span>
              <strong className={styles.summaryTotal}>{totalYield} <small>Liters</small></strong>
            </div>
          </div>

          {/* Batch Entry List */}
          {filteredRecords.length > 0 ? (
            <div className={styles.batchList}>
              <div className={styles.listHeader}>
                <span>Tag ID</span>
                <span>Amount (L)</span>
              </div>

              {filteredRecords.map(record => (
                <div key={record.id} className={styles.recordRow}>
                  <div className={styles.cowTag}>
                     <span className={styles.badge} style={{display: "flex", alignItems: "center", gap: "6px"}}>
                      <AnimalIcon species={record.species} size={16} />
                      {record.tagNumber} {record.name && <span style={{fontWeight: 500, opacity: 0.8}}>({record.name})</span>}
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
                      aria-label={`Amount for ${record.tagNumber}`}
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
          {historyData.length === 0 ? (
             <div style={{padding: '2rem', textAlign: 'center', opacity: 0.6}}>No milk history found.</div>
          ) : (
            <>
              <div className={styles.listHeader}>
                <span>Date</span>
                <span>Session</span>
                <span>Total</span>
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
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
