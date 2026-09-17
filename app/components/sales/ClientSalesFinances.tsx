"use client";
import React, { useState } from "react";
import styles from "../../(dashboard)/sales/page.module.css";
import { TrendingUp, TrendingDown, Banknote, Filter, Plus, Search, Info, X, Download, RotateCcw } from "lucide-react";
import { useToast } from "../ui/Toast";
import EmptyState from "../ui/EmptyState";
import NewTransactionModal from "./NewTransactionModal";

// Helper for formatting Currency securely
function formatCurrency(c: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0
  }).format(c);
}

const CATEGORIES = [
  { value: "ALL", label: "All Categories" },
  { value: "MILK", label: "Milk Sales" },
  { value: "ANIMAL", label: "Animal Sales" },
  { value: "FEED", label: "Feed / Silage" },
  { value: "VET_SERVICES", label: "Vet Services" },
  { value: "LABOR", label: "Labor / Wages" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "OTHER", label: "Other" },
];

export default function ClientSalesFinances({ 
  overview, 
  transactions,
  cashFlow
}: { 
  overview: { totalIncome: number; totalExpenses: number; net: number }, 
  transactions: any[],
  cashFlow: { day: string; income: number; expense: number }[]
}) {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filter States
  const [typeFilter, setTypeFilter] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [dateRangeFilter, setDateRangeFilter] = useState<"ALL" | "TODAY" | "7DAYS" | "MONTH" | "CUSTOM">("ALL");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const isFiltered = typeFilter !== "ALL" || categoryFilter !== "ALL" || dateRangeFilter !== "ALL" || !!searchQuery.trim();

  const resetFilters = () => {
    setTypeFilter("ALL");
    setCategoryFilter("ALL");
    setDateRangeFilter("ALL");
    setCustomStartDate("");
    setCustomEndDate("");
    setSearchQuery("");
  };

  const filteredTransactions = transactions.filter((tx) => {
    // Search query
    const matchesSearch =
      !searchQuery.trim() ||
      tx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // Type filter
    if (typeFilter === "INCOME" && tx.type !== "income") return false;
    if (typeFilter === "EXPENSE" && tx.type !== "expense") return false;

    // Category filter
    if (categoryFilter !== "ALL") {
      const catVal = tx.category.toUpperCase().replace(/\s+/g, "_");
      if (catVal !== categoryFilter && tx.category.toUpperCase() !== categoryFilter) {
        return false;
      }
    }

    // Date range filter
    if (dateRangeFilter !== "ALL") {
      const txDate = new Date(tx.date);
      const now = new Date();
      if (dateRangeFilter === "TODAY") {
        if (txDate.toDateString() !== now.toDateString()) return false;
      } else if (dateRangeFilter === "7DAYS") {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (txDate < sevenDaysAgo) return false;
      } else if (dateRangeFilter === "MONTH") {
        if (txDate.getMonth() !== now.getMonth() || txDate.getFullYear() !== now.getFullYear()) {
          return false;
        }
      } else if (dateRangeFilter === "CUSTOM") {
        if (customStartDate && new Date(tx.date) < new Date(customStartDate)) return false;
        if (customEndDate && new Date(tx.date) > new Date(customEndDate + "T23:59:59")) return false;
      }
    }

    return true;
  });

  const displayIncome = isFiltered
    ? filteredTransactions.filter((tx) => tx.type === "income").reduce((acc, t) => acc + t.amount, 0)
    : overview.totalIncome;

  const displayExpenses = isFiltered
    ? filteredTransactions.filter((tx) => tx.type === "expense").reduce((acc, t) => acc + t.amount, 0)
    : overview.totalExpenses;

  const displayNet = displayIncome - displayExpenses;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Finances</h1>
          <p className={styles.subtitle}>Farm Ledger & Cash Flow</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <a
            href="/api/export?type=finances"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "0.5rem 0.85rem",
              borderRadius: "99px",
              backgroundColor: "var(--color-surface, #ffffff)",
              border: "1px solid var(--color-border, #cbd5e1)",
              color: "inherit",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "0.85rem",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <Download size={15} />
            <span>Export CSV</span>
          </a>

          <button
            className={styles.filterBtn}
            aria-label="Filter transactions"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            style={{
              backgroundColor: isFiltered ? "var(--color-primary, #16a34a)" : undefined,
              color: isFiltered ? "#ffffff" : undefined,
            }}
          >
            <Filter size={18} />
          </button>
        </div>
      </header>

      {/* Filter Drawer / Panel */}
      {isFilterOpen && (
        <div
          style={{
            padding: "1.25rem",
            backgroundColor: "var(--color-surface, #ffffff)",
            borderRadius: "14px",
            border: "1px solid var(--color-border, #e2e8f0)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Filter Transactions</span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {isFiltered && (
                <button
                  onClick={resetFilters}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <RotateCcw size={13} /> Reset
                </button>
              )}
              <button
                onClick={() => setIsFilterOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.4rem", opacity: 0.8 }}>
              Transaction Type
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {(["ALL", "INCOME", "EXPENSE"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  style={{
                    flex: 1,
                    padding: "0.45rem",
                    borderRadius: "8px",
                    border: typeFilter === t ? "2px solid var(--color-primary, #16a34a)" : "1px solid var(--color-border, #cbd5e1)",
                    backgroundColor: typeFilter === t ? "rgba(22, 163, 74, 0.1)" : "transparent",
                    color: typeFilter === t ? "var(--color-primary, #16a34a)" : "inherit",
                    fontWeight: typeFilter === t ? 700 : 500,
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  {t === "ALL" ? "All" : t === "INCOME" ? "Income" : "Expenses"}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.4rem", opacity: 0.8 }}>
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "0.55rem",
                borderRadius: "8px",
                border: "1px solid var(--color-border, #cbd5e1)",
                backgroundColor: "var(--color-bg, #ffffff)",
                color: "inherit",
                fontSize: "0.85rem",
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.4rem", opacity: 0.8 }}>
              Date Range
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.4rem" }}>
              {(
                [
                  { value: "ALL", label: "All" },
                  { value: "TODAY", label: "Today" },
                  { value: "7DAYS", label: "7 Days" },
                  { value: "MONTH", label: "Month" },
                ] as const
              ).map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDateRangeFilter(d.value)}
                  style={{
                    padding: "0.4rem 0.2rem",
                    borderRadius: "6px",
                    border: dateRangeFilter === d.value ? "2px solid var(--color-primary, #16a34a)" : "1px solid var(--color-border, #cbd5e1)",
                    backgroundColor: dateRangeFilter === d.value ? "rgba(22, 163, 74, 0.1)" : "transparent",
                    color: dateRangeFilter === d.value ? "var(--color-primary, #16a34a)" : "inherit",
                    fontWeight: dateRangeFilter === d.value ? 700 : 500,
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {isFiltered && (
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center", margin: "-0.5rem 0 0" }}>
          <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>Filtered by:</span>
          {typeFilter !== "ALL" && (
            <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "99px", backgroundColor: "rgba(59, 130, 246, 0.1)", color: "#2563eb", fontWeight: 600 }}>
              {typeFilter}
            </span>
          )}
          {categoryFilter !== "ALL" && (
            <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "99px", backgroundColor: "rgba(168, 85, 247, 0.1)", color: "#9333ea", fontWeight: 600 }}>
              {categoryFilter}
            </span>
          )}
          {dateRangeFilter !== "ALL" && (
            <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "99px", backgroundColor: "rgba(22, 163, 74, 0.1)", color: "#16a34a", fontWeight: 600 }}>
              {dateRangeFilter}
            </span>
          )}
          <button
            onClick={resetFilters}
            style={{ background: "none", border: "none", color: "#ef4444", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", padding: "0 4px" }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Hero Stats */}
      <div className={styles.heroStats}>
         <div className={`${styles.statCard} ${styles.incomeCard}`}>
            <div className={styles.iconWrapper}><TrendingUp size={24} /></div>
            <div className={styles.statInfo}>
               <span>{isFiltered ? "Filtered Income" : "Total Income"}</span>
               <strong>{formatCurrency(displayIncome)}</strong>
            </div>
         </div>
         <div className={`${styles.statCard} ${styles.expenseCard}`}>
            <div className={styles.iconWrapper}><TrendingDown size={24} /></div>
            <div className={styles.statInfo}>
               <span>{isFiltered ? "Filtered Expenses" : "Total Expenses"}</span>
               <strong>{formatCurrency(displayExpenses)}</strong>
            </div>
         </div>
      </div>

      {/* Cash Flow Chart */}
      <div className={styles.chartSection}>
         <div className={styles.chartHeader}>
           <h3>Cash Flow</h3>
           <span className={displayNet >= 0 ? styles.netPositive : styles.amountNeg}>
             Net: {displayNet > 0 ? "+" : ""}{formatCurrency(displayNet)}
           </span>
         </div>
         
         <div className={styles.cssChart}>
            {(() => {
              const maxVal = Math.max(...cashFlow.map(d => Math.max(d.income, d.expense)), 1);
              return cashFlow.map((d, i) => (
                <div key={i} className={styles.barColumn}>
                   <div className={styles.barWrapper}>
                      <div className={styles.barIncome} style={{ height: `${(d.income / maxVal) * 100}%` }}></div>
                      <div className={styles.barExpense} style={{ height: `${(d.expense / maxVal) * 100}%` }}></div>
                   </div>
                   <span className={styles.dayLabel}>{d.day}</span>
                </div>
              ));
            })()}
         </div>
      </div>

      {/* Search */}
      <div className={styles.searchBox}>
        <Search className={styles.searchIcon} size={20} />
        <input 
          type="text" 
          placeholder="Search transactions..." 
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Ledger */}
      <div className={styles.ledgerSection}>
         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
           <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Recent Transactions</h3>
           <span style={{ fontSize: "0.8rem", opacity: 0.6 }}>{filteredTransactions.length} items</span>
         </div>
         
         {filteredTransactions.length > 0 ? (
           <div className={styles.transactionList}>
             {filteredTransactions.map(tx => {
               const txDate = new Date(tx.date);
               const today = new Date();
               const isToday = txDate.toDateString() === today.toDateString();
               const dateStr = isToday ? "Today" : txDate.toLocaleDateString("en-US", { day: 'numeric', month: 'short' });

               return (
                 <div key={tx.id} className={styles.txRow}>
                    <div className={`${styles.txIcon} ${tx.type === 'income' ? styles.txIncome : styles.txExpense}`}>
                      <Banknote size={20} />
                    </div>
                    <div className={styles.txDetails}>
                       <h4>{tx.title}</h4>
                       <span>{tx.category} &bull; {dateStr}</span>
                    </div>
                    <div className={`${styles.txAmount} ${tx.type === 'income' ? styles.amountPos : styles.amountNeg}`}>
                       {tx.type === 'income' ? "+" : "-"}{formatCurrency(tx.amount)}
                    </div>
                 </div>
               )
             })}
           </div>
         ) : (
           <EmptyState 
             icon={<Info size={36} />}
             title="No transactions found"
             description={isFiltered ? "No transactions match your current search and filter criteria." : "You haven't recorded any transactions yet."}
             actionLabel={isFiltered ? "Reset Filters" : "Add Transaction"}
             onAction={() => (isFiltered ? resetFilters() : setIsModalOpen(true))}
           />
         )}
      </div>

      {/* Add Transaction FAB */}
      <button 
        className={styles.fabMain} 
        aria-label="Add Transaction"
        onClick={() => setIsModalOpen(true)}
      >
        <Plus size={28} color="white" strokeWidth={2.5} />
      </button>

      {/* Add Transaction Modal */}
      <NewTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
