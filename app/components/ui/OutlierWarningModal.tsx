"use client";

import React from "react";
import { AlertTriangle, ShieldCheck, X, Loader2 } from "lucide-react";

interface OutlierWarningModalProps {
  isOpen: boolean;
  warnings: string[];
  canOverride: boolean;
  isSubmitting?: boolean;
  onCancel: () => void;
  onOverride?: () => void;
}

export default function OutlierWarningModal({
  isOpen,
  warnings,
  canOverride,
  isSubmitting = false,
  onCancel,
  onOverride,
}: OutlierWarningModalProps) {
  if (!isOpen || warnings.length === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(4px)",
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onCancel();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          backgroundColor: "var(--color-surface, #ffffff)",
          color: "var(--color-text-main, #0f172a)",
          borderRadius: "20px",
          padding: "1.5rem",
          border: "1px solid var(--color-border, #e2e8f0)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.3)",
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          aria-label="Close warning"
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-sub, #64748b)",
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              backgroundColor: "rgba(245, 158, 11, 0.15)",
              color: "#d97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
              Unusual Value Detected
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--color-text-sub, #64748b)" }}>
              Please review the following validation warning{warnings.length > 1 ? "s" : ""}:
            </p>
          </div>
        </div>

        <ul
          style={{
            margin: "0 0 1.25rem",
            padding: "0.85rem 1rem 0.85rem 2rem",
            borderRadius: "12px",
            backgroundColor: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            fontSize: "0.88rem",
            lineHeight: 1.55,
            display: "flex",
            flexDirection: "column",
            gap: "0.45rem",
          }}
        >
          {warnings.map((w, idx) => (
            <li key={idx}>{w}</li>
          ))}
        </ul>

        {!canOverride && (
          <p
            style={{
              margin: "0 0 1.25rem",
              fontSize: "0.82rem",
              color: "var(--color-text-sub, #64748b)",
              lineHeight: 1.5,
            }}
          >
            Please double-check for typos and adjust the entry. If this outlier value is accurate, an organization <strong>Administrator</strong> can override this warning.
          </p>
        )}

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            style={{
              flex: 1,
              minWidth: "130px",
              padding: "0.75rem 1rem",
              borderRadius: "10px",
              border: "1px solid var(--color-border, #cbd5e1)",
              backgroundColor: "var(--color-bg, #f8fafc)",
              color: "var(--color-text-main)",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            Go Back &amp; Edit
          </button>

          {canOverride && onOverride && (
            <button
              type="button"
              onClick={onOverride}
              disabled={isSubmitting}
              style={{
                flex: 1.2,
                minWidth: "170px",
                padding: "0.75rem 1rem",
                borderRadius: "10px",
                border: "none",
                backgroundColor: "#d97706",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                opacity: isSubmitting ? 0.75 : 1,
              }}
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={17} />}
              <span>Override &amp; Save (Admin)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
