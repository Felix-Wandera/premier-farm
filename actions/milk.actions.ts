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
  session: z.enum(["MORNING", "EVENING", "OTHER"]),
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

    const { session, records } = validatedFields.data;

    // Filter out 0 amounts
    const validRecords = records.filter(r => r.amount > 0);

    if (validRecords.length === 0) {
      return { success: false, message: "No milk yields > 0 to record." };
    }

    const exactNow = new Date();

    const insertData = validRecords.map(r => ({
      tenantId,
      animalId: r.animalId,
      amountLiters: r.amount,
      milkingTime: session,
      date: exactNow,
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

    return { 
      success: true, 
      message: `${session} session saved! Recorded ${validRecords.length} cows for a total of ${totalLitres} L.`,
    };

  } catch (error) {
    console.error("Batch milk error:", error);
    return { success: false, message: "Internal server error while logging milk." };
  }
}

export async function deleteMilkLogSession(date: Date, session: string) {
  try {
    const { tenantId } = await requireTenantContext();

    await prisma.milkLog.updateMany({
      where: {
        tenantId,
        date: date,
        milkingTime: session as any,
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
    session: row.milkingTime === "MORNING" ? "Morning" : row.milkingTime === "EVENING" ? "Evening" : "Other",
    total: row._sum.amountLiters || 0
  }));
}

export async function getSessionMilkLogs(dateStr: string, sessionName: string) {
  try {
    const { tenantId } = await requireTenantContext();

    const targetDate = new Date(dateStr);
    const dbMilkingTime = sessionName.toUpperCase() as "MORNING" | "EVENING" | "OTHER";

    const logs = await prisma.milkLog.findMany({
      where: {
        tenantId,
        date: targetDate,
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
        animal: { tagNumber: "asc" },
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
      include: { animal: { select: { id: true, tagNumber: true } } },
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
      message: `Updated ${log.animal.tagNumber}'s yield to ${amountLiters} L.`,
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
      include: { animal: { select: { id: true, tagNumber: true } } },
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
      message: `Deleted record for ${log.animal.tagNumber}.`,
    };
  } catch (error: any) {
    console.error("Failed to delete milk log:", error);
    return { success: false, message: error.message || "Failed to delete milk log." };
  }
}
