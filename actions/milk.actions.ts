"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "./utils";
import { revalidatePath } from "next/cache";
import { sendPushNotification } from "./push.actions";

export async function getMilkingCows() {
  const { tenantId } = await requireTenantContext();

  const cows = await prisma.animal.findMany({
    where: {
      tenantId,
      isDeleted: false,
      status: "ACTIVE",
      gender: "FEMALE",
      species: { in: ["DAIRY_COW", "INDIGENOUS_COW"] }
    },
    select: {
      id: true,
      tagNumber: true,
      name: true,
      species: true,
    },
    orderBy: { tagNumber: "asc" }
  });

  return cows;
}

const batchSchema = z.object({
  session: z.enum(["MORNING", "MIDDAY", "EVENING", "OTHER"]),
  date: z.string().optional(),
  records: z.array(z.object({
    animalId: z.string().min(1),
    amount: z.number().min(0).max(100),
  }))
});

export async function logBatchMilkSession(data: any) {
  try {
    const { userId, tenantId } = await requireTenantContext();
    
    const validatedFields = batchSchema.safeParse(data);
    
    if (!validatedFields.success) {
      return { success: false, message: "Invalid submission data." };
    }

    const { session, date: customDate, records } = validatedFields.data;

    // Filter out 0 amounts
    const validRecords = records.filter(r => r.amount > 0);

    if (validRecords.length === 0) {
      return { success: false, message: "No milk yields > 0 to record." };
    }

    // Determine target date and range
    const targetDate = customDate ? new Date(customDate) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Prevent duplicate entries for the same cow in this session on this day
    const existingLogs = await prisma.milkLog.findMany({
      where: {
        tenantId,
        animalId: { in: validRecords.map(r => r.animalId) },
        milkingTime: session,
        date: { gte: startOfDay, lte: endOfDay },
        isDeleted: false,
      },
      include: {
        animal: {
          select: { name: true, tagNumber: true },
        },
      },
    });

    if (existingLogs.length > 0) {
      const duplicateNames = existingLogs.map(l => l.animal.name || l.animal.tagNumber).join(", ");
      const dateFormatted = startOfDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const sessionLabel = session === "MORNING" ? "Morning" : session === "MIDDAY" ? "Mid-day" : session === "EVENING" ? "Evening" : "Other";
      return {
        success: false,
        message: `Milk already logged for ${sessionLabel} on ${dateFormatted} for: ${duplicateNames}. To make changes, please edit or delete the existing record.`,
      };
    }

    // Set realistic timestamp if custom date specified
    const logDateTime = new Date(targetDate);
    if (!customDate) {
      // current timestamp
    } else {
      if (session === "MORNING") logDateTime.setHours(7, 0, 0, 0);
      else if (session === "MIDDAY") logDateTime.setHours(13, 0, 0, 0);
      else if (session === "EVENING") logDateTime.setHours(18, 0, 0, 0);
      else logDateTime.setHours(12, 0, 0, 0);
    }

    const insertData = validRecords.map(r => ({
      tenantId,
      animalId: r.animalId,
      amountLiters: r.amount,
      milkingTime: session,
      date: logDateTime,
      recordDate: startOfDay,
      recordedById: userId,
    }));

    await prisma.milkLog.createMany({
      data: insertData,
    });

    const totalLitres = validRecords.reduce((acc, curr) => acc + curr.amount, 0);

    // Trigger Smart Alert for low production to farm managers/admins
    if (totalLitres < 5) {
      const admins = await prisma.tenantUser.findMany({
        where: { tenantId, role: { in: ["ADMIN", "MANAGER"] } },
        select: { userId: true },
      });
      for (const admin of admins) {
        await sendPushNotification(admin.userId, {
          title: "Production Drop Alert 🥛",
          body: `Low yield detected in ${session} session: only ${totalLitres}L across ${validRecords.length} cows.`,
          url: "/milk"
        });
      }
    }

    revalidatePath("/milk");
    revalidatePath("/herd");

    const sessionLabel = session === "MORNING" ? "Morning" : session === "MIDDAY" ? "Mid-day" : session === "EVENING" ? "Evening" : "Other";
    return { 
      success: true, 
      message: `${sessionLabel} session saved! Recorded ${validRecords.length} cows for a total of ${totalLitres} L.`,
    };

  } catch (error) {
    console.error("Batch milk error:", error);
    return { success: false, message: "Internal server error while logging milk." };
  }
}

export async function deleteMilkLogSession(date: Date, session: string) {
  try {
    const { tenantId } = await requireTenantContext();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const normalizedSession = session.toUpperCase().replace("-", "") as any;

    await prisma.milkLog.updateMany({
      where: {
        tenantId,
        date: { gte: startOfDay, lte: endOfDay },
        milkingTime: normalizedSession,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    revalidatePath("/milk");
    return { success: true, message: "Session deleted successfully." };
  } catch (error) {
    console.error("Failed to delete milk log session:", error);
    return { success: false, message: "Failed to delete session." };
  }
}

export async function getMilkHistory() {
  const { tenantId } = await requireTenantContext();

  const rawHistory = await prisma.milkLog.groupBy({
    by: ["date", "milkingTime"],
    where: {
      tenantId,
      isDeleted: false,
    },
    _sum: {
      amountLiters: true,
    },
    orderBy: {
      date: 'desc'
    },
    take: 30
  });

  return rawHistory.map(row => ({
    date: row.date,
    session: row.milkingTime === "MORNING" ? "Morning" : row.milkingTime === "MIDDAY" ? "Mid-day" : row.milkingTime === "EVENING" ? "Evening" : "Other",
    total: row._sum.amountLiters || 0
  }));
}

export async function getSessionMilkLogs(dateStr: string, sessionName: string) {
  try {
    const { tenantId } = await requireTenantContext();

    const startOfDay = new Date(dateStr);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateStr);
    endOfDay.setHours(23, 59, 59, 999);

    const dbMilkingTime = sessionName.toUpperCase().replace("-", "") as "MORNING" | "MIDDAY" | "EVENING" | "OTHER";

    const logs = await prisma.milkLog.findMany({
      where: {
        tenantId,
        date: { gte: startOfDay, lte: endOfDay },
        milkingTime: dbMilkingTime,
        isDeleted: false,
      },
      include: {
        animal: {
          select: {
            id: true,
            tagNumber: true,
            name: true,
            species: true,
          },
        },
        recordedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        animal: { name: "asc" },
      },
    });

    return {
      success: true,
      data: logs.map((log) => ({
        id: log.id,
        amountLiters: log.amountLiters,
        animalId: log.animalId,
        tagNumber: log.animal.tagNumber,
        name: log.animal.name,
        species: log.animal.species,
        recordedBy: log.recordedBy ? `${log.recordedBy.firstName || ""} ${log.recordedBy.lastName || ""}`.trim() : "System",
      })),
    };
  } catch (error: any) {
    console.error("Failed to fetch session milk logs:", error);
    return { success: false, message: error.message || "Failed to load session details.", data: [] };
  }
}

export async function updateSingleMilkLog(logId: string, amountLiters: number) {
  try {
    const { tenantId } = await requireTenantContext();

    if (typeof amountLiters !== "number" || amountLiters <= 0 || amountLiters > 100) {
      return { success: false, message: "Please provide a valid milk yield between 0.1 and 100 Liters." };
    }

    const log = await prisma.milkLog.findFirst({
      where: { id: logId, tenantId },
      include: { animal: { select: { id: true, tagNumber: true, name: true } } },
    });

    if (!log) {
      return { success: false, message: "Milk log entry not found." };
    }

    await prisma.milkLog.update({
      where: { id: logId },
      data: { amountLiters },
    });

    revalidatePath("/milk");
    revalidatePath(`/herd/${log.animal.id}`);
    revalidatePath("/");

    return {
      success: true,
      message: `Updated ${log.animal.name || log.animal.tagNumber || "animal"}'s yield to ${amountLiters} L.`,
    };
  } catch (error: any) {
    console.error("Failed to update milk log:", error);
    return { success: false, message: error.message || "Failed to update milk log." };
  }
}

export async function deleteSingleMilkLog(logId: string) {
  try {
    const { tenantId } = await requireTenantContext();

    const log = await prisma.milkLog.findFirst({
      where: { id: logId, tenantId },
      include: { animal: { select: { id: true, tagNumber: true, name: true } } },
    });

    if (!log) {
      return { success: false, message: "Milk log entry not found." };
    }

    await prisma.milkLog.update({
      where: { id: logId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    revalidatePath("/milk");
    revalidatePath(`/herd/${log.animal.id}`);
    revalidatePath("/");

    return {
      success: true,
      message: `Deleted record for ${log.animal.name || log.animal.tagNumber || "animal"}.`,
    };
  } catch (error: any) {
    console.error("Failed to delete milk log:", error);
    return { success: false, message: error.message || "Failed to delete milk log." };
  }
}
