"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import logoPic from "@/public/logo.png";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Beef,
  Droplet,
  LineChart,
  BarChart3,
  Package,
  Settings,
  LogOut,
  Users,
  HeartPulse,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import styles from "./Sidebar.module.css";
import { ThemeToggle } from "../theme-toggle/ThemeToggle";
import { useToast } from "../ui/Toast";
import { useAuth } from "../auth/AuthProvider";
import TenantSwitcher from "../tenant/TenantSwitcher";
import { APP_BRAND_NAME } from "@/lib/branding";
import { PermissionKey } from "@/lib/permissions";

const navItems: Array<{
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  href: string;
  permission?: PermissionKey;
}> = [
  { icon: Home, label: "Dashboard", href: "/" },
  { icon: BarChart3, label: "Analytics & Reports", href: "/analytics", permission: "analytics:view" },
  { icon: Beef, label: "Herd", href: "/herd", permission: "herd:view" },
  { icon: HeartPulse, label: "Breeding & Health", href: "/breeding", permission: "health:view" },
  { icon: Droplet, label: "Milk Production", href: "/milk", permission: "milk:view" },
  { icon: LineChart, label: "Sales & Finances", href: "/sales", permission: "finances:view" },
  { icon: Package, label: "Inventory", href: "/inventory", permission: "inventory:view" },
  { icon: Users, label: "User Management", href: "/users", permission: "users:manage" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const { hasPermission } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  const handleLogout = async () => {
    toast("Logging out...", "success");
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  return (
    <aside className={styles.sidebar} data-collapsed={isCollapsed}>
      <div className={styles.logoContainer}>
        <div className={styles.logoMarkWrapper}>
          {!isCollapsed && (
            <>
              <Image
                src={logoPic}
                alt={`${APP_BRAND_NAME} Logo`}
                width={32}
                height={32}
                className={styles.logoMark}
              />
              <h1 className={styles.logoText}>{APP_BRAND_NAME}</h1>
            </>
          )}
        </div>
        <button
          className={styles.collapseToggle}
          onClick={toggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <TenantSwitcher isCollapsed={isCollapsed} />

      <nav className={styles.navItems}>
        {navItems
          .filter((item) => !item.permission || hasPermission(item.permission))
          .map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
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
        <ThemeToggle className={styles.navLink} showLabel={!isCollapsed} />
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
