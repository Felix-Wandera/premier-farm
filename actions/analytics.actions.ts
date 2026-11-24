"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "./utils";
import { APP_BRAND_NAME, DEFAULT_CURRENCY, DEFAULT_FARM_LOCATION } from "@/lib/branding";
import { formatSpeciesLabel, parseLocalDate } from "@/lib/validations";

export type AnalyticsPreset =
  | "7d"
  | "30d"
  | "this_month"
  | "last_month"
  | "90d"
  | "ytd"
  | "custom";

export interface AnalyticsQueryInput {
  preset?: AnalyticsPreset;
  from?: string;
  to?: string;
}

function resolveDateRange(input?: AnalyticsQueryInput) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const preset = input?.preset || "30d";
  let periodLabel = "Last 30 Days";

  if (preset === "7d") {
    start.setDate(start.getDate() - 6);
    periodLabel = "Last 7 Days";
  } else if (preset === "30d") {
    start.setDate(start.getDate() - 29);
    periodLabel = "Last 30 Days";
  } else if (preset === "this_month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    periodLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } else if (preset === "last_month") {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    end.setTime(lastDayPrevMonth.getTime());
    periodLabel = start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } else if (preset === "90d") {
    start.setDate(start.getDate() - 89);
    periodLabel = "Last 90 Days";
  } else if (preset === "ytd") {
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    periodLabel = `Year to Date (${now.getFullYear()})`;
  } else if (preset === "custom") {
    const parsedFrom = input?.from ? parseLocalDate(input.from) : null;
    const parsedTo = input?.to ? parseLocalDate(input.to) : null;
    if (parsedFrom) start = parsedFrom;
    else start.setDate(start.getDate() - 29);

    if (parsedTo) {
      end.setTime(parsedTo.getTime());
      end.setHours(23, 59, 59, 999);
    }
    if (start > end) {
      const tmp = new Date(start);
      start = new Date(end);
      start.setHours(0, 0, 0, 0);
      end.setTime(tmp.getTime());
      end.setHours(23, 59, 59, 999);
    }
    periodLabel = `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }

  const durationMs = Math.max(24 * 60 * 60 * 1000, end.getTime() - start.getTime() + 1);
  const daysSpan = Math.max(1, Math.round(durationMs / (24 * 60 * 60 * 1000)));

  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs + 1);
  prevStart.setHours(0, 0, 0, 0);

  const granularity: "day" | "week" | "month" =
    daysSpan <= 45 ? "day" : daysSpan <= 140 ? "week" : "month";

  return {
    preset,
    start,
    end,
    prevStart,
    prevEnd,
    daysSpan,
    granularity,
    periodLabel,
    fromIso: start.toISOString().split("T")[0],
    toIso: end.toISOString().split("T")[0],
  };
}

function getBucketKeyAndLabel(date: Date, granularity: "day" | "week" | "month") {
  const d = new Date(date);
  if (granularity === "day") {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { key, label };
  }
  if (granularity === "week") {
    // Start of week (Monday)
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(d.getFullYear(), d.getMonth(), diff);
    const key = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;
    const label = `Wk ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    return { key, label };
  }
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  return { key, label };
}

function generateTimeBuckets(start: Date, end: Date, granularity: "day" | "week" | "month") {
  const buckets = new Map<string, string>();
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    const { key, label } = getBucketKeyAndLabel(cursor, granularity);
    if (!buckets.has(key)) buckets.set(key, label);
    if (granularity === "day") cursor.setDate(cursor.getDate() + 1);
    else if (granularity === "week") cursor.setDate(cursor.getDate() + 7);
    else cursor.setMonth(cursor.getMonth() + 1);
  }
  // Ensure end date's bucket is also included
  const endBucket = getBucketKeyAndLabel(end, granularity);
  if (!buckets.has(endBucket.key)) buckets.set(endBucket.key, endBucket.label);

  return buckets;
}

function computeDeltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
}

const EXPENSE_LABELS: Record<string, string> = {
  FEED: "Feed & Silage",
  INVENTORY_PURCHASE: "Inventory & Supplies",
  VET_SERVICES: "Veterinary & Medical",
  LABOR: "Labor & Wages",
  MAINTENANCE: "Maintenance & Repairs",
  OTHER: "Other Expenses",
};

const SALE_LABELS: Record<string, string> = {
  MILK: "Milk Sales",
  ANIMAL: "Animal Sales",
  OTHER: "Other Farm Income",
};

export async function getAnalyticsDashboardData(input?: AnalyticsQueryInput) {
  const { tenantId, hasPermission } = await requirePermission("analytics:view");
  const canViewFinances = hasPermission("finances:view");

  const range = resolveDateRange(input);
  const { start, end, prevStart, prevEnd, daysSpan, granularity } = range;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const sixMonthsAhead = new Date(now.getFullYear(), now.getMonth() + 6, 0, 23, 59, 59, 999);

  const [
    tenant,
    allAnimals,
    milkCurrent,
    milkPrevAgg,
    milkLast21Days,
    salesCurrent,
    salesPrevAgg,
    expensesCurrent,
    expensesPrevAgg,
    breedingEventsAll,
    healthRecordsPeriod,
    healthRecords90d,
    inventoryItems,
    stockOut30d,
  ] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, location: true, currencySymbol: true },
    }),
    prisma.animal.findMany({
      where: { tenantId, isDeleted: false },
      select: {
        id: true,
        name: true,
        tagNumber: true,
        species: true,
        gender: true,
        status: true,
        dateOfBirth: true,
        dateOfDeath: true,
        createdAt: true,
        sale: { select: { date: true } },
      },
    }),
    prisma.milkLog.findMany({
      where: { tenantId, isDeleted: false, date: { gte: start, lte: end } },
      select: {
        animalId: true,
        amountLiters: true,
        milkingTime: true,
        date: true,
        animal: { select: { name: true, tagNumber: true, species: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.milkLog.aggregate({
      where: { tenantId, isDeleted: false, date: { gte: prevStart, lte: prevEnd } },
      _sum: { amountLiters: true },
    }),
    prisma.milkLog.findMany({
      where: {
        tenantId,
        isDeleted: false,
        date: { gte: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000) },
      },
      select: { animalId: true, amountLiters: true, date: true },
    }),
    prisma.sale.findMany({
      where: { tenantId, isDeleted: false, date: { gte: start, lte: end } },
      select: { saleType: true, amount: true, quantity: true, buyerName: true, date: true },
      orderBy: { date: "asc" },
    }),
    canViewFinances
      ? prisma.sale.aggregate({
          where: { tenantId, isDeleted: false, date: { gte: prevStart, lte: prevEnd } },
          _sum: { amount: true },
        })
      : Promise.resolve({ _sum: { amount: null } }),
    canViewFinances
      ? prisma.expense.findMany({
          where: { tenantId, isDeleted: false, date: { gte: start, lte: end } },
          select: { category: true, amount: true, date: true },
          orderBy: { date: "asc" },
        })
      : Promise.resolve([]),
    canViewFinances
      ? prisma.expense.aggregate({
          where: { tenantId, isDeleted: false, date: { gte: prevStart, lte: prevEnd } },
          _sum: { amount: true },
        })
      : Promise.resolve({ _sum: { amount: null } }),
    prisma.breedingEvent.findMany({
      where: {
        tenantId,
        isDeleted: false,
        animal: { isDeleted: false },
      },
      include: {
        animal: { select: { id: true, name: true, tagNumber: true, species: true, status: true } },
      },
      orderBy: { expectedDate: "asc" },
    }),
    prisma.healthRecord.findMany({
      where: { tenantId, isDeleted: false, date: { gte: start, lte: end } },
      select: { recordType: true, cost: true, date: true },
    }),
    prisma.healthRecord.findMany({
      where: {
        tenantId,
        isDeleted: false,
        recordType: "TREATMENT",
        date: { gte: ninetyDaysAgo },
        animal: { isDeleted: false },
      },
      include: {
        animal: { select: { id: true, name: true, tagNumber: true, species: true, status: true } },
      },
    }),
    prisma.inventoryItem.findMany({
      where: { tenantId, isDeleted: false },
      orderBy: { name: "asc" },
    }),
    prisma.inventoryTransaction.findMany({
      where: {
        item: { tenantId, isDeleted: false },
        isDeleted: false,
        type: "STOCK_OUT",
        date: { gte: thirtyDaysAgo },
      },
      select: { itemId: true, quantity: true },
    }),
  ]);

  const bucketDefs = generateTimeBuckets(start, end, granularity);

  // ============================================
  // 1. MILK ANALYTICS
  // ============================================
  const milkBuckets = new Map<
    string,
    { label: string; morning: number; midday: number; evening: number; total: number }
  >();
  for (const [key, label] of bucketDefs.entries()) {
    milkBuckets.set(key, { label, morning: 0, midday: 0, evening: 0, total: 0 });
  }

  let totalMilkLiters = 0;
  const cowAgg = new Map<
    string,
    {
      id: string;
      name: string;
      tagNumber: string | null;
      species: string;
      totalLiters: number;
      daysSet: Set<string>;
      curveMap: Map<string, number>;
    }
  >();

  for (const log of milkCurrent) {
    totalMilkLiters += log.amountLiters;
    const { key } = getBucketKeyAndLabel(log.date, granularity);
    const b = milkBuckets.get(key);
    if (b) {
      if (log.milkingTime === "MORNING") b.morning = Number((b.morning + log.amountLiters).toFixed(1));
      else if (log.milkingTime === "MIDDAY") b.midday = Number((b.midday + log.amountLiters).toFixed(1));
      else b.evening = Number((b.evening + log.amountLiters).toFixed(1));
      b.total = Number((b.total + log.amountLiters).toFixed(1));
    }

    const dayKey = log.date.toISOString().split("T")[0];
    let entry = cowAgg.get(log.animalId);
    if (!entry) {
      entry = {
        id: log.animalId,
        name: log.animal?.name || "Unnamed",
        tagNumber: log.animal?.tagNumber || null,
        species: formatSpeciesLabel(log.animal?.species || "DAIRY_COW"),
        totalLiters: 0,
        daysSet: new Set(),
        curveMap: new Map(),
      };
      cowAgg.set(log.animalId, entry);
    }
    entry.totalLiters += log.amountLiters;
    entry.daysSet.add(dayKey);
    if (b) {
      entry.curveMap.set(key, Number(((entry.curveMap.get(key) || 0) + log.amountLiters).toFixed(1)));
    }
  }

  // Rolling 7d vs prior 14d yield drop detection
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const rollingByCow = new Map<string, { recentSum: number; recentDays: Set<string>; priorSum: number; priorDays: Set<string> }>();
  for (const log of milkLast21Days) {
    let r = rollingByCow.get(log.animalId);
    if (!r) {
      r = { recentSum: 0, recentDays: new Set(), priorSum: 0, priorDays: new Set() };
      rollingByCow.set(log.animalId, r);
    }
    const dayStr = log.date.toISOString().split("T")[0];
    if (log.date >= sevenDaysAgo) {
      r.recentSum += log.amountLiters;
      r.recentDays.add(dayStr);
    } else {
      r.priorSum += log.amountLiters;
      r.priorDays.add(dayStr);
    }
  }

  const cowLeaderboard = Array.from(cowAgg.values())
    .map((c) => {
      const milkingDays = Math.max(1, c.daysSet.size);
      const avgDaily = Number((c.totalLiters / milkingDays).toFixed(1));
      const rolling = rollingByCow.get(c.id);
      let dropAlertPct: number | null = null;
      if (rolling && rolling.recentDays.size >= 2 && rolling.priorDays.size >= 3) {
        const recentAvg = rolling.recentSum / rolling.recentDays.size;
        const priorAvg = rolling.priorSum / rolling.priorDays.size;
        if (priorAvg > 0) {
          const changePct = ((recentAvg - priorAvg) / priorAvg) * 100;
          if (changePct <= -20) {
            dropAlertPct = Number(Math.abs(changePct).toFixed(0));
          }
        }
      }

      const curve = Array.from(bucketDefs.entries()).map(([k, label]) => ({
        label,
        liters: c.curveMap.get(k) || 0,
      }));

      return {
        id: c.id,
        name: c.name,
        tagNumber: c.tagNumber,
        species: c.species,
        totalLiters: Number(c.totalLiters.toFixed(1)),
        milkingDays,
        avgDailyLiters: avgDaily,
        dropAlertPct,
        curve,
      };
    })
    .sort((a, b) => b.avgDailyLiters - a.avgDailyLiters);

  const prevMilkTotal = milkPrevAgg._sum.amountLiters || 0;
  const activeLactatingCows = allAnimals.filter(
    (a) =>
      (a.status === "ACTIVE" || a.status === "SICK") &&
      a.gender === "FEMALE" &&
      (a.species === "DAIRY_COW" || a.species === "INDIGENOUS_COW")
  ).length;

  const avgDailyRanchMilk = Number((totalMilkLiters / daysSpan).toFixed(1));
  const avgLitersPerCowPerDay =
    cowAgg.size > 0
      ? Number((avgDailyRanchMilk / cowAgg.size).toFixed(1))
      : activeLactatingCows > 0
        ? Number((avgDailyRanchMilk / activeLactatingCows).toFixed(1))
        : 0;

  const soldMilkLiters = salesCurrent
    .filter((s) => s.saleType === "MILK" && s.quantity != null)
    .reduce((acc, s) => acc + (s.quantity || 0), 0);

  const retainedOrVarianceLiters = Number(Math.max(0, totalMilkLiters - soldMilkLiters).toFixed(1));

  // ============================================
  // 2. FINANCIAL ANALYTICS (Permission-Gated)
  // ============================================
  let financesData = null;
  if (canViewFinances) {
    const cfBuckets = new Map<string, { label: string; income: number; expense: number; net: number }>();
    for (const [key, label] of bucketDefs.entries()) {
      cfBuckets.set(key, { label, income: 0, expense: 0, net: 0 });
    }

    let totalIncome = 0;
    let milkSalesRevenue = 0;
    const revByType = new Map<string, number>();
    const buyerAgg = new Map<string, { buyerName: string; totalAmount: number; totalQuantity: number; count: number }>();

    for (const s of salesCurrent) {
      totalIncome += s.amount;
      if (s.saleType === "MILK") milkSalesRevenue += s.amount;
      revByType.set(s.saleType, (revByType.get(s.saleType) || 0) + s.amount);

      const { key } = getBucketKeyAndLabel(s.date, granularity);
      const b = cfBuckets.get(key);
      if (b) {
        b.income = Math.round(b.income + s.amount);
        b.net = Math.round(b.income - b.expense);
      }

      const buyerKey = s.buyerName?.trim() || "Walk-in / Unspecified Buyer";
      const existingBuyer = buyerAgg.get(buyerKey) || {
        buyerName: buyerKey,
        totalAmount: 0,
        totalQuantity: 0,
        count: 0,
      };
      existingBuyer.totalAmount += s.amount;
      existingBuyer.totalQuantity += s.quantity || 0;
      existingBuyer.count += 1;
      buyerAgg.set(buyerKey, existingBuyer);
    }

    let totalExpenses = 0;
    const expByCat = new Map<string, number>();
    for (const e of expensesCurrent) {
      totalExpenses += e.amount;
      expByCat.set(e.category, (expByCat.get(e.category) || 0) + e.amount);

      const { key } = getBucketKeyAndLabel(e.date, granularity);
      const b = cfBuckets.get(key);
      if (b) {
        b.expense = Math.round(b.expense + e.amount);
        b.net = Math.round(b.income - b.expense);
      }
    }

    const prevIncome = salesPrevAgg._sum.amount || 0;
    const prevExpenses = expensesPrevAgg._sum.amount || 0;
    const netProfit = totalIncome - totalExpenses;
    const prevNet = prevIncome - prevExpenses;
    const profitMarginPct =
      totalIncome > 0 ? Number(((netProfit / totalIncome) * 100).toFixed(1)) : 0;

    const realizedMilkPricePerLiter =
      soldMilkLiters > 0 ? Number((milkSalesRevenue / soldMilkLiters).toFixed(1)) : null;
    const costPerLiterProduced =
      totalMilkLiters > 0 ? Number((totalExpenses / totalMilkLiters).toFixed(1)) : null;
    const netMarginPerLiter =
      realizedMilkPricePerLiter !== null && costPerLiterProduced !== null
        ? Number((realizedMilkPricePerLiter - costPerLiterProduced).toFixed(1))
        : null;

    const expenseByCategory = Array.from(expByCat.entries())
      .map(([category, amount]) => ({
        category,
        label: EXPENSE_LABELS[category] || category,
        amount: Math.round(amount),
        sharePct: totalExpenses > 0 ? Number(((amount / totalExpenses) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const revenueByType = Array.from(revByType.entries())
      .map(([category, amount]) => ({
        category,
        label: SALE_LABELS[category] || category,
        amount: Math.round(amount),
        sharePct: totalIncome > 0 ? Number(((amount / totalIncome) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const topBuyers = Array.from(buyerAgg.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 8);

    financesData = {
      totalIncome: Math.round(totalIncome),
      prevIncome: Math.round(prevIncome),
      incomeDeltaPct: computeDeltaPct(totalIncome, prevIncome),
      totalExpenses: Math.round(totalExpenses),
      prevExpenses: Math.round(prevExpenses),
      expenseDeltaPct: computeDeltaPct(totalExpenses, prevExpenses),
      netProfit: Math.round(netProfit),
      prevNetProfit: Math.round(prevNet),
      netDeltaPct: computeDeltaPct(netProfit, prevNet),
      profitMarginPct,
      unitEconomics: {
        realizedMilkPricePerLiter,
        costPerLiterProduced,
        netMarginPerLiter,
      },
      cashFlowSeries: Array.from(cfBuckets.values()),
      expenseByCategory,
      revenueByType,
      topBuyers,
    };
  }

  // ============================================
  // 3. HERD, BREEDING & HEALTH ANALYTICS
  // ============================================
  const speciesMap = new Map<string, { species: string; label: string; count: number; male: number; female: number }>();
  const ageBuckets = {
    "Calves (<6m)": 0,
    "Youngstock (6–24m)": 0,
    "Prime Herd (2–7y)": 0,
    "Senior (>7y)": 0,
    "Unknown Age": 0,
  };

  let activeCount = 0;
  let sickCount = 0;
  let soldCount = 0;
  let deceasedCount = 0;
  let periodAdditions = 0;
  let periodSales = 0;
  let periodDeaths = 0;

  for (const a of allAnimals) {
    if (a.status === "ACTIVE") activeCount++;
    else if (a.status === "SICK") sickCount++;
    else if (a.status === "SOLD") soldCount++;
    else if (a.status === "DECEASED") deceasedCount++;

    if (a.createdAt >= start && a.createdAt <= end) periodAdditions++;
    if (a.status === "SOLD" && a.sale?.date && a.sale.date >= start && a.sale.date <= end) periodSales++;
    if (a.status === "DECEASED" && a.dateOfDeath && a.dateOfDeath >= start && a.dateOfDeath <= end) periodDeaths++;

    // Only include living herd in active species & age composition
    if (a.status === "ACTIVE" || a.status === "SICK") {
      const sp = speciesMap.get(a.species) || {
        species: a.species,
        label: formatSpeciesLabel(a.species),
        count: 0,
        male: 0,
        female: 0,
      };
      sp.count++;
      if (a.gender === "MALE") sp.male++;
      else sp.female++;
      speciesMap.set(a.species, sp);

      if (!a.dateOfBirth) {
        ageBuckets["Unknown Age"]++;
      } else {
        const months = (now.getTime() - a.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
        if (months < 6) ageBuckets["Calves (<6m)"]++;
        else if (months < 24) ageBuckets["Youngstock (6–24m)"]++;
        else if (months < 84) ageBuckets["Prime Herd (2–7y)"]++;
        else ageBuckets["Senior (>7y)"]++;
      }
    }
  }

  const livingHerdTotal = activeCount + sickCount;
  const mortalityDenom = livingHerdTotal + periodDeaths + periodSales;
  const mortalityRatePct =
    mortalityDenom > 0 ? Number(((periodDeaths / mortalityDenom) * 100).toFixed(1)) : 0;

  // 6-Month Expected Calving Forecast + Overdue Watchlist
  const forecastMap = new Map<string, { monthLabel: string; expectedBirths: number; pregnancyChecks: number }>();
  for (let m = 0; m < 6; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    forecastMap.set(key, {
      monthLabel: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      expectedBirths: 0,
      pregnancyChecks: 0,
    });
  }

  const overdueEvents: Array<{
    id: string;
    animalId: string;
    animalName: string;
    tagNumber: string | null;
    eventType: string;
    expectedDate: string;
    daysOverdue: number;
  }> = [];

  let pendingPregnanciesCount = 0;

  for (const ev of breedingEventsAll) {
    const animalLiving = ev.animal.status === "ACTIVE" || ev.animal.status === "SICK";
    if (!animalLiving || ev.actualDate !== null || !ev.expectedDate) continue;

    if (ev.eventType === "INSEMINATION" || ev.eventType === "NATURAL_MATING") {
      pendingPregnanciesCount++;
    }

    if (ev.expectedDate < now) {
      const daysOverdue = Math.max(
        1,
        Math.floor((now.getTime() - ev.expectedDate.getTime()) / (1000 * 60 * 60 * 24))
      );
      overdueEvents.push({
        id: ev.id,
        animalId: ev.animal.id,
        animalName: ev.animal.name,
        tagNumber: ev.animal.tagNumber,
        eventType: ev.eventType.replace("_", " "),
        expectedDate: ev.expectedDate.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }),
        daysOverdue,
      });
    }

    if (ev.expectedDate >= new Date(now.getFullYear(), now.getMonth(), 1) && ev.expectedDate <= sixMonthsAhead) {
      const key = `${ev.expectedDate.getFullYear()}-${String(ev.expectedDate.getMonth() + 1).padStart(2, "0")}`;
      const bucket = forecastMap.get(key);
      if (bucket) {
        if (ev.eventType === "PREGNANCY_CHECK") bucket.pregnancyChecks++;
        else bucket.expectedBirths++;
      }
    }
  }

  // Health summary & repeat-treated animals (90d)
  let vaccinations = 0;
  let treatments = 0;
  let checkups = 0;
  let totalVetCost = 0;
  for (const hr of healthRecordsPeriod) {
    if (hr.recordType === "VACCINATION") vaccinations++;
    else if (hr.recordType === "TREATMENT") treatments++;
    else checkups++;
    if (hr.cost) totalVetCost += hr.cost;
  }

  const repeatTreatmentMap = new Map<
    string,
    { id: string; name: string; tagNumber: string | null; species: string; status: string; count: number; totalCost: number; lastReason: string }
  >();
  for (const tr of healthRecords90d) {
    const cur = repeatTreatmentMap.get(tr.animal.id) || {
      id: tr.animal.id,
      name: tr.animal.name,
      tagNumber: tr.animal.tagNumber,
      species: formatSpeciesLabel(tr.animal.species),
      status: tr.animal.status,
      count: 0,
      totalCost: 0,
      lastReason: tr.description,
    };
    cur.count += 1;
    cur.totalCost += tr.cost || 0;
    repeatTreatmentMap.set(tr.animal.id, cur);
  }

  const repeatTreatedAnimals = Array.from(repeatTreatmentMap.values())
    .filter((a) => a.count >= 2)
    .sort((a, b) => b.count - a.count)
    .map((a) => ({
      ...a,
      totalCost: canViewFinances ? Math.round(a.totalCost) : null,
    }));

  // ============================================
  // 4. INVENTORY BURN RATE & RUNWAY (30d)
  // ============================================
  const usedByItem = new Map<string, number>();
  for (const tx of stockOut30d) {
    usedByItem.set(tx.itemId, (usedByItem.get(tx.itemId) || 0) + tx.quantity);
  }

  const inventoryRunway = inventoryItems.map((item) => {
    const used30d = Number((usedByItem.get(item.id) || 0).toFixed(1));
    const dailyBurnRate = Number((used30d / 30).toFixed(2));
    const estimatedDaysLeft =
      dailyBurnRate > 0 ? Math.round(item.quantity / dailyBurnRate) : null;

    const belowMin = item.minThreshold !== null && item.quantity <= item.minThreshold;
    let status: "CRITICAL" | "REORDER_SOON" | "HEALTHY" = "HEALTHY";
    if (belowMin || (estimatedDaysLeft !== null && estimatedDaysLeft <= 7)) {
      status = "CRITICAL";
    } else if (estimatedDaysLeft !== null && estimatedDaysLeft <= 14) {
      status = "REORDER_SOON";
    }

    return {
      id: item.id,
      name: item.name,
      category: item.category,
      quantity: Number(item.quantity.toFixed(1)),
      unit: item.unit,
      minThreshold: item.minThreshold,
      used30d,
      dailyBurnRate,
      estimatedDaysLeft,
      status,
    };
  });

  inventoryRunway.sort((a, b) => {
    const rank = { CRITICAL: 0, REORDER_SOON: 1, HEALTHY: 2 };
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    return (a.estimatedDaysLeft ?? 9999) - (b.estimatedDaysLeft ?? 9999);
  });

  return {
    meta: {
      farmName: tenant?.name || APP_BRAND_NAME,
      location: tenant?.location || DEFAULT_FARM_LOCATION,
      currencySymbol: tenant?.currencySymbol || DEFAULT_CURRENCY,
      preset: range.preset,
      periodLabel: range.periodLabel,
      from: range.fromIso,
      to: range.toIso,
      daysSpan,
      granularity,
      canViewFinances,
      generatedAt: new Date().toISOString(),
    },
    milk: {
      totalLiters: Number(totalMilkLiters.toFixed(1)),
      prevTotalLiters: Number(prevMilkTotal.toFixed(1)),
      litersDeltaPct: computeDeltaPct(totalMilkLiters, prevMilkTotal),
      avgDailyLiters: avgDailyRanchMilk,
      avgLitersPerCowPerDay,
      milkedCowsCount: cowAgg.size,
      activeLactatingCows,
      soldMilkLiters: Number(soldMilkLiters.toFixed(1)),
      retainedOrVarianceLiters,
      series: Array.from(milkBuckets.values()),
      cowLeaderboard,
    },
    finances: financesData,
    herd: {
      livingTotal: livingHerdTotal,
      active: activeCount,
      sick: sickCount,
      soldAllTime: soldCount,
      deceasedAllTime: deceasedCount,
      periodAdditions,
      periodSales,
      periodDeaths,
      mortalityRatePct,
      pendingPregnanciesCount,
      speciesBreakdown: Array.from(speciesMap.values()).sort((a, b) => b.count - a.count),
      ageCohorts: Object.entries(ageBuckets).map(([cohort, count]) => ({ cohort, count })),
      calvingForecast: Array.from(forecastMap.values()),
      overdueEvents,
      healthSummary: {
        vaccinations,
        treatments,
        checkups,
        totalVetCost: canViewFinances ? Math.round(totalVetCost) : null,
      },
      repeatTreatedAnimals,
    },
    inventory: {
      items: inventoryRunway,
      criticalCount: inventoryRunway.filter((i) => i.status === "CRITICAL").length,
      reorderSoonCount: inventoryRunway.filter((i) => i.status === "REORDER_SOON").length,
    },
  };
}
