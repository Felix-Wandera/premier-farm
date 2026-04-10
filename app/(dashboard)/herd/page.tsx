import React from "react";
import { getAnimals } from "@/actions/animal.actions";
import ClientHerdDirectory from "../../components/herd/ClientHerdDirectory";

export default async function HerdDirectory() {
  const animals = await getAnimals();
  
  return <ClientHerdDirectory initialAnimals={animals} />;
}
