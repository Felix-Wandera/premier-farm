"use client";
import React, { useState } from "react";
import styles from "./page.module.css";
import { CheckCircle2, History, Clock, Search, Info } from "lucide-react";
import AnimalIcon from "../../components/ui/AnimalIcon";
import { useToast } from "../../components/ui/Toast";
import EmptyState from "../../components/ui/EmptyState";

type MilkingRecord = {
  id: string;
  tagNumber: string;
  name?: string;
  species: string;
  amount: number | "";
};

const MOCK_COWS: MilkingRecord[] = [
  { id: "1", tagNumber: "DC-024", name: "Bella", species: "Dairy Cow", amount: "" },
  { id: "2", tagNumber: "DC-089", name: "Daisy", species: "Dairy Cow", amount: "" },
  { id: "3", tagNumber: "DC-102", name: "Luna", species: "Dairy Cow", amount: "" },
  { id: "4", tagNumber: "IC-012", name: "", species: "Indigenous", amount: "" },
];

export default function MilkLogging() {
  const [session, setSession] = useState<"Morning" | "Evening">("Morning");
  const [activeTab, setActiveTab] = useState<"log" | "history">("log");
  const [records, setRecords] = useState<MilkingRecord[]>(MOCK_COWS);
  const [searchQuery, setSearchQuery] = useState("");
  const toast = useToast();

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
              description={searchQuery ? `No records matching "${searchQuery}"` : "You haven't added any dairy animals to your herd yet."}
              actionLabel="Add Animal"
              onAction={() => toast("Redirecting to Herd...", "info")}
            />
          )}

          {/* Save Button */}
          <div className={styles.stickyFooter}>
            <button className={styles.submitBtn} onClick={() => toast(`${session} session saved — ${totalYield}L`, "success")}>
              <CheckCircle2 size={20} />
              Save {session} Session
            </button>
          </div>
        </>
      )}

      {activeTab === 'history' && (
        <div className={styles.batchList}>
          <div className={styles.listHeader}>
            <span>Date</span>
            <span>Session</span>
            <span>Total</span>
          </div>
          {[
            { date: "Today", session: "Morning", total: "285 L" },
            { date: "Yesterday", session: "Evening", total: "312 L" },
            { date: "Yesterday", session: "Morning", total: "298 L" },
            { date: "25 Mar", session: "Evening", total: "305 L" },
            { date: "25 Mar", session: "Morning", total: "290 L" },
          ].map((entry, i) => (
            <div key={i} className={styles.recordRow}>
              <div className={styles.cowTag}>
                <span className={styles.badge}><Clock size={14} /> {entry.date}</span>
              </div>
              <div className={styles.cowTag}>
                <span className={styles.badge}>{entry.session === 'Morning' ? '🌅' : '🌃'} {entry.session}</span>
              </div>
              <div className={styles.cowTag}>
                <strong>{entry.total}</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
