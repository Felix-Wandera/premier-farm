"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantContext, requireTenantRole } from "./utils";
import { revalidatePath } from "next/cache";

// Gestation periods in days
const GESTATION_DAYS: Record<string, number> = {
  DAIRY_COW: 283,
  INDIGENOUS_COW: 283,
  HEIFER: 283,
  GOAT: 150,
  SHEEP: 150,
};

export async function getBreedingAnimals() {
  const { tenantId } = await requireTenantContext();
  return prisma.animal.findMany({
    where: {
      tenantId,
      isDeleted: false,
      status: "ACTIVE",
      gender: "FEMALE",
    },
    select: {
      id: true,
      tagNumber: true,
      name: true,
      species: true,
      breed: true,
    },
    orderBy: { tagNumber: "asc" },
  });
}

export async function getHealthAnimals() {
  const { tenantId } = await requireTenantContext();
  return prisma.animal.findMany({
    where: {
      tenantId,
      isDeleted: false,
      status: { notIn: ["DECEASED", "SOLD"] },
    },
    select: {
      id: true,
      tagNumber: true,
      name: true,
      species: true,
      breed: true,
      gender: true,
    },
    orderBy: { tagNumber: "asc" },
  });
}

const breedingEventSchema = z.object({
  animalId: z.string().min(1, "Animal is required"),
  eventType: z.enum(["INSEMINATION", "NATURAL_MATING", "PREGNANCY_CHECK", "BIRTH"]),
  date: z.string().min(1, "Event date is required"),
  sireDetails: z.string().optional(),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function createBreedingEvent(data: any) {
  try {
    const { tenantId } = await requireTenantRole(["ADMIN", "MANAGER"]);

    const val = breedingEventSchema.safeParse(data);
    if (!val.success) {
      return { success: false, message: val.error.issues[0]?.message || "Invalid breeding data." };
    }

    const { animalId, eventType, date, sireDetails, expectedDate, notes } = val.data;

    const animal = await prisma.animal.findFirst({
      where: { id: animalId, tenantId },
      select: { species: true, tagNumber: true },
    });

    if (!animal) {
      return { success: false, message: "Selected animal not found in your farm." };
    }

    const eventDate = new Date(date);
    let computedExpectedDate: Date | null = expectedDate ? new Date(expectedDate) : null;

    // Auto-calculate expected calving/due date if not explicitly supplied
    if (!computedExpectedDate && (eventType === "INSEMINATION" || eventType === "NATURAL_MATING")) {
      const days = GESTATION_DAYS[animal.species] || 283;
      computedExpectedDate = new Date(eventDate.getTime() + days * 24 * 60 * 60 * 1000);
    } else if (!computedExpectedDate && eventType === "PREGNANCY_CHECK") {
      computedExpectedDate = new Date(eventDate.getTime() + 60 * 24 * 60 * 60 * 1000);
    }

    await prisma.breedingEvent.create({
      data: {
        tenantId,
        animalId,
        eventType,
        date: eventDate,
        sireDetails: sireDetails?.trim() || null,
        expectedDate: computedExpectedDate,
        actualDate: eventType === "BIRTH" ? eventDate : null,
        notes: notes?.trim() || null,
      },
    });

    revalidatePath("/breeding");
    revalidatePath(`/herd/${animalId}`);
    revalidatePath("/");

    return {
      success: true,
      message: `Successfully recorded ${eventType.replace("_", " ")} for ${animal.tagNumber}!`,
    };
  } catch (error: any) {
    console.error("Failed to create breeding event:", error);
    return { success: false, message: error.message || "Failed to create breeding event." };
  }
}

export async function completeBreedingEvent(eventId: string, actualDate?: string, notes?: string) {
  try {
    const { tenantId } = await requireTenantRole(["ADMIN", "MANAGER"]);

    const event = await prisma.breedingEvent.findFirst({
      where: { id: eventId, tenantId },
      include: { animal: { select: { id: true, tagNumber: true } } },
    });

    if (!event) {
      return { success: false, message: "Event not found in your farm records." };
    }

    const completionDate = actualDate ? new Date(actualDate) : new Date();

    await prisma.breedingEvent.update({
      where: { id: eventId },
      data: {
        actualDate: completionDate,
        notes: notes ? (event.notes ? `${event.notes} | ${notes}` : notes) : event.notes,
      },
    });

    revalidatePath("/breeding");
    revalidatePath(`/herd/${event.animal.id}`);
    revalidatePath("/");

    return {
      success: true,
      message: `Marked event complete for ${event.animal.tagNumber}!`,
    };
  } catch (error: any) {
    console.error("Failed to complete breeding event:", error);
    return { success: false, message: error.message || "Failed to complete event." };
  }
}

const healthRecordSchema = z.object({
  animalId: z.string().min(1, "Animal is required"),
  recordType: z.enum(["VACCINATION", "TREATMENT", "CHECKUP"]),
  description: z.string().min(2, "Description is required"),
  cost: z.number().min(0).optional(),
  date: z.string().min(1, "Date is required"),
});

export async function createHealthRecord(data: any) {
  try {
    const { userId, tenantId } = await requireTenantRole(["ADMIN", "MANAGER"]);

    const val = healthRecordSchema.safeParse(data);
    if (!val.success) {
      return { success: false, message: val.error.issues[0]?.message || "Invalid health data." };
    }

    const { animalId, recordType, description, cost, date } = val.data;

    const animal = await prisma.animal.findFirst({
      where: { id: animalId, tenantId },
      select: { tagNumber: true },
    });

    if (!animal) {
      return { success: false, message: "Selected animal not found in your farm." };
    }

    const recordDate = new Date(date);

    // Create the health record
    await prisma.healthRecord.create({
      data: {
        tenantId,
        animalId,
        recordType,
        description: description.trim(),
        cost: cost && cost > 0 ? cost : null,
        date: recordDate,
      },
    });

    // If cost > 0, log an expense under VET_SERVICES scoped to this tenant
    if (cost && cost > 0) {
      await prisma.expense.create({
        data: {
          tenantId,
          category: "VET_SERVICES",
          amount: cost,
          date: recordDate,
          description: `${recordType}: ${description.trim()} (${animal.tagNumber})`,
          recordedById: userId,
        },
      });
      revalidatePath("/sales");
    }

    revalidatePath("/breeding");
    revalidatePath(`/herd/${animalId}`);
    revalidatePath("/");

    return {
      success: true,
      message: `Successfully recorded ${recordType.toLowerCase()} for ${animal.tagNumber}!`,
    };
  } catch (error: any) {
    console.error("Failed to create health record:", error);
    return { success: false, message: error.message || "Failed to record health event." };
  }
}

export async function getUpcomingEvents() {
  const { tenantId } = await requireTenantContext();

  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  // Only events for the active tenant that haven't been completed yet
  const breedingEvents = await prisma.breedingEvent.findMany({
    where: {
      tenantId,
      isDeleted: false,
      actualDate: null,
      expectedDate: {
        gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        lte: thirtyDaysFromNow,
      },
    },
    include: {
      animal: { select: { tagNumber: true, name: true, species: true } },
    },
    orderBy: { expectedDate: "asc" },
  });

  const formattedEvents = breedingEvents.map((e) => {
    const isNext7Days = (e.expectedDate!.getTime() - now.getTime()) <= 7 * 24 * 60 * 60 * 1000;
    const isOverdue = e.expectedDate!.getTime() < now.getTime();

    return {
      id: e.id,
      date: e.expectedDate!.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      tagNumber: e.animal.tagNumber,
      animalName: e.animal.name,
      species: e.animal.species,
      title: e.eventType.replace("_", " "),
      description: e.sireDetails ? `Sire: ${e.sireDetails}` : `Status: Pending`,
      type: isOverdue || isNext7Days ? "warning" : "info",
      timeframe: isOverdue ? "Overdue" : isNext7Days ? "Next 7 Days" : "Next 30 Days",
    };
  });

  return formattedEvents;
}
