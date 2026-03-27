"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, LineChart, HeartPulse, Package, Users, Settings, LogOut } from "lucide-react";
import styles from "./MobileMenu.module.css";
import { ThemeToggle } from "../theme-toggle/ThemeToggle";

const menuItems = [
  { icon: LineChart, label: "Sales & Finances", href: "/sales" },
  { icon: HeartPulse, label: "Breeding", href: "/breeding" },
  { icon: Package, label: "Inventory", href: "/inventory" },
  { icon: Users, label: "User Management", href: "/users" },
];

export default function MobileMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={`${styles.bottomSheet} glass`}>
        <div className={styles.header}>
          <h2 className={styles.title}>Menu</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close menu">
            <X size={24} />
          </button>
        </div>
        
        <nav className={styles.navGrid}>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`${styles.menuItem} ${isActive ? styles.active : ""}`}
              >
                <div className={styles.iconWrapper}><item.icon size={22} /></div>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.footer}>
          <div className={styles.footerRow}>
             <ThemeToggle className={styles.settingsLink} />
          </div>
          <Link href="/settings" onClick={onClose} className={styles.settingsLink}>
            <Settings size={20} />
            <span>Settings</span>
          </Link>
          <button className={`${styles.settingsLink} ${styles.danger}`}>
            <LogOut size={20} />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
