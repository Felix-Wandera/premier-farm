import React from "react";
import styles from "./PageHeader.module.css";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  children?: React.ReactNode; // Action buttons slot
};

export default function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {children && <div className={styles.actions}>{children}</div>}
    </header>
  );
}
