import React from "react";
import ClientBreedingHub from "../../components/breeding/ClientBreedingHub";
import { getUpcomingEvents } from "@/actions/event.actions";

export default async function BreedingHub() {
  const events = await getUpcomingEvents();

  return <ClientBreedingHub initialEvents={events} />;
}
