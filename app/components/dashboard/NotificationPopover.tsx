"use client";
import React, { useRef, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Info, BellOff, X } from "lucide-react";
import styles from "./NotificationPopover.module.css";

type Alert = {
  type: "warning" | "info";
  title: string;
  description: string;
};

interface NotificationPopoverProps {
  alerts: Alert[];
  onClose: () => void;
}

export default function NotificationPopover({ alerts, onClose }: NotificationPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Map alerts to pages (simple heuristic)
  const getHref = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes("inventory") || t.includes("stock")) return "/inventory";
    if (t.includes("breeding") || t.includes("calving")) return "/breeding";
    if (t.includes("milk") || t.includes("production")) return "/milk";
    return "/";
  };

  return (
    <div className={styles.popover} ref={popoverRef}>
      <div className={styles.header}>
        <h3>Quick Notifications</h3>
        {alerts.length > 0 && <span className={styles.badgeCount}>{alerts.length} Active</span>}
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }}>
            <X size={18} color="var(--color-text-sub)" />
        </button>
      </div>

      <div className={styles.list}>
        {alerts.length > 0 ? (
          alerts.map((alert, index) => (
            <Link 
              key={index} 
              href={getHref(alert.title)} 
              className={styles.alertItem}
              onClick={onClose}
            >
              <div className={`${styles.iconWrapper} ${alert.type === 'warning' ? styles.warningIcon : styles.infoIcon}`}>
                {alert.type === 'warning' ? <AlertTriangle size={18} /> : <Info size={18} />}
              </div>
              <div className={styles.content}>
                <h4>{alert.title}</h4>
                <p>{alert.description}</p>
              </div>
            </Link>
          ))
        ) : (
          <div className={styles.emptyState}>
            <BellOff size={40} strokeWidth={1.5} opacity={0.3} />
            <p>All caught up!</p>
            <p style={{ opacity: 0.7 }}>No active alerts for your farm at the moment.</p>
          </div>
        )}
      </div>

      {alerts.length > 0 && (
        <div className={styles.footer}>
          <Link href="/" className={styles.viewAll} onClick={onClose}>
            View Home Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
