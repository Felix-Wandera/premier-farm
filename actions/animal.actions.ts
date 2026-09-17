"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantContext, requireTenantRole } from "./utils";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

// Explicit mappings from Human-readable UI to Database ENUMs
const SPECIES_MAP: Record<string, any> = {
  "Dairy Cow": "DAIRY_COW",
  "Indigenous": "INDIGENOUS_COW",
  "Bull": "BULL",
  "Heifer": "HEIFER",
  "Sheep": "SHEEP",
  "Goat": "GOAT",
};

// Zod Validation Schema
const animalSchema = z.object({
  species: z.string().min(1, "Species is required"),
  gender: z.enum(["MALE", "FEMALE"]),
  tagNumber: z.string().min(1, "Official Tag Number is required"),
  name: z.string().optional(),
  dateOfBirth: z.string().optional(),
  status: z.enum(["ACTIVE", "SICK", "SOLD", "DECEASED"]),
  motherTag: z.string().optional(),
  sireName: z.string().optional(),
});

type ActionState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createAnimal(formData: any): Promise<ActionState> {
  try {
    const { tenantId } = await requireTenantRole(["ADMIN", "MANAGER"]);

    // 1. Zod Validation
    const validatedFields = animalSchema.safeParse(formData);

    if (!validatedFields.success) {
      return {
        success: false,
        message: "Please fill out all required fields correctly.",
        fieldErrors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const data = validatedFields.data;
    const dbSpecies = SPECIES_MAP[data.species];

    if (!dbSpecies) {
      return { success: false, message: `Invalid species: ${data.species}` };
    }

    // 2. Mother Tag Lookup (Scoped to this tenant)
    let motherId = null;
    if (data.motherTag && data.motherTag.trim() !== "") {
      const mother = await prisma.animal.findFirst({
        where: {
          tenantId,
          tagNumber: data.motherTag.trim(),
        },
        select: { id: true },
      });

      if (!mother) {
        return {
          success: false,
          message: `Could not find a registered animal with Tag ID: ${data.motherTag}`,
        };
      }
      motherId = mother.id;
    }

    // 3. Database Insertion (Scoped to tenantId)
    const newAnimal = await prisma.animal.create({
      data: {
        tenantId,
        tagNumber: data.tagNumber.trim(),
        name: data.name?.trim() || null,
        species: dbSpecies,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        status: data.status,
        motherId,
        fatherName: data.sireName?.trim() || null,
      },
    });

    revalidatePath("/herd");

    return {
      success: true,
      message: `Successfully registered ${newAnimal.tagNumber}!`,
    };

  } catch (error: any) {
    console.error("Failed to create animal:", error);
    
    // Check specific Prisma constraints
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          success: false,
          message: "An animal with this Tag Number already exists. Please check your records.",
        };
      }
    }

    return {
      success: false,
      message: "An unexpected database error occurred. Please try again later.",
    };
  }
}

const updateAnimalSchema = z.object({
  species: z.string().min(1, "Species is required"),
  gender: z.enum(["MALE", "FEMALE"]),
  tagNumber: z.string().min(1, "Official Tag Number is required"),
  name: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

const statusUpdateSchema = z.object({
  status: z.enum(["DECEASED", "SOLD"]),
  date: z.string().min(1, "Date is required"),
  cause: z.string().optional(),
  amount: z.coerce.number().min(0).optional(),
  buyerName: z.string().optional(),
  notes: z.string().optional(),
});

export async function updateAnimalStatus(id: string, status: string, formData: any): Promise<ActionState> {
  try {
    const { tenantId } = await requireTenantRole(["ADMIN", "MANAGER"]);

    const validatedFields = statusUpdateSchema.safeParse({ status, ...formData });

    if (!validatedFields.success) {
      return {
        success: false,
        message: "Please fill out all required fields correctly.",
      };
    }

    const data = validatedFields.data;

    if (data.status === "SOLD" && (!data.amount || data.amount <= 0)) {
      return {
        success: false,
        message: "Sale price must be greater than zero.",
      };
    }

    await prisma.$transaction(async (tx) => {
      const animal = await tx.animal.findFirst({
        where: { id, tenantId },
        select: { id: true, tagNumber: true, name: true },
      });

      if (!animal) {
        throw new Error("Animal not found in your farm records.");
      }

      if (data.status === "SOLD") {
        const saleDesc = `Sale of ${animal.tagNumber}${animal.name ? ` (${animal.name})` : ""}`;
        const sale = await tx.sale.create({
          data: {
            tenantId,
            saleType: "ANIMAL",
            amount: data.amount!,
            quantity: 1,
            date: new Date(data.date),
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
            dateOfDeath: new Date(data.date),
            causeOfDeath: data.cause?.trim() || null,
          },
        });
      }
    });

    revalidatePath("/herd");
    revalidatePath(`/herd/${id}`);
    revalidatePath("/sales");
    revalidatePath("/");

    return {
      success: true,
      message: `Successfully updated animal status to ${data.status}!`,
    };

  } catch (error: any) {
    console.error("Failed to update animal status:", error);

    return {
      success: false,
      message: error.message || "An unexpected database error occurred. Please try again later.",
    };
  }
}

export async function updateAnimal(id: string, formData: any): Promise<ActionState> {
  try {
    const { tenantId } = await requireTenantRole(["ADMIN", "MANAGER"]);

    const validatedFields = updateAnimalSchema.safeParse(formData);

    if (!validatedFields.success) {
      return {
        success: false,
        message: "Please fill out all required fields correctly.",
        fieldErrors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const data = validatedFields.data;
    const dbSpecies = SPECIES_MAP[data.species];

    if (!dbSpecies) {
      return { success: false, message: `Invalid species: ${data.species}` };
    }

    const existing = await prisma.animal.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return { success: false, message: "Animal not found in your farm records." };
    }

    await prisma.animal.update({
      where: { id },
      data: {
        tagNumber: data.tagNumber.trim(),
        name: data.name?.trim() || null,
        species: dbSpecies,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      },
    });

    revalidatePath("/herd");
    revalidatePath(`/herd/${id}`);

    return {
      success: true,
      message: `Successfully updated animal details!`,
    };

  } catch (error: any) {
    console.error("Failed to update animal:", error);

    if (error.code === "P2002") {
      return {
        success: false,
        message: "An animal with this Tag Number already exists in your farm.",
      };
    }

    return {
      success: false,
      message: "An unexpected database error occurred. Please try again later.",
    };
  }
}

export async function getAnimals() {
  const { tenantId } = await requireTenantContext();
  
  const animals = await prisma.animal.findMany({
    where: { tenantId, isDeleted: false },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      tagNumber: true,
      name: true,
      species: true,
      status: true,
      dateOfBirth: true,
    }
  });

  return animals;
}

export async function getAnimalProfile(id: string) {
  const { tenantId } = await requireTenantContext();

  const animal = await prisma.animal.findFirst({
    where: { id, tenantId, isDeleted: false },
    include: {
      mother: { select: { id: true, tagNumber: true, name: true } },
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
        orderBy: { date: "desc" },
        take: 10,
        select: { id: true, amountLiters: true, milkingTime: true, date: true }
      },
      healthRecords: {
        orderBy: { date: "desc" },
        take: 10,
        select: { id: true, recordType: true, description: true, date: true, cost: true }
      },
      breedingEvents: {
        orderBy: { date: "desc" },
        take: 10,
        select: { id: true, eventType: true, expectedDate: true, actualDate: true, date: true, sireDetails: true }
      }
    }
  });

  if (!animal) return null;

  return animal;
}
