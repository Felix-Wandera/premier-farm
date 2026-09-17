"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Trash2, Clock, Check, Edit2, Loader2 } from "lucide-react";
import { getSessionMilkLogs, updateSingleMilkLog, deleteSingleMilkLog } from "@/actions/milk.actions";
import { useToast } from "../ui/Toast";

interface SessionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionDate: string;
  sessionName: string;
  onUpdated?: () => void;
}

interface MilkLogRow {
  id: string;
  amountLiters: number;
  animalId: string;
  tagNumber: string;
  name: string | null;
  species: string;
  recordedBy: string;
}

export default function SessionDetailsModal({
  isOpen,
  onClose,
  sessionDate,
  sessionName,
  onUpdated,
}: SessionDetailsModalProps) {
  const [logs, setLogs] = useState<MilkLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const toast = useToast();

  useEffect(() => {
    if (!isOpen || !sessionDate) return;

    let mounted = true;
    setLoading(true);

    getSessionMilkLogs(sessionDate, sessionName).then((res) => {
      if (!mounted) return;
      setLoading(false);
      if (res.success) {
        setLogs(res.data);
      } else {
        toast(res.message, "error");
      }
    });

    return () => {
      mounted = false;
    };
  }, [isOpen, sessionDate, sessionName]);

  if (!isOpen) return null;

  const totalLiters = logs.reduce((sum, l) => sum + l.amountLiters, 0);

  const handleStartEdit = (log: MilkLogRow) => {
    setEditingId(log.id);
    setEditValue(String(log.amountLiters));
  };

  const handleSaveEdit = async (logId: string) => {
    const val = parseFloat(editValue);
    if (isNaN(val) || val <= 0 || val > 100) {
      toast("Please enter a valid yield between 0.1 and 100 Liters.", "error");
      return;
    }

    setIsSaving(true);
    const res = await updateSingleMilkLog(logId, val);
    setIsSaving(false);

    if (res.success) {
      toast(res.message, "success");
      setLogs((prev) =>
        prev.map((item) => (item.id === logId ? { ...item, amountLiters: val } : item))
      );
      setEditingId(null);
      if (onUpdated) onUpdated();
    } else {
      toast(res.message, "error");
    }
  };

  const handleDeleteLog = async (logId: string, tagNumber: string) => {
    if (!confirm(`Are you sure you want to delete the milk record for ${tagNumber}?`)) {
      return;
    }

    setIsDeletingId(logId);
    const res = await deleteSingleMilkLog(logId);
    setIsDeletingId(null);

    if (res.success) {
      toast(res.message, "success");
      setLogs((prev) => prev.filter((item) => item.id !== logId));
      if (onUpdated) onUpdated();
    } else {
      toast(res.message, "error");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 150,
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
          maxWidth: "520px",
          maxHeight: "85vh",
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
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
                {sessionName} Milking Session
              </h2>
              <span
                style={{
                  fontSize: "0.75rem",
                  padding: "2px 8px",
                  borderRadius: "99px",
                  backgroundColor: "rgba(59, 130, 246, 0.12)",
                  color: "#2563eb",
                  fontWeight: 600,
                }}
              >
                {logs.length} cows
              </span>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", opacity: 0.7, display: "flex", alignItems: "center", gap: "4px" }}>
              <Clock size={13} />
              {sessionDate ? new Date(sessionDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : ""}
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

        {/* Summary Bar */}
        <div
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "var(--color-bg, #f8fafc)",
            borderBottom: "1px solid var(--color-border, #e2e8f0)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.9rem",
          }}
        >
          <span style={{ opacity: 0.75 }}>Total Yield</span>
          <strong style={{ fontSize: "1.1rem", color: "var(--color-primary, #16a34a)" }}>
            {totalLiters.toFixed(1)} Liters
          </strong>
        </div>

        {/* Cow Records List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "3rem", gap: "8px", opacity: 0.7 }}>
              <Loader2 className="animate-spin" size={20} />
              <span>Loading cow yields...</span>
            </div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", opacity: 0.6, fontSize: "0.9rem" }}>
              No individual records found for this session.
            </div>
          ) : (
            logs.map((log) => {
              const isEditing = editingId === log.id;
              const isDeleting = isDeletingId === log.id;

              return (
                <div
                  key={log.id}
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "10px",
                    border: "1px solid var(--color-border, #e2e8f0)",
                    backgroundColor: "var(--color-surface, #ffffff)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{log.tagNumber}</span>
                      {log.name && (
                        <span style={{ fontSize: "0.85rem", opacity: 0.75 }}>({log.name})</span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.75rem", opacity: 0.6, marginTop: "2px" }}>
                      Milker: {log.recordedBy}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {isEditing ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="100"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          style={{
                            width: "70px",
                            padding: "0.35rem 0.5rem",
                            borderRadius: "6px",
                            border: "1px solid var(--color-primary, #16a34a)",
                            fontSize: "0.9rem",
                            fontWeight: 700,
                            textAlign: "center",
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEdit(log.id)}
                          disabled={isSaving}
                          style={{
                            background: "var(--color-primary, #16a34a)",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "6px",
                            padding: "0.4rem",
                            cursor: "pointer",
                          }}
                          title="Save"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--color-text-sub, #64748b)",
                            padding: "0.4rem",
                            cursor: "pointer",
                          }}
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span style={{ fontWeight: 700, fontSize: "1rem", minWidth: "55px", textAlign: "right" }}>
                          {log.amountLiters} L
                        </span>
                        <button
                          onClick={() => handleStartEdit(log)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "4px",
                            color: "var(--color-text-sub, #64748b)",
                          }}
                          title="Edit Yield"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteLog(log.id, log.tagNumber)}
                          disabled={isDeleting}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "4px",
                            color: "#ef4444",
                            opacity: isDeleting ? 0.4 : 1,
                          }}
                          title="Delete Record"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
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
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
