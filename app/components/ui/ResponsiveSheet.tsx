"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import styles from "./ResponsiveSheet.module.css";

export interface ResponsiveSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "dialog" | "drawer";
  zIndex?: number;
  disableClose?: boolean;
}

export default function ResponsiveSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  headerRight,
  footer,
  children,
  size = "md",
  variant = "dialog",
  zIndex = 300,
  disableClose = false,
}: ResponsiveSheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !disableClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, disableClose, onClose]);

  if (!isOpen) return null;

  const sizeClass =
    variant === "drawer"
      ? styles.drawerDesktop
      : size === "sm"
      ? styles.sizeSm
      : size === "lg"
      ? styles.sizeLg
      : styles.sizeMd;

  return (
    <div
      className={`${styles.backdrop} ${variant === "drawer" ? styles.backdropDrawer : ""}`}
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !disableClose) {
          onClose();
        }
      }}
    >
      <div className={`${styles.sheet} ${sizeClass}`}>
        <div className={styles.dragHandle} />

        <div className={styles.header}>
          <div className={styles.headerTitles}>
            <h2 className={styles.title}>{title}</h2>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>

          <div className={styles.headerActions}>
            {headerRight}
            <button
              type="button"
              onClick={onClose}
              disabled={disableClose}
              className={styles.closeBtn}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className={styles.body}>{children}</div>

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
