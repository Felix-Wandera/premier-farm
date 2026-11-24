"use client";
import React, { useState } from "react";
import { Save } from "lucide-react";
import { useToast } from "../ui/Toast";
import { transactInventoryExact } from "@/actions/inventory.actions";
import ResponsiveSheet from "../ui/ResponsiveSheet";
import sheetStyles from "../ui/ResponsiveSheet.module.css";
import { InventoryItemSummary } from "./EditItemModal";

const RESTOCK_REASONS = [
  "Regular Supplier Purchase",
  "Bulk Farm Harvest (Silage / Hay)",
  "Donation / Support Grant",
  "Return from Field / Unused",
  "Stocktake / Audit Adjustment",
  "Other",
];

const REMOVAL_REASONS = [
  "Daily Herd Feeding / Ration",
  "Medical Treatment / Vet Care",
  "Commercial Sale",
  "Spoilage / Damage / Mold",
  "Expired Product Disposal",
  "Loss / Leakage / Breakage",
  "Stocktake / Audit Adjustment",
  "Other",
];

function StockTransactionForm({
  onClose,
  item,
  allItems,
  type,
}: {
  onClose: () => void;
  item: InventoryItemSummary;
  allItems?: InventoryItemSummary[];
  type: "STOCK_IN" | "STOCK_OUT";
}) {
  const todayStr = new Date().toISOString().split("T")[0];
  const [activeType, setActiveType] = useState<"STOCK_IN" | "STOCK_OUT">(type);
  const [selectedItemId, setSelectedItemId] = useState<string>(item.id);
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(todayStr);
  const [selectedReason, setSelectedReason] = useState(
    (type === "STOCK_IN" ? RESTOCK_REASONS : REMOVAL_REASONS)[0]
  );
  const [customReason, setCustomReason] = useState("");
  const [createFinanceTx, setCreateFinanceTx] = useState(true);
  const [financeAmountOverride, setFinanceAmountOverride] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const currentItem =
    (allItems && allItems.find((x) => x.id === selectedItemId)) || item;

  const reasons = activeType === "STOCK_IN" ? RESTOCK_REASONS : REMOVAL_REASONS;
  const unitPrice =
    activeType === "STOCK_IN"
      ? currentItem.unitCost || 0
      : currentItem.unitRevenue || 0;
  const hasFinanceCapability = Boolean(currentItem.linkToFinance && unitPrice > 0);

  const parsedQty = parseFloat(quantity);
  const computedAutoAmount =
    !isNaN(parsedQty) && parsedQty > 0 && unitPrice > 0
      ? String(Math.round(parsedQty * unitPrice))
      : "";
  const effectiveFinanceAmount =
    financeAmountOverride !== null ? financeAmountOverride : computedAutoAmount;

  const handleTypeSwitch = (nextType: "STOCK_IN" | "STOCK_OUT") => {
    setActiveType(nextType);
    setSelectedReason(
      (nextType === "STOCK_IN" ? RESTOCK_REASONS : REMOVAL_REASONS)[0]
    );
    setFinanceAmountOverride(null);
  };

  const handleSave = async () => {
    const numQty = parseFloat(quantity);
    if (!numQty || numQty <= 0) {
      toast("Please enter a valid quantity.", "error");
      return;
    }

    if (activeType === "STOCK_OUT" && numQty > currentItem.quantity) {
      toast(
        `Cannot remove more than available stock (${currentItem.quantity} ${currentItem.unit}).`,
        "error"
      );
      return;
    }

    const finalReason =
      selectedReason === "Other"
        ? customReason.trim() || "Other"
        : selectedReason;

    setIsSubmitting(true);
    const res = await transactInventoryExact({
      itemId: currentItem.id,
      type: activeType,
      quantity: numQty,
      reason: finalReason,
      date,
      createFinanceTx: hasFinanceCapability ? createFinanceTx : false,
      financeAmount:
        hasFinanceCapability && createFinanceTx && effectiveFinanceAmount
          ? parseFloat(effectiveFinanceAmount)
          : undefined,
    });
    setIsSubmitting(false);

    if (res.success) {
      toast(res.message, "success");
      onClose();
    } else {
      toast(res.message, "error");
    }
  };

  const yesterdayStr = (() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return y.toISOString().split("T")[0];
  })();

  return (
    <ResponsiveSheet
      isOpen={true}
      onClose={onClose}
      size="sm"
      title={activeType === "STOCK_IN" ? "Restock Item (Stock In)" : "Use / Remove Stock"}
      subtitle={`${currentItem.name} • Available: ${currentItem.quantity} ${currentItem.unit}`}
      disableClose={isSubmitting}
      footer={
        <button
          type="button"
          onClick={handleSave}
          disabled={isSubmitting}
          className={sheetStyles.primaryBtn}
          style={{
            background: activeType === "STOCK_IN" ? "var(--color-primary)" : "#ef4444",
          }}
        >
          <Save size={18} />
          <span>
            {isSubmitting
              ? "Processing..."
              : activeType === "STOCK_IN"
              ? "Confirm Restock"
              : "Confirm Stock Out"}
          </span>
        </button>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
        <button
          type="button"
          onClick={() => handleTypeSwitch("STOCK_IN")}
          style={{
            minHeight: "44px",
            borderRadius: "12px",
            border:
              activeType === "STOCK_IN"
                ? "2px solid #10b981"
                : "1px solid var(--color-border)",
            backgroundColor:
              activeType === "STOCK_IN"
                ? "rgba(16, 185, 129, 0.14)"
                : "var(--color-bg)",
            color: activeType === "STOCK_IN" ? "#10b981" : "var(--color-text-sub)",
            fontWeight: 700,
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          + Stock In
        </button>
        <button
          type="button"
          onClick={() => handleTypeSwitch("STOCK_OUT")}
          style={{
            minHeight: "44px",
            borderRadius: "12px",
            border:
              activeType === "STOCK_OUT"
                ? "2px solid #ef4444"
                : "1px solid var(--color-border)",
            backgroundColor:
              activeType === "STOCK_OUT"
                ? "rgba(239, 68, 68, 0.14)"
                : "var(--color-bg)",
            color: activeType === "STOCK_OUT" ? "#ef4444" : "var(--color-text-sub)",
            fontWeight: 700,
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          − Stock Out
        </button>
      </div>

      {allItems && allItems.length > 1 && (
        <div className={sheetStyles.fieldGroup}>
          <label className={sheetStyles.label}>Inventory Item</label>
          <select
            className={sheetStyles.select}
            value={currentItem.id}
            onChange={(e) => {
              setSelectedItemId(e.target.value);
              setFinanceAmountOverride(null);
            }}
          >
            {allItems.map((it) => (
              <option key={it.id} value={it.id}>
                {it.name} ({it.quantity} {it.unit} in stock)
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={sheetStyles.fieldGroup}>
        <label className={sheetStyles.label}>
          Quantity to {activeType === "STOCK_IN" ? "Add" : "Remove"} ({currentItem.unit}) *
        </label>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min="0.01"
          className={`${sheetStyles.input} tabular-nums`}
          style={{ fontWeight: 700, fontSize: "1.05rem" }}
          value={quantity}
          onChange={(e) => {
            setQuantity(e.target.value);
            setFinanceAmountOverride(null);
          }}
          placeholder="e.g. 10"
          autoFocus
        />
      </div>

      <div className={sheetStyles.fieldGroup}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label className={sheetStyles.label}>Date of Transfer *</label>
          <div style={{ display: "flex", gap: "5px" }}>
            {[
              { label: "Today", value: todayStr },
              { label: "Yesterday", value: yesterdayStr },
            ].map((p) => {
              const active = date === p.value;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setDate(p.value)}
                  style={{
                    padding: "3px 9px",
                    borderRadius: "99px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    border: active
                      ? "1px solid var(--color-primary)"
                      : "1px solid var(--color-border)",
                    backgroundColor: active ? "var(--color-primary)" : "var(--color-bg)",
                    color: active ? "#ffffff" : "var(--color-text-sub)",
                    cursor: "pointer",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
        <input
          type="date"
          max={todayStr}
          className={sheetStyles.input}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className={sheetStyles.fieldGroup}>
        <label className={sheetStyles.label}>Reason</label>
        <select
          className={sheetStyles.select}
          value={selectedReason}
          onChange={(e) => setSelectedReason(e.target.value)}
        >
          {reasons.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        {selectedReason === "Other" && (
          <input
            type="text"
            placeholder="Write custom reason..."
            className={sheetStyles.input}
            style={{ marginTop: "0.4rem" }}
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
          />
        )}
      </div>

      {hasFinanceCapability && (
        <div
          className={sheetStyles.cardBox}
          style={{
            borderColor:
              activeType === "STOCK_IN"
                ? "rgba(239, 68, 68, 0.25)"
                : "rgba(16, 185, 129, 0.25)",
          }}
        >
          <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
            <input
              type="checkbox"
              style={{
                width: "18px",
                height: "18px",
                marginTop: "2px",
                accentColor: "var(--color-primary)",
              }}
              checked={createFinanceTx}
              onChange={(e) => setCreateFinanceTx(e.target.checked)}
            />
            <div style={{ fontSize: "0.85rem", color: "var(--color-text-main)" }}>
              <strong>
                Auto-record in Finances ({activeType === "STOCK_IN" ? "Expense" : "Sale"})
              </strong>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-sub)", marginTop: "2px" }}>
                {activeType === "STOCK_IN"
                  ? `Unit Cost: KES ${currentItem.unitCost} / ${currentItem.unit}`
                  : `Unit Price: KES ${currentItem.unitRevenue} / ${currentItem.unit}`}
              </div>
            </div>
          </label>

          {createFinanceTx && (
            <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-sub)" }}>
                Amount (KES):
              </span>
              <input
                type="number"
                inputMode="decimal"
                className={`${sheetStyles.input} tabular-nums`}
                style={{ flex: 1, minHeight: "38px", padding: "0.4rem 0.65rem", fontWeight: 700 }}
                value={effectiveFinanceAmount}
                onChange={(e) => setFinanceAmountOverride(e.target.value)}
                placeholder="Total amount"
              />
            </div>
          )}
        </div>
      )}
    </ResponsiveSheet>
  );
}

export default function StockTransactionModal({
  isOpen,
  onClose,
  item,
  allItems,
  type,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItemSummary | null;
  allItems?: InventoryItemSummary[];
  type: "STOCK_IN" | "STOCK_OUT";
}) {
  if (!isOpen || !item) return null;
  return (
    <StockTransactionForm
      key={`${item.id}-${type}`}
      onClose={onClose}
      item={item}
      allItems={allItems}
      type={type}
    />
  );
}
