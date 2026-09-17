import React, { Suspense } from "react";
import ClientBreedingHub from "../../components/breeding/ClientBreedingHub";
import { getUpcomingEvents, getBreedingAnimals, getHealthAnimals } from "@/actions/event.actions";

export default async function BreedingHub() {
  const [events, breedingAnimals, healthAnimals] = await Promise.all([
    getUpcomingEvents(),
    getBreedingAnimals(),
    getHealthAnimals(),
  ]);

  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Loading breeding hub...</div>}>
      <ClientBreedingHub
        initialEvents={events}
        breedingAnimals={breedingAnimals}
        healthAnimals={healthAnimals}
      />
    </Suspense>
  );
}

