"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "./utils";
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
    await requireAuth();

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

    // 2. Mother Tag Lookup (If provided)
    let motherId = null;
    if (data.motherTag && data.motherTag.trim() !== "") {
      const mother = await prisma.animal.findUnique({
        where: { tagNumber: data.motherTag.trim() },
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

    // 3. Database Insertion
    const newAnimal = await prisma.animal.create({
      data: {
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

    revalidatePath("/herd"); // Tell Next.js to flush cache for directory

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

export async function getAnimals() {
  await requireAuth();
  
  const animals = await prisma.animal.findMany({
    where: { isDeleted: false },
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
  await requireAuth();

  const animal = await prisma.animal.findUnique({
    where: { id, isDeleted: false },
    include: {
      mother: { select: { tagNumber: true, name: true } },
      offspring: { select: { tagNumber: true, name: true, dateOfBirth: true } },
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
