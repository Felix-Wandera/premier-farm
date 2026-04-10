"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "./utils";
import { z } from "zod";
import { revalidatePath } from "next/cache";

export async function getFinancialOverview() {
  await requireAuth();

  const [salesResult,  expensesResult] = await Promise.all([
    prisma.sale.aggregate({
      where: { isDeleted: false },
      _sum: { amount: true }
    }),
    prisma.expense.aggregate({
      where: { isDeleted: false },
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
    const user = await requireAuth();
    
    const val = txSchema.safeParse(data);
    if (!val.success) return { success: false, message: "Invalid data." };

    const { type, category, amount, description } = val.data;

    if (type === "income") {
      await prisma.sale.create({
        data: {
          saleType: category as any,
          amount,
          notes: description,
        }
      });
    } else {
      await prisma.expense.create({
        data: {
          category: category as any,
          amount,
          description,
          recordedById: user.id as string
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
  await requireAuth();

  // Fetch both and merge in code since Prisma doesn't do polymorphic queries easily
  const [sales, expenses] = await Promise.all([
    prisma.sale.findMany({
      where: { isDeleted: false },
      orderBy: { date: 'desc' },
      take: 50
    }),
    prisma.expense.findMany({
      where: { isDeleted: false },
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

  // Sort unified descending by date
  unified.sort((a, b) => b.date.getTime() - a.date.getTime());

  return unified.slice(0, 50); // returning top 50
}
