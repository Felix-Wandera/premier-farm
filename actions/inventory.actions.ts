"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "./utils";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getEndOfToday, normalizeWhitespace, parseLocalDate } from "@/lib/validations";

export async function getInventoryItems() {
  const { tenantId, hasPermission } = await requirePermission("inventory:view");
  const canViewFinances = hasPermission("finances:view");

  const items = await prisma.inventoryItem.findMany({
    where: { tenantId, isDeleted: false },
    orderBy: { name: "asc" },
  });

  return items.map((item) => ({
    ...item,
    unitCost: canViewFinances ? item.unitCost : null,
    unitRevenue: canViewFinances ? item.unitRevenue : null,
  }));
}

export async function getInventoryLogs() {
  const { tenantId } = await requirePermission("inventory:view");

  const logs = await prisma.inventoryTransaction.findMany({
    where: {
      item: { tenantId },
      isDeleted: false,
    },
    take: 60,
    orderBy: { date: "desc" },
    include: {
      item: { select: { name: true, unit: true } },
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  return logs;
}

const itemSchema = z.object({
  name: z.string().trim().min(2, "Item name must be at least 2 characters.").max(80),
  category: z.enum(["FEED", "MEDICINE", "EQUIPMENT", "OTHER"]),
  unit: z.string().trim().min(1, "Unit of measurement is required.").max(30),
  minThreshold: z.number().min(0, "Threshold cannot be negative."),
  linkToFinance: z.boolean().optional(),
  unitCost: z.number().min(0).nullable().optional(),
  unitRevenue: z.number().min(0).nullable().optional(),
});

export async function addInventoryItem(data: any) {
  try {
    const { tenantId } = await requirePermission("inventory:manage");

    const validated = itemSchema.safeParse(data);
    if (!validated.success) {
      return { success: false, message: validated.error.issues[0]?.message || "Invalid form data." };
    }

    const cleanName = normalizeWhitespace(validated.data.name);
    const cleanUnit = normalizeWhitespace(validated.data.unit);

    if (
      validated.data.linkToFinance &&
      (!validated.data.unitCost || validated.data.unitCost <= 0) &&
      (!validated.data.unitRevenue || validated.data.unitRevenue <= 0)
    ) {
      return {
        success: false,
        message: "When linking an item to Finances, provide either a positive Restock Cost or Selling Price.",
      };
    }

    const duplicate = await prisma.inventoryItem.findFirst({
      where: {
        tenantId,
        isDeleted: false,
        name: { equals: cleanName, mode: "insensitive" },
      },
      select: { id: true, name: true },
    });

    if (duplicate) {
      return {
        success: false,
        message: `An inventory item named "${duplicate.name}" already exists in your organization.`,
      };
    }

    await prisma.inventoryItem.create({
      data: {
        tenantId,
        name: cleanName,
        category: validated.data.category,
        unit: cleanUnit,
        minThreshold: validated.data.minThreshold,
        linkToFinance: validated.data.linkToFinance || false,
        unitCost: validated.data.unitCost ?? null,
        unitRevenue: validated.data.unitRevenue ?? null,
        quantity: 0,
      },
    });

    revalidatePath("/inventory");
    revalidatePath("/analytics");
    return { success: true, message: `"${cleanName}" added to inventory.` };
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { success: false, message: "An inventory item with this name already exists." };
    }
    return { success: false, message: err?.message || "Failed to create item." };
  }
}

export async function updateInventoryItem(id: string, data: any) {
  try {
    const { tenantId } = await requirePermission("inventory:manage");

    const validated = itemSchema.safeParse(data);
    if (!validated.success) {
      return { success: false, message: validated.error.issues[0]?.message || "Invalid form data." };
    }

    const cleanName = normalizeWhitespace(validated.data.name);
    const cleanUnit = normalizeWhitespace(validated.data.unit);

    if (
      validated.data.linkToFinance &&
      (!validated.data.unitCost || validated.data.unitCost <= 0) &&
      (!validated.data.unitRevenue || validated.data.unitRevenue <= 0)
    ) {
      return {
        success: false,
        message: "When linking an item to Finances, provide either a positive Restock Cost or Selling Price.",
      };
    }

    const existing = await prisma.inventoryItem.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!existing) {
      return { success: false, message: "Inventory item not found in your farm." };
    }

    const duplicate = await prisma.inventoryItem.findFirst({
      where: {
        tenantId,
        isDeleted: false,
        id: { not: id },
        name: { equals: cleanName, mode: "insensitive" },
      },
      select: { name: true },
    });

    if (duplicate) {
      return {
        success: false,
        message: `Another inventory item named "${duplicate.name}" already exists.`,
      };
    }

    await prisma.inventoryItem.update({
      where: { id },
      data: {
        name: cleanName,
        category: validated.data.category,
        unit: cleanUnit,
        minThreshold: validated.data.minThreshold,
        linkToFinance: validated.data.linkToFinance || false,
        unitCost: validated.data.unitCost ?? null,
        unitRevenue: validated.data.unitRevenue ?? null,
      },
    });

    revalidatePath("/inventory");
    revalidatePath("/analytics");
    return { success: true, message: "Item updated successfully." };
  } catch (err: any) {
    return { success: false, message: err?.message || "Failed to update item." };
  }
}

export async function deleteInventoryItem(id: string) {
  try {
    const { tenantId } = await requirePermission("inventory:manage");

    const existing = await prisma.inventoryItem.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!existing) {
      return { success: false, message: "Inventory item not found in your farm." };
    }

    await prisma.inventoryItem.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    revalidatePath("/inventory");
    revalidatePath("/analytics");
    revalidatePath("/");
    return { success: true, message: "Item deleted successfully." };
  } catch (err: any) {
    return { success: false, message: err?.message || "Failed to delete item." };
  }
}

const transactionSchema = z.object({
  itemId: z.string().min(1),
  type: z.enum(["STOCK_IN", "STOCK_OUT"]),
  quantity: z.number().positive("Quantity must be greater than zero."),
  reason: z.string().optional(),
  date: z.string().optional(),
  createFinanceTx: z.boolean().optional(),
  financeAmount: z.number().min(0).optional(),
});

export async function transactInventoryExact(data: any) {
  return transactInventory(data);
}

export async function transactInventory(data: any) {
  try {
    const { userId, tenantId } = await requirePermission("inventory:transact");

    const validated = transactionSchema.safeParse(data);
    if (!validated.success) {
      return { success: false, message: validated.error.issues[0]?.message || "Invalid transaction data." };
    }

    const { itemId, type, quantity, reason, date: customDate, createFinanceTx, financeAmount } = validated.data;
    const txDate = customDate ? parseLocalDate(customDate) : new Date();
    if (!txDate) {
      return { success: false, message: "Invalid transfer date." };
    }
    if (txDate > getEndOfToday()) {
      return { success: false, message: "Inventory transfer date cannot be in the future." };
    }

    await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findFirst({ where: { id: itemId, tenantId, isDeleted: false } });
      if (!item) throw new Error("Item not found in your farm");

      if (type === "STOCK_OUT" && item.quantity < quantity) {
        throw new Error(`Insufficient stock. Only ${item.quantity} ${item.unit} remaining.`);
      }

      const modifier = type === "STOCK_IN" ? quantity : -quantity;

      await tx.inventoryItem.update({
        where: { id: itemId },
        data: { quantity: { increment: modifier } },
      });

      const reasonStr = reason?.trim() ? reason.trim() : null;
      const desc = reasonStr
        ? `[${reasonStr}] ${type === "STOCK_IN" ? "Added" : "Pulled"} ${quantity} ${item.unit} of ${item.name}`
        : type === "STOCK_IN"
          ? `Added ${quantity} ${item.unit} of ${item.name}`
          : `Pulled ${quantity} ${item.unit} of ${item.name}`;

      let expenseId: string | null = null;
      let saleId: string | null = null;

      if (item.linkToFinance && createFinanceTx !== false) {
        if (type === "STOCK_IN") {
          const unitPrice = item.unitCost || 0;
          const calcAmount = financeAmount !== undefined && financeAmount > 0 ? financeAmount : unitPrice * quantity;
          if (calcAmount > 0) {
            const exp = await tx.expense.create({
              data: {
                tenantId,
                category: item.category === "FEED" ? "FEED" : "INVENTORY_PURCHASE",
                amount: calcAmount,
                date: txDate,
                description: reasonStr
                  ? `[${reasonStr}] ${item.name} (${quantity} ${item.unit})`
                  : `Inventory Restock: ${item.name} (${quantity} ${item.unit})`,
                recordedById: userId,
              },
            });
            expenseId = exp.id;
          }
        } else if (type === "STOCK_OUT") {
          const unitPrice = item.unitRevenue || 0;
          const calcAmount = financeAmount !== undefined && financeAmount > 0 ? financeAmount : unitPrice * quantity;
          if (calcAmount > 0) {
            const sale = await tx.sale.create({
              data: {
                tenantId,
                saleType: "OTHER",
                amount: calcAmount,
                quantity,
                date: txDate,
                notes: reasonStr
                  ? `[${reasonStr}] ${item.name} (${quantity} ${item.unit})`
                  : `Inventory Sale: ${item.name} (${quantity} ${item.unit})`,
              },
            });
            saleId = sale.id;
          }
        }
      }

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
        },
      });
    });

    revalidatePath("/inventory");
    revalidatePath("/sales");
    revalidatePath("/analytics");
    revalidatePath("/");
    return { success: true, message: "Stock updated successfully." };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to update stock." };
  }
}
