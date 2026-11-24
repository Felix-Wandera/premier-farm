"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { X, LineChart, BarChart3, HeartPulse, Package, Users, Settings, LogOut } from "lucide-react";
import styles from "./MobileMenu.module.css";
import { ThemeToggle } from "../theme-toggle/ThemeToggle";
import { useToast } from "../ui/Toast";
import { useAuth } from "../auth/AuthProvider";
import TenantSwitcher from "../tenant/TenantSwitcher";
import { PermissionKey } from "@/lib/permissions";

const menuItems: Array<{
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  href: string;
  permission?: PermissionKey;
}> = [
  { icon: BarChart3, label: "Analytics & Reports", href: "/analytics", permission: "analytics:view" },
  { icon: LineChart, label: "Sales & Finances", href: "/sales", permission: "finances:view" },
  { icon: HeartPulse, label: "Breeding & Health", href: "/breeding", permission: "health:view" },
  { icon: Package, label: "Inventory", href: "/inventory", permission: "inventory:view" },
  { icon: Users, label: "User Management", href: "/users", permission: "users:manage" },
];

export default function MobileMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const { hasPermission } = useAuth();

  const handleLogout = async () => {
    onClose();
    toast("Logging out...", "success");
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

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

        <div style={{ padding: "0.25rem 0.5rem" }}>
          <TenantSwitcher />
        </div>

        <nav className={styles.navGrid}>
          {menuItems
            .filter((item) => !item.permission || hasPermission(item.permission))
            .map((item) => {
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
          <button className={`${styles.settingsLink} ${styles.danger}`} onClick={handleLogout}>
            <LogOut size={20} />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
