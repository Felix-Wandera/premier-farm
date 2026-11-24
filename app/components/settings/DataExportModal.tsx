"use client";

import React, { useState } from "react";
import { X, Download, FileSpreadsheet, Droplet, DollarSign, Package, Archive, HeartPulse } from "lucide-react";
import { useToast } from "../ui/Toast";
import { useAuth } from "../auth/AuthProvider";
import { PermissionKey } from "@/lib/permissions";

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

  if (!isOpen) return null;

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
      desc: "Complete list of all animals, ear tags, species, breeds, genealogy, and status.",
      icon: <FileSpreadsheet size={24} color="#16a34a" />,
      permission: "herd:view",
    },
    {
      type: "milk",
      name: "Milk Production Records",
      desc: "Historical milking logs with cow names, tags, sessions, yields, and milkers.",
      icon: <Droplet size={24} color="#2563eb" />,
      permission: "milk:view",
    },
    {
      type: "finances",
      name: "Financial Ledger & Sales",
      desc: "Income, milk sales, animal sales, feed purchases, vet services, and farm expenses.",
      icon: <DollarSign size={24} color="#ca8a04" />,
      permission: "finances:view",
    },
    {
      type: "breeding_health",
      name: "Breeding & Health Records",
      desc: "Inseminations, pregnancy checks, calving history, vaccinations, and vet treatments.",
      icon: <HeartPulse size={24} color="#e11d48" />,
      permission: "health:view",
    },
    {
      type: "inventory",
      name: "Inventory Stock Ledger",
      desc: "Feed, medicine, and equipment stock levels, units, and minimum re-order thresholds.",
      icon: <Package size={24} color="#9333ea" />,
      permission: "inventory:view",
    },
    {
      type: "all",
      name: "Consolidated Ranch Backup",
      desc: "Multi-section CSV archive of all modules you have permission to view.",
      icon: <Archive size={24} color="#0f172a" />,
    },
  ];

  const visibleOptions = exportOptions.filter(
    (opt) => !opt.permission || hasPermission(opt.permission)
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          backgroundColor: "var(--color-surface, #ffffff)",
          color: "var(--color-text-main, #0f172a)",
          borderRadius: "16px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15)",
          border: "1px solid var(--color-border, #e2e8f0)",
          margin: "1rem",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--color-border, #e2e8f0)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>Export Ranch Records</h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", opacity: 0.7 }}>
              Download spreadsheet-ready CSV files (optionally filtered by date)
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "inherit" }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Optional Date Range Filter */}
        <div
          style={{
            padding: "0.9rem 1.5rem",
            borderBottom: "1px solid var(--color-border, #e2e8f0)",
            backgroundColor: "var(--color-bg, #f8fafc)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem",
          }}
        >
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "4px", opacity: 0.75 }}>
              From Date (Optional)
            </label>
            <input
              type="date"
              max={toDate || todayStr}
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{
                width: "100%",
                padding: "0.45rem 0.6rem",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                color: "var(--color-text-main)",
                fontSize: "0.85rem",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "4px", opacity: 0.75 }}>
              To Date (Optional)
            </label>
            <input
              type="date"
              min={fromDate || undefined}
              max={todayStr}
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{
                width: "100%",
                padding: "0.45rem 0.6rem",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                color: "var(--color-text-main)",
                fontSize: "0.85rem",
              }}
            />
          </div>
        </div>

        {/* Options List */}
        <div style={{ padding: "1.1rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.65rem", maxHeight: "55vh", overflowY: "auto" }}>
          {visibleOptions.map((opt) => (
            <div
              key={opt.type}
              onClick={() => handleDownload(opt.type, opt.name)}
              style={{
                padding: "0.9rem 1rem",
                borderRadius: "12px",
                border: "1px solid var(--color-border, #e2e8f0)",
                backgroundColor: "var(--color-bg, #f8fafc)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                <div
                  style={{
                    padding: "0.6rem",
                    borderRadius: "10px",
                    backgroundColor: "var(--color-surface, #ffffff)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  {opt.icon}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.93rem", fontWeight: 700 }}>{opt.name}</h4>
                  <p style={{ margin: "2px 0 0", fontSize: "0.75rem", opacity: 0.7 }}>{opt.desc}</p>
                </div>
              </div>

              <button
                type="button"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-primary, #16a34a)",
                  padding: "6px",
                  display: "flex",
                  alignItems: "center",
                }}
                title={`Download ${opt.name} CSV`}
              >
                <Download size={18} />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid var(--color-border, #e2e8f0)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {(fromDate || toDate) ? (
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
                fontWeight: 600,
                fontSize: "0.82rem",
                cursor: "pointer",
              }}
            >
              Clear Date Filter
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            style={{
              padding: "0.6rem 1.25rem",
              borderRadius: "8px",
              border: "1px solid var(--color-border, #cbd5e1)",
              backgroundColor: "transparent",
              color: "inherit",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
