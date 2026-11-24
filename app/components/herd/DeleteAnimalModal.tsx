"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, Trash2, X, Loader2, ArrowRight } from "lucide-react";
import { deleteAnimal, getAnimalDeletionImpact } from "@/actions/animal.actions";
import { useToast } from "../ui/Toast";
import { useRouter } from "next/navigation";

interface DeleteAnimalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStatusModal?: () => void;
  animal: {
    id: string;
    name: string;
    tagNumber?: string | null;
    status: string;
  };
}

export default function DeleteAnimalModal({
  isOpen,
  onClose,
  onOpenStatusModal,
  animal,
}: DeleteAnimalModalProps) {
  const toast = useToast();
  const router = useRouter();

  const [typedName, setTypedName] = useState("");
  const [reason, setReason] = useState("");
  const [voidHistoricalLogs, setVoidHistoricalLogs] = useState(false);
  const [impact, setImpact] = useState<{
    hasLinkedSale: boolean;
    milkLogsCount: number;
    healthRecordsCount: number;
    breedingEventsCount: number;
    offspringCount: number;
  } | null>(null);
  const [isLoadingImpact, setIsLoadingImpact] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTypedName("");
    setReason("");
    setVoidHistoricalLogs(false);
    setIsLoadingImpact(true);

    getAnimalDeletionImpact(animal.id)
      .then((res) => {
        if (res.success && res.data) {
          setImpact(res.data);
        }
      })
      .finally(() => setIsLoadingImpact(false));
  }, [isOpen, animal.id]);

  if (!isOpen) return null;

  const isNameMatch = typedName.trim() === animal.name.trim();
  const hasHistoricalRecords =
    (impact?.milkLogsCount || 0) +
      (impact?.healthRecordsCount || 0) +
      (impact?.breedingEventsCount || 0) >
    0;

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNameMatch || isDeleting) return;

    setIsDeleting(true);
    const res = await deleteAnimal(animal.id, {
      confirmationName: typedName.trim(),
      reason: reason.trim() || undefined,
      voidHistoricalLogs,
    });
    setIsDeleting(false);

    if (res.success) {
      toast(res.message, "success");
      onClose();
      router.push("/herd");
      router.refresh();
    } else {
      toast(res.message, "error");
    }
  };

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
        backgroundColor: "rgba(15, 23, 42, 0.72)",
        backdropFilter: "blur(4px)",
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <form
        onSubmit={handleConfirmDelete}
        style={{
          width: "100%",
          maxWidth: "480px",
          maxHeight: "90vh",
          overflowY: "auto",
          backgroundColor: "var(--color-surface, #ffffff)",
          color: "var(--color-text-main, #0f172a)",
          borderRadius: "20px",
          border: "1px solid rgba(239, 68, 68, 0.35)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.3)",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "rgba(239, 68, 68, 0.14)",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Trash2 size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#dc2626" }}>
                Delete Animal Record
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--color-text-sub)" }}>
                {animal.name} {animal.tagNumber ? `(#${animal.tagNumber})` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-sub)" }}
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        {/* Lifecycle Exit Guardrail */}
        {animal.status !== "SOLD" && animal.status !== "DECEASED" && onOpenStatusModal && (
          <div
            style={{
              padding: "0.85rem 1rem",
              borderRadius: "12px",
              backgroundColor: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              fontSize: "0.83rem",
              lineHeight: 1.5,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, color: "#d97706", marginBottom: "4px" }}>
              <AlertTriangle size={15} />
              <span>Did this animal pass away or get sold?</span>
            </div>
            <p style={{ margin: "0 0 0.5rem", color: "var(--color-text-main)" }}>
              Deleting removes the animal as a mistaken entry. To preserve mortality &amp; financial analytics, update its status instead.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenStatusModal();
              }}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "#d97706",
                fontWeight: 700,
                fontSize: "0.82rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>Switch to Update Status (Sold / Deceased)</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Relational Impact Summary */}
        <div
          style={{
            padding: "0.85rem 1rem",
            borderRadius: "12px",
            backgroundColor: "var(--color-bg, #f8fafc)",
            border: "1px solid var(--color-border, #e2e8f0)",
            fontSize: "0.84rem",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: "0.45rem" }}>Record Impact Summary</div>
          {isLoadingImpact ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", opacity: 0.7 }}>
              <Loader2 size={15} className="animate-spin" /> Checking linked records...
            </div>
          ) : impact ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem", color: "var(--color-text-sub)" }}>
              <span>• Milk Logs: <strong>{impact.milkLogsCount}</strong></span>
              <span>• Health Logs: <strong>{impact.healthRecordsCount}</strong></span>
              <span>• Breeding Events: <strong>{impact.breedingEventsCount}</strong></span>
              <span>• Recorded Offspring: <strong>{impact.offspringCount}</strong></span>
              {impact.hasLinkedSale && (
                <span style={{ gridColumn: "1 / -1", color: "#dc2626", fontWeight: 600, marginTop: "2px" }}>
                  • Linked Animal Sale entry will also be voided.
                </span>
              )}
            </div>
          ) : null}

          <div style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "var(--color-text-sub)" }}>
            Deleting frees up the name <strong>&quot;{animal.name}&quot;</strong>
            {animal.tagNumber ? ` and tag #${animal.tagNumber}` : ""} for reuse.
          </div>
        </div>

        {hasHistoricalRecords && (
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              fontSize: "0.82rem",
              cursor: "pointer",
              padding: "0.5rem 0.25rem",
            }}
          >
            <input
              type="checkbox"
              checked={voidHistoricalLogs}
              onChange={(e) => setVoidHistoricalLogs(e.target.checked)}
              style={{ marginTop: "3px", width: "16px", height: "16px", accentColor: "#dc2626" }}
            />
            <span>
              <strong>Also void historical milk, health &amp; breeding logs</strong> (check this if the animal was created as test/duplicate data; leave unchecked to keep past ranch totals intact).
            </span>
          </label>
        )}

        <div>
          <label style={{ display: "block", fontSize: "0.83rem", fontWeight: 600, marginBottom: "0.35rem" }}>
            Reason for Deletion (Optional)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Duplicate registration / test entry"
            style={{
              width: "100%",
              padding: "0.65rem 0.75rem",
              borderRadius: "8px",
              border: "1px solid var(--color-border)",
              background: "var(--color-bg)",
              color: "var(--color-text-main)",
              fontSize: "0.9rem",
            }}
          />
        </div>

        {/* Explicit Type-to-Confirm Step */}
        <div
          style={{
            padding: "0.9rem",
            borderRadius: "12px",
            backgroundColor: "rgba(239, 68, 68, 0.06)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
          }}
        >
          <label
            htmlFor="confirm-animal-name"
            style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.45rem" }}
          >
            To confirm, type <span style={{ color: "#dc2626", fontFamily: "monospace", fontSize: "0.95rem" }}>{animal.name}</span> below:
          </label>
          <input
            id="confirm-animal-name"
            type="text"
            autoComplete="off"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder={`Type "${animal.name}"`}
            style={{
              width: "100%",
              padding: "0.7rem 0.8rem",
              borderRadius: "8px",
              border: `1.5px solid ${isNameMatch ? "#16a34a" : "rgba(239, 68, 68, 0.4)"}`,
              background: "var(--color-surface)",
              color: "var(--color-text-main)",
              fontSize: "0.95rem",
              fontWeight: 600,
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            style={{
              flex: 1,
              padding: "0.8rem",
              borderRadius: "10px",
              border: "1px solid var(--color-border)",
              background: "var(--color-bg)",
              color: "var(--color-text-main)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isNameMatch || isDeleting}
            style={{
              flex: 1.3,
              padding: "0.8rem",
              borderRadius: "10px",
              border: "none",
              backgroundColor: "#dc2626",
              color: "#ffffff",
              fontWeight: 700,
              cursor: !isNameMatch || isDeleting ? "not-allowed" : "pointer",
              opacity: !isNameMatch || isDeleting ? 0.45 : 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "opacity 0.15s ease",
            }}
          >
            {isDeleting ? <Loader2 size={17} className="animate-spin" /> : <Trash2 size={17} />}
            <span>{isDeleting ? "Deleting..." : "Confirm Delete"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
