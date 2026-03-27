"use client";
import React, { useState } from "react";
import styles from "./page.module.css";
import { Package, ShieldAlert, History, User, Plus } from "lucide-react";
import { useToast } from "../../components/ui/Toast";

type InventoryItem = {
  id: string;
  name: string;
  category: "Feed" | "Medicine" | "Equipment";
  quantity: number;
  unit: string;
  minThreshold: number;
};

const MOCK_INVENTORY: InventoryItem[] = [
  { id: "1", name: "High-Yield Dairy Meal", category: "Feed", quantity: 18, unit: "bags", minThreshold: 20 },
  { id: "2", name: "Napier Grass Bales", category: "Feed", quantity: 145, unit: "bales", minThreshold: 50 },
  { id: "3", name: "FMD Vaccine", category: "Medicine", quantity: 8, unit: "doses", minThreshold: 10 },
  { id: "4", name: "Milking Salve", category: "Equipment", quantity: 5, unit: "tins", minThreshold: 3 },
];

export default function InventoryManager() {
  const [activeTab, setActiveTab] = useState<"stock" | "ledger">("stock");
  const [items, setItems] = useState<InventoryItem[]>(MOCK_INVENTORY);
  const toast = useToast();

  const increment = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, quantity: item.quantity + 1 } : item));
  };
  const decrement = (id: string) => {
    setItems(prev => prev.map(item => item.id === id && item.quantity > 0 ? { ...item, quantity: item.quantity - 1 } : item));
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Inventory</h1>
          <p className={styles.subtitle}>Manage stock and consumables</p>
        </div>
        <button 
          className={styles.addBtn}
          onClick={() => toast("New item form coming soon!", "info")}
        >
          <Plus size={20} /> Add Item
        </button>
      </header>

      {/* Tabs */}
      <div className={styles.tabToggle}>
         <button 
           className={`${styles.tabBtn} ${activeTab === 'stock' ? styles.activeTab : ''}`}
           onClick={() => setActiveTab('stock')}
         >
           <Package size={18} /> Stock Overview
         </button>
         <button 
           className={`${styles.tabBtn} ${activeTab === 'ledger' ? styles.activeTab : ''}`}
           onClick={() => setActiveTab('ledger')}
         >
           <History size={18} /> Transaction Ledger
         </button>
      </div>

      {activeTab === 'stock' && (
        <div className={styles.stockGrid}>
          {items.map(item => {
            // Calculate progress bar relative to roughly 2.5x the minimum threshold limit
            const maxTrack = item.minThreshold * 2.5; 
            const percent = Math.min((item.quantity / maxTrack) * 100, 100);
            const isCritical = item.quantity <= item.minThreshold;

            return (
              <div key={item.id} className={styles.stockCard}>
                <div className={`${styles.progressBg} ${isCritical ? styles.bgCritical : styles.bgSafe}`} style={{ width: `${percent}%` }}></div>
                
                <div className={styles.cardContent}>
                  <div className={styles.cardHeader}>
                     <span className={styles.categoryBadge}>{item.category}</span>
                     {isCritical && <ShieldAlert size={20} className={styles.alertIcon} />}
                  </div>

                  <h3 className={styles.itemName}>{item.name}</h3>
                  <div className={styles.quantityDisplay}>
                    <span className={`${styles.bigNumber} ${isCritical ? styles.textCritical : ''}`}>{item.quantity}</span>
                    <span className={styles.unit}>{item.unit}</span>
                  </div>

                  {isCritical && <p className={styles.warningText}>Restock needed! (Min: {item.minThreshold})</p>}

                  <div className={styles.quickActions}>
                    <button className={styles.actionBtn} onClick={() => decrement(item.id)}>-</button>
                    <button className={styles.actionBtn} onClick={() => increment(item.id)}>+</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className={styles.ledgerList}>
           <div className={styles.ledgerItem}>
              <div className={`${styles.txIcon} ${styles.txOut}`}>-</div>
              <div className={styles.txInfo}>
                 <h4>Pulled 2 Bags Dairy Meal</h4>
                 <div className={styles.txMeta}>
                   <User size={12} /> <span>Admin</span> &bull; <span>Today 6:00 AM</span>
                 </div>
              </div>
           </div>

           <div className={styles.ledgerItem}>
              <div className={`${styles.txIcon} ${styles.txIn}`}>+</div>
              <div className={styles.txInfo}>
                 <h4>Stock In: Napier Grass (50 bales)</h4>
                 <div className={styles.txMeta}>
                   <User size={12} /> <span>Manager</span> &bull; <span>Yesterday</span>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
