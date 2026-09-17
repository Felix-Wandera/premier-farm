"use server";

import { prisma } from "@/lib/prisma";
import { requireTenantRole } from "./utils";
import { z } from "zod";
import { revalidatePath } from "next/cache";

export async function getFinancialOverview() {
  const { tenantId } = await requireTenantRole(["ADMIN", "MANAGER"]);

  const [salesResult, expensesResult] = await Promise.all([
    prisma.sale.aggregate({
      where: { tenantId, isDeleted: false },
      _sum: { amount: true }
    }),
    prisma.expense.aggregate({
      where: { tenantId, isDeleted: false },
      _sum: { amount: true }
    })
  ]);

  const totalIncome = salesResult._sum.amount || 0;
  const totalExpenses = expensesResult._sum.amount || 0;
  const net = totalIncome - totalExpenses;

  return { totalIncome, totalExpenses, net };
}

const txSchema = z.object({
  type: z.enum(["income", "expense"]),
  category: z.string(),   // e.g. "MILK" or "FEED"
  amount: z.number().positive(),
  description: z.string().optional()
});

export async function recordTransaction(data: any) {
  try {
    const { userId, tenantId } = await requireTenantRole(["ADMIN", "MANAGER"]);
    
    const val = txSchema.safeParse(data);
    if (!val.success) return { success: false, message: "Invalid data." };

    const { type, category, amount, description } = val.data;

    if (type === "income") {
      await prisma.sale.create({
        data: {
          tenantId,
          saleType: category as any,
          amount,
          notes: description,
        }
      });
    } else {
      await prisma.expense.create({
        data: {
          tenantId,
          category: category as any,
          amount,
          description,
          recordedById: userId
        }
      });
    }

    revalidatePath("/sales");
    return { success: true, message: "Transaction recorded successfully." };
  } catch(e) {
    return { success: false, message: "Failed to record transaction." };
  }
}

export async function getTransactions() {
  const { tenantId } = await requireTenantRole(["ADMIN", "MANAGER"]);

  const [sales, expenses] = await Promise.all([
    prisma.sale.findMany({
      where: { tenantId, isDeleted: false },
      orderBy: { date: 'desc' },
      take: 50
    }),
    prisma.expense.findMany({
      where: { tenantId, isDeleted: false },
      orderBy: { date: 'desc' },
      take: 50
    })
  ]);

  const unified = [
    ...sales.map(s => ({
      id: `S-${s.id}`,
      type: "income",
      category: s.saleType,
      title: s.saleType === "MILK" ? `Milk Sales` : s.saleType === "ANIMAL" ? `Animal Sale` : "Other Income",
      amount: s.amount,
      date: s.date
    })),
    ...expenses.map(e => ({
      id: `E-${e.id}`,
      type: "expense",
      category: e.category,
      title: e.description || e.category,
      amount: e.amount,
      date: e.date
    }))
  ];

  unified.sort((a, b) => b.date.getTime() - a.date.getTime());

  return unified.slice(0, 50);
}

export async function getWeeklyCashFlow() {
  const { tenantId } = await requireTenantRole(["ADMIN", "MANAGER"]);

  const days: { day: string; income: number; expense: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date();
    dayStart.setDate(dayStart.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const [salesAgg, expAgg] = await Promise.all([
      prisma.sale.aggregate({
        where: { tenantId, isDeleted: false, date: { gte: dayStart, lt: dayEnd } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { tenantId, isDeleted: false, date: { gte: dayStart, lt: dayEnd } },
        _sum: { amount: true },
      }),
    ]);

    days.push({
      day: dayStart.toLocaleDateString("en-US", { weekday: "short" }).charAt(0),
      income: salesAgg._sum.amount || 0,
      expense: expAgg._sum.amount || 0,
    });
  }

  return days;
}
