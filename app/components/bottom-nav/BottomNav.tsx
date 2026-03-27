"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Beef, Droplet, Menu, Plus } from "lucide-react";
import styles from "./BottomNav.module.css";
import MobileMenu from "../mobile-menu/MobileMenu";
import QuickAddMenu from "../quick-add/QuickAddMenu";

export default function BottomNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Hide BottomNav on deep routes (like /herd/some-id) to free up screen real-estate
  if (pathname.split('/').length > 2) return null;

  const navItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Beef, label: "Herd", href: "/herd" },
  ];
  
  const navItemsRight = [
    { icon: Droplet, label: "Milk", href: "/milk" },
  ];

  const renderNav = (items: typeof navItems) => (
    items.map((item) => {
      const isActive = pathname === item.href;
      return (
        <Link 
          key={item.href} 
          href={item.href} 
          className={`${styles.navItem} ${isActive ? styles.active : ""}`}
        >
          <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
          <span className={styles.label}>{item.label}</span>
        </Link>
      );
    })
  );

  return (
    <>
      <nav className={`${styles.bottomNav} glass`}>
        <div className={styles.navGroup}>
          {renderNav(navItems)}
        </div>

        <div className={styles.fabWrapper}>
          <button className={styles.fab} aria-label="Quick Add" onClick={() => setIsQuickAddOpen(true)}>
            <Plus size={28} color="white" strokeWidth={2.5} />
          </button>
        </div>

        <div className={styles.navGroup}>
          {renderNav(navItemsRight)}
          
          {/* Menu Button swaps Sales out when on Mobile */}
          <button 
            className={styles.navItem} 
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open secondary menu"
          >
            <Menu size={22} strokeWidth={2} />
            <span className={styles.label}>Menu</span>
          </button>
        </div>
      </nav>

      <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <QuickAddMenu isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />
    </>
  );
}
