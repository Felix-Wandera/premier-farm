"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "./utils";
import { revalidatePath } from "next/cache";
import {
  ActionResponse,
  getEndOfToday,
  getSpeciesFamily,
  parseLocalDate,
} from "@/lib/validations";

const GESTATION_DAYS: Record<string, number> = {
  DAIRY_COW: 283,
  INDIGENOUS_COW: 283,
  HEIFER: 283,
  GOAT: 150,
  SHEEP: 150,
};

export async function getBreedingAnimals() {
  const { tenantId } = await requirePermission("health:view");
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
      dateOfBirth: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getHealthAnimals() {
  const { tenantId } = await requirePermission("health:view");
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
    orderBy: { name: "asc" },
  });
}

const breedingEventSchema = z.object({
  animalId: z.string().min(1, "Animal is required"),
  eventType: z.enum(["INSEMINATION", "NATURAL_MATING", "PREGNANCY_CHECK", "BIRTH"]),
  date: z.string().min(1, "Event date is required"),
  sireDetails: z.string().optional(),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
  overrideWarnings: z.boolean().optional(),
});

export type CreateBreedingEventInput = z.input<typeof breedingEventSchema>;

export async function createBreedingEvent(
  data: CreateBreedingEventInput
): Promise<ActionResponse> {
  try {
    const { tenantId, isAdmin } = await requirePermission("health:manage");

    const val = breedingEventSchema.safeParse(data);
    if (!val.success) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: val.error.issues[0]?.message || "Invalid breeding data.",
      };
    }

    const { animalId, eventType, date, sireDetails, expectedDate, notes, overrideWarnings } =
      val.data;

    const animal = await prisma.animal.findFirst({
      where: { id: animalId, tenantId, isDeleted: false },
      select: {
        id: true,
        species: true,
        gender: true,
        status: true,
        tagNumber: true,
        name: true,
        dateOfBirth: true,
        breedingEvents: {
          where: { isDeleted: false },
          orderBy: { date: "desc" },
          take: 5,
        },
      },
    });

    if (!animal) {
      return { success: false, message: "Selected animal not found in your farm." };
    }

    if (animal.gender !== "FEMALE") {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: `"${animal.name}" is Male — breeding/gestation events can only be recorded on female animals.`,
      };
    }

    if (animal.status === "SOLD" || animal.status === "DECEASED") {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: `"${animal.name}" is marked ${animal.status.toLowerCase()} and cannot have new breeding events.`,
      };
    }

    const eventDate = parseLocalDate(date);
    if (!eventDate) {
      return { success: false, code: "VALIDATION_ERROR", message: "Invalid event date." };
    }

    if (
      (eventType === "INSEMINATION" ||
        eventType === "NATURAL_MATING" ||
        eventType === "BIRTH") &&
      eventDate > getEndOfToday()
    ) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: `${eventType.replace("_", " ")} date cannot be in the future.`,
      };
    }

    if (animal.dateOfBirth && eventDate < animal.dateOfBirth) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: `Event date cannot be earlier than "${animal.name}"'s birth date (${animal.dateOfBirth.toLocaleDateString()}).`,
      };
    }

    let computedExpectedDate: Date | null = expectedDate ? parseLocalDate(expectedDate) : null;
    if (computedExpectedDate && computedExpectedDate <= eventDate) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: "Expected due / follow-up date must be after the event date.",
      };
    }

    if (!computedExpectedDate && (eventType === "INSEMINATION" || eventType === "NATURAL_MATING")) {
      const days = GESTATION_DAYS[animal.species] || 283;
      computedExpectedDate = new Date(eventDate.getTime() + days * 24 * 60 * 60 * 1000);
    } else if (!computedExpectedDate && eventType === "PREGNANCY_CHECK") {
      computedExpectedDate = new Date(eventDate.getTime() + 60 * 24 * 60 * 60 * 1000);
    }

    // Biological outlier checks
    const warnings: string[] = [];

    if (animal.dateOfBirth && (eventType === "INSEMINATION" || eventType === "NATURAL_MATING")) {
      const ageMonths =
        (eventDate.getTime() - animal.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      const minBreedingMonths = getSpeciesFamily(animal.species) === "CATTLE" ? 10 : 5;
      if (ageMonths < minBreedingMonths) {
        warnings.push(
          `"${animal.name}" is only ${Math.max(0, Math.round(ageMonths))} months old on this service date (recommended minimum breeding age is ${minBreedingMonths} months).`
        );
      }
    }

    if (eventType === "INSEMINATION" || eventType === "NATURAL_MATING") {
      const activePendingService = animal.breedingEvents.find(
        (ev) =>
          (ev.eventType === "INSEMINATION" || ev.eventType === "NATURAL_MATING") &&
          ev.actualDate === null
      );
      if (activePendingService) {
        warnings.push(
          `"${animal.name}" already has an open ${activePendingService.eventType.replace("_", " ").toLowerCase()} recorded on ${activePendingService.date.toLocaleDateString()}.`
        );
      }

      const lastBirth = animal.breedingEvents.find((ev) => ev.eventType === "BIRTH");
      if (lastBirth) {
        const daysSinceBirth =
          (eventDate.getTime() - lastBirth.date.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceBirth >= 0 && daysSinceBirth < 21) {
          warnings.push(
            `"${animal.name}" gave birth only ${Math.round(daysSinceBirth)} days before this service date (< 21-day voluntary waiting period).`
          );
        }
      }
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
    revalidatePath("/analytics");
    revalidatePath("/");

    return {
      success: true,
      message: `Successfully recorded ${eventType.replace("_", " ").toLowerCase()} for ${animal.name || animal.tagNumber || "animal"}!`,
    };
  } catch (error: unknown) {
    console.error("Failed to create breeding event:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create breeding event.",
    };
  }
}

export async function completeBreedingEvent(
  eventId: string,
  actualDate?: string,
  notes?: string
) {
  try {
    const { tenantId } = await requirePermission("health:manage");

    const event = await prisma.breedingEvent.findFirst({
      where: { id: eventId, tenantId, isDeleted: false },
      include: { animal: { select: { id: true, tagNumber: true, name: true } } },
    });

    if (!event) {
      return { success: false, message: "Event not found in your farm records." };
    }

    const completionDate = actualDate ? parseLocalDate(actualDate) || new Date() : new Date();

    await prisma.breedingEvent.update({
      where: { id: eventId },
      data: {
        actualDate: completionDate,
        notes: notes ? (event.notes ? `${event.notes} | ${notes}` : notes) : event.notes,
      },
    });

    revalidatePath("/breeding");
    revalidatePath(`/herd/${event.animal.id}`);
    revalidatePath("/analytics");
    revalidatePath("/");

    return {
      success: true,
      message: `Marked event complete for ${event.animal.name || event.animal.tagNumber || "animal"}!`,
    };
  } catch (error: unknown) {
    console.error("Failed to complete breeding event:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to complete event.",
    };
  }
}

const healthRecordSchema = z.object({
  animalId: z.string().min(1, "Animal is required"),
  recordType: z.enum(["VACCINATION", "TREATMENT", "CHECKUP"]),
  description: z.string().trim().min(2, "Description is required"),
  cost: z.number().min(0, "Cost cannot be negative").optional(),
  date: z.string().min(1, "Date is required"),
  overrideWarnings: z.boolean().optional(),
});

export type CreateHealthRecordInput = z.input<typeof healthRecordSchema>;

export async function createHealthRecord(
  data: CreateHealthRecordInput
): Promise<ActionResponse> {
  try {
    const { userId, tenantId, isAdmin } = await requirePermission("health:manage");

    const val = healthRecordSchema.safeParse(data);
    if (!val.success) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: val.error.issues[0]?.message || "Invalid health data.",
      };
    }

    const { animalId, recordType, description, cost, date, overrideWarnings } = val.data;

    const animal = await prisma.animal.findFirst({
      where: { id: animalId, tenantId, isDeleted: false },
      select: { tagNumber: true, name: true, status: true, dateOfBirth: true },
    });

    if (!animal) {
      return { success: false, message: "Selected animal not found in your farm." };
    }

    if (animal.status === "SOLD" || animal.status === "DECEASED") {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: `"${animal.name}" is marked ${animal.status.toLowerCase()} and cannot have new health records.`,
      };
    }

    const recordDate = parseLocalDate(date);
    if (!recordDate) {
      return { success: false, code: "VALIDATION_ERROR", message: "Invalid health record date." };
    }
    if (recordDate > getEndOfToday()) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: "Date administered cannot be in the future.",
      };
    }
    if (animal.dateOfBirth && recordDate < animal.dateOfBirth) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: `Health record date cannot precede "${animal.name}"'s birth date.`,
      };
    }

    const warnings: string[] = [];
    if (cost && cost > 100000) {
      warnings.push(
        `Associated veterinary cost of KES ${cost.toLocaleString()} exceeds KES 100,000 for a single treatment.`
      );
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

    await prisma.$transaction(async (tx) => {
      await tx.healthRecord.create({
        data: {
          tenantId,
          animalId,
          recordType,
          description: description.trim(),
          cost: cost && cost > 0 ? cost : null,
          date: recordDate,
        },
      });

      if (cost && cost > 0) {
        await tx.expense.create({
          data: {
            tenantId,
            category: "VET_SERVICES",
            amount: cost,
            date: recordDate,
            description: `${recordType}: ${description.trim()} (${animal.name}${animal.tagNumber ? ` #${animal.tagNumber}` : ""})`,
            recordedById: userId,
          },
        });
      }
    });

    revalidatePath("/breeding");
    revalidatePath(`/herd/${animalId}`);
    revalidatePath("/milk");
    revalidatePath("/sales");
    revalidatePath("/analytics");
    revalidatePath("/");

    return {
      success: true,
      message: `Successfully recorded ${recordType.toLowerCase()} for ${animal.name || animal.tagNumber || "animal"}!`,
    };
  } catch (error: unknown) {
    console.error("Failed to create health record:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to record health event.",
    };
  }
}

export async function getUpcomingEvents() {
  const { tenantId } = await requirePermission("health:view");

  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const breedingEvents = await prisma.breedingEvent.findMany({
    where: {
      tenantId,
      isDeleted: false,
      actualDate: null,
      animal: { isDeleted: false, status: { in: ["ACTIVE", "SICK"] } },
      expectedDate: {
        gte: thirtyDaysAgo,
        lte: thirtyDaysFromNow,
      },
    },
    include: {
      animal: { select: { tagNumber: true, name: true, species: true } },
    },
    orderBy: { expectedDate: "asc" },
  });

  return breedingEvents.map((e) => {
    const isNext7Days = e.expectedDate!.getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1000;
    const isOverdue = e.expectedDate!.getTime() < now.getTime();

    return {
      id: e.id,
      date: e.expectedDate!.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      tagNumber: e.animal.tagNumber,
      animalName: e.animal.name,
      species: e.animal.species,
      title: e.eventType.replace("_", " "),
      description: e.sireDetails
        ? `Sire: ${e.sireDetails}${isOverdue ? " • OVERDUE" : ""}`
        : isOverdue
          ? "Status: Overdue — Action Needed"
          : "Status: Pending",
      type: isOverdue || isNext7Days ? "warning" : "info",
      timeframe: isOverdue ? "Next 7 Days" : isNext7Days ? "Next 7 Days" : "Next 30 Days",
      isOverdue,
    };
  });
}

export interface BreedingScheduleItem {
  id: string;
  animalId: string;
  animalName: string;
  tagNumber: string | null;
  species: string;
  eventType: string;
  title: string;
  description: string;
  dueDateLabel: string;
  countdownText: string;
  isOverdue: boolean;
  bucket: "overdue" | "due_30d" | "gestation";
}

export interface BreedingLogItem {
  id: string;
  animalId: string;
  animalName: string;
  tagNumber: string | null;
  species: string;
  eventType: string;
  dateLabel: string;
  expectedDateLabel: string | null;
  actualDateLabel: string | null;
  sireDetails: string | null;
  notes: string | null;
  isCompleted: boolean;
}

export interface HealthLogItem {
  id: string;
  animalId: string;
  animalName: string;
  tagNumber: string | null;
  species: string;
  recordType: string;
  dateLabel: string;
  description: string;
  cost: number | null;
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export async function getBreedingHubData() {
  const { tenantId, hasPermission } = await requirePermission("health:view");
  const canViewFinances = hasPermission("finances:view");

  const [tenant, allBreedingEvents, allHealthRecords] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { currencySymbol: true },
    }),
    prisma.breedingEvent.findMany({
      where: {
        tenantId,
        isDeleted: false,
        animal: { isDeleted: false },
      },
      include: {
        animal: {
          select: {
            id: true,
            tagNumber: true,
            name: true,
            species: true,
            status: true,
          },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 250,
    }),
    prisma.healthRecord.findMany({
      where: {
        tenantId,
        isDeleted: false,
        animal: { isDeleted: false },
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
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 250,
    }),
  ]);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const openEvents = allBreedingEvents
    .filter(
      (e) =>
        e.actualDate === null &&
        (e.animal.status === "ACTIVE" || e.animal.status === "SICK")
    )
    .sort((a, b) => {
      const aTime = a.expectedDate ? a.expectedDate.getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.expectedDate ? b.expectedDate.getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });

  const scheduleEvents: BreedingScheduleItem[] = openEvents.map((e) => {
    const due = e.expectedDate;
    let isOverdue = false;
    let countdownText = "Scheduled";
    let bucket: BreedingScheduleItem["bucket"] = "gestation";

    if (due) {
      const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());
      const diffDays = Math.round(
        (dueStart.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays < 0) {
        isOverdue = true;
        bucket = "overdue";
        countdownText = `${Math.abs(diffDays)}d overdue`;
      } else if (diffDays === 0) {
        bucket = "due_30d";
        countdownText = "Due today";
      } else if (diffDays <= 30) {
        bucket = "due_30d";
        countdownText = `Due in ${diffDays}d`;
      } else {
        bucket = "gestation";
        countdownText = `Due in ${diffDays}d`;
      }
    }

    const titleMap: Record<string, string> = {
      INSEMINATION: "Expected Calving / Birth (AI)",
      NATURAL_MATING: "Expected Calving / Birth (Mating)",
      PREGNANCY_CHECK: "Follow-up Pregnancy Check",
      BIRTH: "Birth",
    };

    const parts: string[] = [`Recorded ${formatShortDate(e.date)}`];
    if (e.sireDetails) parts.push(`Sire: ${e.sireDetails}`);
    if (e.notes) parts.push(e.notes);

    return {
      id: e.id,
      animalId: e.animal.id,
      animalName: e.animal.name,
      tagNumber: e.animal.tagNumber,
      species: e.animal.species,
      eventType: e.eventType,
      title: titleMap[e.eventType] || e.eventType.replace(/_/g, " "),
      description: parts.join(" • "),
      dueDateLabel: due ? formatShortDate(due) : "No due date",
      countdownText,
      isOverdue,
      bucket,
    };
  });

  const breedingRecords: BreedingLogItem[] = allBreedingEvents.map((e) => ({
    id: e.id,
    animalId: e.animal.id,
    animalName: e.animal.name,
    tagNumber: e.animal.tagNumber,
    species: e.animal.species,
    eventType: e.eventType,
    dateLabel: formatShortDate(e.date),
    expectedDateLabel: e.expectedDate ? formatShortDate(e.expectedDate) : null,
    actualDateLabel: e.actualDate ? formatShortDate(e.actualDate) : null,
    sireDetails: e.sireDetails,
    notes: e.notes,
    isCompleted: e.actualDate !== null,
  }));

  const healthRecords: HealthLogItem[] = allHealthRecords.map((r) => ({
    id: r.id,
    animalId: r.animal.id,
    animalName: r.animal.name,
    tagNumber: r.animal.tagNumber,
    species: r.animal.species,
    recordType: r.recordType,
    dateLabel: formatShortDate(r.date),
    description: r.description,
    cost: canViewFinances ? r.cost : null,
  }));

  return {
    scheduleEvents,
    breedingRecords,
    healthRecords,
    canViewFinances,
    currencySymbol: tenant?.currencySymbol || "KES",
  };
}
