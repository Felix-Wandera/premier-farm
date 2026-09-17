"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "./utils";
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
  await requireAuth();
  return prisma.animal.findMany({
    where: {
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
  await requireAuth();
  return prisma.animal.findMany({
    where: {
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
    await requireRole(["ADMIN", "MANAGER"]);

    const val = breedingEventSchema.safeParse(data);
    if (!val.success) {
      return { success: false, message: val.error.issues[0]?.message || "Invalid breeding data." };
    }

    const { animalId, eventType, date, sireDetails, expectedDate, notes } = val.data;

    const animal = await prisma.animal.findUnique({
      where: { id: animalId },
      select: { species: true, tagNumber: true },
    });

    if (!animal) {
      return { success: false, message: "Selected animal not found." };
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
    await requireRole(["ADMIN", "MANAGER"]);

    const event = await prisma.breedingEvent.findUnique({
      where: { id: eventId },
      include: { animal: { select: { id: true, tagNumber: true } } },
    });

    if (!event) {
      return { success: false, message: "Event not found." };
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
    const session = await requireRole(["ADMIN", "MANAGER"]);

    const val = healthRecordSchema.safeParse(data);
    if (!val.success) {
      return { success: false, message: val.error.issues[0]?.message || "Invalid health data." };
    }

    const { animalId, recordType, description, cost, date } = val.data;

    const animal = await prisma.animal.findUnique({
      where: { id: animalId },
      select: { tagNumber: true },
    });

    if (!animal) {
      return { success: false, message: "Selected animal not found." };
    }

    const recordDate = new Date(date);

    // Create the health record
    await prisma.healthRecord.create({
      data: {
        animalId,
        recordType,
        description: description.trim(),
        cost: cost && cost > 0 ? cost : null,
        date: recordDate,
      },
    });

    // If cost > 0, log an expense under VET_SERVICES
    if (cost && cost > 0) {
      await prisma.expense.create({
        data: {
          category: "VET_SERVICES",
          amount: cost,
          date: recordDate,
          description: `${recordType}: ${description.trim()} (${animal.tagNumber})`,
          recordedById: session.id as string,
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
  await requireAuth();

  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  // Only events that haven't been completed yet (actualDate is null)
  const breedingEvents = await prisma.breedingEvent.findMany({
    where: {
      isDeleted: false,
      actualDate: null,
      expectedDate: {
        gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // include today/overdue
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
