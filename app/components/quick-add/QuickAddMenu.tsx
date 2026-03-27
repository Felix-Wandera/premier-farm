"use client";
import React from "react";
import Link from "next/link";
import { X, Droplet, HeartPulse, DollarSign } from "lucide-react";
import styles from "./QuickAddMenu.module.css";
import AnimalIcon from "../ui/AnimalIcon";

export default function QuickAddMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      {/* Native frosted glass blur on the main view */}
      <div className={styles.backdrop} onClick={onClose} />
      
      <div className={styles.menuContainer}>
         <button className={styles.closeBtn} onClick={onClose} aria-label="Close menu">
           <X size={28} strokeWidth={2.5} />
         </button>

         <h2 className={styles.title}>What would you like to add?</h2>

         <div className={styles.actionGrid}>
            <Link href="/herd/new" className={styles.actionCard} onClick={onClose}>
               <div className={`${styles.iconCircle} ${styles.bgCow}`}>
                  <AnimalIcon species="Dairy Cow" size={36} />
               </div>
               <span>New Animal</span>
            </Link>

            <Link href="/milk" className={styles.actionCard} onClick={onClose}>
               <div className={`${styles.iconCircle} ${styles.bgMilk}`}>
                  <Droplet size={32} />
               </div>
               <span>Log Milk</span>
            </Link>

            <button className={styles.actionCard} onClick={onClose}>
               <div className={`${styles.iconCircle} ${styles.bgHealth}`}>
                  <HeartPulse size={32} />
               </div>
               <span>Health Event</span>
            </button>

            <button className={styles.actionCard} onClick={onClose}>
               <div className={`${styles.iconCircle} ${styles.bgFinance}`}>
                  <DollarSign size={32} />
               </div>
               <span>Finance</span>
            </button>
         </div>
      </div>
    </div>
  );
}
