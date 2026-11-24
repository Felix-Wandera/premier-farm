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

  const getHref = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes("inventory") || t.includes("stock")) return "/inventory";
    if (t.includes("breeding") || t.includes("calving")) return "/breeding";
    if (t.includes("milk") || t.includes("production")) return "/milk";
    return "/";
  };

  return (
    <>
      <div className={styles.mobileScrim} onClick={onClose} />
      <div className={styles.popover} ref={popoverRef} role="dialog" aria-label="Notifications">
        <div className={styles.dragHandle} />
        <div className={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h3>Ranch Alerts</h3>
            {alerts.length > 0 && <span className={styles.badgeCount}>{alerts.length} Active</span>}
          </div>
          <button
            onClick={onClose}
            className={styles.closeBtn}
            aria-label="Close notifications"
          >
            <X size={18} />
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
                <div className={`${styles.iconWrapper} ${alert.type === "warning" ? styles.warningIcon : styles.infoIcon}`}>
                  {alert.type === "warning" ? <AlertTriangle size={18} /> : <Info size={18} />}
                </div>
                <div className={styles.content}>
                  <h4>{alert.title}</h4>
                  <p>{alert.description}</p>
                </div>
              </Link>
            ))
          ) : (
            <div className={styles.emptyState}>
              <BellOff size={36} strokeWidth={1.6} opacity={0.35} />
              <p style={{ fontWeight: 600, color: "var(--color-text-main)" }}>All caught up!</p>
              <p>No active alerts for Premier Ranch Kitale right now.</p>
            </div>
          )}
        </div>

        {alerts.length > 0 && (
          <div className={styles.footer}>
            <Link href="/" className={styles.viewAll} onClick={onClose}>
              View Home Overview
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
