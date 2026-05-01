"use client";
import React, { useState } from "react";
import { X, Save } from "lucide-react";
import { useToast } from "../ui/Toast";
import styles from "../../(dashboard)/inventory/page.module.css";
import { transactInventoryExact } from "@/actions/inventory.actions";

export default function StockTransactionModal({ isOpen, onClose, item, type }: { isOpen: boolean, onClose: () => void, item: any, type: "STOCK_IN" | "STOCK_OUT" }) {
  const [quantity, setQuantity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

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

    setIsSubmitting(true);
    const res = await transactInventoryExact({ itemId: item.id, type, quantity: numQty });
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
      <div style={{ width: "100%", maxWidth: "400px", backgroundColor: "var(--color-surface)", borderRadius: "16px", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", border: "1px solid var(--color-border)", margin: "1rem" }}>

        <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text-main)" }}>
            {type === "STOCK_IN" ? "Add Stock" : "Remove Stock"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-sub)" }}><X size={24} /></button>
        </div>

        <div style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <p style={{ margin: 0, color: "var(--color-text-sub)" }}>
            Item: <strong>{item.name}</strong> <br/>
            Current Stock: <strong>{item.quantity} {item.unit}</strong>
          </p>

          <div>
             <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "var(--color-text-sub)" }}>Quantity to {type === "STOCK_IN" ? "add" : "remove"} ({item.unit})</label>
             <input type="number" style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)" }} value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g. 10" />
          </div>
        </div>

        <div style={{ padding: "1.5rem", borderTop: "1px solid var(--color-border)" }}>
          <button
             onClick={handleSave}
             disabled={isSubmitting}
             style={{ width: "100%", padding: "0.875rem", backgroundColor: type === "STOCK_IN" ? "#22c55e" : "#ef4444", color: "white", borderRadius: "8px", border: "none", fontWeight: 600, display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}
          >
             <Save size={20} />
             {isSubmitting ? "Processing..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
