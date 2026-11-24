"use client";

import React, { useState } from "react";
import { Download, FileSpreadsheet, Droplet, DollarSign, Package, Archive, HeartPulse } from "lucide-react";
import { useToast } from "../ui/Toast";
import { useAuth } from "../auth/AuthProvider";
import { PermissionKey } from "@/lib/permissions";
import ResponsiveSheet from "../ui/ResponsiveSheet";
import sheetStyles from "../ui/ResponsiveSheet.module.css";

interface DataExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFrom?: string;
  defaultTo?: string;
}

export default function DataExportModal({
  isOpen,
  onClose,
  defaultFrom = "",
  defaultTo = "",
}: DataExportModalProps) {
  const toast = useToast();
  const { hasPermission } = useAuth();
  const todayStr = new Date().toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);

  const handleDownload = (type: string, name: string) => {
    toast(`Preparing ${name} export...`, "info");
    const params = new URLSearchParams({ type });
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    window.open(`/api/export?${params.toString()}`, "_blank");
  };

  const exportOptions: Array<{
    type: string;
    name: string;
    desc: string;
    icon: React.ReactNode;
    permission?: PermissionKey;
  }> = [
    {
      type: "herd",
      name: "Herd Directory",
      desc: "All animals, ear tags, species, breeds, genealogy, and status.",
      icon: <FileSpreadsheet size={22} color="#10b981" />,
      permission: "herd:view",
    },
    {
      type: "milk",
      name: "Milk Production Records",
      desc: "Historical milking logs with cow names, tags, sessions, and yields.",
      icon: <Droplet size={22} color="#3b82f6" />,
      permission: "milk:view",
    },
    {
      type: "finances",
      name: "Financial Ledger & Sales",
      desc: "Income, milk sales, animal sales, feed purchases, and farm expenses.",
      icon: <DollarSign size={22} color="#f59e0b" />,
      permission: "finances:view",
    },
    {
      type: "breeding_health",
      name: "Breeding & Health Records",
      desc: "Inseminations, pregnancy checks, calvings, vaccinations, and treatments.",
      icon: <HeartPulse size={22} color="#ec4899" />,
      permission: "health:view",
    },
    {
      type: "inventory",
      name: "Inventory Stock Ledger",
      desc: "Feed, medicine, and equipment stock levels, units, and alert thresholds.",
      icon: <Package size={22} color="#8b5cf6" />,
      permission: "inventory:view",
    },
    {
      type: "all",
      name: "Consolidated Ranch Backup",
      desc: "Multi-section CSV archive of all modules you have permission to view.",
      icon: <Archive size={22} color="var(--color-primary)" />,
    },
  ];

  const visibleOptions = exportOptions.filter(
    (opt) => !opt.permission || hasPermission(opt.permission)
  );

  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="Export Ranch Records"
      subtitle="Download spreadsheet-ready CSV files"
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
          {fromDate || toDate ? (
            <button
              type="button"
              onClick={() => {
                setFromDate("");
                setToDate("");
              }}
              style={{
                background: "none",
                border: "none",
                color: "#ef4444",
                fontWeight: 700,
                fontSize: "0.84rem",
                cursor: "pointer",
              }}
            >
              Clear Date Filter
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className={sheetStyles.secondaryBtn}
            style={{ minWidth: "110px" }}
          >
            Done
          </button>
        </div>
      }
    >
      <div className={`${sheetStyles.fieldRow} ${sheetStyles.fieldRowStackMobile}`}>
        <div className={sheetStyles.fieldGroup}>
          <label className={sheetStyles.label}>From Date (Optional)</label>
          <input
            type="date"
            max={toDate || todayStr}
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className={sheetStyles.input}
          />
        </div>
        <div className={sheetStyles.fieldGroup}>
          <label className={sheetStyles.label}>To Date (Optional)</label>
          <input
            type="date"
            min={fromDate || undefined}
            max={todayStr}
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className={sheetStyles.input}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
        {visibleOptions.map((opt) => (
          <button
            key={opt.type}
            type="button"
            onClick={() => handleDownload(opt.type, opt.name)}
            style={{
              width: "100%",
              padding: "0.9rem 1rem",
              borderRadius: "14px",
              border: "1px solid var(--color-border)",
              backgroundColor: "var(--color-bg)",
              color: "var(--color-text-main)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.85rem",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", minWidth: 0 }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {opt.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "0.92rem", fontWeight: 700 }}>{opt.name}</div>
                <div style={{ fontSize: "0.76rem", color: "var(--color-text-sub)", marginTop: "2px", lineHeight: 1.35 }}>
                  {opt.desc}
                </div>
              </div>
            </div>

            <Download size={18} color="var(--color-primary)" style={{ flexShrink: 0 }} />
          </button>
        ))}
      </div>
    </ResponsiveSheet>
  );
}
