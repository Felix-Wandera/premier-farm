"use client";
import React from "react";
import Link from "next/link";
import { X, Droplet, HeartPulse, DollarSign, Package } from "lucide-react";
import styles from "./QuickAddMenu.module.css";
import AnimalIcon from "../ui/AnimalIcon";
import { useAuth } from "../auth/AuthProvider";

export default function QuickAddMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { hasPermission } = useAuth();

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} onClick={onClose} />

      <div className={styles.menuContainer}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close menu">
          <X size={28} strokeWidth={2.5} />
        </button>

        <h2 className={styles.title}>What would you like to add?</h2>

        <div className={styles.actionGrid}>
          {hasPermission("herd:create") && (
            <Link href="/herd/new" className={styles.actionCard} onClick={onClose}>
              <div className={`${styles.iconCircle} ${styles.bgCow}`}>
                <AnimalIcon species="Dairy Cow" size={36} />
              </div>
              <span>New Animal</span>
            </Link>
          )}

          {hasPermission("milk:log") && (
            <Link href="/milk" className={styles.actionCard} onClick={onClose}>
              <div className={`${styles.iconCircle} ${styles.bgMilk}`}>
                <Droplet size={32} />
              </div>
              <span>Log Milk</span>
            </Link>
          )}

          {hasPermission("health:manage") && (
            <Link href="/breeding?action=health" className={styles.actionCard} onClick={onClose}>
              <div className={`${styles.iconCircle} ${styles.bgHealth}`}>
                <HeartPulse size={32} />
              </div>
              <span>Health Event</span>
            </Link>
          )}

          {hasPermission("finances:manage") ? (
            <Link href="/sales" className={styles.actionCard} onClick={onClose}>
              <div className={`${styles.iconCircle} ${styles.bgFinance}`}>
                <DollarSign size={32} />
              </div>
              <span>Finance</span>
            </Link>
          ) : (
            hasPermission("inventory:transact") && (
              <Link href="/inventory" className={styles.actionCard} onClick={onClose}>
                <div className={`${styles.iconCircle} ${styles.bgFinance}`}>
                  <Package size={32} />
                </div>
                <span>Inventory</span>
              </Link>
            )
          )}
        </div>
      </div>
    </div>
  );
}
