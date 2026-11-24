"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, Trash2, Loader2, ArrowRight } from "lucide-react";
import { deleteAnimal, getAnimalDeletionImpact } from "@/actions/animal.actions";
import { useToast } from "../ui/Toast";
import { useRouter } from "next/navigation";
import ResponsiveSheet from "../ui/ResponsiveSheet";
import sheetStyles from "../ui/ResponsiveSheet.module.css";

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

function DeleteAnimalForm({
  onClose,
  onOpenStatusModal,
  animal,
}: {
  onClose: () => void;
  onOpenStatusModal?: () => void;
  animal: DeleteAnimalModalProps["animal"];
}) {
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
  const [isLoadingImpact, setIsLoadingImpact] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    getAnimalDeletionImpact(animal.id)
      .then((res) => {
        if (active && res.success && res.data) {
          setImpact(res.data);
        }
      })
      .finally(() => {
        if (active) setIsLoadingImpact(false);
      });
    return () => {
      active = false;
    };
  }, [animal.id]);

  const isNameMatch = typedName.trim() === animal.name.trim();
  const hasHistoricalRecords =
    (impact?.milkLogsCount || 0) +
      (impact?.healthRecordsCount || 0) +
      (impact?.breedingEventsCount || 0) >
    0;

  const handleConfirmDelete = async () => {
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
    <ResponsiveSheet
      isOpen={true}
      onClose={onClose}
      size="md"
      zIndex={450}
      disableClose={isDeleting}
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#ef4444" }}>
          <Trash2 size={20} />
          <span>Delete Animal Record</span>
        </span>
      }
      subtitle={`${animal.name} ${animal.tagNumber ? `(#${animal.tagNumber})` : ""}`}
      footer={
        <div style={{ display: "flex", gap: "0.65rem" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className={sheetStyles.secondaryBtn}
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={!isNameMatch || isDeleting}
            style={{
              flex: 1.4,
              minHeight: "46px",
              padding: "0.7rem 1rem",
              borderRadius: "12px",
              border: "none",
              backgroundColor: "#dc2626",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "0.92rem",
              cursor: !isNameMatch || isDeleting ? "not-allowed" : "pointer",
              opacity: !isNameMatch || isDeleting ? 0.45 : 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            {isDeleting ? <Loader2 size={17} className="animate-spin" /> : <Trash2 size={17} />}
            <span>{isDeleting ? "Deleting..." : "Confirm Delete"}</span>
          </button>
        </div>
      }
    >
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: 700,
              color: "#d97706",
              marginBottom: "4px",
            }}
          >
            <AlertTriangle size={15} />
            <span>Did this animal pass away or get sold?</span>
          </div>
          <p style={{ margin: "0 0 0.5rem", color: "var(--color-text-main)" }}>
            Deleting removes a mistaken entry. To preserve mortality &amp; financial analytics, update its status instead.
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

      <div className={sheetStyles.cardBox} style={{ fontSize: "0.84rem" }}>
        <div style={{ fontWeight: 700, marginBottom: "0.45rem" }}>Record Impact Summary</div>
        {isLoadingImpact ? (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", opacity: 0.7 }}>
            <Loader2 size={15} className="animate-spin" /> Checking linked records...
          </div>
        ) : impact ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.35rem",
              color: "var(--color-text-sub)",
            }}
          >
            <span>
              • Milk Logs: <strong className="tabular-nums">{impact.milkLogsCount}</strong>
            </span>
            <span>
              • Health Logs: <strong className="tabular-nums">{impact.healthRecordsCount}</strong>
            </span>
            <span>
              • Breeding Events: <strong className="tabular-nums">{impact.breedingEventsCount}</strong>
            </span>
            <span>
              • Offspring: <strong className="tabular-nums">{impact.offspringCount}</strong>
            </span>
            {impact.hasLinkedSale && (
              <span style={{ gridColumn: "1 / -1", color: "#ef4444", fontWeight: 600, marginTop: "2px" }}>
                • Linked Animal Sale entry will also be voided.
              </span>
            )}
          </div>
        ) : null}

        <div style={{ marginTop: "0.55rem", fontSize: "0.78rem", color: "var(--color-text-sub)" }}>
          Deleting frees up the name <strong>&quot;{animal.name}&quot;</strong>
          {animal.tagNumber ? ` and tag #${animal.tagNumber}` : ""} for reuse.
        </div>
      </div>

      {hasHistoricalRecords && (
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            fontSize: "0.82rem",
            cursor: "pointer",
            lineHeight: 1.45,
          }}
        >
          <input
            type="checkbox"
            checked={voidHistoricalLogs}
            onChange={(e) => setVoidHistoricalLogs(e.target.checked)}
            style={{ marginTop: "2px", width: "18px", height: "18px", accentColor: "#dc2626", flexShrink: 0 }}
          />
          <span>
            <strong>Also void historical milk, health &amp; breeding logs</strong> (enable for duplicate/test data; leave unchecked to preserve past ranch totals).
          </span>
        </label>
      )}

      <div className={sheetStyles.fieldGroup}>
        <label className={sheetStyles.label}>Reason for Deletion (Optional)</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Duplicate registration / test entry"
          className={sheetStyles.input}
        />
      </div>

      <div
        style={{
          padding: "0.95rem",
          borderRadius: "14px",
          backgroundColor: "rgba(239, 68, 68, 0.06)",
          border: "1px solid rgba(239, 68, 68, 0.25)",
        }}
      >
        <label
          htmlFor="confirm-animal-name"
          style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.45rem" }}
        >
          To confirm, type{" "}
          <span style={{ color: "#ef4444", fontFamily: "monospace", fontSize: "0.95rem" }}>
            {animal.name}
          </span>{" "}
          below:
        </label>
        <input
          id="confirm-animal-name"
          type="text"
          autoComplete="off"
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          placeholder={`Type "${animal.name}"`}
          className={sheetStyles.input}
          style={{
            borderColor: isNameMatch ? "#10b981" : "rgba(239, 68, 68, 0.45)",
            backgroundColor: "var(--color-surface)",
            fontWeight: 700,
          }}
        />
      </div>
    </ResponsiveSheet>
  );
}

export default function DeleteAnimalModal({
  isOpen,
  onClose,
  onOpenStatusModal,
  animal,
}: DeleteAnimalModalProps) {
  if (!isOpen) return null;
  return (
    <DeleteAnimalForm
      key={animal.id}
      onClose={onClose}
      onOpenStatusModal={onOpenStatusModal}
      animal={animal}
    />
  );
}
