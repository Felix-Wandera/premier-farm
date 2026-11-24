"use server";

import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "./utils";
import { APP_BRAND_NAME } from "@/lib/branding";

export async function getDashboardStats() {
  const { tenantId, userId, hasPermission } = await requireTenantContext();
  const canViewFinances = hasPermission("finances:view");

  const [user, tenant] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { firstName: true } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, currencySymbol: true } }),
  ]);

  const userName = user?.firstName || null;
  const farmName = tenant?.name || APP_BRAND_NAME;
  const currencySymbol = tenant?.currencySymbol || "KES";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalActive,
    dairyCowCount,
    indigenousCount,
    sickCount,
    todaysMilk,
    yesterdaysMilk,
    monthIncomeAgg,
    monthExpenseAgg,
    lowStockItems,
    upcomingEvents,
    pendingEventsTotal,
  ] = await Promise.all([
    prisma.animal.count({ where: { tenantId, status: "ACTIVE", isDeleted: false } }),
    prisma.animal.count({ where: { tenantId, species: "DAIRY_COW", status: "ACTIVE", isDeleted: false } }),
    prisma.animal.count({ where: { tenantId, species: "INDIGENOUS_COW", status: "ACTIVE", isDeleted: false } }),
    prisma.animal.count({ where: { tenantId, status: "SICK", isDeleted: false } }),
    prisma.milkLog.aggregate({
      where: { tenantId, date: { gte: today, lt: tomorrow }, isDeleted: false },
      _sum: { amountLiters: true },
    }),
    (() => {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return prisma.milkLog.aggregate({
        where: { tenantId, date: { gte: yesterday, lt: today }, isDeleted: false },
        _sum: { amountLiters: true },
      });
    })(),
    canViewFinances
      ? prisma.sale.aggregate({
          where: { tenantId, isDeleted: false, date: { gte: monthStart } },
          _sum: { amount: true },
        })
      : Promise.resolve({ _sum: { amount: null } }),
    canViewFinances
      ? prisma.expense.aggregate({
          where: { tenantId, isDeleted: false, date: { gte: monthStart } },
          _sum: { amount: true },
        })
      : Promise.resolve({ _sum: { amount: null } }),
    prisma.inventoryItem
      .findMany({
        where: {
          tenantId,
          isDeleted: false,
          minThreshold: { not: null },
        },
      })
      .then((items) => items.filter((i) => i.minThreshold !== null && i.quantity <= i.minThreshold!)),
    prisma.breedingEvent.findMany({
      where: {
        tenantId,
        isDeleted: false,
        actualDate: null,
        expectedDate: {
          gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
          lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        animal: { select: { tagNumber: true, name: true, species: true } },
      },
      orderBy: { expectedDate: "asc" },
      take: 5,
    }),
    prisma.breedingEvent.count({
      where: {
        tenantId,
        isDeleted: false,
        actualDate: null,
        expectedDate: {
          lte: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  const todayYield = Number((todaysMilk._sum.amountLiters || 0).toFixed(1));
  const yesterdayYield = Number((yesterdaysMilk._sum.amountLiters || 0).toFixed(1));
  const yieldDiff = Number((todayYield - yesterdayYield).toFixed(1));

  const alerts: { type: "warning" | "info"; title: string; description: string }[] = [];

  if (sickCount > 0) {
    alerts.push({
      type: "warning",
      title: `${sickCount} Sick ${sickCount === 1 ? "Animal" : "Animals"} Under Monitoring`,
      description: "Review recent treatments and milk withdrawal precautions in Herd Directory.",
    });
  }

  for (const item of lowStockItems) {
    alerts.push({
      type: "warning",
      title: `Low ${item.category} Inventory`,
      description: `${item.name} is at ${item.quantity} ${item.unit} (min threshold: ${item.minThreshold} ${item.unit}).`,
    });
  }

  for (const event of upcomingEvents) {
    const isOverdue = event.expectedDate && event.expectedDate < today;
    alerts.push({
      type: isOverdue ? "warning" : "info",
      title: `${isOverdue ? "Overdue" : "Upcoming"} ${event.eventType.replace("_", " ")}`,
      description: `${event.animal.name || event.animal.tagNumber || "Animal"}${event.animal.tagNumber && event.animal.name ? ` (#${event.animal.tagNumber})` : ""} — ${event.expectedDate?.toLocaleDateString("en-US", { day: "numeric", month: "short" })}`,
    });
  }

  return {
    userName,
    farmName,
    currencySymbol,
    herd: {
      total: totalActive,
      dairy: dairyCowCount,
      indigenous: indigenousCount,
      sick: sickCount,
    },
    milk: { todayYield, yieldDiff },
    finance: canViewFinances
      ? {
          income: monthIncomeAgg._sum.amount || 0,
          expenses: monthExpenseAgg._sum.amount || 0,
        }
      : null,
    operations: {
      pendingEvents: pendingEventsTotal,
      lowStockCount: lowStockItems.length,
    },
    alerts,
  };
}
