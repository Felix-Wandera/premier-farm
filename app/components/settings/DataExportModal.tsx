"use client";

import React from "react";
import { X, Download, FileSpreadsheet, Droplet, DollarSign, Package, Archive } from "lucide-react";
import { useToast } from "../ui/Toast";

interface DataExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DataExportModal({ isOpen, onClose }: DataExportModalProps) {
  const toast = useToast();

  if (!isOpen) return null;

  const handleDownload = (type: string, name: string) => {
    toast(`Preparing ${name} export...`, "info");
    window.open(`/api/export?type=${type}`, "_blank");
  };

  const exportOptions = [
    {
      type: "herd",
      name: "Herd Directory",
      desc: "Complete list of all animals, official tag IDs, species, genealogy, and status.",
      icon: <FileSpreadsheet size={24} color="#16a34a" />,
    },
    {
      type: "milk",
      name: "Milk Production Records",
      desc: "Historical milking logs with cow tags, sessions (Morning/Evening), yields, and milkers.",
      icon: <Droplet size={24} color="#2563eb" />,
    },
    {
      type: "finances",
      name: "Financial Ledger & Sales",
      desc: "Income, milk sales, animal sales, vet services, feed purchases, and farm expenses.",
      icon: <DollarSign size={24} color="#ca8a04" />,
    },
    {
      type: "inventory",
      name: "Inventory Stock Ledger",
      desc: "Feed, medicine, and equipment stock levels, units, and minimum re-order thresholds.",
      icon: <Package size={24} color="#9333ea" />,
    },
    {
      type: "all",
      name: "Full Farm Backup Archive",
      desc: "Consolidated multi-sheet backup containing all farm records in a single CSV file.",
      icon: <Archive size={24} color="#0f172a" />,
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
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
            <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>Export Farm Records</h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", opacity: 0.7 }}>
              Download clean, spreadsheet-ready CSV files
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              color: "inherit",
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Options List */}
        <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "65vh", overflowY: "auto" }}>
          {exportOptions.map((opt) => (
            <div
              key={opt.type}
              onClick={() => handleDownload(opt.type, opt.name)}
              style={{
                padding: "1rem",
                borderRadius: "12px",
                border: "1px solid var(--color-border, #e2e8f0)",
                backgroundColor: "var(--color-bg, #f8fafc)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                cursor: "pointer",
                transition: "border-color 0.15s ease, transform 0.15s ease",
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
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>{opt.name}</h4>
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
            justifyContent: "flex-end",
          }}
        >
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
