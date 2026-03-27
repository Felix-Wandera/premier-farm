"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Beef, Droplet, LineChart, Package, Settings, LogOut, Users, HeartPulse } from "lucide-react";
import styles from "./Sidebar.module.css";
import { ThemeToggle } from "../theme-toggle/ThemeToggle";

const navItems = [
  { icon: Home, label: "Dashboard", href: "/" },
  { icon: Beef, label: "Herd", href: "/herd" },
  { icon: HeartPulse, label: "Breeding", href: "/breeding" },
  { icon: Droplet, label: "Milk Production", href: "/milk" },
  { icon: LineChart, label: "Sales & Finances", href: "/sales" },
  { icon: Package, label: "Inventory", href: "/inventory" },
  { icon: Users, label: "User Management", href: "/users" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoContainer}>
        <div className={styles.logoMark}></div>
        <h1 className={styles.logoText}>Premier Farm</h1>
      </div>

      <nav className={styles.navItems}>
        {navItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${isActive ? styles.active : ""}`}
            >
              <item.icon size={20} className={styles.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <ThemeToggle className={styles.navLink} />
        <Link href="/settings" className={styles.navLink}>
          <Settings size={20} className={styles.icon} />
          <span>Settings</span>
        </Link>
        <button className={`${styles.navLink} ${styles.logoutBtn}`}>
          <LogOut size={20} className={styles.icon} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
