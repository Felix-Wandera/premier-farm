"use client";
import React, { useState } from "react";
import styles from "../../(dashboard)/sales/page.module.css";
import { TrendingUp, TrendingDown, Banknote, Filter, Plus, Search, Info } from "lucide-react";
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

  const filteredTransactions = transactions.filter(tx => 
    tx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Finances</h1>
          <p className={styles.subtitle}>Farm Overview</p>
        </div>
        <button className={styles.filterBtn} aria-label="Filter transactions">
           <Filter size={18} />
        </button>
      </header>

      {/* Hero Stats */}
      <div className={styles.heroStats}>
         <div className={`${styles.statCard} ${styles.incomeCard}`}>
            <div className={styles.iconWrapper}><TrendingUp size={24} /></div>
            <div className={styles.statInfo}>
               <span>Total Income</span>
               <strong>{formatCurrency(overview.totalIncome)}</strong>
            </div>
         </div>
         <div className={`${styles.statCard} ${styles.expenseCard}`}>
            <div className={styles.iconWrapper}><TrendingDown size={24} /></div>
            <div className={styles.statInfo}>
               <span>Total Expenses</span>
               <strong>{formatCurrency(overview.totalExpenses)}</strong>
            </div>
         </div>
      </div>

      {/* Cash Flow Chart */}
      <div className={styles.chartSection}>
         <div className={styles.chartHeader}>
           <h3>Cash Flow</h3>
           <span className={overview.net >= 0 ? styles.netPositive : styles.amountNeg}>Net: {overview.net > 0 ? "+" : ""}{formatCurrency(overview.net)}</span>
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
         <h3 className={styles.sectionTitle}>Recent Transactions</h3>
         
         {filteredTransactions.length > 0 ? (
           <div className={styles.transactionList}>
             {filteredTransactions.map(tx => {
               // Format display date
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
             description={searchQuery ? `We couldn't find any transactions matching "${searchQuery}"` : "You haven't recorded any transactions yet."}
             actionLabel="Add Transaction"
             onAction={() => setIsModalOpen(true)}
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
