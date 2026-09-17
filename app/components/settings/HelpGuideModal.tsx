"use client";

import React, { useState } from "react";
import {
  X,
  BookOpen,
  Beef,
  HeartPulse,
  Droplet,
  LineChart,
  Package,
  Users,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from "lucide-react";
import styles from "./SettingsModal.module.css";

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GuideSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  summary: string;
  details: string[];
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "herd",
    title: "1. Herd Management & Animal Profiles",
    icon: <Beef size={20} color="#16a34a" />,
    summary: "Registering cattle, tracking identification tags, lineage, and life statuses.",
    details: [
      "Tag IDs & Breeds: Every animal is assigned a unique ear tag (e.g. PF-001) and breed category (Dairy, Indigenous, or Cross).",
      "Lineage & Pedigree: Assign Sire (father) and Dam (mother) to maintain complete pedigree trees and avoid inbreeding.",
      "Status Transitions: Update animal status to Active, Sold, Deceased, or Transferred with date and audit notes.",
      "Automated Sale Integration: Marking an animal as Sold automatically creates an official financial sale entry with the recorded buyer and price.",
    ],
  },
  {
    id: "breeding",
    title: "2. Breeding & Gestation Cycles",
    icon: <HeartPulse size={20} color="#e11d48" />,
    summary: "Insemination, pregnancy checks, automated calving forecasts, and veterinary logs.",
    details: [
      "Event Logging: Record Artificial Insemination (AI) or Natural Service including the sire tag/code and technician.",
      "Automated Expected Calving: Gestation is automatically computed at 283 days from service date.",
      "Pregnancy Verification: Confirm pregnancy status with vet checkup dates and notes.",
      "Health & Vet Logs: Track vaccination, treatments, and vet expenses with automatic linkage to the farm expense ledger.",
    ],
  },
  {
    id: "milk",
    title: "3. Daily Milk Production Logging",
    icon: <Droplet size={20} color="#2563eb" />,
    summary: "Morning and Evening milking sessions, individual cow yields, and quick batch entry.",
    details: [
      "Session Logging: Record Morning and Evening yields per active lactating cow in liters.",
      "Inline Yield Adjustments: Click on any recorded cow to update their yield directly without re-logging the entire session.",
      "Milker Attribution: Track which staff member performed the milking for quality control and accountability.",
      "Session CSV Exports: Instantly export individual milking sessions or full production histories to CSV.",
    ],
  },
  {
    id: "finances",
    title: "4. Sales, Expenses & Financial Ledgers",
    icon: <LineChart size={20} color="#d97706" />,
    summary: "Tracking income, milk collections, animal sales, vet costs, feed, and net margin.",
    details: [
      "Income Streams: Milk sales (per liter / contracted buyer) and Cattle sales.",
      "Expense Categories: Feed inventory purchases, Veterinary services, Labor & farm hands, and Maintenance.",
      "Multi-Filter Drawer: Filter transactions by Type (Income vs Expense), Category, and Date Range with real-time recalculation of Net Profit.",
      "Standardized CSV Export: Export fully formatted financial statements for accounting and audits.",
    ],
  },
  {
    id: "inventory",
    title: "5. Inventory & Reorder Thresholds",
    icon: <Package size={20} color="#9333ea" />,
    summary: "Stock control for cattle feed, supplements, medications, and equipment.",
    details: [
      "Categories: Feed, Medicine, Equipment, and Consumables.",
      "Stock-In & Stock-Out: Keep an immutable ledger of every inventory deduction or restock, attributed to the staff user.",
      "Low Stock Alerts: Specify a minimum threshold (e.g. 5 bags of dairy meal). The dashboard will proactively flag items needing restock.",
    ],
  },
  {
    id: "roles",
    title: "6. User Roles & Team Access Control (RBAC)",
    icon: <ShieldCheck size={20} color="#0284c7" />,
    summary: "Role-based security permissions for farm owners, managers, and field hands.",
    details: [
      "Admin: Full access — manages team members, farm configuration, financial ledgers, and data backup exports.",
      "Manager: Operational control — logs herd data, milk production, breeding records, inventory, and viewing reports.",
      "Worker: Field operations — focused on daily milk logging, health notes, and animal observations (no financial access).",
      "Invitation Links: Secure 7-day single-use invitation tokens that can be emailed or copied directly to WhatsApp/SMS.",
    ],
  },
];

export default function HelpGuideModal({ isOpen, onClose }: HelpGuideModalProps) {
  const [expandedSection, setExpandedSection] = useState<string>("herd");

  if (!isOpen) return null;

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? "" : id);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer} style={{ maxWidth: "600px" }}>
        <div className={styles.dragHandle} />
        <div className={styles.modalHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <BookOpen size={22} color="var(--color-primary)" />
            <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Farm Operations Guide & FAQ</h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
            aria-label="Close"
          >
            <X size={24} color="var(--color-text-sub)" />
          </button>
        </div>

        <div className={styles.modalBody} style={{ maxHeight: "70vh", overflowY: "auto", padding: "1.25rem" }}>
          <p style={{ margin: "0 0 1rem 0", fontSize: "0.9rem", color: "var(--color-text-sub)" }}>
            Welcome to the Premier Farm Operations Manual. Click any topic below to learn how each module operates:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {GUIDE_SECTIONS.map((sec) => {
              const isExpanded = expandedSection === sec.id;
              return (
                <div
                  key={sec.id}
                  style={{
                    border: "1px solid var(--color-border)",
                    borderRadius: "12px",
                    overflow: "hidden",
                    backgroundColor: isExpanded ? "var(--color-bg)" : "var(--color-surface)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <button
                    onClick={() => toggleSection(sec.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "1rem",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      {sec.icon}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-main)" }}>
                          {sec.title}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--color-text-sub)", marginTop: "2px" }}>
                          {sec.summary}
                        </div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={18} color="var(--color-text-sub)" />
                    ) : (
                      <ChevronDown size={18} color="var(--color-text-sub)" />
                    )}
                  </button>

                  {isExpanded && (
                    <div
                      style={{
                        padding: "0 1rem 1rem 1rem",
                        borderTop: "1px solid var(--color-border)",
                        backgroundColor: "var(--color-surface)",
                      }}
                    >
                      <ul style={{ margin: "0.75rem 0 0 0", paddingLeft: "1.2rem", fontSize: "0.875rem", color: "var(--color-text-main)", lineHeight: 1.6 }}>
                        {sec.details.map((detail, idx) => (
                          <li key={idx} style={{ marginBottom: "0.4rem" }}>
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.modalFooter} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--color-text-sub)" }}>Premier Farm Operations Manual v1.0</span>
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "8px",
              border: "none",
              background: "var(--color-primary)",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
