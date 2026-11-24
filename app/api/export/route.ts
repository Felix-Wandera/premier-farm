import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/actions/utils";
import { DEFAULT_TENANT_SLUG } from "@/lib/branding";
import { parseLocalDate } from "@/lib/validations";

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  try {
    const { tenantId, hasPermission } = await requirePermission("exports:download");

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const farmSlug = tenant?.slug || DEFAULT_TENANT_SLUG;
    const currency = tenant?.currencySymbol || "KES";

    const type = req.nextUrl.searchParams.get("type")?.toLowerCase() || "all";
    const fromParam = req.nextUrl.searchParams.get("from");
    const toParam = req.nextUrl.searchParams.get("to");

    const fromDate = fromParam ? parseLocalDate(fromParam) : null;
    const toDateRaw = toParam ? parseLocalDate(toParam) : null;
    let toDate: Date | null = null;
    if (toDateRaw) {
      toDate = new Date(toDateRaw);
      toDate.setHours(23, 59, 59, 999);
    }

    const dateFilter =
      fromDate || toDate
        ? {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          }
        : undefined;

    const today = new Date().toISOString().split("T")[0];
    const rangeSuffix = fromParam || toParam ? `-${fromParam || "start"}_to_${toParam || today}` : `-${today}`;

    // 1. HERD EXPORT
    if (type === "herd") {
      if (!hasPermission("herd:view")) {
        return NextResponse.json({ error: "Forbidden: Missing herd:view permission." }, { status: 403 });
      }

      const animals = await prisma.animal.findMany({
        where: { tenantId, isDeleted: false },
        include: { mother: { select: { name: true, tagNumber: true } } },
        orderBy: { name: "asc" },
      });

      let csv = "Name,Tag Number,Species,Breed,Gender,Status,Sire,Dam,Date of Birth\n";
      for (const a of animals) {
        const damStr = a.mother
          ? `${a.mother.name}${a.mother.tagNumber ? ` (#${a.mother.tagNumber})` : ""}`
          : "";
        csv +=
          [
            escapeCsv(a.name),
            escapeCsv(a.tagNumber),
            escapeCsv(a.species.replace(/_/g, " ")),
            escapeCsv(a.breed),
            escapeCsv(a.gender),
            escapeCsv(a.status),
            escapeCsv(a.fatherName),
            escapeCsv(damStr),
            escapeCsv(a.dateOfBirth ? a.dateOfBirth.toISOString().split("T")[0] : ""),
          ].join(",") + "\n";
      }

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${farmSlug}-herd-${today}.csv"`,
        },
      });
    }

    // 2. MILK EXPORT
    if (type === "milk") {
      if (!hasPermission("milk:view")) {
        return NextResponse.json({ error: "Forbidden: Missing milk:view permission." }, { status: 403 });
      }

      const milkLogs = await prisma.milkLog.findMany({
        where: {
          tenantId,
          isDeleted: false,
          ...(dateFilter ? { date: dateFilter } : {}),
        },
        include: {
          animal: { select: { tagNumber: true, name: true } },
          recordedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { date: "desc" },
      });

      let csv = "Date,Milking Session,Cow Name,Cow Tag,Amount (Liters),Recorded By\n";
      for (const m of milkLogs) {
        csv +=
          [
            escapeCsv(m.date.toISOString().split("T")[0]),
            escapeCsv(m.milkingTime),
            escapeCsv(m.animal?.name),
            escapeCsv(m.animal?.tagNumber),
            escapeCsv(m.amountLiters),
            escapeCsv(
              m.recordedBy
                ? `${m.recordedBy.firstName || ""} ${m.recordedBy.lastName || ""}`.trim()
                : "System"
            ),
          ].join(",") + "\n";
      }

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${farmSlug}-milk${rangeSuffix}.csv"`,
        },
      });
    }

    // 3. FINANCES (SALES & EXPENSES)
    if (type === "finances" || type === "sales" || type === "expenses") {
      if (!hasPermission("finances:view")) {
        return NextResponse.json(
          { error: "Forbidden: You do not have permission to view or export financial records." },
          { status: 403 }
        );
      }

      const [sales, expenses] = await Promise.all([
        prisma.sale.findMany({
          where: {
            tenantId,
            isDeleted: false,
            ...(dateFilter ? { date: dateFilter } : {}),
          },
          orderBy: { date: "desc" },
        }),
        prisma.expense.findMany({
          where: {
            tenantId,
            isDeleted: false,
            ...(dateFilter ? { date: dateFilter } : {}),
          },
          include: { recordedBy: { select: { firstName: true, lastName: true } } },
          orderBy: { date: "desc" },
        }),
      ]);

      let csv = `Date,Type,Category,Amount (${currency}),Quantity,Buyer / Details,Notes,Recorded By\n`;

      const allRecords: Array<{
        date: Date;
        type: string;
        category: string;
        amount: number;
        quantity: number | string;
        buyer: string;
        notes: string;
        recordedBy: string;
      }> = [];

      if (type !== "expenses") {
        for (const s of sales) {
          allRecords.push({
            date: s.date,
            type: "Income",
            category: s.saleType,
            amount: s.amount,
            quantity: s.quantity ?? "",
            buyer: s.buyerName || "",
            notes: s.notes || "",
            recordedBy: "Sales Ledger",
          });
        }
      }

      if (type !== "sales") {
        for (const e of expenses) {
          allRecords.push({
            date: e.date,
            type: "Expense",
            category: e.category,
            amount: e.amount,
            quantity: "",
            buyer: e.description || "",
            notes: "",
            recordedBy: e.recordedBy
              ? `${e.recordedBy.firstName || ""} ${e.recordedBy.lastName || ""}`.trim()
              : "System",
          });
        }
      }

      allRecords.sort((a, b) => b.date.getTime() - a.date.getTime());

      for (const r of allRecords) {
        csv +=
          [
            escapeCsv(r.date.toISOString().split("T")[0]),
            escapeCsv(r.type),
            escapeCsv(r.category),
            escapeCsv(r.amount),
            escapeCsv(r.quantity),
            escapeCsv(r.buyer),
            escapeCsv(r.notes),
            escapeCsv(r.recordedBy),
          ].join(",") + "\n";
      }

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${farmSlug}-${type}${rangeSuffix}.csv"`,
        },
      });
    }

    // 4. BREEDING & HEALTH EXPORT
    if (type === "breeding_health") {
      if (!hasPermission("health:view")) {
        return NextResponse.json({ error: "Forbidden: Missing health:view permission." }, { status: 403 });
      }
      const canViewFinances = hasPermission("finances:view");

      const [breeding, health] = await Promise.all([
        prisma.breedingEvent.findMany({
          where: { tenantId, isDeleted: false, ...(dateFilter ? { date: dateFilter } : {}) },
          include: { animal: { select: { name: true, tagNumber: true } } },
          orderBy: { date: "desc" },
        }),
        prisma.healthRecord.findMany({
          where: { tenantId, isDeleted: false, ...(dateFilter ? { date: dateFilter } : {}) },
          include: { animal: { select: { name: true, tagNumber: true } } },
          orderBy: { date: "desc" },
        }),
      ]);

      let csv = "=== BREEDING EVENTS ===\n";
      csv += "Date,Animal Name,Tag,Event Type,Sire,Expected Date,Completed Date,Notes\n";
      for (const b of breeding) {
        csv +=
          [
            escapeCsv(b.date.toISOString().split("T")[0]),
            escapeCsv(b.animal?.name),
            escapeCsv(b.animal?.tagNumber),
            escapeCsv(b.eventType),
            escapeCsv(b.sireDetails),
            escapeCsv(b.expectedDate ? b.expectedDate.toISOString().split("T")[0] : ""),
            escapeCsv(b.actualDate ? b.actualDate.toISOString().split("T")[0] : ""),
            escapeCsv(b.notes),
          ].join(",") + "\n";
      }

      csv += "\n=== HEALTH RECORDS ===\n";
      csv += canViewFinances
        ? `Date,Animal Name,Tag,Record Type,Description,Cost (${currency})\n`
        : "Date,Animal Name,Tag,Record Type,Description\n";
      for (const h of health) {
        const cols = [
          escapeCsv(h.date.toISOString().split("T")[0]),
          escapeCsv(h.animal?.name),
          escapeCsv(h.animal?.tagNumber),
          escapeCsv(h.recordType),
          escapeCsv(h.description),
        ];
        if (canViewFinances) cols.push(escapeCsv(h.cost ?? ""));
        csv += cols.join(",") + "\n";
      }

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${farmSlug}-breeding-health${rangeSuffix}.csv"`,
        },
      });
    }

    // 5. INVENTORY EXPORT
    if (type === "inventory") {
      if (!hasPermission("inventory:view")) {
        return NextResponse.json({ error: "Forbidden: Missing inventory:view permission." }, { status: 403 });
      }

      const items = await prisma.inventoryItem.findMany({
        where: { tenantId, isDeleted: false },
        orderBy: { name: "asc" },
      });

      let csv = "Item Name,Category,Quantity In Stock,Unit,Min Threshold,Status\n";
      for (const i of items) {
        const isLow = i.minThreshold !== null && i.quantity <= i.minThreshold;
        csv +=
          [
            escapeCsv(i.name),
            escapeCsv(i.category),
            escapeCsv(i.quantity),
            escapeCsv(i.unit),
            escapeCsv(i.minThreshold ?? ""),
            escapeCsv(isLow ? "Low Stock" : "Normal"),
          ].join(",") + "\n";
      }

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${farmSlug}-inventory-${today}.csv"`,
        },
      });
    }

    // 6. CONSOLIDATED BACKUP (Scoped Strictly by Caller Permissions)
    const canHerd = hasPermission("herd:view");
    const canMilk = hasPermission("milk:view");
    const canFinance = hasPermission("finances:view");
    const canInventory = hasPermission("inventory:view");

    const [animals, milkLogs, sales, expenses, inventory] = await Promise.all([
      canHerd
        ? prisma.animal.findMany({ where: { tenantId, isDeleted: false }, orderBy: { name: "asc" } })
        : Promise.resolve([]),
      canMilk
        ? prisma.milkLog.findMany({
            where: { tenantId, isDeleted: false, ...(dateFilter ? { date: dateFilter } : {}) },
            include: { animal: { select: { tagNumber: true, name: true } } },
            orderBy: { date: "desc" },
            take: 1000,
          })
        : Promise.resolve([]),
      canFinance
        ? prisma.sale.findMany({
            where: { tenantId, isDeleted: false, ...(dateFilter ? { date: dateFilter } : {}) },
            orderBy: { date: "desc" },
          })
        : Promise.resolve([]),
      canFinance
        ? prisma.expense.findMany({
            where: { tenantId, isDeleted: false, ...(dateFilter ? { date: dateFilter } : {}) },
            orderBy: { date: "desc" },
          })
        : Promise.resolve([]),
      canInventory
        ? prisma.inventoryItem.findMany({ where: { tenantId, isDeleted: false }, orderBy: { name: "asc" } })
        : Promise.resolve([]),
    ]);

    let csv = "";

    if (canHerd) {
      csv += "=== HERD DIRECTORY ===\n";
      csv += "Name,Tag Number,Species,Gender,Status,DOB\n";
      for (const a of animals) {
        csv += `${escapeCsv(a.name)},${escapeCsv(a.tagNumber)},${escapeCsv(a.species)},${escapeCsv(a.gender)},${escapeCsv(a.status)},${escapeCsv(a.dateOfBirth ? a.dateOfBirth.toISOString().split("T")[0] : "")}\n`;
      }
      csv += "\n";
    }

    if (canMilk) {
      csv += "=== MILK LOGS ===\n";
      csv += "Date,Session,Yield (L),Cow Name,Cow Tag\n";
      for (const m of milkLogs) {
        csv += `${escapeCsv(m.date.toISOString().split("T")[0])},${escapeCsv(m.milkingTime)},${escapeCsv(m.amountLiters)},${escapeCsv(m.animal?.name)},${escapeCsv(m.animal?.tagNumber)}\n`;
      }
      csv += "\n";
    }

    if (canFinance) {
      csv += "=== SALES ===\n";
      csv += `Date,Type,Amount (${currency}),Buyer,Notes\n`;
      for (const s of sales) {
        csv += `${escapeCsv(s.date.toISOString().split("T")[0])},${escapeCsv(s.saleType)},${escapeCsv(s.amount)},${escapeCsv(s.buyerName)},${escapeCsv(s.notes)}\n`;
      }
      csv += "\n=== EXPENSES ===\n";
      csv += `Date,Category,Amount (${currency}),Description\n`;
      for (const e of expenses) {
        csv += `${escapeCsv(e.date.toISOString().split("T")[0])},${escapeCsv(e.category)},${escapeCsv(e.amount)},${escapeCsv(e.description)}\n`;
      }
      csv += "\n";
    }

    if (canInventory) {
      csv += "=== INVENTORY ===\n";
      csv += "Item Name,Category,Quantity,Unit\n";
      for (const item of inventory) {
        csv += `${escapeCsv(item.name)},${escapeCsv(item.category)},${escapeCsv(item.quantity)},${escapeCsv(item.unit)}\n`;
      }
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${farmSlug}-backup${rangeSuffix}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    const status = String(error?.message || "").startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: error?.message || "Export failed" }, { status });
  }
}
