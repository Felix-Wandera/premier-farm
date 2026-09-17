"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Building2, ChevronDown, Check, Plus, Loader2 } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import styles from "./TenantSwitcher.module.css";

interface TenantSwitcherProps {
  isCollapsed?: boolean;
}

export default function TenantSwitcher({ isCollapsed = false }: TenantSwitcherProps) {
  const { activeTenant, tenantRole, memberships, switchTenant } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwitch = async (tenantId: string) => {
    if (tenantId === activeTenant?.id) {
      setIsOpen(false);
      return;
    }
    setIsSwitching(true);
    await switchTenant(tenantId);
    setIsSwitching(false);
    setIsOpen(false);
  };

  if (isCollapsed) {
    return (
      <div className={styles.container} style={{ padding: "0 0.25rem" }}>
        <button
          className={styles.switcherButton}
          style={{ justifyContent: "center", padding: "0.5rem" }}
          onClick={() => setIsOpen(!isOpen)}
          title={activeTenant ? `${activeTenant.name} (${tenantRole})` : "Switch Farm"}
        >
          <div className={styles.farmIconWrapper}>
            <Building2 size={18} />
          </div>
        </button>

        {isOpen && (
          <div
            ref={dropdownRef}
            className={styles.dropdownMenu}
            style={{ left: "calc(100% + 8px)", top: 0, width: "230px" }}
          >
            <div className={styles.menuHeader}>Farms & Organizations</div>
            <div className={styles.farmList}>
              {memberships.map((m) => {
                const isActive = m.tenantId === activeTenant?.id;
                return (
                  <button
                    key={m.tenantId}
                    className={`${styles.farmItem} ${isActive ? styles.activeFarmItem : ""}`}
                    onClick={() => handleSwitch(m.tenantId)}
                    disabled={isSwitching}
                  >
                    <div className={styles.farmItemContent}>
                      <span className={styles.farmItemName}>{m.name}</span>
                      <span className={styles.farmItemMeta}>{m.role}</span>
                    </div>
                    {isActive && <Check size={16} className={styles.checkIcon} />}
                  </button>
                );
              })}
            </div>
            <div className={styles.menuFooter}>
              <Link
                href="/register-farm"
                className={styles.registerLink}
                onClick={() => setIsOpen(false)}
              >
                <Plus size={15} />
                <span>Register New Farm</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        type="button"
        className={styles.switcherButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className={styles.farmIconWrapper}>
          {isSwitching ? <Loader2 size={18} className="animate-spin" /> : <Building2 size={18} />}
        </div>
        <div className={styles.farmInfo}>
          <span className={styles.farmName}>{activeTenant?.name || "Premier Farm"}</span>
          <span className={styles.roleBadge}>{tenantRole || "Organization"}</span>
        </div>
        <ChevronDown size={16} className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`} />
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu}>
          <div className={styles.menuHeader}>Switch Organization</div>
          <div className={styles.farmList}>
            {memberships.length === 0 ? (
              <div className={styles.farmItem}>
                <span className={styles.farmItemName}>{activeTenant?.name || "Primary Farm"}</span>
                <Check size={16} className={styles.checkIcon} />
              </div>
            ) : (
              memberships.map((m) => {
                const isActive = m.tenantId === activeTenant?.id;
                return (
                  <button
                    key={m.tenantId}
                    type="button"
                    className={`${styles.farmItem} ${isActive ? styles.activeFarmItem : ""}`}
                    onClick={() => handleSwitch(m.tenantId)}
                    disabled={isSwitching}
                  >
                    <div className={styles.farmItemContent}>
                      <span className={styles.farmItemName}>{m.name}</span>
                      <span className={styles.farmItemMeta}>{m.role}</span>
                    </div>
                    {isActive && <Check size={16} className={styles.checkIcon} />}
                  </button>
                );
              })
            )}
          </div>
          <div className={styles.menuFooter}>
            <Link
              href="/register-farm"
              className={styles.registerLink}
              onClick={() => setIsOpen(false)}
            >
              <Plus size={15} />
              <span>Register New Farm</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
