"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Droplet, Menu, Plus } from "lucide-react";
import styles from "./BottomNav.module.css";
import MobileMenu from "../mobile-menu/MobileMenu";
import QuickAddMenu from "../quick-add/QuickAddMenu";
import { CattleIcon } from "../ui/AnimalIcon";
import { useAuth } from "../auth/AuthProvider";

export default function BottomNav() {
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Hide BottomNav on deep sub-routes (/herd/[id], /herd/new)
  if (pathname.split("/").length > 2) return null;

  const canQuickAddAny =
    hasPermission("herd:create") ||
    hasPermission("milk:log") ||
    hasPermission("health:manage") ||
    hasPermission("finances:manage") ||
    hasPermission("inventory:transact") ||
    hasPermission("inventory:manage") ||
    hasPermission("users:manage");

  const navItemsLeft = [
    { icon: Home, label: "Home", href: "/" },
    ...(hasPermission("herd:view")
      ? [{ icon: CattleIcon, label: "Herd", href: "/herd" }]
      : []),
  ];

  const navItemsRight = [
    ...(hasPermission("milk:view")
      ? [{ icon: Droplet, label: "Milk", href: "/milk" }]
      : []),
  ];

  const renderNav = (
    items: Array<{
      icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
      label: string;
      href: string;
    }>
  ) =>
    items.map((item) => {
      const isActive = pathname === item.href;
      return (
        <Link
          key={item.href}
          href={item.href}
          className={`${styles.navItem} ${isActive ? styles.active : ""}`}
        >
          <item.icon size={22} strokeWidth={isActive ? 2.4 : 1.9} />
          <span className={styles.label}>{item.label}</span>
        </Link>
      );
    });

  return (
    <>
      <nav className={`${styles.bottomNav} glass`} aria-label="Primary Mobile Navigation">
        <div className={styles.navGroup}>{renderNav(navItemsLeft)}</div>

        {canQuickAddAny && (
          <div className={styles.fabWrapper}>
            <button
              className={styles.fab}
              aria-label="Open quick actions"
              onClick={() => setIsQuickAddOpen(true)}
            >
              <Plus size={26} color="white" strokeWidth={2.6} />
            </button>
          </div>
        )}

        <div className={styles.navGroup}>
          {renderNav(navItemsRight)}

          <button
            className={`${styles.navItem} ${isMenuOpen ? styles.active : ""}`}
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open ranch menu"
          >
            <Menu size={22} strokeWidth={1.9} />
            <span className={styles.label}>Menu</span>
          </button>
        </div>
      </nav>

      <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <QuickAddMenu isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />
    </>
  );
}
