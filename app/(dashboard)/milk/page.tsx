"use client";
import React, { useState } from "react";
import styles from "./page.module.css";
import { CheckCircle2 } from "lucide-react";

import AnimalIcon from "../../components/ui/AnimalIcon";

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
  const [records, setRecords] = useState<MilkingRecord[]>(MOCK_COWS);
  
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
          <h1 className={styles.pageTitle}>Log Milk</h1>
          <p className={styles.subtitle}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
        </div>
      </header>

      {/* Session Toggle */}
      <div className={styles.sessionToggle}>
         <button 
           className={`${styles.sessionBtn} ${session === 'Morning' ? styles.activeSession : ''}`}
           onClick={() => setSession('Morning')}
         >
           🌅 Morning
         </button>
         <button 
           className={`${styles.sessionBtn} ${session === 'Evening' ? styles.activeSession : ''}`}
           onClick={() => setSession('Evening')}
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
      <div className={styles.batchList}>
        <div className={styles.listHeader}>
          <span>Tag ID</span>
          <span>Amount (L)</span>
        </div>

        {records.map(record => (
          <div key={record.id} className={styles.recordRow}>
             <div className={styles.cowTag}>
               <span className={styles.badge} style={{display: "flex", alignItems: "center", gap: "6px"}}>
                 <AnimalIcon species={record.species} size={16} />
                 {record.tagNumber} {record.name && <span style={{fontWeight: 500, opacity: 0.8}}>({record.name})</span>}
               </span>
             </div>
             
             <div className={styles.inputControls}>
                <button className={styles.qtyBtn} onClick={() => decrement(record.id)}>-</button>
                <input 
                  type="number" 
                  className={styles.qtyInput} 
                  value={record.amount} 
                  onChange={(e) => handleAmountChange(record.id, e.target.value)}
                  placeholder="0"
                />
                <button className={styles.qtyBtn} onClick={() => increment(record.id)}>+</button>
             </div>
          </div>
        ))}
      </div>

      {/* Save Button floating right above nav */}
      <div className={styles.stickyFooter}>
         <button className={styles.submitBtn}>
            <CheckCircle2 size={20} />
            Save {session} Session
         </button>
      </div>
    </div>
  );
}
