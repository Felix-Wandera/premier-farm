"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home, Beef, Droplet, LineChart, Package,
  Settings, LogOut, Users, HeartPulse,
  ChevronLeft, ChevronRight
} from "lucide-react";
import styles from "./Sidebar.module.css";
import { ThemeToggle } from "../theme-toggle/ThemeToggle";
import { useToast } from "../ui/Toast";

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
  const router = useRouter();
  const toast = useToast();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved));
    }
  }, []);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newState));
  };

  const handleLogout = () => {
    toast("Logging out...", "success");
    setTimeout(() => router.push("/login"), 1000);
  };

  return (
    <aside
      className={styles.sidebar}
      data-collapsed={isCollapsed}
    >
      <div className={styles.logoContainer}>
        <div className={styles.logoMarkWrapper}>
          <div className={styles.logoMark}></div>
          {!isCollapsed && <h1 className={styles.logoText}>Premier Farm</h1>}
        </div>
        <button
          className={styles.collapseToggle}
          onClick={toggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className={styles.navItems}>
        {navItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${isActive ? styles.active : ""}`}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon size={20} className={styles.icon} />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <ThemeToggle
          className={styles.navLink}
          showLabel={!isCollapsed}
        />
        <Link
          href="/settings"
          className={styles.navLink}
          title={isCollapsed ? "Settings" : undefined}
        >
          <Settings size={20} className={styles.icon} />
          {!isCollapsed && <span>Settings</span>}
        </Link>
        <button
          className={`${styles.navLink} ${styles.logoutBtn}`}
          onClick={handleLogout}
          title={isCollapsed ? "Log Out" : undefined}
        >
          <LogOut size={20} className={styles.icon} />
          {!isCollapsed && <span>Log Out</span>}
        </button>
      </div>
    </aside>
  );
}
