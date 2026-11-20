"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantContext, requireTenantRole } from "./utils";
import { revalidatePath } from "next/cache";

export async function getInventoryItems() {
  const { tenantId } = await requireTenantContext();

  const items = await prisma.inventoryItem.findMany({
    where: { tenantId, isDeleted: false },
    orderBy: { name: "asc" },
  });

  return items;
}

export async function getInventoryLogs() {
  const { tenantId } = await requireTenantContext();

  const logs = await prisma.inventoryTransaction.findMany({
    where: {
      item: { tenantId },
      isDeleted: false
    },
    take: 50,
    orderBy: { date: "desc" },
    include: {
      item: { select: { name: true, unit: true } },
      user: { select: { firstName: true, lastName: true, email: true } },
    }
  });

  return logs;
}

const newItemSchema = z.object({
  name: z.string().min(2),
  category: z.enum(["FEED", "MEDICINE", "EQUIPMENT", "OTHER"]),
  unit: z.string().min(1),
  minThreshold: z.number().min(0),
  linkToFinance: z.boolean().optional(),
  unitCost: z.number().nullable().optional(),
  unitRevenue: z.number().nullable().optional(),
});

export async function addInventoryItem(data: any) {
  try {
    const { tenantId } = await requireTenantRole(["ADMIN", "MANAGER"]);
    
    const validated = newItemSchema.safeParse(data);
    if (!validated.success) return { success: false, message: "Invalid form data." };

    await prisma.inventoryItem.create({
      data: {
        tenantId,
        name: validated.data.name,
        category: validated.data.category,
        unit: validated.data.unit,
        minThreshold: validated.data.minThreshold,
        linkToFinance: validated.data.linkToFinance || false,
        unitCost: validated.data.unitCost ?? null,
        unitRevenue: validated.data.unitRevenue ?? null,
        quantity: 0
      }
    });

    revalidatePath("/inventory");
    return { success: true, message: "Item added successfully." };
  } catch (err: any) {
    return { success: false, message: "Failed to create item." };
  }
}

const transactionSchema = z.object({
  itemId: z.string(),
  type: z.enum(["STOCK_IN", "STOCK_OUT"]),
  quantity: z.number().positive(),
  reason: z.string().optional(),
  date: z.string().optional(),
  createFinanceTx: z.boolean().optional(),
  financeAmount: z.number().optional(),
});

const updateItemSchema = z.object({
  name: z.string().min(2),
  category: z.enum(["FEED", "MEDICINE", "EQUIPMENT", "OTHER"]),
  unit: z.string().min(1),
  minThreshold: z.number().min(0),
  linkToFinance: z.boolean().optional(),
  unitCost: z.number().nullable().optional(),
  unitRevenue: z.number().nullable().optional(),
});

export async function updateInventoryItem(id: string, data: any) {
  try {
    const { tenantId } = await requireTenantRole(["ADMIN", "MANAGER"]);

    const validated = updateItemSchema.safeParse(data);
    if (!validated.success) return { success: false, message: "Invalid form data." };

    const existing = await prisma.inventoryItem.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return { success: false, message: "Inventory item not found in your farm." };
    }

    await prisma.inventoryItem.update({
      where: { id },
      data: {
        name: validated.data.name,
        category: validated.data.category,
        unit: validated.data.unit,
        minThreshold: validated.data.minThreshold,
        linkToFinance: validated.data.linkToFinance || false,
        unitCost: validated.data.unitCost ?? null,
        unitRevenue: validated.data.unitRevenue ?? null,
      }
    });

    revalidatePath("/inventory");
    return { success: true, message: "Item updated successfully." };
  } catch (err: any) {
    return { success: false, message: "Failed to update item." };
  }
}

export async function deleteInventoryItem(id: string) {
  try {
    const { tenantId } = await requireTenantRole(["ADMIN", "MANAGER"]);

    const existing = await prisma.inventoryItem.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return { success: false, message: "Inventory item not found in your farm." };
    }

    await prisma.inventoryItem.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });

    revalidatePath("/inventory");
    return { success: true, message: "Item deleted successfully." };
  } catch (err: any) {
    return { success: false, message: "Failed to delete item." };
  }
}

export async function transactInventoryExact(data: any) {
  return transactInventory(data);
}

export async function transactInventory(data: any) {
  try {
    const { userId, tenantId } = await requireTenantContext();
    
    const validated = transactionSchema.safeParse(data);
    if (!validated.success) {
      return { success: false, message: "Invalid transaction data." };
    }

    const { itemId, type, quantity, reason, date: customDate, createFinanceTx, financeAmount } = validated.data;
    const txDate = customDate ? new Date(customDate) : new Date();

    // Use a Prisma transaction to ensure the item quantity, log, and finance records stay in sync
    await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findFirst({ where: { id: itemId, tenantId } });
      if (!item) throw new Error("Item not found in your farm");

      if (type === "STOCK_OUT" && item.quantity < quantity) {
        throw new Error(`Insufficient stock. Only ${item.quantity} ${item.unit} remaining.`);
      }

      const modifier = type === "STOCK_IN" ? quantity : -quantity;

      // Update the parent item quantity
      await tx.inventoryItem.update({
        where: { id: itemId },
        data: { quantity: { increment: modifier } }
      });

      const reasonStr = reason?.trim() ? reason.trim() : null;
      const desc = reasonStr 
        ? `[${reasonStr}] ${type === "STOCK_IN" ? "Added" : "Pulled"} ${quantity} ${item.unit} of ${item.name}` 
        : (type === "STOCK_IN" 
          ? `Added ${quantity} ${item.unit} of ${item.name}` 
          : `Pulled ${quantity} ${item.unit} of ${item.name}`);

      let expenseId: string | null = null;
      let saleId: string | null = null;

      // Automated Financial Linkage (if enabled on this item and not opted-out)
      if (item.linkToFinance && createFinanceTx !== false) {
        if (type === "STOCK_IN") {
          const unitPrice = item.unitCost || 0;
          const calcAmount = financeAmount !== undefined && financeAmount > 0 ? financeAmount : (unitPrice * quantity);
          if (calcAmount > 0) {
            const exp = await tx.expense.create({
              data: {
                tenantId,
                category: "INVENTORY_PURCHASE",
                amount: calcAmount,
                date: txDate,
                description: reasonStr ? `[${reasonStr}] ${item.name} (${quantity} ${item.unit})` : `Inventory Restock: ${item.name} (${quantity} ${item.unit})`,
                recordedById: userId,
              }
            });
            expenseId = exp.id;
          }
        } else if (type === "STOCK_OUT") {
          const unitPrice = item.unitRevenue || 0;
          const calcAmount = financeAmount !== undefined && financeAmount > 0 ? financeAmount : (unitPrice * quantity);
          if (calcAmount > 0) {
            const sale = await tx.sale.create({
              data: {
                tenantId,
                saleType: "OTHER",
                amount: calcAmount,
                quantity: quantity,
                date: txDate,
                notes: reasonStr ? `[${reasonStr}] ${item.name} (${quantity} ${item.unit})` : `Inventory Sale: ${item.name} (${quantity} ${item.unit})`,
              }
            });
            saleId = sale.id;
          }
        }
      }

      // Create transaction record
      await tx.inventoryTransaction.create({
        data: {
          itemId,
          type,
          quantity,
          date: txDate,
          reason: reasonStr,
          notes: desc,
          userId,
          expenseId,
          saleId,
        }
      });
    });

    revalidatePath("/inventory");
    revalidatePath("/sales");
    revalidatePath("/");
    return { success: true, message: "Stock updated successfully." };

  } catch (error: any) {
    return { success: false, message: error.message || "Failed to update stock." };
  }
}
