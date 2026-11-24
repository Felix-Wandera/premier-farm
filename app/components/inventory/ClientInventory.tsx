"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import styles from "../../(dashboard)/inventory/page.module.css";
import {
  Package,
  ShieldAlert,
  History,
  User,
  Plus,
  Search,
  Info,
  Edit2,
} from "lucide-react";
import { useToast } from "../ui/Toast";
import EmptyState from "../ui/EmptyState";
import NewItemModal from "./NewItemModal";
import StockTransactionModal from "./StockTransactionModal";
import EditItemModal, { InventoryItemSummary } from "./EditItemModal";
import { useAuth } from "../auth/AuthProvider";
import { QUICK_ACTION_EVENT, QuickActionId } from "@/lib/quick-actions";

interface InventoryLogRow {
  id: string;
  type: "STOCK_IN" | "STOCK_OUT" | string;
  notes: string | null;
  date: Date | string;
  user?: { firstName: string | null; lastName: string | null } | null;
}

export default function ClientInventory({
  initialItems,
  initialLogs,
}: {
  initialItems: InventoryItemSummary[];
  initialLogs: InventoryLogRow[];
}) {
  const searchParams = useSearchParams();
  const initialAction = searchParams.get("action");
  const { hasPermission } = useAuth();
  const canManageItems = hasPermission("inventory:manage");
  const canTransact = hasPermission("inventory:transact");

  const [activeTab, setActiveTab] = useState<"stock" | "ledger">("stock");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(
    () =>
      initialAction === "new-item" ||
      (initialAction === "record-stock" && initialItems.length === 0 && canManageItems)
  );
  const [transactionModalState, setTransactionModalState] = useState<{
    isOpen: boolean;
    item: InventoryItemSummary | null;
    type: "STOCK_IN" | "STOCK_OUT";
  }>(() =>
    initialAction === "record-stock" && initialItems.length > 0
      ? { isOpen: true, item: initialItems[0], type: "STOCK_IN" }
      : { isOpen: false, item: null, type: "STOCK_IN" }
  );
  const [editModalState, setEditModalState] = useState<{
    isOpen: boolean;
    item: InventoryItemSummary | null;
  }>({ isOpen: false, item: null });
  const toast = useToast();

  useEffect(() => {
    const handleQuickAction = (e: Event) => {
      const detail = (e as CustomEvent<{ action: QuickActionId }>).detail;
      if (detail?.action === "new-item") {
        setIsModalOpen(true);
      } else if (detail?.action === "record-stock") {
        setActiveTab("stock");
        if (initialItems.length > 0) {
          setTransactionModalState({
            isOpen: true,
            item: initialItems[0],
            type: "STOCK_IN",
          });
        } else if (canManageItems) {
          toast("Create your first inventory item to record stock.", "info");
          setIsModalOpen(true);
        }
      }
    };
    window.addEventListener(QUICK_ACTION_EVENT, handleQuickAction);
    return () => window.removeEventListener(QUICK_ACTION_EVENT, handleQuickAction);
  }, [initialItems, canManageItems, toast]);

  const filteredItems = initialItems.filter(
    (item) =>
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLedger = initialLogs.filter(
    (entry) =>
      !searchQuery.trim() ||
      (entry.notes || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Inventory</h1>
          <p className={styles.subtitle}>Feed, medicine, and ranch supplies</p>
        </div>
        {canManageItems && (
          <button
            type="button"
            className={styles.desktopAddBtn}
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={18} strokeWidth={2.4} />
            <span>Add Item</span>
          </button>
        )}
      </header>

      {/* Tabs */}
      <div className={styles.tabToggle} role="tablist">
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "stock" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("stock")}
          role="tab"
          aria-selected={activeTab === "stock"}
        >
          <Package size={17} /> Stock ({initialItems.length})
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "ledger" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("ledger")}
          role="tab"
          aria-selected={activeTab === "ledger"}
        >
          <History size={17} /> Ledger
        </button>
      </div>

      {/* Search */}
      <div className={styles.searchBox}>
        <Search className={styles.searchIcon} size={18} />
        <input
          type="text"
          placeholder={`Search ${activeTab === "stock" ? "items" : "stock history"}...`}
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {activeTab === "stock" && (
        <>
          {filteredItems.length > 0 ? (
            <div className={styles.stockGrid}>
              {filteredItems.map((item) => {
                const minThreshold = item.minThreshold || 0;
                const maxTrack = minThreshold > 0 ? minThreshold * 2.5 : 100;
                const percent = Math.min((item.quantity / maxTrack) * 100, 100);
                const isCritical = minThreshold > 0 && item.quantity <= minThreshold;

                return (
                  <div key={item.id} className={styles.stockCard}>
                    <div className={styles.cardContent}>
                      <div className={styles.cardHeader}>
                        <span className={styles.categoryBadge}>{item.category}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {isCritical && (
                            <span className={styles.lowStockPill}>
                              <ShieldAlert size={13} /> Low
                            </span>
                          )}
                          {canManageItems && (
                            <button
                              type="button"
                              className={styles.editItemBtn}
                              onClick={() => setEditModalState({ isOpen: true, item })}
                              aria-label={`Edit ${item.name}`}
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className={styles.itemMainRow}>
                        <h3
                          className={styles.itemName}
                          onClick={() =>
                            canManageItems && setEditModalState({ isOpen: true, item })
                          }
                          style={{ cursor: canManageItems ? "pointer" : "default" }}
                        >
                          {item.name}
                        </h3>
                        <div className={`${styles.quantityDisplay} tabular-nums`}>
                          <span
                            className={`${styles.bigNumber} ${
                              isCritical ? styles.textCritical : ""
                            }`}
                          >
                            {item.quantity}
                          </span>
                          <span className={styles.unit}>{item.unit}</span>
                        </div>
                      </div>

                      <div className={styles.gaugeTrack}>
                        <div
                          className={`${styles.gaugeFill} ${
                            isCritical ? styles.fillCritical : styles.fillSafe
                          }`}
                          style={{ width: `${Math.max(percent, item.quantity > 0 ? 6 : 0)}%` }}
                        />
                      </div>

                      {isCritical && (
                        <p className={styles.warningText}>
                          Below minimum alert level ({minThreshold} {item.unit})
                        </p>
                      )}

                      {canTransact && (
                        <div className={styles.quickActions}>
                          <button
                            type="button"
                            className={styles.stockOutBtn}
                            onClick={() =>
                              setTransactionModalState({
                                isOpen: true,
                                item,
                                type: "STOCK_OUT",
                              })
                            }
                          >
                            − Use Stock
                          </button>
                          <button
                            type="button"
                            className={styles.stockInBtn}
                            onClick={() =>
                              setTransactionModalState({
                                isOpen: true,
                                item,
                                type: "STOCK_IN",
                              })
                            }
                          >
                            + Restock
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Info size={36} />}
              title="No inventory items found"
              description={
                searchQuery
                  ? `No stock items matched "${searchQuery}".`
                  : "Your ranch inventory is currently empty."
              }
              actionLabel={canManageItems ? "Add Item" : undefined}
              onAction={canManageItems ? () => setIsModalOpen(true) : undefined}
            />
          )}
        </>
      )}

      {activeTab === "ledger" && (
        <>
          {filteredLedger.length > 0 ? (
            <div className={styles.ledgerList}>
              {filteredLedger.map((entry) => (
                <div key={entry.id} className={styles.ledgerItem}>
                  <div
                    className={`${styles.txIcon} ${
                      entry.type === "STOCK_IN" ? styles.txIn : styles.txOut
                    }`}
                  >
                    {entry.type === "STOCK_IN" ? "+" : "−"}
                  </div>
                  <div className={styles.txInfo}>
                    <h4>{entry.notes || "Stock adjustment"}</h4>
                    <div className={styles.txMeta}>
                      <User size={12} />
                      <span>
                        {entry.user
                          ? `${entry.user.firstName || ""} ${entry.user.lastName || ""}`.trim() ||
                            "Staff Member"
                          : "Staff Member"}
                      </span>
                      <span>•</span>
                      <span>{new Date(entry.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Info size={36} />}
              title="No ledger entries"
              description={
                searchQuery
                  ? `No ledger entries matched "${searchQuery}".`
                  : "No stock movements recorded yet."
              }
            />
          )}
        </>
      )}

      <NewItemModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      <EditItemModal
        isOpen={editModalState.isOpen}
        onClose={() => setEditModalState({ isOpen: false, item: null })}
        item={editModalState.item}
      />

      <StockTransactionModal
        isOpen={transactionModalState.isOpen}
        onClose={() =>
          setTransactionModalState({ isOpen: false, item: null, type: "STOCK_IN" })
        }
        item={transactionModalState.item}
        allItems={initialItems}
        type={transactionModalState.type}
      />
    </div>
  );
}
