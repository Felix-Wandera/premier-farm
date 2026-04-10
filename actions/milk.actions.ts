"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "./utils";
import { revalidatePath } from "next/cache";
import { sendPushNotification } from "./push.actions";

export async function getMilkingCows() {
  await requireAuth();

  const cows = await prisma.animal.findMany({
    where: {
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
    const sessionUser = await requireAuth();
    
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

    // Use a single exact timestamp so groupBy works perfectly later
    const exactNow = new Date();

    const insertData = validRecords.map(r => ({
      animalId: r.animalId,
      amountLiters: r.amount,
      milkingTime: session,
      date: exactNow,
      recordedById: sessionUser.id as string,
    }));

    await prisma.milkLog.createMany({
      data: insertData,
    });

    const totalLitres = validRecords.reduce((acc, curr) => acc + curr.amount, 0);

    // Trigger Smart Alert for low production
    if (totalLitres < 5) {
      const admins = await prisma.user.findMany({ where: { role: "ADMIN", isDeleted: false }, select: { id: true } });
      for (const admin of admins) {
        await sendPushNotification(admin.id, {
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

export async function getMilkHistory() {
  await requireAuth();

  // Group by exact date and session
  const rawHistory = await prisma.milkLog.groupBy({
    by: ["date", "milkingTime"],
    _sum: {
      amountLiters: true,
    },
    orderBy: {
      date: 'desc'
    },
    take: 30
  });

  // Map to friendly format
  return rawHistory.map(row => ({
    date: row.date,
    session: row.milkingTime === "MORNING" ? "Morning" : row.milkingTime === "EVENING" ? "Evening" : "Other",
    total: row._sum.amountLiters || 0
  }));
}
