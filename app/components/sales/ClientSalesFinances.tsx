"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import styles from "../../(dashboard)/sales/page.module.css";
import {
  TrendingUp,
  TrendingDown,
  Banknote,
  Filter,
  Plus,
  Search,
  Info,
  X,
  Download,
  RotateCcw,
} from "lucide-react";
import EmptyState from "../ui/EmptyState";
import NewTransactionModal from "./NewTransactionModal";
import { useAuth } from "../auth/AuthProvider";
import { QUICK_ACTION_EVENT, QuickActionId } from "@/lib/quick-actions";

function formatCurrency(c: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
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

interface FinancialTxItem {
  id: string;
  title: string;
  category: string;
  type: "income" | "expense" | string;
  amount: number;
  date: Date | string;
}

export default function ClientSalesFinances({
  overview,
  transactions,
  cashFlow,
}: {
  overview: { totalIncome: number; totalExpenses: number; net: number };
  transactions: FinancialTxItem[];
  cashFlow: { day: string; income: number; expense: number }[];
}) {
  const searchParams = useSearchParams();
  const initialAction = searchParams.get("action");
  const { hasPermission } = useAuth();
  const canManageFinances = hasPermission("finances:manage");
  const canExport = hasPermission("exports:download");

  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(
    () => initialAction === "record-transaction" || initialAction === "transaction"
  );
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedBarIdx, setSelectedBarIdx] = useState<number | null>(null);

  const [typeFilter, setTypeFilter] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [dateRangeFilter, setDateRangeFilter] = useState<
    "ALL" | "TODAY" | "7DAYS" | "MONTH" | "CUSTOM"
  >("ALL");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  useEffect(() => {
    const handleQuickAction = (e: Event) => {
      const detail = (e as CustomEvent<{ action: QuickActionId }>).detail;
      if (detail?.action === "record-transaction") {
        setIsModalOpen(true);
      }
    };
    window.addEventListener(QUICK_ACTION_EVENT, handleQuickAction);
    return () => window.removeEventListener(QUICK_ACTION_EVENT, handleQuickAction);
  }, []);

  const isFiltered =
    typeFilter !== "ALL" ||
    categoryFilter !== "ALL" ||
    dateRangeFilter !== "ALL" ||
    !!searchQuery.trim();

  const resetFilters = () => {
    setTypeFilter("ALL");
    setCategoryFilter("ALL");
    setDateRangeFilter("ALL");
    setCustomStartDate("");
    setCustomEndDate("");
    setSearchQuery("");
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      !searchQuery.trim() ||
      tx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (typeFilter === "INCOME" && tx.type !== "income") return false;
    if (typeFilter === "EXPENSE" && tx.type !== "expense") return false;

    if (categoryFilter !== "ALL") {
      const catVal = tx.category.toUpperCase().replace(/\s+/g, "_");
      if (catVal !== categoryFilter && tx.category.toUpperCase() !== categoryFilter) {
        return false;
      }
    }

    if (dateRangeFilter !== "ALL") {
      const txDate = new Date(tx.date);
      const now = new Date();
      if (dateRangeFilter === "TODAY") {
        if (txDate.toDateString() !== now.toDateString()) return false;
      } else if (dateRangeFilter === "7DAYS") {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (txDate < sevenDaysAgo) return false;
      } else if (dateRangeFilter === "MONTH") {
        if (
          txDate.getMonth() !== now.getMonth() ||
          txDate.getFullYear() !== now.getFullYear()
        ) {
          return false;
        }
      } else if (dateRangeFilter === "CUSTOM") {
        if (customStartDate && new Date(tx.date) < new Date(customStartDate)) return false;
        if (customEndDate && new Date(tx.date) > new Date(customEndDate + "T23:59:59"))
          return false;
      }
    }

    return true;
  });

  const displayIncome = isFiltered
    ? filteredTransactions
        .filter((tx) => tx.type === "income")
        .reduce((acc, t) => acc + t.amount, 0)
    : overview.totalIncome;

  const displayExpenses = isFiltered
    ? filteredTransactions
        .filter((tx) => tx.type === "expense")
        .reduce((acc, t) => acc + t.amount, 0)
    : overview.totalExpenses;

  const displayNet = displayIncome - displayExpenses;
  const activeDayPoint = selectedBarIdx !== null ? cashFlow[selectedBarIdx] : null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Sales &amp; Finances</h1>
          <p className={styles.subtitle}>Ranch ledger &amp; 7-day cash flow</p>
        </div>

        <div className={styles.headerControls}>
          {canManageFinances && (
            <button
              type="button"
              className={styles.desktopAddBtn}
              onClick={() => setIsModalOpen(true)}
            >
              <Plus size={17} strokeWidth={2.4} />
              <span>New Transaction</span>
            </button>
          )}

          {canExport && (
            <a
              href="/api/export?type=finances"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.exportBtn}
              aria-label="Export CSV"
              title="Export Finances CSV"
            >
              <Download size={16} />
              <span className={styles.exportBtnText}>Export</span>
            </a>
          )}

          <button
            type="button"
            className={`${styles.filterBtn} ${isFiltered ? styles.filterBtnActive : ""}`}
            aria-label="Filter transactions"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <Filter size={18} />
          </button>
        </div>
      </header>

      {/* Collapsible Theme-Safe Filter Panel */}
      {isFilterOpen && (
        <div className={styles.filterPanel}>
          <div className={styles.filterPanelHeader}>
            <span>Filter Transactions</span>
            <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
              {isFiltered && (
                <button type="button" onClick={resetFilters} className={styles.resetLinkBtn}>
                  <RotateCcw size={13} /> Reset
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className={styles.filterCloseBtn}
                aria-label="Close filters"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          <div className={styles.filterGroup}>
            <label>Transaction Type</label>
            <div className={styles.segmentedRow}>
              {(["ALL", "INCOME", "EXPENSE"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`${styles.segmentPill} ${
                    typeFilter === t ? styles.segmentActive : ""
                  }`}
                >
                  {t === "ALL" ? "All" : t === "INCOME" ? "Income" : "Expenses"}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterGroup}>
            <label>Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={styles.filterSelect}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Date Range</label>
            <div className={styles.datePresetGrid}>
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
                  className={`${styles.segmentPill} ${
                    dateRangeFilter === d.value ? styles.segmentActive : ""
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hero Stats */}
      <div className={styles.heroStats}>
        <div className={`${styles.statCard} ${styles.incomeCard}`}>
          <div className={styles.statCardLeft}>
            <div className={styles.iconWrapper}>
              <TrendingUp size={20} />
            </div>
            <div className={styles.statInfo}>
              <span>{isFiltered ? "Filtered Income" : "Total Income"}</span>
            </div>
          </div>
          <div className={`${styles.statInfo} tabular-nums`}>
            <strong>{formatCurrency(displayIncome)}</strong>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.expenseCard}`}>
          <div className={styles.statCardLeft}>
            <div className={styles.iconWrapper}>
              <TrendingDown size={20} />
            </div>
            <div className={styles.statInfo}>
              <span>{isFiltered ? "Filtered Expenses" : "Total Expenses"}</span>
            </div>
          </div>
          <div className={`${styles.statInfo} tabular-nums`}>
            <strong>{formatCurrency(displayExpenses)}</strong>
          </div>
        </div>
      </div>

      {/* Touch-Interactive Cash Flow Chart */}
      <div className={styles.chartSection}>
        <div className={styles.chartHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <h3>Cash Flow</h3>
            <div className={styles.chartLegend}>
              <span>
                <span className={styles.legendDotGreen} /> Income
              </span>
              <span>
                <span className={styles.legendDotRed} /> Expense
              </span>
            </div>
          </div>
          <span
            className={`${displayNet >= 0 ? styles.netPositive : styles.netNegative} tabular-nums`}
          >
            Net: {displayNet > 0 ? "+" : ""}
            {formatCurrency(displayNet)}
          </span>
        </div>

        {activeDayPoint ? (
          <div className={`${styles.touchReadout} tabular-nums`}>
            <strong>{activeDayPoint.day}:</strong>
            <span className={styles.amountPos}>+{formatCurrency(activeDayPoint.income)}</span>
            <span>•</span>
            <span className={styles.amountNeg}>-{formatCurrency(activeDayPoint.expense)}</span>
          </div>
        ) : (
          <p className={styles.touchHint}>Tap any day bar to inspect daily totals</p>
        )}

        <div className={styles.cssChart}>
          {(() => {
            const maxVal = Math.max(
              ...cashFlow.map((d) => Math.max(d.income, d.expense)),
              1
            );
            return cashFlow.map((d, i) => {
              const isSelected = selectedBarIdx === i;
              return (
                <button
                  key={i}
                  type="button"
                  className={`${styles.barColumn} ${isSelected ? styles.barColumnSelected : ""}`}
                  onClick={() => setSelectedBarIdx((prev) => (prev === i ? null : i))}
                  aria-label={`${d.day}: Income ${formatCurrency(d.income)}, Expense ${formatCurrency(
                    d.expense
                  )}`}
                >
                  <div className={styles.barPair}>
                    <div className={styles.trackIncome}>
                      <div
                        className={styles.barIncome}
                        style={{ height: `${Math.max((d.income / maxVal) * 100, d.income > 0 ? 6 : 0)}%` }}
                      />
                    </div>
                    <div className={styles.trackExpense}>
                      <div
                        className={styles.barExpense}
                        style={{ height: `${Math.max((d.expense / maxVal) * 100, d.expense > 0 ? 6 : 0)}%` }}
                      />
                    </div>
                  </div>
                  <span className={styles.dayLabel}>{d.day}</span>
                </button>
              );
            });
          })()}
        </div>
      </div>

      {/* Search */}
      <div className={styles.searchBox}>
        <Search className={styles.searchIcon} size={18} />
        <input
          type="text"
          placeholder="Search ledger by reason or category..."
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Ledger */}
      <div className={styles.ledgerSection}>
        <div className={styles.ledgerHeader}>
          <h3 className={styles.sectionTitle}>Recent Transactions</h3>
          <span className="tabular-nums">{filteredTransactions.length} entries</span>
        </div>

        {filteredTransactions.length > 0 ? (
          <div className={styles.transactionList}>
            {filteredTransactions.map((tx) => {
              const txDate = new Date(tx.date);
              const today = new Date();
              const isToday = txDate.toDateString() === today.toDateString();
              const dateStr = isToday
                ? "Today"
                : txDate.toLocaleDateString("en-US", { day: "numeric", month: "short" });

              return (
                <div key={tx.id} className={styles.txRow}>
                  <div
                    className={`${styles.txIcon} ${
                      tx.type === "income" ? styles.txIncome : styles.txExpense
                    }`}
                  >
                    <Banknote size={19} />
                  </div>
                  <div className={styles.txDetails}>
                    <h4>{tx.title}</h4>
                    <span>
                      {tx.category} &bull; {dateStr}
                    </span>
                  </div>
                  <div
                    className={`${styles.txAmount} ${
                      tx.type === "income" ? styles.amountPos : styles.amountNeg
                    } tabular-nums`}
                  >
                    {tx.type === "income" ? "+" : "-"}
                    {formatCurrency(tx.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Info size={36} />}
            title="No transactions found"
            description={
              isFiltered
                ? "No transactions match your current filter criteria."
                : "You haven't recorded any financial transactions yet."
            }
            actionLabel={
              isFiltered ? "Reset Filters" : canManageFinances ? "Record Transaction" : undefined
            }
            onAction={
              isFiltered
                ? resetFilters
                : canManageFinances
                ? () => setIsModalOpen(true)
                : undefined
            }
          />
        )}
      </div>

      <NewTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
