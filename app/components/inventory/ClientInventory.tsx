"use client";
import React, { useState } from "react";
import styles from "../../../(dashboard)/inventory/page.module.css";
import { Package, ShieldAlert, History, User, Plus, Search, Info } from "lucide-react";
import { useToast } from "../ui/Toast";
import EmptyState from "../ui/EmptyState";
import { transactInventory } from "@/actions/inventory.actions";
import NewItemModal from "./NewItemModal";

export default function ClientInventory({ 
  initialItems, 
  initialLogs 
}: { 
  initialItems: any[], 
  initialLogs: any[] 
}) {
  const [activeTab, setActiveTab] = useState<"stock" | "ledger">("stock");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const toast = useToast();

  const filteredItems = initialItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLedger = initialLogs.filter(entry => 
    entry.notes.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTransaction = async (itemId: string, type: "STOCK_IN" | "STOCK_OUT") => {
    // Optimistic UI could go here, but for strict inventory, wait for server
    const response = await transactInventory({ itemId, type, quantity: 1 });
    if (response.success) {
      toast(response.message, "success");
    } else {
      toast(response.message, "error");
    }
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
          onClick={() => setIsModalOpen(true)}
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
                const minThreshold = item.minThreshold || 0;
                const maxTrack = minThreshold > 0 ? minThreshold * 2.5 : 100; 
                const percent = Math.min((item.quantity / maxTrack) * 100, 100);
                const isCritical = minThreshold > 0 && item.quantity <= minThreshold;

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

                      {isCritical && <p className={styles.warningText}>Restock needed! (Min: {minThreshold})</p>}

                      <div className={styles.quickActions}>
                        <button className={styles.actionBtn} onClick={() => handleTransaction(item.id, "STOCK_OUT")}>-</button>
                        <button className={styles.actionBtn} onClick={() => handleTransaction(item.id, "STOCK_IN")}>+</button>
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
               {filteredLedger.map((entry: any) => (
                 <div key={entry.id} className={styles.ledgerItem}>
                    <div className={`${styles.txIcon} ${entry.type === 'STOCK_IN' ? styles.txIn : styles.txOut}`}>
                      {entry.type === 'STOCK_IN' ? '+' : '-'}
                    </div>
                    <div className={styles.txInfo}>
                       <h4>{entry.notes}</h4>
                       <div className={styles.txMeta}>
                         <User size={12} /> <span>System User</span> &bull; <span>{new Date(entry.date).toLocaleString()}</span>
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

      {/* Add Item Modal */}
      <NewItemModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
