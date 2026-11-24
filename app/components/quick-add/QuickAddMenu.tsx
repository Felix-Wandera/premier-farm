"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  X,
  Droplet,
  HeartPulse,
  Stethoscope,
  DollarSign,
  Package,
  PackagePlus,
  UserPlus,
  ArrowRight,
} from "lucide-react";
import styles from "./QuickAddMenu.module.css";
import AnimalIcon from "../ui/AnimalIcon";
import { useAuth } from "../auth/AuthProvider";
import { PermissionKey } from "@/lib/permissions";
import { dispatchQuickAction, QuickActionId } from "@/lib/quick-actions";

interface ActionItem {
  id: QuickActionId;
  label: string;
  description: string;
  targetPath: string;
  permission: PermissionKey;
  colorClass: string;
  icon: React.ReactNode;
}

const ALL_ACTIONS: ActionItem[] = [
  {
    id: "add-animal",
    label: "Register Animal",
    description: "Add a cow, calf, bull, sheep, or goat",
    targetPath: "/herd",
    permission: "herd:create",
    colorClass: styles.bgCow,
    icon: <AnimalIcon species="Dairy Cow" size={26} />,
  },
  {
    id: "log-milk",
    label: "Log Milk Session",
    description: "Enter Morning, Mid-day, or Evening yields",
    targetPath: "/milk",
    permission: "milk:log",
    colorClass: styles.bgMilk,
    icon: <Droplet size={24} />,
  },
  {
    id: "log-breeding",
    label: "Log Breeding Event",
    description: "Record AI, mating, pregnancy check, or calving",
    targetPath: "/breeding",
    permission: "health:manage",
    colorClass: styles.bgBreeding,
    icon: <HeartPulse size={24} />,
  },
  {
    id: "log-health",
    label: "Log Health Record",
    description: "Record vaccination, deworming, or vet treatment",
    targetPath: "/breeding",
    permission: "health:manage",
    colorClass: styles.bgHealth,
    icon: <Stethoscope size={24} />,
  },
  {
    id: "record-transaction",
    label: "Record Sale / Expense",
    description: "Log farm income or operating expense in KES",
    targetPath: "/sales",
    permission: "finances:manage",
    colorClass: styles.bgFinance,
    icon: <DollarSign size={24} />,
  },
  {
    id: "record-stock",
    label: "Stock In / Stock Out",
    description: "Restock supplies or deduct daily consumption",
    targetPath: "/inventory",
    permission: "inventory:transact",
    colorClass: styles.bgInventory,
    icon: <Package size={24} />,
  },
  {
    id: "new-item",
    label: "New Inventory Item",
    description: "Create a feed, medicine, or equipment SKU",
    targetPath: "/inventory",
    permission: "inventory:manage",
    colorClass: styles.bgInventoryAlt,
    icon: <PackagePlus size={24} />,
  },
  {
    id: "invite-member",
    label: "Invite Team Member",
    description: "Send ranch access invite & assign role",
    targetPath: "/users",
    permission: "users:manage",
    colorClass: styles.bgTeam,
    icon: <UserPlus size={24} />,
  },
];

export default function QuickAddMenu({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { hasPermission } = useAuth();

  if (!isOpen) return null;

  const allowedActions = ALL_ACTIONS.filter((a) => hasPermission(a.permission));

  // Context-pinned actions when inside a specific module; empty on Home (/), /analytics, /settings
  const isModuleRoute =
    pathname === "/herd" ||
    pathname === "/milk" ||
    pathname === "/breeding" ||
    pathname === "/sales" ||
    pathname === "/inventory" ||
    pathname === "/users";

  const pinnedActions = isModuleRoute
    ? allowedActions.filter((a) => a.targetPath === pathname)
    : [];

  const pinnedIds = new Set(pinnedActions.map((a) => a.id));
  const secondaryActions =
    pinnedActions.length > 0
      ? allowedActions.filter((a) => !pinnedIds.has(a.id))
      : allowedActions;

  const handleTrigger = (action: ActionItem) => {
    onClose();

    if (action.id === "add-animal") {
      router.push("/herd/new");
      return;
    }

    if (pathname === action.targetPath) {
      dispatchQuickAction(action.id);
      return;
    }

    if (action.id === "log-milk") {
      router.push("/milk");
      return;
    }

    router.push(`${action.targetPath}?action=${action.id}`);
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Quick Actions">
      <div className={styles.backdrop} onClick={onClose} />

      <div className={styles.menuContainer}>
        <div className={styles.dragHandle} />

        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Quick Actions</h2>
            <p className={styles.subtitle}>
              {pinnedActions.length > 0
                ? "Suggested for this screen or jump anywhere"
                : "Choose what you would like to record"}
            </p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close quick actions">
            <X size={20} />
          </button>
        </div>

        <div className={styles.scrollArea}>
          {pinnedActions.length > 0 && (
            <div className={styles.pinnedSection}>
              <span className={styles.sectionLabel}>On This Screen</span>
              <div className={styles.pinnedList}>
                {pinnedActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className={styles.pinnedCard}
                    onClick={() => handleTrigger(action)}
                  >
                    <div className={`${styles.pinnedIcon} ${action.colorClass}`}>
                      {action.icon}
                    </div>
                    <div className={styles.pinnedText}>
                      <span className={styles.pinnedTitle}>{action.label}</span>
                      <span className={styles.pinnedDesc}>{action.description}</span>
                    </div>
                    <ArrowRight size={18} className={styles.pinnedArrow} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {secondaryActions.length > 0 && (
            <div className={styles.gridSection}>
              {pinnedActions.length > 0 && (
                <span className={styles.sectionLabel}>More Farm Actions</span>
              )}
              <div className={styles.actionGrid}>
                {secondaryActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className={styles.actionCard}
                    onClick={() => handleTrigger(action)}
                  >
                    <div className={`${styles.iconCircle} ${action.colorClass}`}>
                      {action.icon}
                    </div>
                    <span className={styles.cardLabel}>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
