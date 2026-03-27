"use client";
import React, { useState } from "react";
import styles from "./page.module.css";
import { TrendingUp, TrendingDown, Banknote, Filter, Plus, Search, Info } from "lucide-react";
import { useToast } from "../../components/ui/Toast";
import EmptyState from "../../components/ui/EmptyState";

export default function SalesFinances() {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const MOCK_TRANSACTIONS = [
    { id: 1, type: "income", category: "Milk Sales", title: "Brookside Dairy - 1200L", amount: "+KES 85,000", date: "Today" },
    { id: 2, type: "expense", category: "Feed", title: "Farmers Agro - 20 Bags Dairy Meal", amount: "-KES 32,000", date: "Yesterday" },
    { id: 3, type: "income", category: "Animal Sale", title: "Sold Bull Tag #B-001", amount: "+KES 120,000", date: "24 Mar" },
    { id: 4, type: "expense", category: "Medical", title: "Vet Visit & Vaccinations", amount: "-KES 15,000", date: "22 Mar" },
  ];

  const filteredTransactions = MOCK_TRANSACTIONS.filter(tx => 
    tx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Finances</h1>
          <p className={styles.subtitle}>March 2026 Overview</p>
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
               <strong>KES 425,000</strong>
            </div>
         </div>
         <div className={`${styles.statCard} ${styles.expenseCard}`}>
            <div className={styles.iconWrapper}><TrendingDown size={24} /></div>
            <div className={styles.statInfo}>
               <span>Total Expenses</span>
               <strong>KES 184,000</strong>
            </div>
         </div>
      </div>

      {/* Visual Chart Placeholder */}
      <div className={styles.chartSection}>
         <div className={styles.chartHeader}>
           <h3>Cash Flow</h3>
           <span className={styles.netPositive}>Net: +KES 241,000</span>
         </div>
         
         <div className={styles.cssChart}>
            {/* Simple CSS bars to represent graph */}
            {[40, 65, 30, 80, 50, 90, 70].map((height, i) => (
              <div key={i} className={styles.barColumn}>
                 <div className={styles.barWrapper}>
                    <div className={styles.barIncome} style={{ height: `${height}%` }}></div>
                    <div className={styles.barExpense} style={{ height: `${height * 0.4}%` }}></div>
                 </div>
                 <span className={styles.dayLabel}>{['M','T','W','T','F','S','S'][i]}</span>
              </div>
            ))}
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
             {filteredTransactions.map(tx => (
               <div key={tx.id} className={styles.txRow}>
                  <div className={`${styles.txIcon} ${tx.type === 'income' ? styles.txIncome : styles.txExpense}`}>
                    <Banknote size={20} />
                  </div>
                  <div className={styles.txDetails}>
                     <h4>{tx.title}</h4>
                     <span>{tx.category} &bull; {tx.date}</span>
                  </div>
                  <div className={`${styles.txAmount} ${tx.type === 'income' ? styles.amountPos : styles.amountNeg}`}>
                     {tx.amount}
                  </div>
               </div>
             ))}
           </div>
         ) : (
           <EmptyState 
             icon={<Info size={36} />}
             title="No transactions found"
             description={searchQuery ? `We couldn't find any transactions matching "${searchQuery}"` : "You haven't recorded any transactions yet."}
             actionLabel="Add Transaction"
             onAction={() => toast("Transaction form coming soon!", "info")}
           />
         )}
      </div>

      {/* Add Transaction FAB */}
      <button 
        className={styles.fabMain} 
        aria-label="Add Transaction"
        onClick={() => toast("Transaction form coming soon!", "info")}
      >
        <Plus size={28} color="white" strokeWidth={2.5} />
      </button>
    </div>
  );
}
