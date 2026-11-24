"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "./utils";
import { revalidatePath } from "next/cache";
import { sendPushNotification } from "./push.actions";
import { ActionResponse, getEndOfToday, parseLocalDate } from "@/lib/validations";

export async function getMilkingCows() {
  const { tenantId } = await requirePermission("milk:view");

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const cows = await prisma.animal.findMany({
    where: {
      tenantId,
      isDeleted: false,
      status: { in: ["ACTIVE", "SICK"] },
      gender: "FEMALE",
      species: { in: ["DAIRY_COW", "INDIGENOUS_COW"] },
    },
    select: {
      id: true,
      tagNumber: true,
      name: true,
      species: true,
      status: true,
      dateOfBirth: true,
      healthRecords: {
        where: {
          isDeleted: false,
          recordType: "TREATMENT",
          date: { gte: sevenDaysAgo },
        },
        select: { id: true, date: true, description: true },
        take: 1,
        orderBy: { date: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return cows.map((c) => ({
    id: c.id,
    tagNumber: c.tagNumber,
    name: c.name,
    species: c.species,
    status: c.status,
    hasRecentTreatment: c.healthRecords.length > 0,
    recentTreatmentNote: c.healthRecords[0]?.description || null,
  }));
}

const batchSchema = z.object({
  session: z.enum(["MORNING", "MIDDAY", "EVENING", "OTHER"]),
  date: z.string().optional(),
  overrideWarnings: z.boolean().optional(),
  records: z.array(
    z.object({
      animalId: z.string().min(1),
      amount: z.number().min(0).max(60, "Single-session yield cannot exceed 60 Liters."),
    })
  ),
});

export async function logBatchMilkSession(data: any): Promise<ActionResponse> {
  try {
    const { userId, tenantId, isAdmin } = await requirePermission("milk:log");

    const validatedFields = batchSchema.safeParse(data);
    if (!validatedFields.success) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: validatedFields.error.issues[0]?.message || "Invalid submission data.",
      };
    }

    const { session, date: customDate, records, overrideWarnings } = validatedFields.data;
    const validRecords = records.filter((r) => r.amount > 0);

    if (validRecords.length === 0) {
      return { success: false, code: "VALIDATION_ERROR", message: "No milk yields greater than 0 L to record." };
    }

    const parsedTarget = customDate ? parseLocalDate(customDate) : new Date();
    if (!parsedTarget) {
      return { success: false, code: "VALIDATION_ERROR", message: "Invalid milking date." };
    }
    if (parsedTarget > getEndOfToday()) {
      return { success: false, code: "VALIDATION_ERROR", message: "Milking date cannot be in the future." };
    }

    const startOfDay = new Date(parsedTarget);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(parsedTarget);
    endOfDay.setHours(23, 59, 59, 999);

    const sevenDaysBeforeSession = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Verify all submitted animals exist in this tenant and are eligible
    const submittedIds = Array.from(new Set(validRecords.map((r) => r.animalId)));
    const dbCows = await prisma.animal.findMany({
      where: {
        tenantId,
        id: { in: submittedIds },
        isDeleted: false,
      },
      include: {
        healthRecords: {
          where: {
            isDeleted: false,
            recordType: "TREATMENT",
            date: { gte: sevenDaysBeforeSession, lte: endOfDay },
          },
          take: 1,
        },
      },
    });

    if (dbCows.length !== submittedIds.length) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: "One or more selected cows were not found in your active herd.",
      };
    }

    const cowById = new Map(dbCows.map((c) => [c.id, c]));
    const warnings: string[] = [];

    for (const rec of validRecords) {
      const cow = cowById.get(rec.animalId)!;
      if (cow.gender !== "FEMALE") {
        return {
          success: false,
          code: "VALIDATION_ERROR",
          message: `"${cow.name}" is Male and cannot have milk logs.`,
        };
      }
      if (cow.status === "SOLD" || cow.status === "DECEASED") {
        return {
          success: false,
          code: "VALIDATION_ERROR",
          message: `"${cow.name}" is marked ${cow.status.toLowerCase()} and cannot have new milk logs.`,
        };
      }
      if (cow.dateOfBirth && startOfDay < cow.dateOfBirth) {
        return {
          success: false,
          code: "VALIDATION_ERROR",
          message: `Milking date cannot precede "${cow.name}"'s birth date.`,
        };
      }

      const maxNormalYield = cow.species === "INDIGENOUS_COW" ? 12 : 25;
      if (rec.amount > maxNormalYield) {
        warnings.push(
          `${cow.name}${cow.tagNumber ? ` (#${cow.tagNumber})` : ""}: ${rec.amount} L in a single session exceeds typical ${cow.species === "INDIGENOUS_COW" ? "Indigenous" : "Dairy"} threshold (${maxNormalYield} L).`
        );
      }

      if (cow.status === "SICK" || cow.healthRecords.length > 0) {
        warnings.push(
          `${cow.name}${cow.tagNumber ? ` (#${cow.tagNumber})` : ""} is marked Sick or received veterinary treatment within 7 days — verify antibiotic milk withdrawal!`
        );
      }
    }

    // Prevent duplicate entries for the same cow in this session on this day
    const existingLogs = await prisma.milkLog.findMany({
      where: {
        tenantId,
        animalId: { in: submittedIds },
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
      const duplicateNames = existingLogs.map((l) => l.animal.name || l.animal.tagNumber).join(", ");
      const dateFormatted = startOfDay.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const sessionLabel =
        session === "MORNING" ? "Morning" : session === "MIDDAY" ? "Mid-day" : session === "EVENING" ? "Evening" : "Other";
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: `Milk already logged for ${sessionLabel} on ${dateFormatted} for: ${duplicateNames}. Edit the existing session in History instead.`,
      };
    }

    if (warnings.length > 0 && !(overrideWarnings && isAdmin)) {
      return {
        success: false,
        code: "OUTLIER_WARNING",
        message: warnings[0],
        warnings,
        canOverride: isAdmin,
      };
    }

    const logDateTime = new Date(startOfDay);
    if (session === "MORNING") logDateTime.setHours(7, 0, 0, 0);
    else if (session === "MIDDAY") logDateTime.setHours(13, 0, 0, 0);
    else if (session === "EVENING") logDateTime.setHours(18, 0, 0, 0);
    else logDateTime.setHours(12, 0, 0, 0);

    const insertData = validRecords.map((r) => ({
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

    const totalLitres = Number(validRecords.reduce((acc, curr) => acc + curr.amount, 0).toFixed(1));

    if (totalLitres < 5) {
      const admins = await prisma.tenantUser.findMany({
        where: { tenantId, role: { in: ["ADMIN", "MANAGER"] } },
        select: { userId: true },
      });
      for (const admin of admins) {
        await sendPushNotification(admin.userId, {
          title: "Production Drop Alert 🥛",
          body: `Low yield detected in ${session} session: only ${totalLitres}L across ${validRecords.length} cows.`,
          url: "/milk",
        });
      }
    }

    revalidatePath("/milk");
    revalidatePath("/herd");
    revalidatePath("/analytics");
    revalidatePath("/");

    const sessionLabel =
      session === "MORNING" ? "Morning" : session === "MIDDAY" ? "Mid-day" : session === "EVENING" ? "Evening" : "Other";
    return {
      success: true,
      message: `${sessionLabel} session saved! Recorded ${validRecords.length} cows for a total of ${totalLitres} L.`,
    };
  } catch (error: any) {
    console.error("Batch milk error:", error);
    return { success: false, message: error?.message || "Internal server error while logging milk." };
  }
}

export async function deleteMilkLogSession(date: Date, session: string) {
  try {
    const { tenantId } = await requirePermission("milk:manage_history");
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
    revalidatePath("/analytics");
    revalidatePath("/");
    return { success: true, message: "Session deleted successfully." };
  } catch (error: any) {
    console.error("Failed to delete milk log session:", error);
    return { success: false, message: error?.message || "Failed to delete session." };
  }
}

export async function getMilkHistory() {
  const { tenantId } = await requirePermission("milk:view");

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
      date: "desc",
    },
    take: 45,
  });

  return rawHistory.map((row) => ({
    date: row.date,
    session:
      row.milkingTime === "MORNING"
        ? "Morning"
        : row.milkingTime === "MIDDAY"
          ? "Mid-day"
          : row.milkingTime === "EVENING"
            ? "Evening"
            : "Other",
    total: Number((row._sum.amountLiters || 0).toFixed(1)),
  }));
}

export async function getSessionMilkLogs(dateStr: string, sessionName: string) {
  try {
    const { tenantId } = await requirePermission("milk:view");

    const startOfDay = new Date(dateStr);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateStr);
    endOfDay.setHours(23, 59, 59, 999);

    const dbMilkingTime = sessionName.toUpperCase().replace("-", "") as
      | "MORNING"
      | "MIDDAY"
      | "EVENING"
      | "OTHER";

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
        recordedBy: log.recordedBy
          ? `${log.recordedBy.firstName || ""} ${log.recordedBy.lastName || ""}`.trim()
          : "System",
      })),
    };
  } catch (error: any) {
    console.error("Failed to fetch session milk logs:", error);
    return { success: false, message: error.message || "Failed to load session details.", data: [] };
  }
}

export async function updateSingleMilkLog(
  logId: string,
  amountLiters: number,
  overrideWarnings = false
): Promise<ActionResponse> {
  try {
    const { tenantId, isAdmin } = await requirePermission("milk:manage_history");

    if (typeof amountLiters !== "number" || isNaN(amountLiters) || amountLiters <= 0 || amountLiters > 60) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: "Please provide a valid milk yield between 0.1 and 60 Liters.",
      };
    }

    const log = await prisma.milkLog.findFirst({
      where: { id: logId, tenantId, isDeleted: false },
      include: { animal: { select: { id: true, tagNumber: true, name: true, species: true } } },
    });

    if (!log) {
      return { success: false, message: "Milk log entry not found." };
    }

    const maxNormal = log.animal.species === "INDIGENOUS_COW" ? 12 : 25;
    if (amountLiters > maxNormal && !(overrideWarnings && isAdmin)) {
      return {
        success: false,
        code: "OUTLIER_WARNING",
        message: `${amountLiters} L exceeds typical single-session threshold (${maxNormal} L) for ${log.animal.name}.`,
        warnings: [
          `${log.animal.name}: ${amountLiters} L in a single milking session exceeds the normal threshold of ${maxNormal} L.`,
        ],
        canOverride: isAdmin,
      };
    }

    await prisma.milkLog.update({
      where: { id: logId },
      data: { amountLiters },
    });

    revalidatePath("/milk");
    revalidatePath(`/herd/${log.animal.id}`);
    revalidatePath("/analytics");
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
    const { tenantId } = await requirePermission("milk:manage_history");

    const log = await prisma.milkLog.findFirst({
      where: { id: logId, tenantId, isDeleted: false },
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
    revalidatePath("/analytics");
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
