"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "./utils";

export async function getDashboardStats() {
  await requireAuth();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalActive,
    dairyCowCount,
    indigenousCount,
    todaysMilk,
    yesterdaysMilk,
    totalIncome,
    totalExpenses,
    lowStockItems,
    upcomingEvents,
  ] = await Promise.all([
    // Total active herd
    prisma.animal.count({ where: { status: "ACTIVE", isDeleted: false } }),
    // Dairy count
    prisma.animal.count({ where: { species: "DAIRY_COW", status: "ACTIVE", isDeleted: false } }),
    // Indigenous count
    prisma.animal.count({ where: { species: "INDIGENOUS_COW", status: "ACTIVE", isDeleted: false } }),
    // Today's milk yield
    prisma.milkLog.aggregate({
      where: { date: { gte: today, lt: tomorrow }, isDeleted: false },
      _sum: { amountLiters: true }
    }),
    // Yesterday's milk yield
    (() => {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return prisma.milkLog.aggregate({
        where: { date: { gte: yesterday, lt: today }, isDeleted: false },
        _sum: { amountLiters: true }
      });
    })(),
    // Total sales revenue
    prisma.sale.aggregate({ where: { isDeleted: false }, _sum: { amount: true } }),
    // Total expenses
    prisma.expense.aggregate({ where: { isDeleted: false }, _sum: { amount: true } }),
    // Low stock items (below threshold)
    prisma.inventoryItem.findMany({
      where: {
        isDeleted: false,
        minThreshold: { not: null },
      },
    }).then(items => items.filter(i => i.minThreshold !== null && i.quantity <= i.minThreshold!)),
    // Upcoming breeding events (next 7 days)
    prisma.breedingEvent.findMany({
      where: {
        isDeleted: false,
        expectedDate: {
          gte: today,
          lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        animal: { select: { tagNumber: true, name: true, species: true } }
      },
      orderBy: { expectedDate: "asc" },
      take: 5
    })
  ]);

  const todayYield = todaysMilk._sum.amountLiters || 0;
  const yesterdayYield = yesterdaysMilk._sum.amountLiters || 0;
  const yieldDiff = todayYield - yesterdayYield;

  const income = totalIncome._sum.amount || 0;
  const expenses = totalExpenses._sum.amount || 0;

  // Build alerts array
  const alerts: { type: "warning" | "info"; title: string; description: string }[] = [];

  for (const item of lowStockItems) {
    alerts.push({
      type: "warning",
      title: `Low ${item.category} Inventory`,
      description: `${item.name} is below minimum threshold (${item.minThreshold} ${item.unit}).`
    });
  }

  for (const event of upcomingEvents) {
    const species = event.animal.species === "DAIRY_COW" ? "Dairy Cow" : event.animal.species;
    alerts.push({
      type: "info",
      title: `Upcoming ${event.eventType.replace("_", " ")}`,
      description: `${event.animal.tagNumber}${event.animal.name ? ` (${event.animal.name})` : ''} — ${event.expectedDate?.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`
    });
  }

  return {
    herd: { total: totalActive, dairy: dairyCowCount, indigenous: indigenousCount },
    milk: { todayYield, yieldDiff },
    finance: { income, expenses },
    alerts,
  };
}
