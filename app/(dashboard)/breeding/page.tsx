import React, { Suspense } from "react";
import ClientBreedingHub from "../../components/breeding/ClientBreedingHub";
import {
  getBreedingHubData,
  getBreedingAnimals,
  getHealthAnimals,
} from "@/actions/event.actions";

export default async function BreedingHub() {
  const [hubData, breedingAnimals, healthAnimals] = await Promise.all([
    getBreedingHubData(),
    getBreedingAnimals(),
    getHealthAnimals(),
  ]);

  return (
    <Suspense
      fallback={
        <div style={{ padding: "2rem", textAlign: "center" }}>
          Loading breeding &amp; health hub...
        </div>
      }
    >
      <ClientBreedingHub
        scheduleEvents={hubData.scheduleEvents}
        breedingRecords={hubData.breedingRecords}
        healthRecords={hubData.healthRecords}
        canViewFinances={hubData.canViewFinances}
        currencySymbol={hubData.currencySymbol}
        breedingAnimals={breedingAnimals}
        healthAnimals={healthAnimals}
      />
    </Suspense>
  );
}

