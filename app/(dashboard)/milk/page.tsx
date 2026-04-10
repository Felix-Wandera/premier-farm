import React from "react";
import ClientMilkLogging from "../../components/milk/ClientMilkLogging";
import { getMilkingCows, getMilkHistory } from "@/actions/milk.actions";

export default async function MilkLogging() {
  const [cows, history] = await Promise.all([
    getMilkingCows(),
    getMilkHistory(),
  ]);

  return <ClientMilkLogging initialCows={cows} historyData={history} />;
}
