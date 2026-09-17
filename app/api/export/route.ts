import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "ADMIN" && session.role !== "MANAGER") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators and managers can export farm data." },
        { status: 403 }
      );
    }

    const type = req.nextUrl.searchParams.get("type")?.toLowerCase() || "all";
    const today = new Date().toISOString().split("T")[0];

    // 1. HERD EXPORT
    if (type === "herd") {
      const animals = await prisma.animal.findMany({
        where: { isDeleted: false },
        include: { mother: { select: { tagNumber: true } } },
        orderBy: { tagNumber: "asc" },
      });

      let csv = "Tag Number,Name,Species,Breed,Gender,Status,Sire,Dam Tag,Date of Birth\n";
      for (const a of animals) {
        csv += [
          escapeCsv(a.tagNumber),
          escapeCsv(a.name),
          escapeCsv(a.species.replace(/_/g, " ")),
          escapeCsv(a.breed),
          escapeCsv(a.gender),
          escapeCsv(a.status),
          escapeCsv(a.fatherName),
          escapeCsv(a.mother?.tagNumber),
          escapeCsv(a.dateOfBirth ? a.dateOfBirth.toISOString().split("T")[0] : ""),
        ].join(",") + "\n";
      }

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="premier-farm-herd-${today}.csv"`,
        },
      });
    }

    // 2. MILK EXPORT
    if (type === "milk") {
      const milkLogs = await prisma.milkLog.findMany({
        where: { isDeleted: false },
        include: {
          animal: { select: { tagNumber: true, name: true } },
          recordedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { date: "desc" },
      });

      let csv = "Date,Milking Session,Cow Tag,Cow Name,Amount (Liters),Recorded By\n";
      for (const m of milkLogs) {
        csv += [
          escapeCsv(m.date.toISOString().split("T")[0]),
          escapeCsv(m.milkingTime),
          escapeCsv(m.animal?.tagNumber),
          escapeCsv(m.animal?.name),
          escapeCsv(m.amountLiters),
          escapeCsv(m.recordedBy ? `${m.recordedBy.firstName || ""} ${m.recordedBy.lastName || ""}`.trim() : "System"),
        ].join(",") + "\n";
      }

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="premier-farm-milk-${today}.csv"`,
        },
      });
    }

    // 3. FINANCES (SALES & EXPENSES)
    if (type === "finances" || type === "sales" || type === "expenses") {
      const [sales, expenses] = await Promise.all([
        prisma.sale.findMany({ where: { isDeleted: false }, orderBy: { date: "desc" } }),
        prisma.expense.findMany({
          where: { isDeleted: false },
          include: { recordedBy: { select: { firstName: true, lastName: true } } },
          orderBy: { date: "desc" },
        }),
      ]);

      let csv = "Date,Type,Category,Amount (KES),Buyer / Details,Notes,Recorded By\n";

      const allRecords: Array<{
        date: Date;
        type: string;
        category: string;
        amount: number;
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
            buyer: s.buyerName || "",
            notes: s.notes || "",
            recordedBy: "Sales Dept",
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
            buyer: e.description || "",
            notes: "",
            recordedBy: e.recordedBy ? `${e.recordedBy.firstName || ""} ${e.recordedBy.lastName || ""}`.trim() : "System",
          });
        }
      }

      allRecords.sort((a, b) => b.date.getTime() - a.date.getTime());

      for (const r of allRecords) {
        csv += [
          escapeCsv(r.date.toISOString().split("T")[0]),
          escapeCsv(r.type),
          escapeCsv(r.category),
          escapeCsv(r.amount),
          escapeCsv(r.buyer),
          escapeCsv(r.notes),
          escapeCsv(r.recordedBy),
        ].join(",") + "\n";
      }

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="premier-farm-${type}-${today}.csv"`,
        },
      });
    }

    // 4. INVENTORY EXPORT
    if (type === "inventory") {
      const items = await prisma.inventoryItem.findMany({
        where: { isDeleted: false },
        orderBy: { name: "asc" },
      });

      let csv = "Item Name,Category,Quantity In Stock,Unit,Min Threshold,Status\n";
      for (const i of items) {
        const isLow = i.minThreshold !== null && i.quantity <= i.minThreshold;
        csv += [
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
          "Content-Disposition": `attachment; filename="premier-farm-inventory-${today}.csv"`,
        },
      });
    }

    // 5. DEFAULT / ALL CONSOLIDATED BACKUP
    const [animals, milkLogs, sales, expenses, inventory] = await Promise.all([
      prisma.animal.findMany({ where: { isDeleted: false }, orderBy: { tagNumber: "asc" } }),
      prisma.milkLog.findMany({
        where: { isDeleted: false },
        include: { animal: { select: { tagNumber: true } } },
        orderBy: { date: "desc" },
        take: 500,
      }),
      prisma.sale.findMany({ where: { isDeleted: false }, orderBy: { date: "desc" } }),
      prisma.expense.findMany({ where: { isDeleted: false }, orderBy: { date: "desc" } }),
      prisma.inventoryItem.findMany({ where: { isDeleted: false }, orderBy: { name: "asc" } }),
    ]);

    let csv = "=== HERD DIRECTORY ===\n";
    csv += "Tag Number,Name,Species,Gender,Status,DOB\n";
    for (const a of animals) {
      csv += `${escapeCsv(a.tagNumber)},${escapeCsv(a.name)},${escapeCsv(a.species)},${escapeCsv(a.gender)},${escapeCsv(a.status)},${escapeCsv(a.dateOfBirth ? a.dateOfBirth.toISOString().split("T")[0] : "")}\n`;
    }

    csv += "\n=== MILK LOGS ===\n";
    csv += "Date,Session,Yield (L),Cow Tag\n";
    for (const m of milkLogs) {
      csv += `${escapeCsv(m.date.toISOString().split("T")[0])},${escapeCsv(m.milkingTime)},${escapeCsv(m.amountLiters)},${escapeCsv(m.animal?.tagNumber)}\n`;
    }

    csv += "\n=== SALES ===\n";
    csv += "Date,Type,Amount (KES),Buyer,Notes\n";
    for (const s of sales) {
      csv += `${escapeCsv(s.date.toISOString().split("T")[0])},${escapeCsv(s.saleType)},${escapeCsv(s.amount)},${escapeCsv(s.buyerName)},${escapeCsv(s.notes)}\n`;
    }

    csv += "\n=== EXPENSES ===\n";
    csv += "Date,Category,Amount (KES),Description\n";
    for (const e of expenses) {
      csv += `${escapeCsv(e.date.toISOString().split("T")[0])},${escapeCsv(e.category)},${escapeCsv(e.amount)},${escapeCsv(e.description)}\n`;
    }

    csv += "\n=== INVENTORY ===\n";
    csv += "Item Name,Category,Quantity,Unit\n";
    for (const item of inventory) {
      csv += `${escapeCsv(item.name)},${escapeCsv(item.category)},${escapeCsv(item.quantity)},${escapeCsv(item.unit)}\n`;
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="premier-farm-full-backup-${today}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
