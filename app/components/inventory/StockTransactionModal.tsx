"use client";
import React, { useState, useEffect } from "react";
import { X, Save, DollarSign } from "lucide-react";
import { useToast } from "../ui/Toast";
import styles from "../../(dashboard)/inventory/page.module.css";
import { transactInventoryExact } from "@/actions/inventory.actions";

const RESTOCK_REASONS = [
  "Regular Supplier Purchase",
  "Bulk Farm Harvest (Silage / Hay)",
  "Donation / Support Grant",
  "Return from Field / Unused",
  "Stocktake / Audit Adjustment",
  "Other"
];

const REMOVAL_REASONS = [
  "Daily Herd Feeding / Ration",
  "Medical Treatment / Vet Care",
  "Commercial Sale",
  "Spoilage / Damage / Mold",
  "Expired Product Disposal",
  "Loss / Leakage / Breakage",
  "Stocktake / Audit Adjustment",
  "Other"
];

export default function StockTransactionModal({ isOpen, onClose, item, type }: { isOpen: boolean, onClose: () => void, item: any, type: "STOCK_IN" | "STOCK_OUT" }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(todayStr);
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [createFinanceTx, setCreateFinanceTx] = useState(true);
  const [financeAmount, setFinanceAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const reasons = type === "STOCK_IN" ? RESTOCK_REASONS : REMOVAL_REASONS;

  // Auto-calculate finance amount when quantity or item changes
  const unitPrice = type === "STOCK_IN" ? (item?.unitCost || 0) : (item?.unitRevenue || 0);
  const hasFinanceCapability = Boolean(item?.linkToFinance && unitPrice > 0);

  useEffect(() => {
    if (isOpen) {
      setQuantity("");
      setDate(todayStr);
      setSelectedReason(reasons[0]);
      setCustomReason("");
      setCreateFinanceTx(true);
      setFinanceAmount("");
    }
  }, [isOpen, type, item]);

  useEffect(() => {
    const q = parseFloat(quantity);
    if (!isNaN(q) && q > 0 && unitPrice > 0) {
      setFinanceAmount(String(Math.round(q * unitPrice)));
    } else {
      setFinanceAmount("");
    }
  }, [quantity, unitPrice]);

  if (!isOpen || !item) return null;

  const handleSave = async () => {
    const numQty = parseFloat(quantity);
    if (!numQty || numQty <= 0) {
      toast("Please enter a valid quantity.", "error");
      return;
    }

    if (type === "STOCK_OUT" && numQty > item.quantity) {
      toast(`Cannot remove more than available stock (${item.quantity}).`, "error");
      return;
    }

    const finalReason = selectedReason === "Other" 
      ? (customReason.trim() || "Other") 
      : selectedReason;

    setIsSubmitting(true);
    const res = await transactInventoryExact({
      itemId: item.id,
      type,
      quantity: numQty,
      reason: finalReason,
      date,
      createFinanceTx: hasFinanceCapability ? createFinanceTx : false,
      financeAmount: hasFinanceCapability && createFinanceTx && financeAmount ? parseFloat(financeAmount) : undefined,
    });
    setIsSubmitting(false);

    if (res.success) {
      toast(res.message, "success");
      setQuantity("");
      onClose();
    } else {
      toast(res.message, "error");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div style={{ width: "100%", maxWidth: "450px", maxHeight: "90vh", overflowY: "auto", backgroundColor: "var(--color-surface)", borderRadius: "16px", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", border: "1px solid var(--color-border)", margin: "1rem" }}>

        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--color-text-main)" }}>
            {type === "STOCK_IN" ? "Restock Item (Stock In)" : "Remove Item (Stock Out)"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-sub)" }}><X size={24} /></button>
        </div>

        <div style={{ padding: "1.25rem 1.5rem", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ backgroundColor: "var(--color-bg)", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid var(--color-border)" }}>
            <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-text-main)" }}>{item.name}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--color-text-sub)", marginTop: "2px" }}>
              Current Stock: <strong>{item.quantity} {item.unit}</strong>
              {item.linkToFinance && (
                <span> • {type === "STOCK_IN" ? `Unit Cost: KES ${item.unitCost || 0}` : `Unit Price: KES ${item.unitRevenue || 0}`}</span>
              )}
            </div>
          </div>

          <div>
             <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600, fontSize: "0.85rem", color: "var(--color-text-sub)" }}>
               Quantity to {type === "STOCK_IN" ? "Add" : "Remove"} ({item.unit}) *
             </label>
             <input
               type="number"
               step="any"
               min="0.01"
               style={{ width: "100%", minHeight: "44px", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)", fontSize: "1rem", fontWeight: 700 }}
               value={quantity}
               onChange={e => setQuantity(e.target.value)}
               placeholder="e.g. 10"
               autoFocus
             />
          </div>

          {/* Mobile-Friendly Date Selector */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--color-text-sub)" }}>Date of Transfer *</label>
              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  type="button"
                  onClick={() => setDate(todayStr)}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "99px",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    border: "1px solid var(--color-border)",
                    backgroundColor: date === todayStr ? "var(--color-primary)" : "var(--color-bg)",
                    color: date === todayStr ? "white" : "var(--color-text-main)",
                    cursor: "pointer"
                  }}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    setDate(y.toISOString().split('T')[0]);
                  }}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "99px",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    border: "1px solid var(--color-border)",
                    backgroundColor: date !== todayStr ? "var(--color-primary)" : "var(--color-bg)",
                    color: date !== todayStr ? "white" : "var(--color-text-main)",
                    cursor: "pointer"
                  }}
                >
                  Yesterday
                </button>
              </div>
            </div>
            <input
              type="date"
              max={todayStr}
              style={{ width: "100%", minHeight: "44px", padding: "0.6rem 0.75rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)", fontSize: "0.95rem", fontWeight: 600 }}
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          {/* Reason Dropdown + Custom Allowance */}
          <div>
            <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600, fontSize: "0.85rem", color: "var(--color-text-sub)" }}>Reason for Transfer</label>
            <select
              style={{ width: "100%", minHeight: "44px", padding: "0.65rem 0.75rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)", fontSize: "0.9rem" }}
              value={selectedReason}
              onChange={e => setSelectedReason(e.target.value)}
            >
              {reasons.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {selectedReason === "Other" && (
              <input
                type="text"
                placeholder="Write your custom reason..."
                style={{ width: "100%", marginTop: "0.5rem", minHeight: "40px", padding: "0.6rem 0.75rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)", fontSize: "0.9rem" }}
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                autoFocus
              />
            )}
          </div>

          {/* Financial Linkage Card */}
          {hasFinanceCapability && (
            <div style={{ backgroundColor: type === "STOCK_IN" ? "rgba(239, 68, 68, 0.06)" : "rgba(34, 197, 94, 0.06)", border: `1px solid ${type === "STOCK_IN" ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)"}`, borderRadius: "10px", padding: "0.85rem" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  style={{ width: "18px", height: "18px", marginTop: "2px", accentColor: "var(--color-primary)" }}
                  checked={createFinanceTx}
                  onChange={e => setCreateFinanceTx(e.target.checked)}
                />
                <div style={{ fontSize: "0.85rem", color: "var(--color-text-main)" }}>
                  <strong>Auto-record in Finances ({type === "STOCK_IN" ? "Expense" : "Sale"})</strong>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-sub)", marginTop: "2px" }}>
                    {type === "STOCK_IN" ? `Unit Cost: KES ${item.unitCost} / ${item.unit}` : `Unit Price: KES ${item.unitRevenue} / ${item.unit}`}
                  </div>
                </div>
              </label>

              {createFinanceTx && (
                <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-sub)" }}>Amount (KES):</span>
                  <input
                    type="number"
                    style={{ flex: 1, padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)", fontSize: "0.95rem", fontWeight: 700 }}
                    value={financeAmount}
                    onChange={e => setFinanceAmount(e.target.value)}
                    placeholder="Total amount"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid var(--color-border)" }}>
          <button
             onClick={handleSave}
             disabled={isSubmitting}
             style={{ width: "100%", padding: "0.875rem", backgroundColor: type === "STOCK_IN" ? "#22c55e" : "#ef4444", color: "white", borderRadius: "8px", border: "none", fontWeight: 600, display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}
          >
             <Save size={20} />
             {isSubmitting ? "Processing..." : (type === "STOCK_IN" ? "Confirm Restock" : "Confirm Removal")}
          </button>
        </div>
      </div>
    </div>
  );
}
