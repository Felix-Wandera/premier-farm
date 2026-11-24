import React, { Suspense } from "react";
import ClientInventory from "../../components/inventory/ClientInventory";
import { getInventoryItems, getInventoryLogs } from "@/actions/inventory.actions";

export default async function InventoryManager() {
  const [items, logs] = await Promise.all([
    getInventoryItems(),
    getInventoryLogs(),
  ]);

  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Loading inventory...</div>}>
      <ClientInventory initialItems={items} initialLogs={logs} />
    </Suspense>
  );
}
