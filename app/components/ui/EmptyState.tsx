import React from "react";
import styles from "./EmptyState.module.css";
import { Inbox } from "lucide-react";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className={styles.container}>
      <div className={styles.iconCircle}>
        {icon || <Inbox size={36} />}
      </div>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {actionLabel && onAction && (
        <button className={styles.actionBtn} onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}
