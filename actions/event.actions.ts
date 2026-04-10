"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "./utils";

export async function getUpcomingEvents() {
  await requireAuth();

  const now = new Date();
  
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  const breedingEvents = await prisma.breedingEvent.findMany({
    where: {
      isDeleted: false,
      expectedDate: {
        gte: now,
        lte: thirtyDaysFromNow
      }
    },
    include: {
      animal: { select: { tagNumber: true, name: true, species: true } }
    },
    orderBy: { expectedDate: "asc" }
  });

  const formattedEvents = breedingEvents.map(e => {
    const isNext7Days = (e.expectedDate!.getTime() - now.getTime()) <= 7 * 24 * 60 * 60 * 1000;
    
    return {
      id: e.id,
      date: e.expectedDate!.toLocaleDateString("en-US", { day: 'numeric', month: 'short' }),
      tagNumber: e.animal.tagNumber,
      animalName: e.animal.name,
      species: e.animal.species,
      title: e.eventType,
      description: e.sireDetails ? `Sire: ${e.sireDetails}` : `Status: Pending`,
      type: isNext7Days ? "warning" : "info",
      timeframe: isNext7Days ? "Next 7 Days" : "Next 30 Days"
    };
  });

  return formattedEvents;
}
