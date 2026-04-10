"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "./utils";
import { revalidatePath } from "next/cache";

export async function getInventoryItems() {
  await requireAuth();

  const items = await prisma.inventoryItem.findMany({
    where: { isDeleted: false },
    orderBy: { name: "asc" },
  });

  return items;
}

export async function getInventoryLogs() {
  await requireAuth();

  const logs = await prisma.inventoryTransaction.findMany({
    where: { isDeleted: false },
    take: 50,
    orderBy: { date: "desc" },
    include: {
      item: { select: { name: true, unit: true } }
    }
  });

  return logs;
}

const newItemSchema = z.object({
  name: z.string().min(2),
  category: z.enum(["FEED", "MEDICINE", "EQUIPMENT", "OTHER"]),
  unit: z.string().min(1),
  minThreshold: z.number().min(0)
});

export async function addInventoryItem(data: any) {
  try {
    await requireAuth();
    
    const validated = newItemSchema.safeParse(data);
    if (!validated.success) return { success: false, message: "Invalid form data." };

    await prisma.inventoryItem.create({
      data: {
        name: validated.data.name,
        category: validated.data.category,
        unit: validated.data.unit,
        minThreshold: validated.data.minThreshold,
        quantity: 0
      }
    });

    revalidatePath("/inventory");
    return { success: true, message: "Item added successfully." };
  } catch (err: any) {
    return { success: false, message: "Failed to create item." };
  }
} // end addInventoryItem

const transactionSchema = z.object({
  itemId: z.string(),
  type: z.enum(["STOCK_IN", "STOCK_OUT"]),
  quantity: z.number().positive(),
});

export async function transactInventory(data: any) {
  try {
    await requireAuth();
    
    const validated = transactionSchema.safeParse(data);
    if (!validated.success) {
      return { success: false, message: "Invalid transaction data." };
    }

    const { itemId, type, quantity } = validated.data;

    // Use a Prisma transaction to ensure the item quantity and log are in sync
    await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });
      if (!item) throw new Error("Item not found");

      if (type === "STOCK_OUT" && item.quantity < quantity) {
        throw new Error(`Insufficient stock. Only ${item.quantity} ${item.unit} remaining.`);
      }

      const modifier = type === "STOCK_IN" ? quantity : -quantity;

      // Update the parent item quantity
      await tx.inventoryItem.update({
        where: { id: itemId },
        data: { quantity: { increment: modifier } }
      });

      const desc = type === "STOCK_IN" 
        ? `Added ${quantity} ${item.unit} of ${item.name}` 
        : `Pulled ${quantity} ${item.unit} of ${item.name}`;

      // Create transaction record
      await tx.inventoryTransaction.create({
        data: {
          itemId,
          type,
          quantity,
          notes: desc
        }
      });
    });

    revalidatePath("/inventory");
    return { success: true, message: "Stock updated successfully." };

  } catch (error: any) {
    return { success: false, message: error.message || "Failed to update stock." };
  }
}
