"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import styles from "./Breadcrumb.module.css";

const routeLabels: Record<string, string> = {
  herd: "Herd",
  milk: "Milk Production",
  breeding: "Breeding",
  sales: "Sales",
  inventory: "Inventory",
  users: "Team Management",
  settings: "Settings",
  new: "Register New",
};

export default function Breadcrumb() {
  const pathname = usePathname();
  
  if (pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);
  
  return (
    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      <Link href="/" className={styles.homeLink}>
        <Home size={14} />
      </Link>
      
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        const isLast = index === segments.length - 1;
        const label = routeLabels[segment] || segment.toUpperCase();

        return (
          <React.Fragment key={href}>
            <ChevronRight className={styles.separator} size={14} />
            {isLast ? (
              <span className={styles.current} aria-current="page">
                {label}
              </span>
            ) : (
              <Link href={href} className={styles.link}>
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
