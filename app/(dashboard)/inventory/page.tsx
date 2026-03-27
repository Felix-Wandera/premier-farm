"use client";
import React, { useState } from "react";
import styles from "./page.module.css";
import { Package, ShieldAlert, History, User, Plus, Search, Info } from "lucide-react";
import { useToast } from "../../components/ui/Toast";
import EmptyState from "../../components/ui/EmptyState";

type InventoryItem = {
  id: string;
  name: string;
  category: "Feed" | "Medicine" | "Equipment";
  quantity: number;
  unit: string;
  minThreshold: number;
};

type LedgerEntry = {
  id: string;
  description: string;
  change: number;
  user: string;
  date: string;
};

const MOCK_INVENTORY: InventoryItem[] = [
  { id: "1", name: "High-Yield Dairy Meal", category: "Feed", quantity: 18, unit: "bags", minThreshold: 20 },
  { id: "2", name: "Napier Grass Bales", category: "Feed", quantity: 145, unit: "bales", minThreshold: 50 },
  { id: "3", name: "FMD Vaccine", category: "Medicine", quantity: 8, unit: "doses", minThreshold: 10 },
  { id: "4", name: "Milking Salve", category: "Equipment", quantity: 5, unit: "tins", minThreshold: 3 },
];

const MOCK_LEDGER: LedgerEntry[] = [
  { id: "L1", description: "Pulled 2 Bags Dairy Meal", change: -2, user: "Admin", date: "Today 6:00 AM" },
  { id: "L2", description: "Stock In: Napier Grass (50 bales)", change: 50, user: "Manager", date: "Yesterday" }
];

export default function InventoryManager() {
  const [activeTab, setActiveTab] = useState<"stock" | "ledger">("stock");
  const [items, setItems] = useState<InventoryItem[]>(MOCK_INVENTORY);
  const [searchQuery, setSearchQuery] = useState("");
  const toast = useToast();

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLedger = MOCK_LEDGER.filter(entry => 
    entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.user.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <div className={styles.tabToggle} role="tablist">
         <button 
           className={`${styles.tabBtn} ${activeTab === 'stock' ? styles.activeTab : ''}`}
           onClick={() => setActiveTab('stock')}
           role="tab"
           aria-selected={activeTab === 'stock'}
         >
           <Package size={18} /> Stock Overview
         </button>
         <button 
           className={`${styles.tabBtn} ${activeTab === 'ledger' ? styles.activeTab : ''}`}
           onClick={() => setActiveTab('ledger')}
           role="tab"
           aria-selected={activeTab === 'ledger'}
         >
           <History size={18} /> Transaction Ledger
         </button>
      </div>

      {/* Search */}
      <div className={styles.searchBox}>
        <Search className={styles.searchIcon} size={20} />
        <input 
          type="text" 
          placeholder={`Search ${activeTab === 'stock' ? 'inventory' : 'ledger'}...`} 
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {activeTab === 'stock' && (
        <>
          {filteredItems.length > 0 ? (
            <div className={styles.stockGrid}>
              {filteredItems.map(item => {
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
          ) : (
            <EmptyState 
              icon={<Info size={36} />}
              title="No items found"
              description={searchQuery ? `We couldn't find any stock items matching "${searchQuery}"` : "Your inventory is currently empty."}
              actionLabel="Add Item"
              onAction={() => toast("New item form coming soon!", "info")}
            />
          )}
        </>
      )}

      {activeTab === 'ledger' && (
        <>
          {filteredLedger.length > 0 ? (
            <div className={styles.ledgerList}>
               {filteredLedger.map(entry => (
                 <div key={entry.id} className={styles.ledgerItem}>
                    <div className={`${styles.txIcon} ${entry.change > 0 ? styles.txIn : styles.txOut}`}>
                      {entry.change > 0 ? '+' : '-'}
                    </div>
                    <div className={styles.txInfo}>
                       <h4>{entry.description}</h4>
                       <div className={styles.txMeta}>
                         <User size={12} /> <span>{entry.user}</span> &bull; <span>{entry.date}</span>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
          ) : (
            <EmptyState 
              icon={<Info size={36} />}
              title="No records found"
              description={searchQuery ? `No ledger entries matching "${searchQuery}"` : "No transaction history yet."}
            />
          )}
        </>
      )}
    </div>
  );
}
