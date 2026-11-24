"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "./utils";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { ActionResponse, getEndOfToday, parseLocalDate } from "@/lib/validations";

export async function getFinancialOverview() {
  const { tenantId } = await requirePermission("finances:view");

  const [salesResult, expensesResult] = await Promise.all([
    prisma.sale.aggregate({
      where: { tenantId, isDeleted: false },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { tenantId, isDeleted: false },
      _sum: { amount: true },
    }),
  ]);

  const totalIncome = salesResult._sum.amount || 0;
  const totalExpenses = expensesResult._sum.amount || 0;
  const net = totalIncome - totalExpenses;

  return { totalIncome, totalExpenses, net };
}

const incomeTxSchema = z.object({
  type: z.literal("income"),
  category: z.enum(["MILK", "ANIMAL", "OTHER"]),
  amount: z.number().positive("Amount must be greater than zero."),
  quantity: z.number().positive().optional(),
  buyerName: z.string().optional(),
  description: z.string().optional(),
  date: z.string().optional(),
  reason: z.string().optional(),
  overrideWarnings: z.boolean().optional(),
});

const expenseTxSchema = z.object({
  type: z.literal("expense"),
  category: z.enum(["INVENTORY_PURCHASE", "FEED", "LABOR", "VET_SERVICES", "MAINTENANCE", "OTHER"]),
  amount: z.number().positive("Amount must be greater than zero."),
  description: z.string().optional(),
  date: z.string().optional(),
  reason: z.string().optional(),
  overrideWarnings: z.boolean().optional(),
});

const txSchema = z.discriminatedUnion("type", [incomeTxSchema, expenseTxSchema]);

export async function recordTransaction(data: any): Promise<ActionResponse> {
  try {
    const { userId, tenantId, isAdmin } = await requirePermission("finances:manage");

    const val = txSchema.safeParse(data);
    if (!val.success) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: val.error.issues[0]?.message || "Invalid transaction data or category.",
      };
    }

    const parsed = val.data;
    const txDate = parsed.date ? parseLocalDate(parsed.date) : new Date();
    if (!txDate) {
      return { success: false, code: "VALIDATION_ERROR", message: "Invalid transaction date." };
    }
    if (txDate > getEndOfToday()) {
      return { success: false, code: "VALIDATION_ERROR", message: "Transaction date cannot be in the future." };
    }

    if (parsed.amount > 500000 && !(parsed.overrideWarnings && isAdmin)) {
      return {
        success: false,
        code: "OUTLIER_WARNING",
        message: `Transaction amount of KES ${parsed.amount.toLocaleString()} exceeds KES 500,000.`,
        warnings: [
          `Single ${parsed.type} amount of KES ${parsed.amount.toLocaleString()} exceeds the standard KES 500,000 verification threshold.`,
        ],
        canOverride: isAdmin,
      };
    }

    const finalNotes = parsed.reason?.trim()
      ? parsed.description?.trim()
        ? `[${parsed.reason.trim()}] ${parsed.description.trim()}`
        : parsed.reason.trim()
      : parsed.description?.trim() || null;

    if (parsed.type === "income") {
      await prisma.sale.create({
        data: {
          tenantId,
          saleType: parsed.category,
          amount: parsed.amount,
          quantity: parsed.quantity ?? null,
          buyerName: parsed.buyerName?.trim() || null,
          date: txDate,
          notes: finalNotes,
        },
      });
    } else {
      await prisma.expense.create({
        data: {
          tenantId,
          category: parsed.category,
          amount: parsed.amount,
          date: txDate,
          description: finalNotes,
          recordedById: userId,
        },
      });
    }

    revalidatePath("/sales");
    revalidatePath("/analytics");
    revalidatePath("/");
    return { success: true, message: "Transaction recorded successfully." };
  } catch (e: any) {
    return { success: false, message: e?.message || "Failed to record transaction." };
  }
}

export async function getTransactions() {
  const { tenantId } = await requirePermission("finances:view");

  const [sales, expenses] = await Promise.all([
    prisma.sale.findMany({
      where: { tenantId, isDeleted: false },
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.expense.findMany({
      where: { tenantId, isDeleted: false },
      orderBy: { date: "desc" },
      take: 100,
    }),
  ]);

  const unified = [
    ...sales.map((s) => ({
      id: `S-${s.id}`,
      type: "income",
      category: s.saleType,
      title:
        s.notes ||
        (s.saleType === "MILK"
          ? "Milk Sales"
          : s.saleType === "ANIMAL"
            ? "Animal Sale"
            : "Other Income"),
      amount: s.amount,
      date: s.date,
    })),
    ...expenses.map((e) => ({
      id: `E-${e.id}`,
      type: "expense",
      category: e.category,
      title: e.description || e.category.replace("_", " "),
      amount: e.amount,
      date: e.date,
    })),
  ];

  unified.sort((a, b) => b.date.getTime() - a.date.getTime());

  return unified.slice(0, 100);
}

export async function getWeeklyCashFlow() {
  const { tenantId } = await requirePermission("finances:view");

  const start = new Date();
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  const [sales, expenses] = await Promise.all([
    prisma.sale.findMany({
      where: { tenantId, isDeleted: false, date: { gte: start } },
      select: { date: true, amount: true },
    }),
    prisma.expense.findMany({
      where: { tenantId, isDeleted: false, date: { gte: start } },
      select: { date: true, amount: true },
    }),
  ]);

  const buckets = new Map<string, { day: string; income: number; expense: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    buckets.set(key, {
      day: d.toLocaleDateString("en-US", { weekday: "short" }).charAt(0),
      income: 0,
      expense: 0,
    });
  }

  for (const s of sales) {
    const d = new Date(s.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const b = buckets.get(key);
    if (b) b.income += s.amount;
  }

  for (const e of expenses) {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const b = buckets.get(key);
    if (b) b.expense += e.amount;
  }

  return Array.from(buckets.values());
}
