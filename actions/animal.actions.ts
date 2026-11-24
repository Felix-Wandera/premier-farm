"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "./utils";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  ActionResponse,
  formatSpeciesLabel,
  getEndOfToday,
  getSpeciesFamily,
  normalizeAnimalName,
  normalizeTagNumber,
  parseLocalDate,
  parseSpecies,
  validateSpeciesGender,
} from "@/lib/validations";

const animalFormSchema = z.object({
  species: z.string().min(1, "Species is required"),
  gender: z.enum(["MALE", "FEMALE"]),
  name: z.string().trim().min(1, "Animal name is required").max(80, "Name is too long"),
  tagNumber: z.string().trim().max(40, "Tag number is too long").optional().or(z.literal("")),
  breed: z.string().trim().max(80, "Breed is too long").optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "SICK", "SOLD", "DECEASED"]).optional(),
  motherId: z.string().optional().or(z.literal("")),
  motherTag: z.string().optional().or(z.literal("")),
  sireName: z.string().optional().or(z.literal("")),
  overrideWarnings: z.boolean().optional(),
});

/**
 * Checks whether an animal name and/or tag number are available within the caller's organization.
 * Non-deleted records (including SOLD and DECEASED) keep their names/tags reserved;
 * soft-deleted records (`isDeleted = true`) free up both name and tag.
 */
export async function checkAnimalIdentityAvailability(params: {
  name?: string;
  tagNumber?: string;
  excludeId?: string;
}) {
  const { tenantId } = await requirePermission("herd:view");

  const normalizedName = params.name ? normalizeAnimalName(params.name) : "";
  const normalizedTag = normalizeTagNumber(params.tagNumber);

  let nameConflict: { tagNumber: string | null; status: string; species: string } | null = null;
  let tagConflict: { name: string; status: string } | null = null;

  if (normalizedName) {
    const existingByName = await prisma.animal.findFirst({
      where: {
        tenantId,
        isDeleted: false,
        ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
        name: { equals: normalizedName, mode: "insensitive" },
      },
      select: { tagNumber: true, status: true, species: true },
    });
    if (existingByName) {
      nameConflict = existingByName;
    }
  }

  if (normalizedTag) {
    const existingByTag = await prisma.animal.findFirst({
      where: {
        tenantId,
        isDeleted: false,
        ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
        tagNumber: { equals: normalizedTag, mode: "insensitive" },
      },
      select: { name: true, status: true },
    });
    if (existingByTag) {
      tagConflict = existingByTag;
    }
  }

  return {
    nameAvailable: !nameConflict,
    nameError: nameConflict
      ? `An animal named "${normalizedName}" already exists in your organization (${formatSpeciesLabel(nameConflict.species)}${nameConflict.tagNumber ? `, #${nameConflict.tagNumber}` : ""}, ${nameConflict.status.toLowerCase()}).`
      : null,
    tagAvailable: !tagConflict,
    tagError: tagConflict
      ? `Tag #${normalizedTag} is already assigned to "${tagConflict.name}" (${tagConflict.status.toLowerCase()}).`
      : null,
  };
}

/**
 * Collects all descendant IDs of an animal so we can prevent circular genealogy when editing Dam (`motherId`).
 */
async function collectDescendantIds(tenantId: string, rootId: string): Promise<Set<string>> {
  const allAnimals = await prisma.animal.findMany({
    where: { tenantId, isDeleted: false, motherId: { not: null } },
    select: { id: true, motherId: true },
  });

  const childrenByMother = new Map<string, string[]>();
  for (const a of allAnimals) {
    if (!a.motherId) continue;
    const list = childrenByMother.get(a.motherId) || [];
    list.push(a.id);
    childrenByMother.set(a.motherId, list);
  }

  const descendants = new Set<string>();
  const queue = [rootId];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    const kids = childrenByMother.get(curr) || [];
    for (const kid of kids) {
      if (!descendants.has(kid)) {
        descendants.add(kid);
        queue.push(kid);
      }
    }
  }
  return descendants;
}

export async function getEligibleDamAnimals(excludeAnimalId?: string) {
  const { tenantId } = await requirePermission("herd:view");
  const excludedIds = excludeAnimalId
    ? await collectDescendantIds(tenantId, excludeAnimalId)
    : new Set<string>();
  if (excludeAnimalId) excludedIds.add(excludeAnimalId);

  const females = await prisma.animal.findMany({
    where: {
      tenantId,
      isDeleted: false,
      gender: "FEMALE",
      ...(excludedIds.size > 0 ? { id: { notIn: Array.from(excludedIds) } } : {}),
    },
    select: {
      id: true,
      name: true,
      tagNumber: true,
      species: true,
      status: true,
      dateOfBirth: true,
    },
    orderBy: { name: "asc" },
  });

  return females;
}

async function validateAndResolveMother(params: {
  tenantId: string;
  excludeId?: string;
  childSpecies: any;
  childDob: Date | null;
  motherId?: string | null;
  motherTag?: string | null;
}): Promise<{ motherId: string | null; hardError?: string; outlierWarning?: string }> {
  const { tenantId, excludeId, childSpecies, childDob, motherId, motherTag } = params;

  let mother: {
    id: string;
    name: string;
    tagNumber: string | null;
    gender: string;
    species: string;
    dateOfBirth: Date | null;
  } | null = null;

  if (motherId && motherId.trim() !== "") {
    mother = await prisma.animal.findFirst({
      where: { id: motherId.trim(), tenantId, isDeleted: false },
      select: { id: true, name: true, tagNumber: true, gender: true, species: true, dateOfBirth: true },
    });
    if (!mother) {
      return { motherId: null, hardError: "Selected Dam (Mother) was not found in your active farm records." };
    }
  } else if (motherTag && motherTag.trim() !== "") {
    const cleanTag = normalizeTagNumber(motherTag)!;
    mother = await prisma.animal.findFirst({
      where: {
        tenantId,
        isDeleted: false,
        OR: [
          { tagNumber: { equals: cleanTag, mode: "insensitive" } },
          { name: { equals: motherTag.trim(), mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, tagNumber: true, gender: true, species: true, dateOfBirth: true },
    });
    if (!mother) {
      return {
        motherId: null,
        hardError: `Could not find a registered animal matching Dam tag or name "${motherTag.trim()}".`,
      };
    }
  } else {
    return { motherId: null };
  }

  if (excludeId && mother.id === excludeId) {
    return { motherId: null, hardError: "An animal cannot be assigned as its own mother (Dam)." };
  }

  if (excludeId) {
    const descendants = await collectDescendantIds(tenantId, excludeId);
    if (descendants.has(mother.id)) {
      return {
        motherId: null,
        hardError: `"${mother.name}" is recorded as an offspring/descendant of this animal and cannot be set as its Dam.`,
      };
    }
  }

  if (mother.gender !== "FEMALE") {
    return {
      motherId: null,
      hardError: `"${mother.name}" is Male and cannot be assigned as a Dam (Mother).`,
    };
  }

  if (getSpeciesFamily(mother.species) !== getSpeciesFamily(childSpecies)) {
    return {
      motherId: null,
      hardError: `Species mismatch: "${mother.name}" (${formatSpeciesLabel(mother.species)}) cannot be the mother of a ${formatSpeciesLabel(childSpecies)}.`,
    };
  }

  let outlierWarning: string | undefined;
  if (mother.dateOfBirth && childDob) {
    if (mother.dateOfBirth >= childDob) {
      return {
        motherId: null,
        hardError: `Dam "${mother.name}" (born ${mother.dateOfBirth.toLocaleDateString()}) must be born earlier than her offspring (${childDob.toLocaleDateString()}).`,
      };
    }

    const ageDiffMonths =
      (childDob.getTime() - mother.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    const minMaternalMonths = getSpeciesFamily(childSpecies) === "CATTLE" ? 12 : 5;
    if (ageDiffMonths < minMaternalMonths) {
      outlierWarning = `Dam "${mother.name}" would have been only ${Math.round(ageDiffMonths)} months old when this offspring was born (typical minimum is ${minMaternalMonths} months).`;
    }
  }

  return { motherId: mother.id, outlierWarning };
}

export async function createAnimal(formData: any): Promise<ActionResponse> {
  try {
    const { tenantId, isAdmin } = await requirePermission("herd:create");

    const validatedFields = animalFormSchema.safeParse(formData);
    if (!validatedFields.success) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: validatedFields.error.issues[0]?.message || "Please fill out all required fields correctly.",
        fieldErrors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const data = validatedFields.data;
    const dbSpecies = parseSpecies(data.species);
    if (!dbSpecies) {
      return { success: false, code: "VALIDATION_ERROR", message: `Invalid species: ${data.species}` };
    }

    const genderErr = validateSpeciesGender(dbSpecies, data.gender);
    if (genderErr) {
      return { success: false, code: "VALIDATION_ERROR", message: genderErr };
    }

    const normalizedName = normalizeAnimalName(data.name);
    const normalizedTag = normalizeTagNumber(data.tagNumber);

    // Uniqueness checks (scoped to tenantId & isDeleted = false)
    const availability = await checkAnimalIdentityAvailability({
      name: normalizedName,
      tagNumber: normalizedTag || undefined,
    });

    if (!availability.nameAvailable) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: availability.nameError!,
        fieldErrors: { name: [availability.nameError!] },
      };
    }
    if (!availability.tagAvailable) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: availability.tagError!,
        fieldErrors: { tagNumber: [availability.tagError!] },
      };
    }

    // DOB validation
    const warnings: string[] = [];
    let parsedDob: Date | null = null;
    if (data.dateOfBirth) {
      parsedDob = parseLocalDate(data.dateOfBirth);
      if (!parsedDob) {
        return { success: false, code: "VALIDATION_ERROR", message: "Invalid Date of Birth." };
      }
      if (parsedDob > getEndOfToday()) {
        return { success: false, code: "VALIDATION_ERROR", message: "Date of Birth cannot be in the future." };
      }
      const ageYears = (Date.now() - parsedDob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (ageYears > 25) {
        warnings.push(`Date of Birth (${parsedDob.toLocaleDateString()}) makes this animal ${Math.floor(ageYears)} years old, which is unusually old.`);
      }
    }

    // Mother / Dam validation
    const motherCheck = await validateAndResolveMother({
      tenantId,
      childSpecies: dbSpecies,
      childDob: parsedDob,
      motherId: data.motherId,
      motherTag: data.motherTag,
    });

    if (motherCheck.hardError) {
      return { success: false, code: "VALIDATION_ERROR", message: motherCheck.hardError };
    }
    if (motherCheck.outlierWarning) {
      warnings.push(motherCheck.outlierWarning);
    }

    if (warnings.length > 0 && !(data.overrideWarnings && isAdmin)) {
      return {
        success: false,
        code: "OUTLIER_WARNING",
        message: warnings[0],
        warnings,
        canOverride: isAdmin,
      };
    }

    const newAnimal = await prisma.animal.create({
      data: {
        tenantId,
        name: normalizedName,
        tagNumber: normalizedTag,
        species: dbSpecies,
        breed: data.breed?.trim() || null,
        gender: data.gender,
        dateOfBirth: parsedDob,
        status: data.status === "SICK" ? "SICK" : "ACTIVE",
        motherId: motherCheck.motherId,
        fatherName: data.sireName?.trim() || null,
      },
    });

    revalidatePath("/herd");
    revalidatePath("/");
    revalidatePath("/analytics");

    return {
      success: true,
      message: `Successfully registered ${newAnimal.name}${newAnimal.tagNumber ? ` (#${newAnimal.tagNumber})` : ""}!`,
    };
  } catch (error: any) {
    console.error("Failed to create animal:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: "An animal with this Name or Tag Number already exists in your organization.",
      };
    }

    return {
      success: false,
      message: error?.message || "An unexpected database error occurred. Please try again later.",
    };
  }
}

const statusUpdateSchema = z.object({
  status: z.enum(["DECEASED", "SOLD"]),
  date: z.string().min(1, "Date is required"),
  cause: z.string().optional(),
  amount: z.coerce.number().min(0).optional(),
  buyerName: z.string().optional(),
  notes: z.string().optional(),
  overrideWarnings: z.boolean().optional(),
});

export async function updateAnimalStatus(
  id: string,
  status: string,
  formData: any
): Promise<ActionResponse> {
  try {
    const { tenantId, isAdmin } = await requirePermission("herd:edit");

    const validatedFields = statusUpdateSchema.safeParse({ status, ...formData });
    if (!validatedFields.success) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: validatedFields.error.issues[0]?.message || "Please fill out all required fields correctly.",
      };
    }

    const data = validatedFields.data;
    const eventDate = parseLocalDate(data.date);
    if (!eventDate) {
      return { success: false, code: "VALIDATION_ERROR", message: "Please provide a valid date." };
    }
    if (eventDate > getEndOfToday()) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: `${data.status === "SOLD" ? "Sale date" : "Date of passing"} cannot be in the future.`,
      };
    }

    if (data.status === "DECEASED" && !data.cause?.trim()) {
      return { success: false, code: "VALIDATION_ERROR", message: "Cause of death is required." };
    }

    if (data.status === "SOLD" && (!data.amount || data.amount <= 0)) {
      return { success: false, code: "VALIDATION_ERROR", message: "Sale price must be greater than zero." };
    }

    const animal = await prisma.animal.findFirst({
      where: { id, tenantId, isDeleted: false },
      select: { id: true, tagNumber: true, name: true, dateOfBirth: true },
    });

    if (!animal) {
      return { success: false, message: "Animal not found in your farm records." };
    }

    if (animal.dateOfBirth && eventDate < animal.dateOfBirth) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: `Event date (${eventDate.toLocaleDateString()}) cannot be earlier than ${animal.name}'s birth date (${animal.dateOfBirth.toLocaleDateString()}).`,
      };
    }

    const warnings: string[] = [];
    if (data.status === "SOLD" && data.amount) {
      if (data.amount > 500000) {
        warnings.push(`Sale price of KES ${data.amount.toLocaleString()} is unusually high (> KES 500,000).`);
      } else if (data.amount < 2000) {
        warnings.push(`Sale price of KES ${data.amount.toLocaleString()} is unusually low (< KES 2,000).`);
      }
    }

    if (warnings.length > 0 && !(data.overrideWarnings && isAdmin)) {
      return {
        success: false,
        code: "OUTLIER_WARNING",
        message: warnings[0],
        warnings,
        canOverride: isAdmin,
      };
    }

    await prisma.$transaction(async (tx) => {
      // Soft-delete any uncompleted upcoming breeding events so sold/deceased animals don't trigger reminders
      await tx.breedingEvent.updateMany({
        where: { animalId: id, tenantId, actualDate: null, isDeleted: false },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      if (data.status === "SOLD") {
        const saleDesc = `Sale of ${animal.name}${animal.tagNumber ? ` (#${animal.tagNumber})` : ""}`;
        const sale = await tx.sale.create({
          data: {
            tenantId,
            saleType: "ANIMAL",
            amount: data.amount!,
            quantity: 1,
            date: eventDate,
            buyerName: data.buyerName?.trim() || null,
            notes: data.notes?.trim() || saleDesc,
          },
        });

        await tx.animal.update({
          where: { id },
          data: {
            status: "SOLD",
            saleId: sale.id,
          },
        });
      } else if (data.status === "DECEASED") {
        await tx.animal.update({
          where: { id },
          data: {
            status: "DECEASED",
            dateOfDeath: eventDate,
            causeOfDeath: data.cause?.trim() || null,
          },
        });
      }
    });

    revalidatePath("/herd");
    revalidatePath(`/herd/${id}`);
    revalidatePath("/sales");
    revalidatePath("/breeding");
    revalidatePath("/analytics");
    revalidatePath("/");

    return {
      success: true,
      message: `Successfully updated ${animal.name}'s status to ${data.status}!`,
    };
  } catch (error: any) {
    console.error("Failed to update animal status:", error);
    return {
      success: false,
      message: error.message || "An unexpected database error occurred. Please try again later.",
    };
  }
}

export async function updateAnimal(id: string, formData: any): Promise<ActionResponse> {
  try {
    const { tenantId, isAdmin } = await requirePermission("herd:edit");

    const validatedFields = animalFormSchema.safeParse(formData);
    if (!validatedFields.success) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: validatedFields.error.issues[0]?.message || "Please fill out all required fields correctly.",
        fieldErrors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const data = validatedFields.data;
    const dbSpecies = parseSpecies(data.species);
    if (!dbSpecies) {
      return { success: false, code: "VALIDATION_ERROR", message: `Invalid species: ${data.species}` };
    }

    const genderErr = validateSpeciesGender(dbSpecies, data.gender);
    if (genderErr) {
      return { success: false, code: "VALIDATION_ERROR", message: genderErr };
    }

    const existing = await prisma.animal.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!existing) {
      return { success: false, message: "Animal not found in your farm records." };
    }

    const normalizedName = normalizeAnimalName(data.name);
    const normalizedTag = normalizeTagNumber(data.tagNumber);

    const availability = await checkAnimalIdentityAvailability({
      name: normalizedName,
      tagNumber: normalizedTag || undefined,
      excludeId: id,
    });

    if (!availability.nameAvailable) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: availability.nameError!,
        fieldErrors: { name: [availability.nameError!] },
      };
    }
    if (!availability.tagAvailable) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: availability.tagError!,
        fieldErrors: { tagNumber: [availability.tagError!] },
      };
    }

    const warnings: string[] = [];
    let parsedDob: Date | null = null;
    if (data.dateOfBirth) {
      parsedDob = parseLocalDate(data.dateOfBirth);
      if (!parsedDob) {
        return { success: false, code: "VALIDATION_ERROR", message: "Invalid Date of Birth." };
      }
      if (parsedDob > getEndOfToday()) {
        return { success: false, code: "VALIDATION_ERROR", message: "Date of Birth cannot be in the future." };
      }
      const ageYears = (Date.now() - parsedDob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (ageYears > 25) {
        warnings.push(`Date of Birth (${parsedDob.toLocaleDateString()}) makes this animal ${Math.floor(ageYears)} years old, which is unusually old.`);
      }
    }

    const motherCheck = await validateAndResolveMother({
      tenantId,
      excludeId: id,
      childSpecies: dbSpecies,
      childDob: parsedDob,
      motherId: data.motherId,
      motherTag: data.motherTag,
    });

    if (motherCheck.hardError) {
      return { success: false, code: "VALIDATION_ERROR", message: motherCheck.hardError };
    }
    if (motherCheck.outlierWarning) {
      warnings.push(motherCheck.outlierWarning);
    }

    if (warnings.length > 0 && !(data.overrideWarnings && isAdmin)) {
      return {
        success: false,
        code: "OUTLIER_WARNING",
        message: warnings[0],
        warnings,
        canOverride: isAdmin,
      };
    }

    const nextStatus =
      data.status && (data.status === "ACTIVE" || data.status === "SICK")
        ? data.status
        : existing.status;

    await prisma.$transaction(async (tx) => {
      // If reverting a previously SOLD animal back to ACTIVE/SICK, void its auto-generated Sale record
      let nextSaleId = existing.saleId;
      if (existing.status === "SOLD" && (nextStatus === "ACTIVE" || nextStatus === "SICK") && existing.saleId) {
        await tx.sale.update({
          where: { id: existing.saleId },
          data: { isDeleted: true, deletedAt: new Date() },
        });
        nextSaleId = null;
      }

      await tx.animal.update({
        where: { id },
        data: {
          name: normalizedName,
          tagNumber: normalizedTag,
          species: dbSpecies,
          breed: data.breed !== undefined ? data.breed.trim() || null : existing.breed,
          gender: data.gender,
          dateOfBirth: parsedDob,
          status: nextStatus,
          saleId: nextSaleId,
          dateOfDeath: nextStatus === "ACTIVE" || nextStatus === "SICK" ? null : existing.dateOfDeath,
          causeOfDeath: nextStatus === "ACTIVE" || nextStatus === "SICK" ? null : existing.causeOfDeath,
          motherId: data.motherId !== undefined || data.motherTag !== undefined ? motherCheck.motherId : existing.motherId,
          fatherName: data.sireName !== undefined ? data.sireName.trim() || null : existing.fatherName,
        },
      });
    });

    revalidatePath("/herd");
    revalidatePath(`/herd/${id}`);
    revalidatePath("/milk");
    revalidatePath("/sales");
    revalidatePath("/analytics");
    revalidatePath("/");

    return {
      success: true,
      message: `Successfully updated ${normalizedName}'s profile!`,
    };
  } catch (error: any) {
    console.error("Failed to update animal:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: "An animal with this Name or Tag Number already exists in your organization.",
      };
    }

    return {
      success: false,
      message: error?.message || "An unexpected database error occurred. Please try again later.",
    };
  }
}

export async function getAnimalDeletionImpact(id: string) {
  try {
    const { tenantId } = await requirePermission("herd:delete");

    const animal = await prisma.animal.findFirst({
      where: { id, tenantId, isDeleted: false },
      select: {
        id: true,
        name: true,
        tagNumber: true,
        status: true,
        saleId: true,
        _count: {
          select: {
            milkLogs: { where: { isDeleted: false } },
            healthRecords: { where: { isDeleted: false } },
            breedingEvents: { where: { isDeleted: false } },
            offspring: { where: { isDeleted: false } },
          },
        },
      },
    });

    if (!animal) {
      return { success: false, message: "Animal not found." };
    }

    return {
      success: true,
      data: {
        name: animal.name,
        tagNumber: animal.tagNumber,
        status: animal.status,
        hasLinkedSale: Boolean(animal.saleId),
        milkLogsCount: animal._count.milkLogs,
        healthRecordsCount: animal._count.healthRecords,
        breedingEventsCount: animal._count.breedingEvents,
        offspringCount: animal._count.offspring,
      },
    };
  } catch (error: any) {
    return { success: false, message: error?.message || "Forbidden." };
  }
}

const deleteAnimalSchema = z.object({
  confirmationName: z.string().min(1, "Confirmation name is required."),
  reason: z.string().max(200).optional(),
  voidHistoricalLogs: z.boolean().optional(),
});

export async function deleteAnimal(
  id: string,
  payload: { confirmationName: string; reason?: string; voidHistoricalLogs?: boolean }
): Promise<ActionResponse> {
  try {
    const { tenantId } = await requirePermission("herd:delete");

    const val = deleteAnimalSchema.safeParse(payload);
    if (!val.success) {
      return { success: false, message: val.error.issues[0]?.message || "Invalid confirmation." };
    }

    const animal = await prisma.animal.findFirst({
      where: { id, tenantId, isDeleted: false },
      select: { id: true, name: true, tagNumber: true, saleId: true },
    });

    if (!animal) {
      return { success: false, message: "Animal record not found or already deleted." };
    }

    if (val.data.confirmationName.trim() !== animal.name.trim()) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: `Confirmation text did not match "${animal.name}". Animal was not deleted.`,
      };
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // 1. Soft-delete uncompleted breeding events so no phantom reminders trigger
      await tx.breedingEvent.updateMany({
        where: { animalId: id, tenantId, actualDate: null, isDeleted: false },
        data: { isDeleted: true, deletedAt: now },
      });

      // 2. If animal had an auto-generated Sale record, soft-delete it so revenue isn't orphaned
      if (animal.saleId) {
        await tx.sale.update({
          where: { id: animal.saleId },
          data: { isDeleted: true, deletedAt: now },
        });
      }

      // 3. Optionally void historical milk & health logs if deleting a mistaken/duplicate animal entry
      if (val.data.voidHistoricalLogs) {
        await tx.milkLog.updateMany({
          where: { animalId: id, tenantId, isDeleted: false },
          data: { isDeleted: true, deletedAt: now },
        });
        await tx.healthRecord.updateMany({
          where: { animalId: id, tenantId, isDeleted: false },
          data: { isDeleted: true, deletedAt: now },
        });
        await tx.breedingEvent.updateMany({
          where: { animalId: id, tenantId, isDeleted: false },
          data: { isDeleted: true, deletedAt: now },
        });
      }

      // 4. Soft-delete the Animal (partial unique indexes automatically release its name & tagNumber)
      await tx.animal.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: now,
          saleId: null,
        },
      });
    });

    revalidatePath("/herd");
    revalidatePath(`/herd/${id}`);
    revalidatePath("/milk");
    revalidatePath("/breeding");
    revalidatePath("/sales");
    revalidatePath("/analytics");
    revalidatePath("/");

    return {
      success: true,
      message: `"${animal.name}" has been deleted. Its name and ear tag are now freed for reuse.`,
    };
  } catch (error: any) {
    console.error("Failed to delete animal:", error);
    return {
      success: false,
      message: error?.message || "Failed to delete animal.",
    };
  }
}

export async function getAnimals() {
  const { tenantId } = await requirePermission("herd:view");

  const animals = await prisma.animal.findMany({
    where: { tenantId, isDeleted: false },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      tagNumber: true,
      name: true,
      species: true,
      breed: true,
      gender: true,
      status: true,
      dateOfBirth: true,
    },
  });

  return animals;
}

export async function getAnimalProfile(id: string) {
  const { tenantId, hasPermission } = await requirePermission("herd:view");
  const canViewFinances = hasPermission("finances:view");

  const animal = await prisma.animal.findFirst({
    where: { id, tenantId, isDeleted: false },
    include: {
      mother: { select: { id: true, tagNumber: true, name: true, isDeleted: true } },
      offspring: {
        where: { isDeleted: false },
        orderBy: { dateOfBirth: "desc" },
        select: {
          id: true,
          tagNumber: true,
          name: true,
          gender: true,
          species: true,
          status: true,
          dateOfBirth: true,
        },
      },
      sale: {
        select: {
          id: true,
          amount: true,
          buyerName: true,
          date: true,
          notes: true,
        },
      },
      milkLogs: {
        where: { isDeleted: false },
        orderBy: { date: "desc" },
        take: 15,
        select: { id: true, amountLiters: true, milkingTime: true, date: true, recordDate: true },
      },
      healthRecords: {
        where: { isDeleted: false },
        orderBy: { date: "desc" },
        take: 15,
        select: { id: true, recordType: true, description: true, date: true, cost: true },
      },
      breedingEvents: {
        where: { isDeleted: false },
        orderBy: { date: "desc" },
        take: 15,
        select: { id: true, eventType: true, expectedDate: true, actualDate: true, date: true, sireDetails: true, notes: true },
      },
    },
  });

  if (!animal) return null;

  // Redact financial amounts on the server if user lacks `finances:view`
  return {
    ...animal,
    sale: animal.sale
      ? {
          ...animal.sale,
          amount: canViewFinances ? animal.sale.amount : null,
        }
      : null,
    healthRecords: animal.healthRecords.map((hr) => ({
      ...hr,
      cost: canViewFinances ? hr.cost : null,
    })),
  };
}
