import React from "react";
import ClientInventory from "../../components/inventory/ClientInventory";
import { getInventoryItems, getInventoryLogs } from "@/actions/inventory.actions";

export default async function InventoryManager() {
  const [items, logs] = await Promise.all([
    getInventoryItems(),
    getInventoryLogs()
  ]);

  return <ClientInventory initialItems={items} initialLogs={logs} />;
}
