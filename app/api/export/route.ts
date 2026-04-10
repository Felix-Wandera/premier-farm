import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [animals, milkLogs, sales, expenses] = await Promise.all([
      prisma.animal.findMany({ where: { isDeleted: false }, orderBy: { tagNumber: "asc" } }),
      prisma.milkLog.findMany({ where: { isDeleted: false }, orderBy: { date: "desc" }, take: 500 }),
      prisma.sale.findMany({ where: { isDeleted: false }, orderBy: { date: "desc" } }),
      prisma.expense.findMany({ where: { isDeleted: false }, orderBy: { date: "desc" } }),
    ]);

    let csv = "";

    // Animals Sheet
    csv += "=== ANIMALS ===\n";
    csv += "Tag Number,Name,Species,Gender,Status,Date of Birth\n";
    for (const a of animals) {
      csv += `${a.tagNumber},${a.name || ""},${a.species},${a.gender},${a.status},${a.dateOfBirth ? a.dateOfBirth.toISOString().split("T")[0] : ""}\n`;
    }

    csv += "\n=== MILK LOGS ===\n";
    csv += "Date,Session,Amount (L),Animal ID\n";
    for (const m of milkLogs) {
      csv += `${m.date.toISOString().split("T")[0]},${m.milkingTime},${m.amountLiters},${m.animalId}\n`;
    }

    csv += "\n=== SALES ===\n";
    csv += "Date,Type,Amount,Buyer,Notes\n";
    for (const s of sales) {
      csv += `${s.date.toISOString().split("T")[0]},${s.saleType},${s.amount},${s.buyerName || ""},${(s.notes || "").replace(/,/g, ";")}\n`;
    }

    csv += "\n=== EXPENSES ===\n";
    csv += "Date,Category,Amount,Description\n";
    for (const e of expenses) {
      csv += `${e.date.toISOString().split("T")[0]},${e.category},${e.amount},${(e.description || "").replace(/,/g, ";")}\n`;
    }

    const today = new Date().toISOString().split("T")[0];

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="premier-farm-export-${today}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
