"use client";

import React, { useEffect } from "react";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message = "This action cannot be undone. Are you sure you want to proceed?",
  confirmText = "Delete",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmationModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const isDanger = variant === "danger";

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        padding: "1rem",
        animation: "fadeIn 0.15s ease-out",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "var(--color-surface, #ffffff)",
          color: "var(--color-text-main, #0f172a)",
          borderRadius: "20px",
          padding: "1.75rem 1.5rem 1.5rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid var(--color-border, #e2e8f0)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          position: "relative",
          animation: "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Close Icon Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          aria-label="Close modal"
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            background: "none",
            border: "none",
            cursor: isLoading ? "not-allowed" : "pointer",
            color: "var(--color-text-muted, #94a3b8)",
            padding: "6px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={18} />
        </button>

        {/* Warning Icon Badge */}
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1rem",
            backgroundColor: isDanger ? "rgba(239, 68, 68, 0.12)" : "rgba(245, 158, 11, 0.12)",
            color: isDanger ? "#ef4444" : "#f59e0b",
          }}
        >
          {isDanger ? <Trash2 size={28} /> : <AlertTriangle size={28} />}
        </div>

        {/* Title */}
        <h3
          style={{
            margin: "0 0 0.5rem",
            fontSize: "1.2rem",
            fontWeight: 700,
            color: "var(--color-text-main, #0f172a)",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h3>

        {/* Message */}
        <div
          style={{
            margin: "0 0 1.5rem",
            fontSize: "0.92rem",
            color: "var(--color-text-secondary, #64748b)",
            lineHeight: 1.55,
          }}
        >
          {message}
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            width: "100%",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: "0.75rem 1rem",
              borderRadius: "12px",
              border: "1px solid var(--color-border, #e2e8f0)",
              backgroundColor: "var(--color-bg, #f8fafc)",
              color: "var(--color-text-main, #334155)",
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: isLoading ? "not-allowed" : "pointer",
              transition: "background-color 0.15s ease",
            }}
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: "0.75rem 1rem",
              borderRadius: "12px",
              border: "none",
              backgroundColor: isDanger ? "#ef4444" : "#f59e0b",
              color: "#ffffff",
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: isLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              boxShadow: isDanger
                ? "0 4px 12px rgba(239, 68, 68, 0.3)"
                : "0 4px 12px rgba(245, 158, 11, 0.3)",
              transition: "transform 0.1s ease, opacity 0.15s ease",
              opacity: isLoading ? 0.75 : 1,
            }}
          >
            {isLoading && <Loader2 size={16} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
