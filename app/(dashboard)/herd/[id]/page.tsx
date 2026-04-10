import React from "react";
import ClientAnimalProfile from "../../../components/herd/ClientAnimalProfile";
import { getAnimalProfile } from "@/actions/animal.actions";

export default async function AnimalProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getAnimalProfile(id);

  return <ClientAnimalProfile initialData={data} />;
}
